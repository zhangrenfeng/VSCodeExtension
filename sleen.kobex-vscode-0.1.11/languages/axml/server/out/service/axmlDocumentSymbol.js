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
const document_1 = require("./document");
const util_1 = require("./util");
class AXMLDocumentSymbol {
    doDocumentSymbol(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = yield document_1.PageDocument.getDocument(document.uri);
            const rootNode = yield doc.getAxmlTree();
            const symbols = [];
            rootNode.childNodes.forEach(child => this.visitNode(child, document, symbols));
            return symbols;
        });
    }
    visitNode(node, document, symbols) {
        if (node.type === 'element') {
            const children = [];
            node.childNodes.forEach(child => this.visitNode(child, document, children));
            const getAttrValue = (name) => {
                const attr = node.tagStart.attributes.find(attr => attr.name.text === name);
                if (attr) {
                    return attr.value ? attr.value.text : true;
                }
                return undefined;
            };
            let name = node.tagStart.tagTextNode.text;
            const id = getAttrValue('id');
            if (typeof id === 'string') {
                name += '#' + id;
            }
            const className = getAttrValue('class');
            if (typeof className === 'string') {
                name += this.getClassNames(className).map(c => '.' + c).join('');
            }
            symbols.push({
                kind: vscode_languageserver_1.SymbolKind.Object,
                name,
                range: util_1.createRange(node, document),
                selectionRange: util_1.createRange(node.tagStart.tagTextNode, document),
                children,
            });
        }
    }
    getClassNames(className) {
        const classNames = [];
        className = className.replace(/[-\w]*\{\{.*?}}[-\w]*/g, s => {
            classNames.push(s);
            return '';
        });
        classNames.unshift(...className.split(/\s/).filter(s => s));
        return classNames;
    }
}
exports.AXMLDocumentSymbol = AXMLDocumentSymbol;
//# sourceMappingURL=axmlDocumentSymbol.js.map