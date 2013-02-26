
//run the example from level-couch-sync to get this db

var db = require('levelup')(process.env.HOME + '/.level-npm')
var mapMerge = require('./')
var Buffer = require('buffer').Buffer

function parse(v) {
  if('object' !== typeof v || Buffer.isBuffer(v))
    return JSON.parse(v.toString())
  return v
}

mapMerge(db, {
  start: '\xFFnpm~package~',
  end  : '\xFFnpm~package~~',
  prefix: '\xFFnpm~index~',
  map: function (key, val, emit) {
    val = parse(val)

    function split (ary) {
      if(!ary) return
      if('string' == typeof ary)
        ary = ary.split(/[\W\d]+/).filter(function (e) {
          return !!e
        })
      if(!ary.forEach) return
      ary.forEach(function (w) {
        w = w.toUpperCase()
        var o = {}
        o[val.name] = 1
        emit(w, o)
      })         
    }

    split(val.name)
    split(val.keywords)
    split(val.description)
    split(val.readme)

  },
  merge: function (M, m, key) {
    M = parse(M);
    m = parse(m);

    for(var k in m) {
      if(!M[k]) M[k] = m[k]
      else      M[k] += m[k]
    }

    if(Math.random() < 0.0001)
      console.log(key)

    return M
  }

})

db.mapMerge.start()

