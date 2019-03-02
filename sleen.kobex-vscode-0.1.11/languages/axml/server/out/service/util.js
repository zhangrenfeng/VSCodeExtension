"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
function pathFromUri(uri) {
    if (uri.startsWith('file://')) {
        return uri.slice('file://'.length);
    }
    return uri;
}
exports.pathFromUri = pathFromUri;
function getTagName(element) {
    return element ? element.tagStart.tagTextNode.text : '';
}
exports.getTagName = getTagName;
function getWordAtOffset(text, offset) {
    const head = text.slice(0, offset);
    const tail = text.slice(offset);
    const wordStart = head.search(/[\w-]*$/);
    const wordEnd = offset + tail.match(/^[\w-]*/)[0].length;
    return text.slice(wordStart, wordEnd);
}
exports.getWordAtOffset = getWordAtOffset;
function getWordRangeAtOffset(document, position) {
    const lineRange = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(position.line, 0), vscode_languageserver_1.Position.create(position.line + 1, 0));
    const textOfLine = document.getText(lineRange);
    const lineOffset = document.offsetAt(lineRange.start);
    const offset = document.offsetAt(position) - lineOffset;
    const head = textOfLine.slice(0, offset);
    const tail = textOfLine.slice(offset);
    const start = head.search(/[\w-]*$/) + lineOffset;
    const end = offset + tail.match(/^[\w-]*/)[0].length + lineOffset;
    return { start: document.positionAt(start), end: document.positionAt(end) };
}
exports.getWordRangeAtOffset = getWordRangeAtOffset;
function isClassAttr(prop) {
    return prop.includes('class') || prop.includes('Class');
}
exports.isClassAttr = isClassAttr;
function isEventAttr(prop) {
    return prop.match(/^on[A-Z]/);
}
exports.isEventAttr = isEventAttr;
function filterObject(obj, filter) {
    return Object.keys(obj)
        .filter(v => filter(v, obj[v], obj))
        .reduce((p, c) => (p[c] = obj[c], p), {});
}
exports.filterObject = filterObject;
function createRange(node, document) {
    return vscode_languageserver_1.Range.create(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
}
exports.createRange = createRange;
//# sourceMappingURL=util.js.map