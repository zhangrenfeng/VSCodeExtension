'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const mistDocument_1 = require("./mistDocument");
class MistCompletionProvider {
    provideDefinition(document, position, token) {
        return mistDocument_1.MistDocument.getDocumentByUri(document.uri).provideDefinition(position, token);
    }
    provideHover(document, position, token) {
        return mistDocument_1.MistDocument.getDocumentByUri(document.uri).provideHover(position, token);
    }
    provideCompletionItems(document, position, token) {
        return mistDocument_1.MistDocument.getDocumentByUri(document.uri).provideCompletionItems(position, token);
    }
    selectionDidChange(textEditor) {
        if (textEditor.selection.start.compareTo(textEditor.selection.end) !== 0) {
            return;
        }
        let doc = textEditor.document;
        let sel = textEditor.selection.start;
        if (textEditor.document.getText(new vscode.Range(doc.positionAt(doc.offsetAt(sel) - 1), doc.positionAt(doc.offsetAt(sel) + 1))) === '""') {
            vscode.commands.executeCommand("mist.triggerSuggest");
        }
    }
    isTriggerCharacter(c) {
        return c.length === 1 && MistCompletionProvider.triggerRE.test(c);
    }
    documentDidChange(textEditor, event) {
        let change = event.contentChanges[0];
        if (change.text === '{') {
            let prev = textEditor.document.getText(new vscode.Range(change.range.start.translate(0, -1), change.range.start));
            if (prev === '$') {
                textEditor.edit(edit => {
                    edit.insert(change.range.end.translate(0, 1), '}');
                }, { undoStopBefore: false, undoStopAfter: true }).then(() => {
                    let pos = change.range.end.translate(0, 1);
                    textEditor.selection = new vscode.Selection(pos, pos);
                });
            }
        }
        if (!this.isTriggerCharacter(change.text)) {
            return;
        }
        let doc = textEditor.document;
        let sel = textEditor.selection.start.translate(0, 1);
        let items = this.provideCompletionItems(doc, sel, null);
        if (items && items.length > 0) {
            vscode.commands.executeCommand("editor.action.triggerSuggest");
        }
    }
}
MistCompletionProvider.triggerRE = /[a-zA-Z_.]/;
exports.default = MistCompletionProvider;
//# sourceMappingURL=completionProvider.js.map