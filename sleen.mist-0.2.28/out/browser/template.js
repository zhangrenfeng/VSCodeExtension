(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./parser", "./type", "./functions"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const parser_1 = require("./parser");
    const type_1 = require("./type");
    const functions_1 = require("./functions");
    function isObject(obj) {
        return obj && typeof (obj) === 'object' && obj.constructor === Object;
    }
    function getTypeFromString(name) {
        const arrowTypeRE = /^\((.*)\)\s*=>\s*(\w+)$/;
        let match = arrowTypeRE.exec(name);
        if (match) {
            let params = match[1].split(',').map(s => {
                let components = s.trim().split(':');
                return new type_1.Parameter(components[0].trim(), type_1.Type.getType(components[1].trim()));
            });
            return new type_1.ArrowType(type_1.Type.getType(match[2]), params);
        }
        return type_1.Type.getType(name);
    }
    function registerTypes() {
        const aliases = {
            "NSString": "string",
            "NSNumber": "number",
            "CGFloat": "number",
            "float": "number",
            "double": "number",
            "int": "number",
            "uint": "number",
            "NSInteger": "number",
            "NSUInteger": "number",
            "BOOL": "boolean",
            "bool": "boolean",
            "id": "any",
            "NSArray": "array",
            "NSDictionary": "object"
        };
        let typeName = name => aliases[name.replace('*', '')] || name;
        let getType = name => name ? getTypeFromString(typeName(name)) || type_1.Type.registerType(new type_1.Type(typeName(name))) : type_1.Type.Void;
        Object.keys(functions_1.functions).forEach(name => {
            let funs = functions_1.functions[name];
            let typeN = typeName(name);
            let type = getTypeFromString(typeN);
            if (!type) {
                type = type_1.Type.registerType(new type_1.Type(typeN));
            }
            Object.keys(funs).forEach(fun => {
                funs[fun].forEach(info => {
                    let doc = info.comment;
                    if (info.deprecated) {
                        doc = `[Deprecated] ${info.deprecated}\n${doc || ''}`.trim();
                    }
                    type.registerMethod(fun, new type_1.Method(getType(info.return), doc, (info.params || []).map(p => new type_1.Parameter(p.name, getType(p.type) || type_1.Type.Any)), info.js));
                });
            });
        });
        const properties = {
            "VZMistItem": {
                "tplController": {
                    "type": "VZMistTemplateController",
                    "comment": "模版关联的 template controller"
                }
            },
            "CGPoint": {
                "x": {
                    "type": "CGFloat"
                },
                "y": {
                    "type": "CGFloat"
                }
            },
            "CGSize": {
                "width": {
                    "type": "CGFloat"
                },
                "height": {
                    "type": "CGFloat"
                }
            },
            "CGRect": {
                "origin": {
                    "type": "CGPoint"
                },
                "size": {
                    "type": "CGSize"
                },
                "x": {
                    "type": "CGFloat"
                },
                "y": {
                    "type": "CGFloat"
                },
                "width": {
                    "type": "CGFloat"
                },
                "height": {
                    "type": "CGFloat"
                }
            },
            "UIEdgeInsets": {
                "top": {
                    "type": "CGFloat"
                },
                "left": {
                    "type": "CGFloat"
                },
                "bottom": {
                    "type": "CGFloat"
                },
                "right": {
                    "type": "CGFloat"
                }
            },
            "NSRange": {
                "location": {
                    "type": "NSUInteger"
                },
                "length": {
                    "type": "NSUInteger"
                }
            },
            "CGVector": {
                "dx": {
                    "type": "CGFloat"
                },
                "dy": {
                    "type": "CGFloat"
                }
            },
            "UIOffset": {
                "horizontal": {
                    "type": "CGFloat"
                },
                "vertical": {
                    "type": "CGFloat"
                }
            },
        };
        Object.keys(properties).forEach(name => {
            let props = properties[name];
            name = typeName(name);
            let type = type_1.Type.getType(name);
            if (!type) {
                console.error(`type '${name}' not found`);
                return;
            }
            Object.keys(props).forEach(prop => {
                let info = props[prop];
                let propType;
                let comment;
                if (typeof (info.type) === 'string') {
                    propType = getType(info.type);
                    comment = info.comment;
                }
                else if (typeof (info) === 'object') {
                    propType = type_1.Type.typeof(info);
                }
                type.registerProperty(prop, new type_1.Property(propType, comment));
            });
        });
    }
    registerTypes();
    class StringConcatExpressionNode extends parser_1.ExpressionNode {
        constructor(expressions) {
            super();
            this.expressions = expressions;
        }
        compute(context) {
            let computed = this.expressions.map(e => e.compute(context));
            if (computed.some(v => v === parser_1.None))
                return parser_1.None;
            return computed.join('');
        }
        computeValue(context) {
            let computed = this.expressions.map(e => e.computeValue(context)).filter(s => s !== null && s !== undefined);
            return computed.join('');
        }
        getType(context) {
            return type_1.Type.String;
        }
        check(context) {
            return this.expressions.reduce((p, c) => p.concat(c.check(context)), []);
        }
    }
    exports.StringConcatExpressionNode = StringConcatExpressionNode;
    class Cache {
        constructor(maxCount) {
            this.maxCount = maxCount;
            this.dict = {};
            this.keys = [];
        }
        get(key) {
            if (key in this.dict) {
                let index = this.keys.indexOf(key);
                this.keys.splice(index, 1);
                this.keys.push(key);
                return this.dict[key];
            }
            return null;
        }
        set(key, value) {
            if (!(key in this.dict)) {
                this.keys.push(key);
                if (this.keys.length > this.maxCount) {
                    this.keys.splice(0, 1);
                }
            }
            this.dict[key] = value;
        }
    }
    let expCache = new Cache(200);
    function parse(exp) {
        let parsed = expCache.get(exp);
        if (!parsed) {
            parsed = parser_1.Parser.parse(exp);
            expCache.set(exp, parsed);
        }
        return parsed;
    }
    exports.parse = parse;
    class ErrorNode extends parser_1.ExpressionNode {
        compute(context) {
            return parser_1.None;
        }
        computeValue(context) {
            return null;
        }
        getType(context) {
            return type_1.Type.Any;
        }
        check(context) {
            return [];
        }
    }
    function parseExpressionInString(source) {
        if (source.startsWith("$:")) {
            let { expression: node, errorMessage: error } = parse(source.substring(2));
            if (error || !node) {
                return new ErrorNode();
            }
            return node;
        }
        const re = /\$\{(.*?)\}/mg;
        re.lastIndex = 0;
        let match;
        let index = 0;
        let parts = [];
        while (match = re.exec(source)) {
            let exp = match[1];
            let { expression: node, errorMessage: error } = parse(exp);
            if (error || !node) {
                node = new ErrorNode();
            }
            if (match.index === 0 && re.lastIndex === source.length) {
                return node;
            }
            else {
                if (match.index > index) {
                    parts.push(new parser_1.LiteralNode(source.slice(index, match.index)));
                }
                parts.push(node);
                index = re.lastIndex;
            }
        }
        if (parts.length === 0) {
            return null;
        }
        if (index < source.length) {
            parts.push(new parser_1.LiteralNode(source.slice(index)));
        }
        return new StringConcatExpressionNode(parts);
    }
    function parseExpressionInObject(obj) {
        if (typeof (obj) === 'string') {
            let exp = parseExpressionInString(obj);
            if (exp) {
                return exp;
            }
            return obj;
        }
        else if (obj instanceof Array) {
            return obj.map(o => parseExpressionInObject(o));
        }
        else if (obj && obj !== parser_1.None && typeof (obj) === 'object') {
            return Object.keys(obj).reduce((p, c) => { p[c] = parseExpressionInObject(obj[c]); return p; }, {});
        }
        return obj;
    }
    exports.parseExpressionInObject = parseExpressionInObject;
    function bindData(template, data, builtin) {
        if (!template)
            return { layout: {} };
        let parsedTemplate = parseExpressionInObject(template);
        let valueContext = new parser_1.ExpressionContext();
        let compute = obj => {
            if (obj instanceof parser_1.ExpressionNode) {
                let value = obj.computeValue(valueContext);
                if (value === parser_1.None || value === undefined)
                    value = null;
                return value;
            }
            else if (obj instanceof Array) {
                return obj.map(o => compute(o));
            }
            else if (obj && obj !== parser_1.None && typeof (obj) === 'object') {
                let values = Object.keys(obj).map(k => compute(obj[k]));
                return Object.keys(obj).reduce((p, c, i) => { if (values[i] !== null)
                    p[c] = values[i]; return p; }, {});
            }
            return obj;
        };
        function extract(obj, defaultValue = null, blacklist = null) {
            if (blacklist) {
                obj = Object.assign({}, obj);
                blacklist.forEach(k => delete obj[k]);
            }
            let value = compute(obj);
            if (value === null || value === undefined) {
                value = defaultValue;
            }
            return value;
        }
        let styles = extract(parsedTemplate.styles, {}, []);
        valueContext.pushDict(builtin);
        valueContext.pushDict(data);
        valueContext.push('_data_', data);
        if ('data' in parsedTemplate) {
            let tplData = parsedTemplate.data;
            if (tplData && tplData instanceof (Object)) {
                let computed = extract(tplData);
                valueContext.pushDict(computed);
                data = Object.assign({}, data, computed);
                valueContext.push('_data_', data);
            }
        }
        if ('state' in parsedTemplate) {
            let state = parsedTemplate.state;
            if (state && state instanceof (Object)) {
                let computed = extract(state);
                valueContext.push('state', computed);
            }
        }
        let rootNode = parsedTemplate.layout;
        let computeNode = (node, index) => {
            if (!node)
                return null;
            node['node-index'] = index;
            let vars = node.vars;
            if (isObject(vars)) {
                vars = [vars];
            }
            let pushed = [];
            let popAll = () => pushed.forEach(k => valueContext.pop(k));
            if (vars instanceof Array) {
                vars.forEach(vs => {
                    valueContext.pushDict(extract(vs));
                    pushed.push(...Object.keys(vs));
                });
            }
            if (extract(node.gone)) {
                popAll();
                return null;
            }
            let classes = extract(node.class, '').split(' ').filter(s => s.length > 0);
            if (classes.length > 0) {
                let style = classes.map(c => styles[c]).filter(c => c).reduce((p, c) => { return Object.assign({}, p, c); }, {});
                node.style = Object.assign({}, style, node.style);
            }
            let children = node.children;
            node = extract(node, null, ['vars', 'gone', 'class', 'repeat', 'children']);
            if (children instanceof Array) {
                let list = [];
                children.forEach((c, nodeIndex) => {
                    if (c instanceof parser_1.ExpressionNode) {
                        c = extract(c);
                    }
                    if (typeof (c) === 'object') {
                        if (c.repeat) {
                            let repeat = extract(c.repeat);
                            let count = 1;
                            let items;
                            if (typeof (repeat) === 'number') {
                                count = repeat;
                            }
                            else if (repeat instanceof Array) {
                                count = repeat.length;
                                items = repeat;
                            }
                            for (var i = 0; i < count; i++) {
                                valueContext.push('_index_', i);
                                valueContext.push('_item_', items ? items[i] : null);
                                list.push(computeNode(Object.assign({}, c), (index ? index + ',' : '') + nodeIndex));
                                valueContext.pop('_index_');
                                valueContext.pop('_item_');
                            }
                        }
                        else {
                            list.push(computeNode(c, (index ? index + ',' : '') + nodeIndex));
                        }
                    }
                });
                node.children = list.filter(c => c);
            }
            popAll();
            return node;
        };
        let node = computeNode(rootNode, "");
        return { layout: node };
    }
    exports.bindData = bindData;
});
//# sourceMappingURL=template.js.map