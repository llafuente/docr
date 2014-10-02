# docr

Small javascript to markdown documentation tool


## usage

```bash
npm install -g docr

docr file|pattern [ file|pattern]
```

Documentation will be printed to stdout.

# examples

```bash
# multiple files
docr index.js lib/xxx.js

# globbing support
docr lib/*
```

# File compatibility

docr is very simple. Do not support prototype or even objects. It's made some modules i have that has recursive require(s).


As you may know, when you have recursive require the easiest way to solve it is to write you module like this.

```js
module.exports = {
    power: power
}
/**
 * Give me some power!
 *
 * @param {Number} a
 * @param {Number} b
 * @return {Number}
 */
function power(a, b) {
    return Math.power(a, b);
}
```

Generate documentation for any function that has a `doc-block`. To be coherent function name must be the same as exports.
