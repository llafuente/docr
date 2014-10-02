'use strict';

module.exports = {
    readFile: readFile,
    generate: generate
};

var fs = require("fs"),
    path = require("path"),
    utils = require("esprima-ast-utils"),
    doctrine = require("doctrine"),
    methods = {};

function getNearestFunction(node) {
    // search nearest function
    var fn = null,
        min_diff = Infinity;

    node.$parent.body.every(function (subnode) {
        if (subnode.type === "FunctionDeclaration") {
            var diff = subnode.range[0] - node.range[1];

            if (diff > 0 && diff < min_diff) {
                min_diff = diff;
                fn = subnode;
            }
        }

        return true;
    });

    return fn;
}

function getDoctrineNotes(doctrine) {
    var i = 0,
        max = doctrine.tags.length,
        list = [];
    for (i = 0; i < max; ++i) {
        if (doctrine.tags[i].title === 'note') {
            list.push(doctrine.tags[i]);
        }
    }

    return list.length ? list : null;
}

function getDoctrineParams(doctrine) {
    var i = 0,
        max = doctrine.tags.length,
        list = [];
    for (i = 0; i < max; ++i) {
        if (doctrine.tags[i].title === 'param') {
            list.push(doctrine.tags[i]);
        }
    }

    return list.length ? list : null;
}


function getDoctrineExample(doctrine) {
    var i = 0,
        max = doctrine.tags.length;
    for (i = 0; i < max; ++i) {
        if (doctrine.tags[i].title === 'example') {
            return doctrine.tags[i];
        }
    }

    return null;
}

function getDoctrineParam(doctrine, param_name) {
    var i = 0,
        max = doctrine.tags.length;
    for (i = 0; i < max; ++i) {
        if (doctrine.tags[i].name === param_name && doctrine.tags[i].title === 'param') {
            return doctrine.tags[i];
        }
    }

    return null;
}

function readFile(file) {
    methods[file] = {};

    //var tree = utils.parseFile(path.join("lib", file));
    var tree = utils.parseFile(file);

    utils.traverse(tree, function(node) {
        if (node.type === "Block") {
            var fn  = getNearestFunction(node);
            if (fn) {
                methods[file][fn.id.name] = {
                    doctrine: doctrine.parse(node.value, {
                        unwrap: true,
                        lineNumbers: true,
                        sloppy: true
                    }),
                    arguments: utils.getArgumentList(fn)
                };
            }
        }

    });
}

function doctrineExpressionToText(expr) {
    switch(expr.type) {
    case 'NullLiteral':
        return "NULL";
    case 'NameExpression':
        return expr.name;
    case 'OptionalType':
        return '[' + expr.expression.name + ']';
    case 'UnionType':
        return expr.elements.map(function(t) {
            return doctrineExpressionToText(t);
        }).join("|");
    default:
    console.log(expr);
    throw new Error("do it!");
    }
}

function generate() {
    var docs = [];

    Object.keys(methods).forEach(function(file) {
        docs.push('### ' + path.basename(file).split(".")[0]);
        docs.push('');
        docs.push('');

        Object.keys(methods[file]).forEach(function(fun_name) {
            var doctrine = methods[file][fun_name].doctrine,
                args = methods[file][fun_name].arguments.map(function(name) {
                    var p = getDoctrineParam(doctrine, name);
                    if (p && p.type) {
                        return doctrineExpressionToText(p.type) + ":" + name;
                    }
                    console.error("(wrn) " + file + ":" + fun_name + " argument not documented: " + name);
                    return name;
                });

            docs.push('#### `' + fun_name + "` (" + args.join(", ") + ")");

            docs.push('');

            if (doctrine.description) {
                docs.push(doctrine.description.trim().split("\n").join("\n\n"));
            }

            var params = getDoctrineParams(doctrine);

            if (params) {
                params.forEach(function(param) {
                    if (param.description) {
                        docs.push('');
                        docs.push("* `" + param.name + "`: " + param.description);
                    }
                });
            }

            var notes = getDoctrineNotes(doctrine);
            if (notes) {
                notes.forEach(function(note) {
                    docs.push('');
                    docs.push("**Note**: " + note.description);
                });
            }

            var example = getDoctrineExample(doctrine);
            if (example) {
                docs.push('');
                docs.push('Example:');
                docs.push('```js');
                docs.push(example.description);
                docs.push('```');
            }

            docs.push('');
            docs.push('');
            docs.push('');

        });

    });

    return docs.join("\n");
}


