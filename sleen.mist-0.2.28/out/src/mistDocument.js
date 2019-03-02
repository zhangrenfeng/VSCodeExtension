"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const vscode = require("vscode");
const json = require("jsonc-parser");
const path = require("path");
const fs = require("fs");
const json_1 = require("./utils/json");
const imageHelper_1 = require("./imageHelper");
const lexer_1 = require("./browser/lexer");
const type_1 = require("./browser/type");
const parser_1 = require("./browser/parser");
const snippets_1 = require("./snippets");
const template_1 = require("./browser/template");
const schema_1 = require("./schema");
const template_schema_1 = require("./template_schema");
var ExpType;
(function (ExpType) {
    ExpType[ExpType["Void"] = 0] = "Void";
    ExpType[ExpType["Object"] = 1] = "Object";
    ExpType[ExpType["Array"] = 2] = "Array";
    ExpType[ExpType["Number"] = 3] = "Number";
    ExpType[ExpType["String"] = 4] = "String";
    ExpType[ExpType["Boolean"] = 5] = "Boolean";
    ExpType[ExpType["Function"] = 6] = "Function";
    ExpType[ExpType["Lambda"] = 7] = "Lambda";
    ExpType[ExpType["Other"] = 8] = "Other";
})(ExpType || (ExpType = {}));
function nameOfType(type) {
    switch (type) {
        case ExpType.Void: return "void";
        case ExpType.Object: return "object";
        case ExpType.Array: return "array";
        case ExpType.Number: return "number";
        case ExpType.String: return "string";
        case ExpType.Boolean: return "bool";
        case ExpType.Function: return "function";
        case ExpType.Lambda: return "lambda";
        default: return "<unknown>";
    }
}
let MIST_EXP_RE = /\$\{.*?\}/mg;
// let MIST_EXP_PREFIX_RE = /([_a-zA-Z0-9.]+)\.([_a-zA-Z][_a-zA-Z0-9]*)?$/;
class Variable {
    static unique(vars) {
        let reversed = [...vars].reverse();
        return vars.filter((v, i) => reversed.findIndex(n => n.name === v.name) === vars.length - i - 1);
    }
    constructor(name, value, description, incomplete = false) {
        this.name = name;
        let a = [[100, 18], [50, 20], [80, 14], [130, 23], [70, 17], [60, 26], [80, 19], [50, 21], [80, 23], [70, 18], [80, 20]];
        if (value instanceof type_1.IType) {
            this.type = value;
            this.value = parser_1.None;
        }
        else {
            this.value = value;
        }
        this.description = description;
        this.incomplete = incomplete;
    }
    setNode(node, uri = null) {
        this.node = node;
        this.uri = uri ? vscode.Uri.file(uri) : null;
        return this;
    }
}
function findLastIndex(list, predicate) {
    for (var i = list.length - 1; i >= 0; i--) {
        if (predicate(list[i])) {
            return i;
        }
    }
    return -1;
}
let BUILTIN_VARS = [
    new Variable("_width_", type_1.Type.Number, "屏幕宽度"),
    new Variable("_height_", type_1.Type.Number, "屏幕高度"),
    new Variable("_mistitem_", type_1.Type.Any, "模版对应的 item 对象"),
    new Variable("system", type_1.Type.registerType(new type_1.Type('system')).registerPropertys({
        "name": new type_1.Property(type_1.Type.String, "系统名称"),
        "version": new type_1.Property(type_1.Type.String, "系统版本"),
        "deviceName": new type_1.Property(type_1.Type.String, "设备名称")
    }), "系统信息"),
    new Variable("screen", type_1.Type.registerType(new type_1.Type('screen')).registerPropertys({
        "width": new type_1.Property(type_1.Type.Number, "屏幕宽度"),
        "height": new type_1.Property(type_1.Type.Number, "屏幕高度"),
        "scale": new type_1.Property(type_1.Type.Number, "屏幕像素密度"),
        "statusBarHeight": new type_1.Property(type_1.Type.Number, "状态栏高度"),
        "isPlus": new type_1.Property(type_1.Type.Boolean, "是否是大屏（iPhone 6/6s/7/8 Plus）"),
        "isSmall": new type_1.Property(type_1.Type.Boolean, "是否是小屏（iPhone 4/4s/5/5s/SE）"),
        "isX": new type_1.Property(type_1.Type.Boolean, "是否是 iPhone X"),
        "safeArea": new type_1.Property(type_1.Type.getType('UIEdgeInsets'), "安全区域"),
    }), "屏幕属性"),
    new Variable("app", type_1.Type.registerType(new type_1.Type('screen')).registerPropertys({
        "isAlipay": new type_1.Property(type_1.Type.Boolean, "是否是支付宝客户端"),
        "isKoubei": new type_1.Property(type_1.Type.Boolean, "是否是口碑客户端"),
    }), "应用属性"),
];
class JsonStringError {
    constructor(description, offset, length) {
        this.description = description;
        this.offset = offset;
        this.length = length;
    }
}
exports.JsonStringError = JsonStringError;
class JsonString {
    constructor(source) {
        this.source = source;
        this.errors = [];
        this.parse();
    }
    sourceIndex(parsedIndex) {
        if (this.escapes.length === 0)
            return parsedIndex;
        let i = this.escapes.findIndex(e => e.parsedIndex >= parsedIndex);
        if (i >= 0)
            return this.escapes[i].sourceIndex - this.escapes[i].parsedIndex + parsedIndex;
        let last = this.escapes[this.escapes.length - 1];
        return parsedIndex - last.parsedIndex - 1 + last.sourceEnd;
    }
    parsedIndex(sourceIndex) {
        if (this.escapes.length === 0)
            return sourceIndex;
        let i = this.escapes.findIndex(e => e.sourceIndex >= sourceIndex);
        if (i >= 0)
            return this.escapes[i].parsedIndex - this.escapes[i].sourceIndex + sourceIndex;
        let last = this.escapes[this.escapes.length - 1];
        if (sourceIndex < last.sourceEnd) {
            return last.parsedIndex;
        }
        return sourceIndex - last.sourceEnd + last.parsedIndex + 1;
    }
    parse() {
        let origin = this.source;
        let parsed = '';
        let start = 0;
        this.escapes = [];
        for (let i = 0; i < origin.length;) {
            let c = origin.charAt(i);
            if (c < ' ') {
                this.errors.push(new JsonStringError('Invalid characters in string. Control characters must be escaped.', i, 1));
                parsed += c;
                i++;
            }
            else if (c === '\\' && i < origin.length - 1) {
                if (i > start)
                    parsed += origin.substring(start, i);
                c = origin.charAt(i + 1);
                let sourceIndex = i;
                let parsedIndex = parsed.length;
                switch (c) {
                    case '"':
                        parsed += '"';
                        break;
                    case '\\':
                        parsed += '\\';
                        break;
                    case '/':
                        parsed += '/';
                        break;
                    case 'b':
                        parsed += '\b';
                        break;
                    case 'f':
                        parsed += '\f';
                        break;
                    case 'n':
                        parsed += '\n';
                        break;
                    case 'r':
                        parsed += '\r';
                        break;
                    case 't':
                        parsed += '\t';
                        break;
                    case 'u':
                        let match = origin.substr(i + 2, 4).match(/^[0-9A-Fa-f]*/);
                        let hex = match[0];
                        if (hex.length !== 4) {
                            this.errors.push(new JsonStringError('Invalid unicode sequence in string', i, 2 + hex.length));
                        }
                        else {
                            parsed += String.fromCharCode(parseInt(hex, 16));
                        }
                        i += hex.length;
                        break;
                    default:
                        this.errors.push(new JsonStringError('Invalid escape character in string', i, 2));
                        break;
                }
                i += 2;
                start = i;
                this.escapes.push({
                    sourceIndex: sourceIndex,
                    sourceEnd: i,
                    parsedIndex: parsedIndex
                });
            }
            else {
                i++;
            }
        }
        if (origin.length > start)
            parsed += origin.substring(start);
        this.parsed = parsed;
    }
}
exports.JsonString = JsonString;
class MistData {
    static openFile(file) {
        let dir = path.dirname(file);
        if (!(dir in this.dataMap)) {
            this.dataMap[dir] = {};
        }
        let text = fs.readFileSync(file).toString();
        if (text) {
            let jsonTree = json_1.parseJson(text);
            var results = [];
            let travelTree = (obj) => {
                if (obj.type === 'array') {
                    obj.children.forEach(travelTree);
                }
                else if (obj.type === 'object') {
                    let valueForKey = k => {
                        let node = obj.children.find(c => c.children[0].value === k);
                        return node ? node.children[1] : null;
                    };
                    let templateKeys = ["templateId", "template", "blockId"];
                    let dataNode, key;
                    if ((dataNode = valueForKey('data')) && (key = templateKeys.find(k => !!valueForKey(k)))) {
                        let data = new MistData();
                        let templateId = valueForKey(key).value;
                        templateId = templateId.replace(/^\w+@/, '');
                        data.template = templateId;
                        data.file = file;
                        data.start = obj.offset;
                        data.end = obj.offset + obj.length;
                        data.data = json_1.getNodeValue(dataNode);
                        data.node = dataNode;
                        results.push(data);
                    }
                    else {
                        obj.children.filter(c => c.children.length >= 2).map(c => c.children[1]).forEach(travelTree);
                    }
                }
            };
            travelTree(jsonTree);
            this.dataMap[dir][file] = results;
            Object.keys(MistDocument.documents).forEach(k => MistDocument.documents[k].clearDatas());
        }
    }
    static openDir(dir) {
        if (!(dir in this.dataMap)) {
            this.dataMap[dir] = {};
            let files = fs.readdirSync(dir);
            files.filter(f => f.endsWith(".json")).map(f => {
                let file = `${dir}/${f}`;
                this.openFile(file);
            });
        }
    }
    static getData(dir, template) {
        let dirDatas = this.dataMap[dir];
        let result = [];
        if (dirDatas) {
            for (let file in dirDatas) {
                let datas = dirDatas[file];
                let found = datas.filter(d => d.template === template);
                if (found && found.length > 0) {
                    if (found.length > 1) {
                        found.forEach((d, i) => d.index = i);
                    }
                    result = result.concat(found);
                }
            }
        }
        return result;
    }
    description() {
        return `${path.basename(this.file)} ${this.index > 0 ? `#${this.index + 1}` : ''}`.trim();
    }
}
MistData.dataMap = {};
exports.MistData = MistData;
class MistNode {
    constructor(node) {
        this.node = node;
        let children = json_1.getPropertyNode(node, 'children');
        if (children && children.type === 'array') {
            this.children = children.children.map(n => {
                let child = new MistNode(n);
                child.parent = this;
                return child;
            });
        }
    }
    property(key) {
        let p = json_1.getPropertyNode(this.node, key);
        return p ? json_1.getNodeValue(p) : null;
    }
    type() {
        var type = this.property('type');
        if (!type) {
            type = this.property('children') ? 'stack' : 'node';
        }
        else if (typeof (type) === 'string' && type.match(/^\${.+}$/)) {
            type = "exp";
        }
        return type;
    }
}
function getCurrentExpression(exp) {
    var index = exp.length - 1;
    var stop = false;
    var braceCount = {};
    const braceDict = { '{': '}', '(': ')', '[': ']' };
    while (index >= 0) {
        var c = exp[index];
        switch (c) {
            case ',':
            case '?':
            case ':':
            case '+':
            case '-':
            case '*':
            case '/':
            case '%':
            case '&':
            case '|':
            case '!':
            case '>':
            case '<':
            case '=':
                if (Object.keys(braceCount).every(k => braceCount[k] === 0)) {
                    stop = true;
                }
                break;
            case '(':
            case '{':
            case '[':
                c = braceDict[c];
                braceCount[c] = (braceCount[c] || 0) - 1;
                if (braceCount[c] < 0) {
                    stop = true;
                }
                break;
            case '\'':
            case '"':
                let quote = c;
                while (--index >= 0) {
                    c = exp[index];
                    if (c === quote) {
                        break;
                    }
                }
                break;
            case ']':
            case ')':
            case '}':
                braceCount[c] = (braceCount[c] || 0) + 1;
        }
        if (stop) {
            break;
        }
        index--;
    }
    return exp.substr(index + 1).trim();
}
exports.getCurrentExpression = getCurrentExpression;
function getPrefix(exp) {
    let match = /(.*)\.([_a-zA-Z]\w*)?$/.exec(exp);
    let prefix;
    let func;
    if (match) {
        return {
            prefix: match[1],
            function: match[2]
        };
    }
    else {
        return {
            prefix: null,
            function: exp
        };
    }
}
exports.getPrefix = getPrefix;
// (1, xx(2, 3), 3) => 3
function getFunctionParamsCount(exp) {
    var index = 1;
    var stop = false;
    var braceCount = {};
    var commaCount = 0;
    let braceDict = { '}': '{', ')': '(', ']': '[' };
    while (index < exp.length) {
        var c = exp[index];
        switch (c) {
            case ',':
                if (Object.keys(braceCount).every(k => braceCount[k] === 0)) {
                    commaCount++;
                }
                break;
            case '(':
            case '{':
            case '[':
                braceCount[c] = (braceCount[c] || 0) + 1;
                break;
            case '\'':
            case '"':
                let quote = c;
                while (++index < exp.length) {
                    c = exp[index];
                    if (c === quote) {
                        break;
                    }
                }
                break;
            case ']':
            case ')':
            case '}':
                c = braceDict[c];
                braceCount[c] = (braceCount[c] || 0) - 1;
                if (braceCount[c] < 0) {
                    stop = true;
                }
        }
        if (stop) {
            break;
        }
        index++;
    }
    let paramsCount = commaCount + 1;
    if (exp.substring(1, index).match(/^\s*$/)) {
        paramsCount = 0;
    }
    return paramsCount;
}
exports.getFunctionParamsCount = getFunctionParamsCount;
function getSignatureInfo(exp) {
    var index = exp.length - 1;
    var stop = false;
    var braceCount = {};
    var commaCount = 0;
    let braceDict = { '{': '}', '(': ')', '[': ']' };
    while (index >= 0) {
        var c = exp[index];
        switch (c) {
            case ',':
                if (Object.keys(braceCount).every(k => braceCount[k] === 0)) {
                    commaCount++;
                }
                break;
            case '(':
            case '{':
            case '[':
                c = braceDict[c];
                braceCount[c] = (braceCount[c] || 0) - 1;
                if (braceCount[c] < 0) {
                    stop = true;
                }
                break;
            case '\'':
            case '"':
                let quote = c;
                while (--index >= 0) {
                    c = exp[index];
                    if (c === quote) {
                        break;
                    }
                }
                break;
            case ']':
            case ')':
            case '}':
                braceCount[c] = (braceCount[c] || 0) + 1;
        }
        if (stop) {
            break;
        }
        index--;
    }
    if (stop) {
        exp = exp.substr(0, index).trim();
        exp = getCurrentExpression(exp);
        return Object.assign({}, getPrefix(exp), { paramIndex: commaCount });
    }
    return null;
}
exports.getSignatureInfo = getSignatureInfo;
function isArray(obj) {
    return obj instanceof Array;
}
function isObject(obj) {
    return obj && typeof (obj) === 'object' && obj.constructor === Object;
}
let ID_RE = /^[_a-zA-Z]\w*$/;
function isId(str) {
    return ID_RE.test(str);
}
class TrackExpressionContext extends parser_1.ExpressionContext {
    constructor() {
        super();
        this.accessed = {};
    }
    get(key) {
        let list = this.accessed[key];
        if (list && list.length > 0) {
            list[list.length - 1] = true;
        }
        return super.get(key);
    }
    push(key, value) {
        let list = this.accessed[key];
        if (!list) {
            list = [];
            this.accessed[key] = list;
        }
        list.push(false);
        super.push(key, value);
    }
    pop(key) {
        let list = this.accessed[key];
        list.pop();
        return super.get(key);
    }
    isAccessed(key) {
        let list = this.accessed[key];
        if (list && list.length > 0) {
            return list[list.length - 1];
        }
        return true;
    }
}
class MistDocument {
    constructor(document) {
        this.dataIndex = 0;
        this.document = document;
    }
    static getDocumentByUri(uri) {
        return MistDocument.documents[uri.toString()];
    }
    static initialize() {
        vscode.workspace.textDocuments.forEach(d => MistDocument.onDidOpenTextDocument(d));
        if (vscode.workspace.rootPath) {
            MistData.openDir(vscode.workspace.rootPath);
        }
    }
    static onDidOpenTextDocument(document) {
        if (document.languageId === 'mist') {
            MistDocument.documents[document.uri.toString()] = new MistDocument(document);
            if (document.fileName) {
                MistData.openDir(path.dirname(document.fileName));
            }
        }
    }
    static onDidCloseTextDocument(document) {
        if (document.languageId === 'mist') {
            MistDocument.documents[document.uri.toString()] = null;
        }
    }
    static onDidSaveTextDocument(document) {
        if (document.languageId === 'mist') {
        }
        else if (document.fileName.endsWith('.json')) {
            MistData.openFile(document.fileName);
        }
    }
    static onDidChangeTextDocument(event) {
        if (event.document.languageId === 'mist') {
            let mistDocument = MistDocument.getDocumentByUri(event.document.uri);
            mistDocument.onDidChangeTextDocument(event);
        }
    }
    clearDatas() {
        this.datas = null;
    }
    getRootNode() {
        return this.rootNode;
    }
    getTemplate() {
        this.parseTemplate();
        return this.template;
    }
    getDatas() {
        if (!this.datas) {
            let file = this.document.fileName;
            let dir = path.dirname(file);
            let templateId = path.basename(file, ".mist");
            this.datas = MistData.getData(dir, templateId);
        }
        return this.datas;
    }
    setData(name) {
        let datas = this.getDatas();
        if (datas.length === 0)
            return;
        let data = datas.find(d => d.description() === name);
        if (!data) {
            data = datas[0];
        }
        this.dataFile = data.file;
        this.dataIndex = data.index || 0;
    }
    getData() {
        let datas = this.getDatas();
        if (datas && datas.length > 0) {
            if (this.dataFile == null) {
                this.dataFile = datas[0].file;
            }
            let filterdDatas = datas.filter(d => d.file === this.dataFile);
            if (this.dataIndex < filterdDatas.length) {
                return filterdDatas[this.dataIndex];
            }
        }
        return null;
    }
    dir() {
        if (this.document.fileName) {
            return path.dirname(this.document.fileName);
        }
        return vscode.workspace.rootPath;
    }
    provideCompletionItems(position, token) {
        template_schema_1.NodeSchema.setCurrentDir(this.dir());
        let document = this.document;
        let location = json.getLocation(document.getText(), document.offsetAt(position));
        this.parseTemplate();
        let getWordRange = () => document.getWordRangeAtPosition(position, /[-_$a-zA-Z0-9]+/);
        // 在上一行没有以逗号结尾时，也认为在 key 里
        if (!location.isAtPropertyKey) {
            let wordRange = getWordRange();
            let p = wordRange ? wordRange.start : position;
            let line = document.getText(new vscode.Range(new vscode.Position(p.line, 0), p)).trim();
            if (line === '') {
                location.isAtPropertyKey = true;
                location.previousNode = null;
                location.path = [...location.path.slice(0, -1), ""];
            }
            else if (line === '"') {
                location.isAtPropertyKey = true;
            }
        }
        // expression suggestions
        var items = [];
        if (!location.isAtPropertyKey) {
            let expression = this.getExpressionAtLocation(location, position);
            if (expression !== null) {
                let { lexerError: error } = template_1.parse(expression);
                if (error === lexer_1.LexerErrorCode.UnclosedString) {
                    return [];
                }
                let exp = getCurrentExpression(expression);
                let { prefix: prefix, function: func } = getPrefix(exp);
                let type;
                let ctx = this.contextAtLocation(location);
                if (prefix) {
                    type = this.expressionTypeWithContext(prefix, ctx.typeContext);
                }
                else {
                    if (document.getText(new vscode.Range(position.translate(0, -1), position)) === '.') {
                        return [];
                    }
                    type = type_1.Type.Global;
                    items = items.concat(['true', 'false', 'null', 'nil'].map(s => new vscode_1.CompletionItem(s, vscode.CompletionItemKind.Keyword)));
                    ctx.vars.forEach(v => {
                        let item = new vscode_1.CompletionItem(v.name, vscode.CompletionItemKind.Field);
                        item.detail = v.value !== parser_1.None ? `"${v.name}": ${JSON.stringify(v.value, null, '\t')}` : `${v.name}: ${v.type.getName()}`;
                        let doc = [];
                        if (v.type && v.value === parser_1.None) {
                            doc.push(v.type.getName());
                        }
                        if (v.description) {
                            doc.push(v.description);
                        }
                        item.documentation = doc.join('\n\n');
                        items.push(item);
                    });
                }
                if (type) {
                    let properties = type.getAllProperties();
                    let methods = type.getAllMethods();
                    items = items.concat(Object.keys(properties).filter(isId).map(k => {
                        let p = properties[k];
                        let item = new vscode.CompletionItem(k, type === type_1.Type.Global ? vscode.CompletionItemKind.Constant : vscode.CompletionItemKind.Property);
                        if (p.description) {
                            item.documentation = p.description;
                        }
                        if (p.type) {
                            item.detail = this.propertyName(k, p);
                        }
                        return item;
                    }));
                    items = items.concat(Object.keys(methods).map(k => {
                        let m = methods[k];
                        let item = new vscode.CompletionItem(k, vscode.CompletionItemKind.Method);
                        let funInfo = m[0];
                        let params = funInfo.params || [];
                        let noParams = params.length === 0 && m.length === 1;
                        item.insertText = new vscode.SnippetString(k + (noParams ? '()' : '($0)'));
                        if (!noParams) {
                            item.command = {
                                title: 'Trigger Signature Help',
                                command: "editor.action.triggerParameterHints"
                            };
                        }
                        if (m[0].description) {
                            item.documentation = m[0].description;
                        }
                        item.detail = this.methodName(k, m[0], m.length);
                        return item;
                    }));
                    return items;
                }
                return items;
            }
            else {
                let nodePath = this.nodePath(location.path);
                if (nodePath && location.previousNode && nodePath.length >= 2 && nodePath[0] === 'style' && (nodePath[1] === 'image' || nodePath[1] === 'error-image' || nodePath[1] === 'background-image')) {
                    let range = new vscode.Range(document.positionAt(location.previousNode.offset + 1), document.positionAt(location.previousNode.offset + location.previousNode.length - 1));
                    let items = imageHelper_1.ImageHelper.provideCompletionItems(this, token);
                    items.forEach(item => item.range = range);
                    return items;
                }
            }
        }
        // property suggestions
        let node = this.rootNode;
        let matchingSchemas = [];
        let offset = document.offsetAt(position);
        if (!location.isAtPropertyKey && !location.previousNode) {
            // 用 key 的 offset，否则找不到对应的 schema
            let name = location.path[location.path.length - 1];
            let parentNode = json.findNodeAtLocation(node, location.path.slice(0, -1));
            let propNode = parentNode.children.find(n => n.children[0].value === name);
            if (propNode) {
                offset = propNode.children[0].offset;
            }
        }
        else if (location.isAtPropertyKey && location.previousNode) {
            // 在 key 已经有引号时
            let parentNode = json.findNodeAtLocation(node, location.path.slice(0, -1));
            offset = parentNode.offset;
        }
        schema_1.validateJsonNode(node, template_schema_1.templateSchema, offset, matchingSchemas);
        if (matchingSchemas.length > 0) {
            for (let s of matchingSchemas) {
                if (location.isAtPropertyKey && s && typeof (s) === 'object') {
                    if (s.properties) {
                        let notDeprecated = (s) => !(s && typeof (s) === 'object' && s.deprecatedMessage);
                        let s1 = s;
                        let existsProperties = json.findNodeAtLocation(node, location.path.slice(0, -1)).children.map(c => c.children[0].value);
                        items.push(...Object.keys(s.properties)
                            .filter(k => notDeprecated(s1.properties[k]))
                            .filter(k => existsProperties.indexOf(k) < 0)
                            .map(k => {
                            let s = s1.properties[k];
                            let item = new vscode_1.CompletionItem(k, vscode.CompletionItemKind.Property);
                            if (s && typeof (s) === 'object') {
                                switch (s.format) {
                                    case 'event':
                                        item.kind = vscode.CompletionItemKind.Event;
                                        break;
                                }
                                if (s.description) {
                                    item.detail = s.description;
                                }
                            }
                            let valueText = (inQuote) => {
                                if (!location.isAtPropertyKey) {
                                    return '';
                                }
                                let valueText = '';
                                let comma = false;
                                let pos = inQuote ? position.translate(0, 1) : position;
                                let text = document.getText(new vscode.Range(pos, pos.translate(5, 0)));
                                if (text.match(/^\s*"/)) {
                                    comma = true;
                                }
                                let value = this.schemaSnippet(s) || '$0';
                                valueText += `: ${value}`;
                                if (comma) {
                                    valueText += ',';
                                }
                                return valueText;
                            };
                            if (location.previousNode) {
                                let offset = document.offsetAt(position);
                                let delta = offset - location.previousNode.offset;
                                let inQuote = delta > 0 && delta < location.previousNode.length;
                                if (inQuote) {
                                    item.insertText = new vscode.SnippetString(`${k}"${valueText(true)}`);
                                    item.range = new vscode.Range(document.positionAt(location.previousNode.offset + 1), document.positionAt(location.previousNode.offset + location.previousNode.length));
                                }
                                else {
                                    item.insertText = `"${k}"`;
                                    item.range = new vscode.Range(document.positionAt(location.previousNode.offset), document.positionAt(location.previousNode.offset + location.previousNode.length));
                                }
                            }
                            else {
                                item.range = getWordRange();
                                item.insertText = new vscode.SnippetString(`"${k}"${valueText(false)}`);
                            }
                            let text = typeof (item.insertText) === 'string' ? item.insertText : item.insertText.value;
                            if (!text.includes('\n') && !k.startsWith('margin') && k !== 'width' && k !== 'height' && k !== 'flex-basis') {
                                item.command = {
                                    title: "",
                                    command: "mist.triggerSuggest"
                                };
                            }
                            return item;
                        }));
                    }
                }
                else if (!location.isAtPropertyKey && s && typeof (s) === 'object') {
                    let enums = this.schemaEnums(s);
                    if (location.previousNode) {
                        enums = enums.filter(s => typeof (s[0]) === 'string');
                        items.push(...enums.map(e => {
                            let item = new vscode_1.CompletionItem(e[0], e[2]);
                            if (e[1]) {
                                item.detail = e[1];
                            }
                            item.command = {
                                title: "Move To Line End",
                                command: "mist.moveToLineEnd"
                            };
                            item.range = getWordRange();
                            return item;
                        }));
                    }
                    else {
                        items.push(...enums.map(e => {
                            let item = new vscode_1.CompletionItem(JSON.stringify(e[0]), e[2]);
                            if (e[1]) {
                                item.detail = e[1];
                            }
                            item.command = {
                                title: "Move To Line End",
                                command: "mist.moveToLineEnd"
                            };
                            item.range = getWordRange();
                            return item;
                        }));
                    }
                }
            }
        }
        // snippets
        if (!location.previousNode) {
            let nodePath = this.nodePath(location.path);
            let snippets = snippets_1.default.nodeSnippets;
            if (nodePath && nodePath.length === 0) {
                let trialingText = this.document.getText(new vscode.Range(position, position.translate(3, 0)));
                let needTrialingComma = trialingText.trim().startsWith('{');
                snippets = Object.keys(snippets).reduce((p, c) => {
                    p[c] = '{\n  ' + snippets[c].replace(/\n/mg, '\n  ') + '\n}';
                    if (needTrialingComma)
                        p[c] += ',';
                    return p;
                }, {});
            }
            else if (nodePath && nodePath.length === 1 && location.isAtPropertyKey) {
                let node = this.nodeAtPath(location.path);
                if (node.node.children.length > 0) {
                    return items;
                }
            }
            else {
                return items;
            }
            items.push(...Object.keys(snippets).map(name => {
                let item = new vscode_1.CompletionItem(name, vscode.CompletionItemKind.Snippet);
                item.insertText = new vscode.SnippetString(snippets[name]);
                return item;
            }));
        }
        return items;
    }
    provideHover(position, token) {
        template_schema_1.NodeSchema.setCurrentDir(this.dir());
        function findNodeAtLocation(root, path) {
            if (!root) {
                return void 0;
            }
            let node = root;
            for (let segment of path) {
                if (typeof segment === 'string') {
                    if (node.type !== 'object') {
                        return void 0;
                    }
                    let found = false;
                    for (let propertyNode of node.children) {
                        if (propertyNode.children[0].value === segment) {
                            if (propertyNode.children.length >= 2) {
                                node = propertyNode.children[1];
                            }
                            else {
                                node = propertyNode;
                            }
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        return void 0;
                    }
                }
                else {
                    let index = segment;
                    if (node.type !== 'array' || index < 0 || index >= node.children.length) {
                        return void 0;
                    }
                    node = node.children[index];
                }
            }
            return node;
        }
        let contentsFromProperty = (name, prop) => {
            let contents = [];
            contents.push({ language: 'typescript', value: this.propertyName(name, prop) });
            if (prop.description) {
                contents.push(prop.description);
            }
            return contents;
        };
        let contentsFromMethod = (name, fun, count) => {
            let contents = [];
            contents.push({ language: 'typescript', value: this.methodName(name, fun, count) });
            if (fun.description) {
                contents.push(fun.description);
            }
            return contents;
        };
        let document = this.document;
        let wordRange = document.getWordRangeAtPosition(position, /[-_$a-zA-Z0-9]+/);
        if (wordRange == null || wordRange.start === wordRange.end) {
            return;
        }
        let location = json.getLocation(document.getText(), document.offsetAt(position));
        this.parseTemplate();
        let expression = this.getExpressionAtLocation(location, wordRange.end);
        if (expression != null) {
            expression = getCurrentExpression(expression);
            let isFunction = document.getText(new vscode.Range(wordRange.end, wordRange.end.translate(0, 1))) === '(';
            let contents = [];
            let ctx = this.contextAtLocation(location);
            let { prefix: prefix, function: func } = getPrefix(expression);
            let type;
            if (prefix) {
                type = this.expressionTypeWithContext(prefix, ctx.typeContext);
            }
            else if (!isFunction) {
                let v = ctx.vars.find(v => v.name === func);
                if (v) {
                    // if (v.value !== None) {
                    //     contents.push({ language: 'mist', value: `"${v.name}": ${JSON.stringify(v.value, null, '\t')}` });
                    // }
                    if (v.type) {
                        contents.push({ language: 'typescript', value: `"${v.name}": ${v.type.getName()}` });
                    }
                    if (v.description) {
                        contents.push(v.description);
                    }
                }
            }
            else {
                type = type_1.Type.Global;
            }
            if (type) {
                if (isFunction) {
                    let fun = type.getMethods(func);
                    if (fun && fun.length > 0) {
                        let current;
                        if (fun.length > 1) {
                            let paramsCount = getFunctionParamsCount(this.getTrailingExpressionAtLocation(location, wordRange.end));
                            current = fun.find(f => f.params.length === paramsCount);
                        }
                        contents.push(...contentsFromMethod(func, current || fun[0], fun.length));
                    }
                    else {
                        let prop = type.getProperty(func);
                        if (prop) {
                            contents.push(...contentsFromProperty(func, prop));
                        }
                    }
                }
                else {
                    let prop = type.getProperty(func);
                    if (prop) {
                        contents.push(...contentsFromProperty(func, prop));
                    }
                    else {
                        let fun = type.getMethod(func, 0);
                        if (fun && fun.type && fun.type !== type_1.Type.Void) {
                            contents.push(...contentsFromMethod(func, fun, type.getMethods(func).length));
                        }
                    }
                }
            }
            return new vscode_1.Hover(contents);
        }
        let node = this.rootNode;
        let matchingSchemas = [];
        let range = new vscode.Range(document.positionAt(location.previousNode.offset), document.positionAt(location.previousNode.offset + location.previousNode.length));
        let offset = document.offsetAt(position);
        schema_1.validateJsonNode(node, template_schema_1.templateSchema, offset, matchingSchemas);
        if (matchingSchemas.length > 0) {
            let s = matchingSchemas[0]; // TODO
            if (!location.isAtPropertyKey && s && typeof (s) === 'object') {
                if (s.enum && s.enumDescriptions) {
                    let value = json_1.getNodeValue(json.findNodeAtLocation(node, location.path));
                    let index = s.enum.indexOf(value);
                    if (index >= 0) {
                        return new vscode_1.Hover(s.enumDescriptions[index], range);
                    }
                }
            }
            if (s && typeof (s) === 'object' && s.description) {
                return new vscode_1.Hover(s.description, range);
            }
        }
        return null;
    }
    provideDefinition(position, token) {
        let document = this.document;
        let wordRange = document.getWordRangeAtPosition(position);
        if (wordRange == null || wordRange.start === wordRange.end) {
            return null;
        }
        let location = json.getLocation(document.getText(), document.offsetAt(position));
        this.parseTemplate();
        let expression = this.getExpressionAtLocation(location, wordRange.end);
        if (!expression) {
            return null;
        }
        expression = getCurrentExpression(expression);
        let { prefix: prefix, function: name } = getPrefix(expression);
        if (prefix) {
            return null;
        }
        let isFunction = document.getText(new vscode.Range(wordRange.end, wordRange.end.translate(0, 1))) === '(';
        if (isFunction) {
            return null;
        }
        let ctx = this.contextAtLocation(location);
        let index = findLastIndex(ctx.vars, v => v.name === name);
        if (index >= 0) {
            let v = ctx.vars[index];
            if (v.node) {
                let uri = v.uri || this.document.uri;
                return vscode.workspace.openTextDocument(uri).then(doc => {
                    return new vscode.Location(uri, new vscode.Range(doc.positionAt(v.node.offset), doc.positionAt(v.node.offset + v.node.length)));
                });
            }
        }
        return null;
    }
    provideSignatureHelp(position, token) {
        let document = this.document;
        let location = json.getLocation(document.getText(), document.offsetAt(position));
        this.parseTemplate();
        let expression = this.getExpressionAtLocation(location, position);
        if (expression) {
            let signatureInfo = getSignatureInfo(expression);
            if (signatureInfo) {
                let type;
                if (signatureInfo.prefix) {
                    let ctx = this.contextAtLocation(location);
                    type = this.expressionTypeWithContext(signatureInfo.prefix, ctx.typeContext);
                }
                else {
                    type = type_1.Type.Global;
                }
                if (!type) {
                    return null;
                }
                let fun = type.getMethods(signatureInfo.function);
                if (fun && fun.length > 0) {
                    let signatureHelp = new vscode.SignatureHelp();
                    signatureHelp.signatures = fun.map(f => {
                        let signature = new vscode.SignatureInformation(this.methodName(signatureInfo.function, f, fun.length));
                        signature.parameters = (f.params || []).map(p => new vscode.ParameterInformation(`${p.name}: ${p.type.getName()}`));
                        signature.documentation = f.description;
                        return signature;
                    });
                    signatureHelp.activeSignature = 0;
                    signatureHelp.activeParameter = signatureInfo.paramIndex;
                    return signatureHelp;
                }
            }
        }
        return null;
    }
    validate() {
        template_schema_1.NodeSchema.setCurrentDir(this.dir());
        this.parseTemplate();
        if (!this.template)
            return [];
        let vars = [];
        let typeContext = new TrackExpressionContext();
        let diagnostics = [];
        let pushVariable = (v, isConst = false) => {
            vars.push(v);
            let isExp = false;
            let parsed = template_1.parseExpressionInObject(v.value);
            if (this.hasExpression(parsed)) {
                isExp = true;
                if (!v.type) {
                    v.type = this.computeExpressionTypeInObject(parsed, typeContext, isConst);
                }
            }
            if (!v.type) {
                v.type = (isConst ? type_1.Type.typeof(v.value, isConst) : this.getDataType(v.value)) || type_1.Type.Any;
            }
            if (v.incomplete && v.type instanceof type_1.ObjectType) {
                v.type.setIndexType();
            }
            typeContext.push(v.name, v.type);
        };
        let push = (key, value) => pushVariable(new Variable(key, value));
        let pop = key => {
            let index = findLastIndex(vars, v => v.name === key);
            if (index >= 0) {
                if (!typeContext.isAccessed(key)) {
                    let v = vars[index];
                    if (v.node && !v.uri) {
                        let node = v.node.children[0];
                        diagnostics.push(new vscode.Diagnostic(nodeRange(node), `未引用的变量 \`${key}\``, vscode.DiagnosticSeverity.Warning));
                    }
                }
                vars.splice(index, 1);
            }
            typeContext.pop(key);
        };
        let pushDict = dict => Object.keys(dict).forEach(key => push(key, dict[key]));
        let pushVarsDict = (node, isConst = false) => {
            let pushed = [];
            node.children.forEach(c => {
                if (c.children.length === 2) {
                    let key = c.children[0].value;
                    pushVariable(new Variable(key, json_1.getNodeValue(c.children[1])).setNode(c), isConst);
                    pushed.push(key);
                }
            });
            return pushed;
        };
        let range = (offset, length) => {
            let start = this.document.positionAt(offset);
            let end = this.document.positionAt(offset + length);
            return new vscode.Range(start, end);
        };
        let nodeRange = (node) => {
            return range(node.offset, node.length);
        };
        let validate = (node) => {
            if (!node)
                return;
            if (node.type === 'object') {
                node.children.forEach(child => {
                    if (child.children.length >= 2) {
                        validate(child.children[1]);
                    }
                });
            }
            else if (node.type === 'array') {
                node.children.forEach(validate);
            }
            else if (node.type === 'string') {
                let expressions = this.findExpressionsInString(node);
                expressions.forEach(exp => {
                    if (exp.string.errors.length > 0) {
                        return;
                    }
                    let { expression: expNode, errorMessage: error, errorOffset: offset, errorLength: length } = template_1.parse(exp.string.parsed);
                    if (error) {
                        let start = exp.string.sourceIndex(offset);
                        let end = exp.string.sourceIndex(offset + length);
                        diagnostics.push(new vscode.Diagnostic(range(start + exp.offset + node.offset, end - start), error, vscode.DiagnosticSeverity.Error));
                    }
                    else {
                        let errors = expNode.check(typeContext);
                        if (errors && errors.length > 0) {
                            diagnostics.push(...errors.map(e => {
                                let start = exp.string.sourceIndex(e.offset);
                                let end = exp.string.sourceIndex(e.offset + e.length);
                                return new vscode.Diagnostic(range(start + exp.offset + node.offset, end - start), e.description, e.level === parser_1.ExpressionErrorLevel.Info ? vscode.DiagnosticSeverity.Information :
                                    e.level === parser_1.ExpressionErrorLevel.Warning ? vscode.DiagnosticSeverity.Warning :
                                        vscode.DiagnosticSeverity.Error);
                            }));
                        }
                    }
                });
            }
        };
        let resolveExpressionsInNode = (node) => {
            if (node.value instanceof type_1.IType)
                return;
            if (node.type === 'string') {
                let parsed = template_1.parseExpressionInObject(node.value);
                if (parsed === null) {
                    node.value = type_1.Type.Any;
                }
                else {
                    node.value = this.computeExpressionTypeInObject(parsed, typeContext, true);
                }
            }
            else if (node.type === 'array') {
                node.children.forEach(c => resolveExpressionsInNode(c));
            }
            else if (node.type === 'object') {
                node.children.forEach(c => {
                    if (c.children.length === 2)
                        resolveExpressionsInNode(c.children[1]);
                });
            }
        };
        let validateProperty = (node, schema) => {
            if (!node)
                return;
            if (node.type !== 'property') {
                node = node.parent;
            }
            if (!node || node.type !== 'property')
                return;
            if (typeof (schema) !== 'object')
                return;
            let keyNode = node.children[0];
            let valueNode = node.children[1];
            if (!valueNode)
                return;
            let key = keyNode.value;
            let s = schema.properties[key];
            if (!valueNode)
                return;
            if (!s) {
                if (!schema.additionalProperties) {
                    let desc = `不存在属性 \`${key}\``;
                    let style = schema.properties.style;
                    let inStyle = style && typeof (style) === 'object' && key in style.properties;
                    if (inStyle) {
                        desc += `，是否想使用 \`style\` 中的 \`${key}\``;
                    }
                    diagnostics.push(new vscode.Diagnostic(range(keyNode.offset, keyNode.length), desc, vscode.DiagnosticSeverity.Warning));
                }
                return;
            }
            validate(valueNode);
            resolveExpressionsInNode(valueNode);
            let errors = schema_1.validateJsonNode(valueNode, s);
            diagnostics.push(...errors.map(e => new vscode.Diagnostic(range(e.node.offset, e.node.length), e.error, vscode.DiagnosticSeverity.Warning)));
        };
        let assertNoExp = (node) => {
            if (node && node.type === 'string') {
                let expressions = this.findExpressionsInString(node);
                if (expressions.length > 0) {
                    diagnostics.push(new vscode.Diagnostic(nodeRange(node), '该属性不支持使用表达式', vscode.DiagnosticSeverity.Error));
                }
            }
        };
        let noExpProps = ['controller', 'identifier', 'async-display', 'cell-height-animation', 'reuse-identifier'];
        BUILTIN_VARS.forEach(v => pushVariable(v));
        let data = this.getData() ? this.getData().data : {};
        pushDict(data);
        pushVariable(new Variable('_data_', this.getDataType(data), '模版关联的数据', true));
        validateProperty(json.findNodeAtLocation(this.rootNode, ['data']), template_schema_1.templateSchema);
        if (this.template.data instanceof Object) {
            data = Object.assign({}, data, this.template.data);
        }
        pushDict(data);
        pushVariable(new Variable('_data_', this.getDataType(data), '模版关联的数据', true));
        pushDict({
            '_item_': type_1.Type.Null,
            '_index_': type_1.Type.Null,
        });
        validateProperty(json.findNodeAtLocation(this.rootNode, ['state']), template_schema_1.templateSchema);
        pushVariable(new Variable('state', this.template.state || null, '模版状态', true));
        this.rootNode.children.forEach(c => {
            let key = c.children[0].value;
            if (key === 'layout' || key === 'data' || key === 'state') {
                return;
            }
            if (noExpProps.indexOf(key) >= 0) {
                assertNoExp(c.children[1]);
            }
            validateProperty(c, template_schema_1.templateSchema);
        });
        let validateNode = (node) => {
            if (!node)
                return;
            if (node.node.type === 'string') {
                let expressions = this.findExpressionsInString(node.node);
                if (expressions.length === 1 && expressions[0].offset === 3 && expressions[0].string.source.length === node.node.length - 5) {
                }
                else {
                    diagnostics.push(new vscode.Diagnostic(nodeRange(node.node), '`node` 必须为 `object` 类型', vscode.DiagnosticSeverity.Error));
                    return;
                }
                validate(node.node);
                return;
            }
            else if (node.node.type !== 'object') {
                diagnostics.push(new vscode.Diagnostic(nodeRange(node.node), '`node` 必须为 `object` 类型', vscode.DiagnosticSeverity.Error));
                return;
            }
            let pushed = [];
            let schema = new template_schema_1.NodeSchema().getSchema(node.node);
            let repeatNode = json_1.getPropertyNode(node.node, 'repeat');
            if (repeatNode) {
                validateProperty(repeatNode.parent, schema);
                pushVariable(new Variable('_index_', type_1.Type.Number, '当前 `repeat` 元素索引'));
                let repeatType = repeatNode.value;
                if (!(repeatType instanceof type_1.IType)) {
                    repeatType = type_1.Type.Any;
                }
                let valueType = repeatType.getTypeAtIndex(type_1.Type.Number);
                pushVariable(new Variable('_item_', valueType, '当前 `repeat` 元素'));
                pushed.push('_item_', '_index_');
            }
            let varsNode = json_1.getPropertyNode(node.node, 'vars');
            if (varsNode) {
                if (varsNode.type === 'array') {
                    varsNode.children.forEach(c => {
                        if (c.type !== 'object') {
                            diagnostics.push(new vscode.Diagnostic(nodeRange(c), '必须为 `object` 类型', vscode.DiagnosticSeverity.Error));
                            return;
                        }
                        validate(c);
                        pushed.push(...pushVarsDict(c, true));
                    });
                }
                else if (varsNode.type === 'object') {
                    validate(varsNode);
                    pushed.push(...pushVarsDict(varsNode, true));
                }
                else {
                    diagnostics.push(new vscode.Diagnostic(nodeRange(varsNode), '`vars` 属性只能为 `object` 或 `array`', vscode.DiagnosticSeverity.Error));
                }
            }
            const list = ['repeat', 'vars', 'children'];
            let otherNodes = node.node.children.filter(n => n.children.length === 2 && list.indexOf(n.children[0].value) < 0);
            if (typeof (schema) === 'object') {
                let childrenNode = json.findNodeAtLocation(node.node, ['children']);
                if (childrenNode && !schema.properties['children'] && schema.additionalProperties === false) {
                    let keyNode = childrenNode.parent.children[0];
                    diagnostics.push(new vscode.Diagnostic(range(keyNode.offset, keyNode.length), '不存在属性 `children`', vscode.DiagnosticSeverity.Warning));
                }
                otherNodes.forEach(n => validateProperty(n, schema));
            }
            if (node.children) {
                node.children.forEach(validateNode);
            }
            pushed.forEach(pop);
        };
        validateNode(this.nodeTree);
        return diagnostics;
    }
    onDidChangeTextDocument(event) {
        this.template = null;
        this.rootNode = null;
    }
    parseTemplate() {
        if (!this.rootNode || !this.template) {
            this.rootNode = json_1.parseJson(this.document.getText());
            if (this.rootNode) {
                this.template = json_1.getNodeValue(this.rootNode);
                let layoutNode = json_1.getPropertyNode(this.rootNode, "layout");
                if (layoutNode) {
                    this.nodeTree = new MistNode(layoutNode);
                }
            }
        }
    }
    // "abc ${expression1} ${a + max(a, b.c|) + d} xxx" ⟹ ") + d"
    // "$:a + max(a, b.c|) + d" ⟹ ) + d
    getTrailingExpressionAtLocation(location, position) {
        let document = this.document;
        if (!location.isAtPropertyKey && location.previousNode.type === 'string') {
            let start = location.previousNode.offset + 1;
            let end = location.previousNode.offset + location.previousNode.length - 1;
            let str = document.getText(new vscode.Range(document.positionAt(start), document.positionAt(end)));
            let pos = document.offsetAt(position) - start;
            if (str.startsWith("$:")) {
                if (pos >= 2) {
                    let s = str.substring(pos);
                    return json.parse(`"${s}"`);
                }
                else {
                    return null;
                }
            }
            let match;
            MIST_EXP_RE.lastIndex = 0;
            while (match = MIST_EXP_RE.exec(str)) {
                if (pos >= match.index + 2 && pos <= match.index + match[0].length - 1) {
                    let str = match[0].slice(pos - match.index, -1);
                    return json.parse(`"${str}"`);
                }
            }
        }
        return null;
    }
    // "abc ${expression1} ${a + max(a, b.c|) + d} xxx" ⟹ "a + max(a, b.c"
    // "$:a + max(a, b.c|) + d" ⟹ "a + max(a, b.c"
    getExpressionAtLocation(location, position) {
        let document = this.document;
        if (!location.isAtPropertyKey && location.previousNode && location.previousNode.type === 'string') {
            let start = location.previousNode.offset + 1;
            let end = location.previousNode.offset + location.previousNode.length - 1;
            let str = document.getText(new vscode.Range(document.positionAt(start), document.positionAt(end)));
            let pos = document.offsetAt(position) - start;
            if (str.startsWith("$:")) {
                if (pos >= 2) {
                    let s = str.substring(2, pos);
                    return json.parse(`"${s}"`);
                }
                else {
                    return null;
                }
            }
            let match;
            MIST_EXP_RE.lastIndex = 0;
            while (match = MIST_EXP_RE.exec(str)) {
                if (pos >= match.index + 2 && pos <= match.index + match[0].length - 1) {
                    let str = match[0].substring(2, pos - match.index);
                    return json.parse(`"${str}"`);
                }
            }
        }
        return null;
    }
    nodeAtOffset(node, offset) {
        if (offset > node.node.offset && offset < node.node.offset + node.node.length) {
            if (node.children) {
                for (let child of node.children) {
                    let node = this.nodeAtOffset(child, offset);
                    if (node) {
                        return node;
                    }
                }
            }
            return node;
        }
        return null;
    }
    nodePath(path) {
        if (path.length > 0 && path[0] === "layout") {
            let start = 1;
            while (start + 1 < path.length && path[start] === "children" && path[start + 1] !== undefined) {
                start += 2;
            }
            return path.slice(start);
        }
        return null;
    }
    nodeAtPath(path) {
        if (!(path.length >= 1 && path[0] === 'layout')) {
            return null;
        }
        path.splice(0, 1);
        let node = this.nodeTree;
        while (path.length >= 2 && path[0] === 'children' && typeof (path[1]) === 'number') {
            node = node.children[path[1]];
            path.splice(0, 2);
        }
        return node;
    }
    computeExpressionValueInObject(obj, context) {
        if (obj instanceof parser_1.ExpressionNode) {
            return obj.compute(context);
        }
        else if (obj instanceof Array) {
            let list = obj.map(o => this.computeExpressionValueInObject(o, context));
            return list.some(v => v === parser_1.None) ? parser_1.None : list;
        }
        else if (obj && obj !== parser_1.None && typeof (obj) === 'object') {
            let values = Object.keys(obj).map(k => this.computeExpressionValueInObject(obj[k], context));
            if (values.some(v => v === parser_1.None))
                return parser_1.None;
            return Object.keys(obj).reduce((p, c, i) => { p[c] = values[i]; return p; }, {});
        }
        return obj;
    }
    computeExpressionTypeInObject(obj, context, isConst = false) {
        if (obj instanceof parser_1.ExpressionNode) {
            return obj.getType(context);
        }
        else if (obj instanceof Array) {
            let types = obj.map(o => this.computeExpressionTypeInObject(o, context, isConst));
            return isConst ? type_1.ArrayType.tuple(types) : new type_1.ArrayType(type_1.UnionType.type(types));
        }
        else if (obj && obj !== parser_1.None && typeof (obj) === 'object') {
            return new type_1.ObjectType(Object.keys(obj).reduce((p, c) => { p[c] = this.computeExpressionTypeInObject(obj[c], context, isConst); return p; }, {}));
        }
        return type_1.Type.typeof(obj, isConst);
    }
    hasExpression(obj) {
        if (obj instanceof parser_1.ExpressionNode) {
            return true;
        }
        else if (obj instanceof Array) {
            return obj.some(o => this.hasExpression(o));
        }
        else if (obj && obj !== parser_1.None && typeof (obj) === 'object') {
            return Object.keys(obj).some(k => this.hasExpression(obj[k]));
        }
        return false;
    }
    contextAtLocation(location) {
        let vars = [];
        let typeContext = new parser_1.ExpressionContext();
        let pushVariable = (v, isConst = false) => {
            vars.push(v);
            let isExp = false;
            let parsed = template_1.parseExpressionInObject(v.value);
            if (this.hasExpression(parsed)) {
                isExp = true;
                if (!v.type) {
                    v.type = this.computeExpressionTypeInObject(parsed, typeContext, isConst);
                }
            }
            if (!v.type) {
                v.type = type_1.Type.typeof(v.value, isConst) || type_1.Type.Any;
            }
            if (v.incomplete && v.type instanceof type_1.ObjectType) {
                v.type.setIndexType();
            }
            typeContext.push(v.name, v.type);
        };
        let push = (key, value) => pushVariable(new Variable(key, value));
        let pushDict = dict => Object.keys(dict).forEach(key => push(key, dict[key]));
        let pushVarsDict = (node, isConst = false) => {
            if (!node)
                return [];
            let pushed = [];
            node.children.forEach(c => {
                if (c.children.length === 2) {
                    let key = c.children[0].value;
                    pushVariable(new Variable(key, json_1.getNodeValue(c.children[1])).setNode(c), isConst);
                    pushed.push(key);
                }
            });
            return pushed;
        };
        BUILTIN_VARS.forEach(v => pushVariable(v));
        let data = this.getData();
        let dataDict = data ? data.data : {};
        if (data) {
            data.node.children.forEach(c => {
                if (c.children.length === 2) {
                    let key = c.children[0].value;
                    pushVariable(new Variable(key, json_1.getNodeValue(c.children[1])).setNode(c, data.file));
                }
            });
        }
        pushVariable(new Variable('_data_', dataDict, '模版关联的数据', true));
        if (this.template.data instanceof Object) {
            dataDict = Object.assign({}, dataDict, this.template.data);
        }
        pushVarsDict(json.findNodeAtLocation(this.rootNode, ['data']));
        pushVariable(new Variable('_data_', dataDict, '模版关联的数据', true));
        if (location.path[0] !== 'data' && location.path[0] !== 'state') {
            pushVariable(new Variable('state', this.template.state || null, '模版状态', true));
        }
        let path = [...location.path];
        let node = this.nodeAtPath(path);
        let inVars = path.length > 0 && path[0] === 'vars';
        let inRepeat = path.length > 0 && path[0] === 'repeat';
        let nodeStack = [];
        while (node) {
            nodeStack.push(node);
            node = node.parent;
        }
        while (nodeStack.length > 0) {
            let node = nodeStack.pop();
            if (!(inRepeat && nodeStack.length === 0)) {
                let repeatNode = json_1.getPropertyNode(node.node, 'repeat');
                if (repeatNode) {
                    pushVariable(new Variable('_index_', type_1.Type.Number, '当前 `repeat` 元素索引'));
                    let repeatType = repeatNode.value;
                    if (!(repeatType instanceof type_1.IType)) {
                        repeatType = type_1.Type.Any;
                    }
                    let valueType = repeatType.getTypeAtIndex(type_1.Type.Number);
                    pushVariable(new Variable('_item_', valueType, '当前 `repeat` 元素'));
                }
                let varsNode = json_1.getPropertyNode(node.node, 'vars');
                if (varsNode) {
                    if (varsNode.type === 'array') {
                        var count = varsNode.children.length;
                        if (path.length >= 2 && path[0] === 'vars' && typeof (path[1]) === 'number') {
                            count = path[1];
                        }
                        for (var i = 0; i < count; i++) {
                            pushVarsDict(varsNode.children[i], true);
                        }
                    }
                    else if (varsNode.type === 'object') {
                        pushVarsDict(varsNode, true);
                    }
                }
            }
        }
        return {
            vars: Variable.unique(vars),
            typeContext: typeContext
        };
    }
    expressionTypeWithContext(expression, context) {
        let { expression: node, errorMessage: error } = template_1.parse(expression);
        if (error || !node) {
            return null;
        }
        else {
            return node.getType(context);
        }
    }
    expressionValueWithContext(expression, context) {
        let { expression: node, errorMessage: error } = template_1.parse(expression);
        if (error || !node) {
            return null;
        }
        else {
            return node.compute(context);
        }
    }
    propertyName(name, property) {
        return `${property.ownerType !== type_1.Type.Global ? '(property) ' : ''}${property.ownerType && property.ownerType !== type_1.Type.Global ? property.ownerType.getName() + '.' : ''}${name}: ${property.type.getName()}`;
    }
    methodName(name, method, count) {
        let returnType = method.type ? method.type.getName() : 'void';
        return `${method.ownerType !== type_1.Type.Global ? '(method) ' : ''}${method.ownerType && method.ownerType !== type_1.Type.Global ? method.ownerType.getName() + '.' : ''}${name}(${(method.params || []).map(p => `${p.name}: ${p.type.getName()}`).join(', ')}): ${returnType}${count > 1 ? ` (+${count - 1} overload${count > 2 ? 's' : ''})` : ''}`;
    }
    findExpressionsInString(stringNode) {
        let position = this.document.positionAt(stringNode.offset);
        let rawString = this.document.getText(new vscode.Range(position, position.translate(0, stringNode.length)));
        if (rawString.startsWith("\"$:")) {
            return [{
                    string: new JsonString(rawString.slice(3, -1)),
                    offset: 3
                }];
        }
        const re = /\$\{(.*?)\}/mg;
        re.lastIndex = 0;
        let results = [];
        let match;
        while (match = re.exec(rawString)) {
            results.push({
                string: new JsonString(match[1]),
                offset: match.index + 2
            });
        }
        return results;
    }
    valueType(value) {
        if (value === null)
            return 'null';
        if (value instanceof Array)
            return 'array';
        return typeof (value);
    }
    schemaSnippet(s) {
        function schemaForType(type) {
            switch (type) {
                case 'string': return '"$0"';
                case 'object': return '{\n  $0\n}';
                case 'array': return '[\n  $0\n]';
                case 'null': return '${0:null}';
            }
            return '';
        }
        if (s && typeof (s) === 'object') {
            if (s.snippet)
                return s.snippet;
            if (s.oneOf) {
                let schemas = s.oneOf.filter(s => s && typeof (s) === 'object' && !s.deprecatedMessage);
                if (schemas.length === 1) {
                    return this.schemaSnippet(schemas[0]);
                }
                let set = [...new Set(s.oneOf.filter(s => s && typeof (s) === 'object' && !s.deprecatedMessage).map(s => this.schemaSnippet(s)))];
                if (set.length === 1) {
                    return set[0];
                }
                return '';
            }
            if (s.type === 'object' && s.required && s.required.length > 0) {
                let ret = `{
${s.required.map(p => `"${p}": ${this.schemaSnippet(s.properties[p]) || '$0'}`).join(',\n').split('\n').map(s => '  ' + s).join('\n')}
}`;
                var n = 0;
                ret = ret.replace(/\$\d+/mg, s => {
                    return `$${++n}`;
                });
                return ret;
            }
            if (s.type)
                return schemaForType(s.type);
            if (s.enum) {
                let set = [...new Set(s.enum.map(e => this.valueType(e)))];
                if (set.length === 1) {
                    return set[0];
                }
            }
        }
        return '';
    }
    schemaEnums(s) {
        if (s && typeof (s) === 'object') {
            if (s.enum) {
                let enums = s.enum;
                enums = enums.map((e, i) => [e, s.enumDescriptions ? s.enumDescriptions[i] : null, vscode.CompletionItemKind.EnumMember]);
                if (s.type) {
                    enums = enums.filter(e => this.valueType(e[0]) === s.type);
                }
                return enums;
            }
            else if (s.type) {
                switch (s.type) {
                    case 'boolean': return [[true, null, vscode.CompletionItemKind.Constant], [false, null, vscode.CompletionItemKind.Constant]];
                    case 'null': return [[null, null, vscode.CompletionItemKind.Constant]];
                }
            }
            else if (s.oneOf) {
                return s.oneOf.filter(s => s && typeof (s) === 'object' && !s.deprecatedMessage).map(s => this.schemaEnums(s)).reduce((p, c) => { p.push(...c); return p; }, []);
            }
        }
        return [];
    }
    getDataType(obj) {
        if (obj instanceof type_1.IType)
            return obj;
        if (obj === undefined || obj === null) {
            return type_1.Type.Any;
        }
        let type = typeof (obj);
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return type_1.Type.getType(type);
        }
        if (obj instanceof Array) {
            let ts = obj.map(o => this.getDataType(o));
            let objectTypes = ts.filter(t => t instanceof type_1.ObjectType);
            if (objectTypes.length >= 2) {
                let newObjectType = new type_1.ObjectType(objectTypes.reduce((p, c) => {
                    let map = c.getMap();
                    Object.keys(map).forEach(k => {
                        if (k in p) {
                            p[k] = type_1.IntersectionType.type([p[k], map[k]]);
                        }
                        else {
                            p[k] = map[k];
                        }
                    });
                    return p;
                }, {}));
                ts = ts.filter(t => !(t instanceof type_1.ObjectType));
                ts.push(newObjectType);
            }
            return new type_1.ArrayType(type_1.UnionType.type(ts));
        }
        return new type_1.ObjectType(Object.keys(obj).reduce((ret, k) => { ret[k] = this.getDataType(obj[k]); return ret; }, {}));
    }
}
MistDocument.documents = {};
exports.MistDocument = MistDocument;
//# sourceMappingURL=mistDocument.js.map