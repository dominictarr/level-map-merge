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

## JSON

one of the performance improvements possible in `map-merge` is to run a batch
and keep the merged data structure in memory, instead of stringifing and parsing.
Building an inverted index of all the READMEs in npm takes over 20 minutes parsing JSON,
but only 40 seconds keeping it as objects!

## Example

Inverted Index (word -> list of documents it appears in)

See also `./example.js`

``` js
var LevelMapMerge = require('level-map-merge')
var LevelUp       = require('levelup')

var db = LevelUp()
LevelMapMerge(db, {
  map: function (key, val, emit) {
    //the raw data can be anything, so you have to parse it.
    val = JSON.parse(val)
    val.split(/\W+/).forEach(function (e) {
      //but the mapped structure is expected to be js.
      emit(e, [key])
    })
  },
  //merge 'little' into 'big'
  merge: function (big, little, key) {
    //you don't need to use parse here!
    little.forEach(function (e) {
      if(-1 == big.indexOf(e))
        big.push(e)
    })
    //don't use stringify here either!
    return big
  }
}
```

## Limitations

currently, the entire batch view needs to fit into memory.
(will be a problem with millions of records, but not for thousands)

## Licence 

MIT

