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
const parser_1 = require("../parser");
const util_1 = require("./util");
class AXMLRename {
    doRename(document, position, newName) {
        return __awaiter(this, void 0, void 0, function* () {
            const node = yield this.getNodeAtPosition(document, position);
            if (node.type === 'string' && node.parent.type === 'tag') {
                const element = node.parent.parent;
                const targetNodes = [element.tagStart, element.tagEnd].filter(t => t);
                return {
                    changes: {
                        [document.uri]: targetNodes.map(t => {
                            return vscode_languageserver_1.TextEdit.replace(util_1.createRange(t.tagTextNode, document), newName);
                        })
                    }
                };
            }
            return null;
        });
    }
    doPrepareRename(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const node = yield this.getNodeAtPosition(document, position);
            if (node.type === 'string' && node.parent.type === 'tag') {
                return util_1.createRange(node, document);
            }
            return Promise.reject('无法重命名此元素');
        });
    }
    getNodeAtPosition(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = yield document_1.PageDocument.getDocument(document.uri);
            position = util_1.getWordRangeAtOffset(document, position).start;
            return parser_1.nodeAtOffset(yield doc.getAxmlTree(), document.offsetAt(position));
        });
    }
}
exports.AXMLRename = AXMLRename;
//# sourceMappingURL=axmlRename.js.map