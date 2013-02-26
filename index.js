
var fs         = require('fs')
var through    = require('through')
var from       = require('from')
var EventEmitter = require('events').EventEmitter
var LevelHooks = require('level-hooks')

//TODO conver semvers so that they are lexiographically sortable.

module.exports = function (db, opts) {

  LevelHooks()(db)

  var range = opts.range || {start: opts.start || '', end: opts.end || '~'} 

  var map    = opts.map
  var merge  = opts.merge
  var prefix = opts.prefix || ''

  if(!map) throw new Error('must provide map function')
  if(!merge) throw new Error('must provide merge function')

  var emitter = new EventEmitter()

  var mapped = {}, batchMode = false
  db.mapMerge = emitter

  emitter.start = function () {
    if(batchMode) return
    batchMode = true
    emitter.emit('batch:start')

    db.readStream({
      start: range.start,
      end: range.end
    })
    .pipe(through(function (data) { 
      doMap(data.key, data.value)
    }))
    .on('end', function () {
      from(Object.keys(mapped).sort())
        .pipe(through(function (key) {
          this.queue({key: prefix+key, value: JSON.stringify(mapped[key])})
        }))
        .on('end', function () {
          batchMode = false
          mapped = {}
          //TODO: keep count of the keys, so an subsequent batches
          //can make a progress bar?

          emitter.emit('batch:done')
        })
        .pipe(ws = db.writeStream())
    })
  }

  function get(key, cb) {
    if(mapped[key]) cb(null, mapped[key])

    db.get(key, function (err, value) {
      //maybe return the mapped[key] incase it has been written async since
      //we called get.
      if(mapped[key])
        mapped[key] = merge(mapped[key], value, key)
      cb(err, mapped[key] || value)
    })
  }

  function doMap(key, value) {
    map(key, value, function (key, value) {
      if(!mapped[key]) mapped[key] = value
      else             mapped[key] = merge(mapped[key], value, key)

      emitter.emit('merge', key, mapped[key])
    })
  }

  db.hooks.post(function (e) {

    //deletes have to wait until batch mode
    if(!e.value) return

    var key = e.key.toString()

    //check if in range
    if(opts.start > key || opts.end < key) return

    //if it was inserted during batch mode, merge into the batch.
    //there might be a small racecondition here when if batch
    //has started writing, but hasn't finished yet.

    //however, those cases will all get fixed the next time the batch runs.
 
    if(batchMode)
      doMap(key, e.value)
    else
      get(key, function (err, value) {
        doMap(key, value)
      })
  })

}
