
//run the example from level-couch-sync to get this db

var db = 
  require('level-sublevel')
    (require('levelup')
      (process.env.HOME + '/.level-npm'))

var mapMerge = require('./')
var Buffer = require('buffer').Buffer

function parse(v) {
  if('object' !== typeof v || Buffer.isBuffer(v))
    return JSON.parse(v.toString())
  return v
}

var package = db.sublevel('package')
var index   = db.sublevel('index')

mapMerge(package, index,
  function (key, val, emit) {
    val = JSON.parse(val)
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
        o[val.name] = '1'
        emit(w, o)
      })         
    }

    split(val.name)
    split(val.keywords)
    split(val.description)
    split(val.readme)

  },
  function (M, m, key) {
    //M = parse(M);
    //m = parse(m);

    for(var k in m) {
      if(!M[k]) M[k] = m[k]
      else      M[k] += m[k]
    }
    if(Math.random() < 0.0001)
      console.log(key)

    return M
  }).start()

