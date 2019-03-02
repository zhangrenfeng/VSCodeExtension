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
const document_1 = require("./document");
const util_1 = require("./util");
class AXMLFolding {
    doFoldingRanges(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = yield document_1.PageDocument.getDocument(document.uri);
            const rootNode = yield doc.getAxmlTree();
            const ranges = [];
            rootNode.childNodes.forEach(child => this.visitNode(child, document, ranges));
            return ranges;
        });
    }
    visitNode(node, document, ranges) {
        if (node.type === 'element') {
            const range = util_1.createRange(node, document);
            ranges.push({
                startLine: range.start.line,
                endLine: range.end.line - 1,
            });
            node.childNodes.forEach(child => this.visitNode(child, document, ranges));
        }
    }
}
exports.AXMLFolding = AXMLFolding;
//# sourceMappingURL=axmlFolding.js.map