'use strict';

module.exports = {
    readFile: readFile,
    generate: generate
};

var fs = require("fs"),
    path = require("path"),
    utils = require("esprima-ast-utils"),
    doctrine = require("doctrine"),
    methods = {},
    intros = {};

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

function getDoctrineName(doctrine) {
    var i = 0,
        max = doctrine.tags.length,
        list = [];
    for (i = 0; i < max; ++i) {
        if (doctrine.tags[i].title === 'name') {
            return doctrine.tags[i].name;
        }
    }

    return null;
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

function getDoctrineReturn(doctrine) {
    var i = 0,
        max = doctrine.tags.length;
    for (i = 0; i < max; ++i) {
        if (doctrine.tags[i].title === 'return') {
            return doctrine.tags[i];
        }
    }

    return null;
}

function getReturned(doctrine) {
    var rtn = getDoctrineReturn(doctrine);

    return rtn ? (" -> " + doctrineExpressionToText(rtn.type)) : "";
}

function readFile(file, options) {
    options = options || {};
    options.intro = options.intro || false;
    options.level = options.level || 0;

    methods[file] = {};
    intros[file] = null;

    //var tree = utils.parseFile(path.join("lib", file));
    var tree = utils.parseFile(file);

    var md_code_block = false; // trim or not?
    utils.traverse(tree, function(node) {
        if (node.type === "Block") {
            if (options.intro && node.range[0] === 0) {
                intros[file] = node.value.split("\n").map(function(line) {
                    var cut = line.indexOf("*");
                    var block = line.indexOf("```");
                    if (cut !== -1) {
                        line = line.substring(cut + 1);
                    }
                    if (!md_code_block) {
                      line = line.trim();
                    }

                    if (block !== -1) {
                      line = line.trim();
                      md_code_block = !md_code_block;
                    }

                    return line;
                }).join("\n");
                return;
            }

            var fn  = getNearestFunction(node);
            if (fn) {
                methods[file][fn.id.name] = {
                    doctrine: doctrine.parse(node.value, {
                        unwrap: true,
                        lineNumbers: true,
                        sloppy: true
                    }),
                    arguments: utils.getArgumentList(fn) || []
                };
            }
        }

    });
}

function isOptional(expr) {
    return expr.type === 'OptionalType';
}

function doctrineExpressionToText(expr) {
    switch(expr.type) {
    case 'NullLiteral':
        return "NULL";
    case 'NameExpression':
        return expr.name;
    case 'OptionalType':
        return expr.expression.name;
    case 'UnionType':
        return expr.elements.map(function(t) {
            return doctrineExpressionToText(t);
        }).join("|");
    default:
    console.log(expr);
    throw new Error("do it!");
    }
}

function generate(ignore_pattern) {
    var docs = [];

    Object.keys(methods).forEach(function(file) {
        if (intros[file]) {
            docs.push(intros[file]);
        } else {
            docs.push('#### ' + path.basename(file).split(".")[0]);
        }
        docs.push('');
        docs.push('');

        Object.keys(methods[file]).forEach(function(fun_name) {
            if (fun_name.match(ignore_pattern)) {
                return;
            }

            var doctrine = methods[file][fun_name].doctrine,
                args = "";

            methods[file][fun_name].arguments.forEach(function(name) {
                var p = getDoctrineParam(doctrine, name);
                if (p && p.type) {
                    var txt = doctrineExpressionToText(p.type) + ":" + name;

                    if (isOptional(p.type)) {

                        args += (args.length === 0 ? "[ " : " [, ") + txt + "]";
                        return;
                    }


                    args += (args.length === 0 ? "" : ", ") + txt;
                    return;
                }
                console.error("(wrn) " + file + ":" + fun_name + " argument not documented: " + name);
                args += (args.length === 0 ? "" : ", ") + name;
            });

            docs.push('##### `' + (getDoctrineName(doctrine) || fun_name) + "` (" + args + ")" + getReturned(doctrine));

            docs.push('');

            if (doctrine.description) {
                docs.push(doctrine.description.trim());
            }
            docs.push('');

            var params = getDoctrineParams(doctrine);

            if (params) {
                docs.push('*Parameters:*');
                docs.push('');
                params.forEach(function(param) {
                    if (param.description) {
                        docs.push("* `" + param.name + "`: " + param.description);
                    } else {
                        docs.push("* `" + param.name + "`");
                    }
                    docs.push('');
                });
                docs.push('');
            }

            var rtn = getDoctrineReturn(doctrine);
            if (rtn) {
                docs.push('*Returns:*');
                docs.push('');
                docs.push("* `" + doctrineExpressionToText(rtn.type) + "`" + (rtn.description ? (": " + rtn.description) : ""));
                docs.push('');

            }


            var notes = getDoctrineNotes(doctrine);
            if (notes) {
                notes.forEach(function(note) {
                    docs.push("*Note*: " + note.description);
                    docs.push('');
                });
            }

            var example = getDoctrineExample(doctrine);
            if (example) {
                docs.push('*Example*:');
                docs.push('```js');
                docs.push(example.description);
                docs.push('```');
                docs.push('');
            }

            docs.push('');
            docs.push('<br /><br />');
            docs.push('');

        });

    });

    return docs.join("\n");
}
