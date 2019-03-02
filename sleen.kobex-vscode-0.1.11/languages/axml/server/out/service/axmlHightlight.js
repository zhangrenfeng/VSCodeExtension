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
class AXMLHighlight {
    doHighlight(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const node = yield this.getNodeAtPosition(document, position);
            if (node.type === 'string' && node.parent.type === 'tag') {
                const element = node.parent.parent;
                const ranges = [
                    util_1.createRange(element.tagStart.tagTextNode, document),
                    util_1.createRange(element.tagEnd ? element.tagEnd.tagTextNode : {
                        offset: element.offset + element.length - 2,
                        length: 2
                    }, document),
                ];
                return ranges.map(range => {
                    const highlight = {
                        kind: vscode_languageserver_1.DocumentHighlightKind.Text,
                        range
                    };
                    return highlight;
                });
            }
            return null;
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
exports.AXMLHighlight = AXMLHighlight;
//# sourceMappingURL=axmlHightlight.js.map