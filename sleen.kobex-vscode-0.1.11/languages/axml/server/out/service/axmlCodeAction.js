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
const axmlParser_1 = require("../parser/axmlParser");
const parser_1 = require("../parser");
const util_1 = require("./util");
const path = require("path");
const document_1 = require("./document");
const server_1 = require("../server");
class AXMLCodeAction {
    doCodeAction(document, range, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = yield document_1.PageDocument.getDocument(document.uri);
            const offset = document.offsetAt(range.start);
            const node = parser_1.nodeAtOffset(yield doc.getAxmlTree(), offset);
            const list = [];
            yield Promise.all(context.diagnostics.map((d) => __awaiter(this, void 0, void 0, function* () {
                if (typeof (d.code) !== 'number') {
                    return;
                }
                switch (d.code) {
                    case 1000 + axmlParser_1.ErrorCode.TagNotMatch:
                        {
                            const action = this.tagNotMatchAction(document, node);
                            if (action) {
                                list.push(action);
                            }
                            break;
                        }
                    case 2001:
                    case 2003:
                        {
                            const action = this.removeAttributeAction(document, node);
                            if (action) {
                                list.push(action);
                            }
                            break;
                        }
                    case 2007:
                        {
                            const actions = yield this.createSelectorActions(document, node, range);
                            list.push(...actions);
                            break;
                        }
                }
            })));
            list.push(...yield this.createRefactorActions(document_1.PageDocument.getElementNode(node), document));
            return list;
        });
    }
    tagNotMatchAction(document, node) {
        if (node.type === 'string') {
            node = node.parent;
        }
        if (node.type === 'tag' && node.isEndTag) {
            const tagName = node.parent.tagStart.tagTextNode.text;
            return {
                title: `修改为 \`${tagName}\``,
                kind: vscode_languageserver_1.CodeActionKind.QuickFix,
                edit: {
                    changes: {
                        [document.uri]: [vscode_languageserver_1.TextEdit.replace({
                                start: document.positionAt(node.tagTextNode.offset),
                                end: document.positionAt(node.tagTextNode.offset + node.tagTextNode.length)
                            }, tagName)]
                    }
                }
            };
        }
        return null;
    }
    removeAttributeAction(document, node) {
        if (node.type === 'string') {
            node = node.parent;
        }
        if (node.type === 'attribute') {
            const attrName = node.name.text;
            return {
                title: `移除属性 \`${attrName}\``,
                kind: vscode_languageserver_1.CodeActionKind.QuickFix,
                edit: {
                    changes: {
                        [document.uri]: [vscode_languageserver_1.TextEdit.del({
                                start: document.positionAt(node.offset - 1),
                                end: document.positionAt(node.offset + node.length)
                            })]
                    }
                }
            };
        }
        return null;
    }
    createSelectorActions(document, node, range) {
        return __awaiter(this, void 0, void 0, function* () {
            if (node.type === 'string') {
                node = node.parent;
            }
            if (node.type === 'attribute') {
                const list = [];
                let selector;
                const attrName = node.name.text;
                if (util_1.isClassAttr(attrName)) {
                    const pos = range.start;
                    const textOfLine = document.getText(vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(pos.line, 0), vscode_languageserver_1.Position.create(pos.line + 1, 0)));
                    const word = util_1.getWordAtOffset(textOfLine, pos.character);
                    selector = '.' + word;
                }
                else if (attrName === 'id' && node.value) {
                    selector = '#' + node.value.text;
                }
                else {
                    return [];
                }
                const axmlPath = util_1.pathFromUri(document.uri);
                const doc = yield document_1.PageDocument.getDocument(axmlPath);
                const acssPath = path.join(path.dirname(axmlPath), path.basename(axmlPath, '.axml') + '.acss');
                const appAcssPath = path.join(doc.appPath, 'app.acss');
                list.push(this.createSelectorAction(selector, acssPath));
                list.push(this.createSelectorAction(selector, appAcssPath));
                return list;
            }
            return [];
        });
    }
    createSelectorAction(selector, file) {
        const style = `
${selector} {

}
`;
        const uri = `file://${file}`;
        return {
            title: `在 \`${path.basename(file)}\` 中新增样式 \`${selector}\``,
            kind: vscode_languageserver_1.CodeActionKind.QuickFix,
            edit: {
                changes: {
                    [uri]: [vscode_languageserver_1.TextEdit.insert(vscode_languageserver_1.Position.create(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), style)]
                }
            },
            command: {
                title: 'save',
                command: server_1.KobexCommands.saveFile,
                arguments: [file]
            }
        };
    }
    createRefactorActions(element, document) {
        const actions = [];
        this.createWrapAction(element, document, actions);
        this.createUnwrapAction(element, document, actions);
        return actions;
    }
    createWrapAction(element, document, actions) {
        const elementRange = util_1.createRange(element, document);
        const trailingSpaces = document.getText(vscode_languageserver_1.Range.create({ line: elementRange.start.line, character: 0 }, elementRange.start)).match(/^\s*/)[0];
        actions.push({
            title: `增加层级`,
            kind: vscode_languageserver_1.CodeActionKind.Refactor,
            edit: {
                changes: {
                    [document.uri]: [vscode_languageserver_1.TextEdit.replace(elementRange, `<view>
  ${trailingSpaces}${document.getText(elementRange).replace(/\n/g, '\n  ')}
${trailingSpaces}</view>`)]
                }
            }
        });
    }
    createUnwrapAction(element, document, actions) {
        const elementRange = util_1.createRange(element, document);
        if (element.tagEnd && element.childNodes.length > 0) {
            const firstChild = element.childNodes[0];
            const lastChild = element.childNodes[element.childNodes.length - 1];
            let offset = firstChild.offset;
            if (firstChild.type === 'text') {
                offset += document.getText(util_1.createRange(firstChild, document)).search(/[^\s]/);
            }
            let end;
            if (lastChild.type === 'text') {
                end = lastChild.offset + document.getText(util_1.createRange(lastChild, document)).search(/\s*$/);
            }
            else {
                end = lastChild.offset + lastChild.length;
            }
            const childrenRange = util_1.createRange({ offset, length: end - offset }, document);
            actions.push({
                title: `删除层级`,
                kind: vscode_languageserver_1.CodeActionKind.Refactor,
                edit: {
                    changes: {
                        [document.uri]: [vscode_languageserver_1.TextEdit.replace(elementRange, document.getText(childrenRange).replace(/\n(  |\t)/g, '\n'))]
                    }
                }
            });
        }
    }
}
exports.AXMLCodeAction = AXMLCodeAction;
//# sourceMappingURL=axmlCodeAction.js.map