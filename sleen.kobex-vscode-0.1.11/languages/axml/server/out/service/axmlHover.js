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
const parser_1 = require("../parser");
const document_1 = require("./document");
const util_1 = require("./util");
class AXMLHover {
    doHover(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = yield document_1.PageDocument.getDocument(document.uri);
            const node = parser_1.nodeAtOffset(yield doc.getAxmlTree(), document.offsetAt(position));
            let hover = null;
            if (node.type === 'string') {
                if (node.parent.type === 'tag') {
                    hover = yield this.doHoverTag(node, doc);
                }
                else if (node.parent.type === 'attribute' && node.parent.name === node) {
                    hover = yield this.doHoverAttribute(node, doc);
                }
                else if (node.parent.type === 'attribute' && node.parent.value === node) {
                    hover = yield this.doHoverAttributeValue(node, doc);
                }
                if (hover) {
                    hover.range = util_1.createRange(node, document);
                }
            }
            return Promise.resolve(hover);
        });
    }
    doHoverTag(node, doc) {
        return __awaiter(this, void 0, void 0, function* () {
            const name = node.text;
            const components = yield doc.getAvailableComponents();
            const component = components[name];
            if (component) {
                return {
                    contents: {
                        kind: 'markdown',
                        value: component.description
                    }
                };
            }
            return null;
        });
    }
    doHoverAttribute(node, doc) {
        return __awaiter(this, void 0, void 0, function* () {
            const attributes = yield doc.getAvailableAttributes(node);
            const attrName = node.text;
            if (attrName in attributes) {
                const attr = attributes[attrName];
                let doc = attr.description;
                if (attr.default !== undefined) {
                    doc += `\n\n默认值 \`${String(attr.default)}\``;
                }
                return {
                    contents: {
                        kind: 'markdown',
                        value: [
                            '```typescript',
                            `(${attr.definition ? 'props' : 'attribute'}) ${attrName}: ${attr.type}`,
                            '```',
                            '',
                            doc,
                        ].join('\n')
                    }
                };
            }
            return null;
        });
    }
    doHoverAttributeValue(node, doc) {
        return __awaiter(this, void 0, void 0, function* () {
            const attributes = yield doc.getAvailableAttributes(node);
            const attrValue = node.text;
            const attrName = node.parent.name.text;
            if (util_1.isEventAttr(attrName)) {
                const method = doc.methods[attrValue];
                if (method) {
                    return {
                        contents: {
                            kind: 'markdown',
                            value: [
                                '```typescript',
                                `(method) ${attrValue}: ${method.type}`,
                                '```',
                                '',
                                method.documentation,
                            ].join('\n')
                        }
                    };
                }
            }
            else if (attrName in attributes) {
                const attr = attributes[attrName];
                if (attr.enum && attr.enumDescriptions) {
                    const index = attr.enum.indexOf(attrValue);
                    if (index >= 0) {
                        return {
                            contents: {
                                kind: 'markdown',
                                value: attr.enumDescriptions[index]
                            }
                        };
                    }
                }
            }
            return null;
        });
    }
}
exports.AXMLHover = AXMLHover;
//# sourceMappingURL=axmlHover.js.map