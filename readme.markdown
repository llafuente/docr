# docr

Small javascript to markdown documentation tool


## usage

```bash
npm install -g docr

docr file|pattern [ file|pattern] [--append file] [--intro]
  pattern    Linux will expand wildcards so remember to escape
             them "\*"
  append     can be repeated
  intro      if the file has an intro (comment at the very
             beginning of the file) it will be used
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

`docr` is very simple. Do not support prototype or even objects. It's made some modules i have that has recursive require(s).


As you may know, when you have recursive require the easiest way to solve it is to write you module like this.

```js
module.exports = {
    power: power
}

function _private_function() {
    // this function won't be documented because starts with "_"
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

`docr` will generate documentation for any function that has a *doc-block*. To be coherent function name must be the same as exports.

# examples

* [esprima-ast-utils](https://github.com/llafuente/esprima-ast-utils)