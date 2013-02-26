# level-map-merge

Like a simple realtime map-reduce, but simpler.

`map-merge` has two parts, a batch part, and a real-time part.
the batch is run (say) every few hours,
and the real-time part is run the rest of the time.
The realtime map-merge can add things,
but only the batch part can delete things.

`map-merge` is suitable for situations where it's okay
to have slightly old or incorrect data, like an inverted index!

The included `./example.js` builds a full text index for the
npm registry is about ~1.5 minutes. 

## Example

Inverted Index (word -> list of documents it appears in)

See also `./example.js`

``` js
var LevelMapMerge = require('level-map-merge')
var LevelUp       = require('levelup')

var db = LevelUp()
LevelMapMerge(db, {
  json:true, 
  map: function (key, val, emit) {
    val.split(/\W+/).forEach(function (e) {
      emit(e, [key])
    })
  },
  merge: function (big, little, key) {
    little.forEach(function (e) {
      if(-1 == big.indexOf(e))
        big.push(e)
    })
    return big
  }
}
```

## Licence 

MIT

