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
const vscode_languageserver_types_1 = require("vscode-languageserver-types");
const util_1 = require("./util");
const document_1 = require("./document");
const parser_1 = require("../parser");
class AXMLDefinition {
    doDefinition(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = yield document_1.PageDocument.getDocument(document.uri);
            const offset = document.offsetAt(position);
            const node = parser_1.nodeAtOffset(yield doc.getAxmlTree(), offset);
            if (node.type === 'string' && node.parent.type === 'tag') {
                return this.doDefinitionComponentTag(doc, node);
            }
            else if (node.parent.type === 'attribute' && node.parent.name === node) {
                return this.doDefinitionComponentAttribute(doc, node.parent);
            }
            else if (node.parent.type === 'attribute' && node.parent.value === node) {
                const attrName = node.parent.name.text;
                if (util_1.isClassAttr(attrName)) {
                    const word = util_1.getWordAtOffset(node.parent.value.text, offset - node.offset);
                    return this.doDefinitionSelector(doc, '.' + word);
                }
                else if (attrName === 'id') {
                    return this.doDefinitionSelector(doc, '#' + node.parent.value.text);
                }
                else if (util_1.isEventAttr(attrName)) {
                    return this.doDefinitionEvent(doc, node.parent.value.text);
                }
            }
            return null;
        });
    }
    doDefinitionComponentTag(doc, node) {
        return __awaiter(this, void 0, void 0, function* () {
            const element = document_1.PageDocument.getElementNode(node);
            const tagName = util_1.getTagName(element);
            const components = yield doc.getAvailableComponents();
            const component = components[tagName];
            if (component && component.isRef) {
                const componentPath = doc.getComponentPath(tagName);
                return {
                    uri: `file://${componentPath}.axml`,
                    range: {
                        start: vscode_languageserver_types_1.Position.create(0, 0),
                        end: vscode_languageserver_types_1.Position.create(0, 0)
                    }
                };
            }
            return null;
        });
    }
    doDefinitionComponentAttribute(doc, node) {
        return __awaiter(this, void 0, void 0, function* () {
            const attributes = yield doc.getAvailableAttributes(node);
            const attr = attributes[node.name.text];
            if (attr && attr.definition) {
                return this.createDefinition(attr.definition);
            }
            return null;
        });
    }
    doDefinitionSelector(doc, selector) {
        return __awaiter(this, void 0, void 0, function* () {
            const styles = yield doc.getStyles();
            const ranges = styles[selector];
            if (ranges && ranges.length > 0) {
                return yield Promise.all(ranges.map((d) => __awaiter(this, void 0, void 0, function* () { return yield this.createDefinition(d); })));
            }
            return null;
        });
    }
    doDefinitionEvent(doc, methodName) {
        return __awaiter(this, void 0, void 0, function* () {
            const method = doc.methods[methodName];
            if (method) {
                return this.createDefinition(method.definition);
            }
            return null;
        });
    }
    createDefinition(d) {
        return __awaiter(this, void 0, void 0, function* () {
            const { uri, range: { start, end } } = d;
            const doc = yield document_1.PageDocument.getTextDocument(uri);
            return {
                uri,
                range: {
                    start: doc.positionAt(start),
                    end: doc.positionAt(end)
                }
            };
        });
    }
}
exports.AXMLDefinition = AXMLDefinition;
//# sourceMappingURL=axmlDefinition.js.map