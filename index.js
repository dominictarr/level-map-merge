var fs           = require('fs')
var through      = require('through')
var from         = require('from')
var EventEmitter = require('events').EventEmitter

//TODO conver semvers so that they are lexiographically sortable.

module.exports = function (db, mapDb, map, merge) {

  if('string' === typeof mapDb)
    mapDb = db.sublevel(mapDb)

  if(!map) throw new Error('must provide map function')
  if(!merge) throw new Error('must provide merge function')

  var mapped = {}, batchMode = false

  function parse(e) {
  //  if(!opts.json) return e
    if(Buffer.isBuffer(e) || 'string' === typeof e)
      return JSON.parse(e)
  }

  function stringify(e) {
//    if(!opts.json) return e
    return JSON.stringify(e)
  }

  mapDb.start = function () {
    if(batchMode) return
    batchMode = true
    mapDb.emit('start')

    db.createReadStream({
     // end: '~'
    })
    .pipe(through(function (data) { 
      doMap(data.key, parse(data.value))
    }))
    .on('end', function () {
      //TODO: when saving, merge with a stream of current keys,
      //so you can delete keys that where not in the batch!
      //Alternatively, 
      from(Object.keys(mapped).sort())
        .pipe(through(function (key) {
          this.queue({key: key, value: stringify(mapped[key])})
        }))
        .on('end', function () {
          batchMode = false
          mapped = {}
          //TODO: keep count of the keys, so an subsequent batches
          //can make a progress bar?

          mapDb.emit('done')
        })
        .pipe(ws = mapDb.createWriteStream())
    })
    return mapDb
  }

  function get(key, cb) {
    if(mapped[key]) cb(null, mapped[key])

    db.get(key, function (err, value) {
      //maybe return the mapped[key] incase it has been written async since
      //we called get.
      if(mapped[key])
        mapped[key] = merge(mapped[key], parse(value), key)
      cb(err, mapped[key] || value)
    })
  }

  function doMap(key, value) {
    map(key, value, function (key, value) {
      if(!mapped[key]) mapped[key] = value
      else             mapped[key] = merge(mapped[key], value, key)

      //TODO: save merges when not in batchMode
      mapDb.emit('merge', key, mapped[key])      
    })
  }

  db.post(function (e) {

    //deletes have to wait until batch mode
    if(!e.value) return

    //check if in range
    var key = e.key.toString()
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
        //TODO: save real-time updates to database.
        //maybe thing here is to gather realtime updates
        //until after batch has finished, and then process them.
        //that would be reliable, I think.
      })
  })
  return mapDb
}
