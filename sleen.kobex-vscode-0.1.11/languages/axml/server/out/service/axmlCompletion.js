"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const parser_1 = require("../parser");
const document_1 = require("./document");
const util_1 = require("./util");
class AXMLCompletion {
    doComplete(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = yield document_1.PageDocument.getDocument(document.uri);
            const prevText = document.getText({ start: { line: position.line, character: 0 }, end: position });
            const hasTrailingChar = !!prevText.match(/<[-\w]*$/);
            const offset = document.offsetAt(position);
            const node = parser_1.nodeAtOffset(yield doc.getAxmlTree(), offset);
            let list = [];
            if (node.type === 'tag' && !node.isEndTag) {
                if (offset > node.tagTextNode.offset + node.tagTextNode.length) {
                    list = yield this.doCompleteAttribute(node, doc);
                }
                else {
                    list = yield this.doCompleteTag(node, doc, hasTrailingChar);
                }
            }
            else if (node.type === 'text' || node.type === 'element') {
                if (!prevText.match(/<\/\s*[-\w]*$/)) {
                    list = yield this.doCompleteTag(node, doc, hasTrailingChar);
                }
            }
            else if (node.parent.type === 'attribute' && node.parent.name === node) {
                list = yield this.doCompleteAttribute(node.parent.parent, doc);
            }
            else if (node.parent.type === 'attribute' && node.parent.value === node) {
                list = yield this.doCompleteAttributeValue(node.parent, doc);
            }
            if (list.length > 0) {
                const wordRange = util_1.getWordRangeAtOffset(document, position);
                list.forEach(item => {
                    item.textEdit = vscode_languageserver_1.TextEdit.replace(wordRange, item.insertText || item.label);
                });
            }
            return list;
        });
    }
    doResolve(item) {
        return __awaiter(this, void 0, void 0, function* () {
            return item;
        });
    }
    doCompleteTag(node, doc, hasTrailingChar = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const whenContext = doc.getWhenContext(null, document_1.PageDocument.getElementNode(node));
            let components = yield doc.getAvailableComponents(whenContext);
            const list = Object.keys(components).map(k => {
                const component = components[k];
                let snippet = component.snippet || (component.singleTag ? `<${k} $1/>` : `<${k}>$1</${k}>`);
                if (hasTrailingChar) {
                    snippet = snippet.slice(1);
                }
                const item = {
                    label: k,
                    kind: component.isRef ? vscode_languageserver_1.CompletionItemKind.Reference : vscode_languageserver_1.CompletionItemKind.Property,
                    documentation: this.markdownDocumentation(component.description),
                    insertText: snippet,
                    insertTextFormat: vscode_languageserver_1.InsertTextFormat.Snippet,
                };
                return item;
            });
            return list;
        });
    }
    doCompleteAttribute(node, doc) {
        return __awaiter(this, void 0, void 0, function* () {
            const attributes = yield doc.getAvailableAttributes(node, true);
            const list = [];
            Object.keys(attributes).forEach(k => {
                const attr = attributes[k];
                if (attr.dependencies) {
                    if (attr.dependencies.some(k => !node.attributes.find(a => a.name.text === k))) {
                        return;
                    }
                }
                let snippet;
                if (attr.snippet === '') {
                    snippet = k;
                }
                else if (attr.snippet) {
                    snippet = `${k}="${attr.snippet}"`;
                }
                else if (attr.type === 'string' || attr.type === 'enum' || attr.type === 'event' || attr.type === 'color') {
                    snippet = `${k}="$1"`;
                }
                else {
                    snippet = `${k}="{{$1}}"`;
                }
                let doc = attr.description;
                if (attr.default !== undefined) {
                    doc += `\n\n默认值 \`${String(attr.default)}\``;
                }
                const item = {
                    label: k,
                    kind: attr.type === 'event' ? vscode_languageserver_1.CompletionItemKind.Event : vscode_languageserver_1.CompletionItemKind.Property,
                    detail: `(${attr.definition ? 'props' : 'attribute'}) ${k}: ${attr.type}`,
                    documentation: this.markdownDocumentation(doc),
                    insertText: snippet,
                    insertTextFormat: vscode_languageserver_1.InsertTextFormat.Snippet,
                };
                list.push(item);
            });
            return list;
        });
    }
    doCompleteAttributeValue(node, doc) {
        return __awaiter(this, void 0, void 0, function* () {
            const attributes = yield doc.getAvailableAttributes(node);
            const name = node.name.text;
            if (util_1.isClassAttr(name)) {
                return this.doCompleteSelector(doc, '.');
            }
            else if (name === 'id') {
                return this.doCompleteSelector(doc, '#');
            }
            else if (util_1.isEventAttr(name)) {
                return this.doCompleteEvent(doc);
            }
            else {
                const attr = attributes[name];
                if (attr && attr.enum) {
                    return attr.enum.map((e, i) => {
                        const item = {
                            label: e,
                            documentation: this.markdownDocumentation((attr.enumDescriptions || [])[i]),
                            kind: vscode_languageserver_1.CompletionItemKind.EnumMember,
                        };
                        return item;
                    });
                }
            }
            return [];
        });
    }
    doCompleteSelector(doc, prefix) {
        return __awaiter(this, void 0, void 0, function* () {
            const styles = yield doc.getStyles();
            const classes = Object.keys(styles).filter(k => k.startsWith(prefix));
            return classes.map(k => {
                const item = {
                    label: k.slice(prefix.length),
                    kind: vscode_languageserver_1.CompletionItemKind.Class
                };
                return item;
            });
        });
    }
    doCompleteEvent(doc) {
        return __awaiter(this, void 0, void 0, function* () {
            return Object.keys(doc.methods).map(k => {
                const method = doc.methods[k];
                const item = {
                    label: k,
                    kind: vscode_languageserver_1.CompletionItemKind.Method,
                    documentation: this.markdownDocumentation(method.documentation),
                    detail: method.type,
                };
                return item;
            });
        });
    }
    markdownDocumentation(doc) {
        if (doc) {
            return {
                kind: 'markdown',
                value: doc
            };
        }
        return undefined;
    }
}
exports.AXMLCompletion = AXMLCompletion;
//# sourceMappingURL=axmlCompletion.js.map