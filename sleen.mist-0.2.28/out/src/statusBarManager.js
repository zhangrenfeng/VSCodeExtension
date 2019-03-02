"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const mistDocument_1 = require("./mistDocument");
const previewProvider_1 = require("./previewProvider");
class StatusBarManager {
    static initialize() {
        this.dataItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        this.dataItem.tooltip = "选择模版关联的数据";
        vscode.commands.registerCommand('mist.selectData', () => {
            let editor = vscode.window.activeTextEditor;
            let doc = mistDocument_1.MistDocument.getDocumentByUri(editor.document.uri);
            let datas = doc.getDatas();
            let items = datas.map(d => {
                let item = { label: path.basename(d.file), detail: d.file, description: d.index > 0 ? `#${d.index + 1}` : null };
                return item;
            });
            vscode.window.showQuickPick(items).then(r => {
                if (!r)
                    return;
                let name = r.label + (r.description ? ' ' + r.description : '');
                doc.setData(name);
                this.updateDataItemForDocument(doc);
                previewProvider_1.MistContentProvider.sharedInstance.send('selectData', { name });
            });
        });
        this.onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
    }
    static updateDataItemForDocument(doc) {
        if (!doc)
            return;
        let datas = doc.getDatas();
        if (doc.getData()) {
            let text = '$(file-text) ' + doc.getData().description();
            if (datas.length > 1) {
                text += ` (共 ${datas.length} 处)`;
            }
            this.dataItem.text = text;
            this.dataItem.command = 'mist.selectData';
        }
        else if (datas && datas.length > 0) {
            this.dataItem.text = '$(file-text) Select Data...';
            this.dataItem.command = 'mist.selectData';
        }
        else {
            this.dataItem.text = '$(file-text) 未找到数据';
            this.dataItem.command = null;
        }
    }
    static onDidChangeActiveTextEditor(editor) {
        if (editor && editor.document.languageId === 'mist') {
            let doc = mistDocument_1.MistDocument.getDocumentByUri(editor.document.uri);
            this.updateDataItemForDocument(doc);
            this.dataItem.show();
        }
        else {
            this.dataItem.hide();
        }
    }
}
exports.StatusBarManager = StatusBarManager;
//# sourceMappingURL=statusBarManager.js.map