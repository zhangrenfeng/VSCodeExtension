'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mistDocument_1 = require("./mistDocument");
const convertor = require("./convertor");
const previewProvider_1 = require("./previewProvider");
const nodeTreeProvider_1 = require("./nodeTreeProvider");
const completionProvider_1 = require("./completionProvider");
const diagnosticProvider_1 = require("./diagnosticProvider");
const formatter_1 = require("./formatter");
const color = require("./utils/color");
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const vscode_1 = require("vscode");
const httpServer = require("http-server");
const request = require("request");
const signatureHelpProvider_1 = require("./signatureHelpProvider");
const statusBarManager_1 = require("./statusBarManager");
function activate(context) {
    setupMistDocument(context);
    setupStatusBarManager(context);
    registerConvertor(context);
    registerMistServer(context);
    registerPreviewProvider(context);
    registerNodeTreeProvider(context);
    registerCompletionProvider(context);
    registerSignatureHelpProvider(context);
    registerDiagnosticProvider(context);
    registerValidateWorkspace(context);
    registerFormatter(context);
    registerColorDecorations(context);
}
exports.activate = activate;
function setupStatusBarManager(context) {
    statusBarManager_1.StatusBarManager.initialize();
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        statusBarManager_1.StatusBarManager.onDidChangeActiveTextEditor(editor);
    }));
}
function setupMistDocument(context) {
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => {
        mistDocument_1.MistDocument.onDidOpenTextDocument(document);
    }));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(document => {
        mistDocument_1.MistDocument.onDidCloseTextDocument(document);
    }));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
        mistDocument_1.MistDocument.onDidSaveTextDocument(document);
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        mistDocument_1.MistDocument.onDidChangeTextDocument(event);
    }));
    mistDocument_1.MistDocument.initialize();
}
let stopServerFunc;
function deactivate(context) {
    if (stopServerFunc) {
        return stopServerFunc();
    }
}
exports.deactivate = deactivate;
function registerMistServer(context) {
    let server;
    let output;
    vscode.workspace.getConfiguration().update('mist.isDebugging', false);
    context.subscriptions.push(vscode_1.commands.registerCommand('mist.startServer', uri => {
        if (server) {
            return;
        }
        let workingDir = vscode.workspace.rootPath;
        if (!workingDir) {
            vscode.window.showErrorMessage("未打开文件夹");
            return;
        }
        let options = {
            root: workingDir,
            logFn: (req, res, err) => {
                output.appendLine(`> GET\t${req.url}`);
            }
        };
        let serverPort = 10001;
        server = httpServer.createServer(options);
        server.server.once("error", err => {
            server = null;
            let errMsg;
            if (err.code === 'EADDRINUSE') {
                errMsg = "Port 10001 already in use. Use <lsof -i tcp:10001> then <kill $PID> to free.";
            }
            else {
                errMsg = "Failed to start server. " + err.message;
            }
            vscode.window.showErrorMessage(errMsg);
        });
        server.listen(serverPort, "0.0.0.0", function () {
            vscode.workspace.getConfiguration().update('mist.isDebugging', true);
            output = vscode.window.createOutputChannel("Mist Debug Server");
            output.show();
            output.appendLine(`> Start mist debug server at 127.0.0.1:${serverPort}`);
        });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('mist.stopServer', uri => {
        stopServer();
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('mist.debugAndroid', args => {
        // push current file to Android
        require('child_process').exec('adb shell ip route', function (error, stdout, stderr) {
            var ptr = stdout.indexOf("scope link  src ");
            if (ptr <= 0) {
                console.log("failed read ip from adb!");
                vscode.window.showErrorMessage("从adb获取手机IP失败，请使用USB连接手机。");
                return;
            }
            var ptr = ptr + "scope link  src ".length;
            var ip = stdout.substr(ptr).trim();
            console.log("device [" + ip + "]");
            var fileUri = vscode.window.activeTextEditor.document.uri;
            var file = fileUri.toString().substring(7);
            var filePath = path.parse(file);
            var templateName = filePath.name;
            filePath = path.parse(filePath.dir);
            var templateConfigPath = filePath.dir + "/.template_config.json";
            fs.exists(templateConfigPath, function (tplConfigExist) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (!tplConfigExist) {
                        vscode.window.showErrorMessage("配置文件不存在。请填写业务前缀并保存（如：KOUBEI）。");
                        let doc = yield vscode.workspace.openTextDocument(vscode.Uri.parse(`untitled:${templateConfigPath}`));
                        let editor = yield vscode.window.showTextDocument(doc);
                        editor.insertSnippet(new vscode.SnippetString(`{
    "bizCode": "$0"
}`));
                        return;
                    }
                    console.log("current file : " + fileUri + " template_config file : " + templateConfigPath + (tplConfigExist ? "" : " is not exist!"));
                    var cfg_content = fs.readFileSync(templateConfigPath, "UTF-8");
                    var cfg = JSON.parse(cfg_content);
                    console.log("bizCode:" + cfg.bizCode);
                    let templateContent;
                    try {
                        var JsoncParser = require("jsonc-parser");
                        var content = JSON.stringify(JsoncParser.parse(vscode.window.activeTextEditor.document.getText(), "", { disallowComments: false, allowTrailingComma: true }));
                        console.log("templateContent : " + content);
                        templateContent = encodeURIComponent(content);
                    }
                    catch (e) {
                        vscode.window.showErrorMessage("模板格式错误：" + e.message);
                        return;
                    }
                    var content = 'templateName=' + cfg.bizCode + "@" + templateName + "&templateHtml=" + templateContent; // + "// timestamp = " + process.hrtime();
                    let headers = {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    };
                    let url = `http://${ip}:9012/update`;
                    request.post({
                        url,
                        headers,
                        form: content
                    }, (err, res, data) => {
                        console.log(err, res, data);
                        if (err) {
                            vscode.window.showErrorMessage("传输模板到手机失败：" + err.message);
                        }
                        else {
                            vscode.window.showInformationMessage("模板已传输到手机");
                        }
                    });
                });
            });
        });
    }));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
        let validFormat = previewProvider_1.isMistFile(document) || document.uri.path.endsWith('.json');
        if (!validFormat || !server) {
            return;
        }
        let clientPort = 10002;
        let options = {
            hostname: '0.0.0.0',
            port: clientPort,
            method: 'GET',
            path: '/refresh'
        };
        var req = require('http').request(options, null);
        req.on('error', (e) => {
            console.log(`SIMULATOR NOT RESPONSE: ${e.message}\n`);
        });
        req.end();
    }));
    function stopServer() {
        if (server) {
            server.close();
            server = null;
        }
        if (output) {
            output.clear();
            output.hide();
            output.dispose();
            output = null;
        }
        if (vscode.workspace.rootPath) {
            // return vscode.workspace.getConfiguration().update('mist.isDebugging', false);
            // direct read/write the settings file cause update configuration dose not work in `deactivate`
            let settingsPath = `${vscode.workspace.rootPath}/.vscode/settings.json`;
            let text = fs.readFileSync(settingsPath).toString();
            let settings = JSON.parse(text);
            if (settings && settings["mist.isDebugging"]) {
                settings["mist.isDebugging"] = false;
                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
            }
        }
    }
    stopServerFunc = stopServer;
}
function registerPreviewProvider(context) {
    previewProvider_1.MistContentProvider.context = context;
    const contentProvider = previewProvider_1.MistContentProvider.sharedInstance;
    const contentProviderRegistration = vscode.workspace.registerTextDocumentContentProvider('mist-preview', contentProvider);
    context.subscriptions.push(contentProviderRegistration);
    context.subscriptions.push(vscode_1.commands.registerCommand('mist.showPreviewToSide', uri => {
        let resource = uri;
        if (!(resource instanceof vscode.Uri)) {
            if (vscode.window.activeTextEditor) {
                // we are relaxed and don't check for markdown files
                resource = vscode.window.activeTextEditor.document.uri;
            }
        }
        return vscode.commands.executeCommand('vscode.previewHtml', 'mist-preview://shared', vscode.ViewColumn.Two, 'Mist Preview');
    }));
    context.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(editors => {
        contentProvider.update('shared');
    }));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
        if (previewProvider_1.isMistFile(document)) {
            contentProvider.update(document.uri.toString());
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        if (previewProvider_1.isMistFile(event.document)) {
            contentProvider.update(event.document.uri.toString());
        }
    }));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(event => {
        if (event.textEditor.document.languageId === 'mist') {
            contentProvider.selectionDidChange(event.textEditor);
        }
    }));
}
function registerConvertor(context) {
    context.subscriptions.push(vscode_1.commands.registerTextEditorCommand('mist.convertToNew', (textEditor, edit) => {
        try {
            let isHomePage = path.basename(textEditor.document.fileName).startsWith('home_');
            let [newText, error, todoCount] = convertor.convertToNewFormat(textEditor.document.getText(), isHomePage);
            if (error) {
                vscode.window.showErrorMessage(error);
            }
            else {
                textEditor.edit(edit => edit.replace(new vscode.Range(textEditor.document.positionAt(0), textEditor.document.positionAt(textEditor.document.getText().length)), newText)).then(success => {
                    if (todoCount > 0) {
                        vscode.window.showInformationMessage("有 " + todoCount + " 个需要检查的地方");
                        let todoMark = "// TODO";
                        let index = textEditor.document.getText().indexOf(todoMark);
                        textEditor.selection = new vscode.Selection(textEditor.document.positionAt(index), textEditor.document.positionAt(index + todoMark.length));
                        textEditor.revealRange(textEditor.selection);
                        vscode.commands.executeCommand("actions.find");
                    }
                });
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(error);
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('mist.convertAll', args => {
        if (!vscode.workspace.rootPath) {
            vscode.window.showErrorMessage("未打开文件夹");
            return;
        }
        vscode.window.showInformationMessage("该操作可能会修改当前目录下的所有 .mist 文件，且无法撤销，确定要继续吗？", "确定").then(result => {
            if (result === "确定") {
                vscode.workspace.findFiles("*.mist").then(files => {
                    if (files.length === 0) {
                        vscode.window.showWarningMessage("没有找到 .mist 模版文件");
                        return;
                    }
                    let allTodoCount = 0;
                    let successCount = 0;
                    let failedCount = 0;
                    files.forEach(uri => {
                        let filePath = uri.fsPath;
                        let text = fs.readFileSync(filePath, "utf-8");
                        try {
                            let fileName = path.basename(filePath);
                            let [newText, error, todoCount] = convertor.convertToNewFormat(text, fileName.startsWith("home_"));
                            allTodoCount += todoCount;
                            if (error) {
                                throw error;
                            }
                            else {
                                fs.writeFileSync(filePath, newText, { encoding: "utf-8" });
                                console.log('"' + filePath + '" 转换成功');
                                successCount++;
                            }
                        }
                        catch (error) {
                            console.error('"' + filePath + '" 转换失败，' + error);
                            failedCount++;
                        }
                    });
                    let info = "转换完成，其中 " + successCount + " 个成功，" + failedCount + " 个失败" + (allTodoCount > 0 ? "，共有 " + allTodoCount + " 个需要检查的地方，已用 '// TODO' 标记" : "");
                    vscode.window.showInformationMessage(info);
                });
            }
        });
    }));
}
function registerNodeTreeProvider(context) {
    const nodeTreeProvider = new nodeTreeProvider_1.default(context);
    const symbolsProviderRegistration = vscode.languages.registerDocumentSymbolProvider({ language: 'mist' }, nodeTreeProvider);
    vscode.window.registerTreeDataProvider('mistNodeTree', nodeTreeProvider);
    vscode.commands.registerCommand('mist.openNodeSelection', range => {
        nodeTreeProvider.select(range);
    });
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
        if (document.languageId === 'mist') {
            nodeTreeProvider.update();
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'mist') {
            nodeTreeProvider.update();
        }
    }));
}
function registerCompletionProvider(context) {
    let completionProvider = new completionProvider_1.default();
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: 'mist' }, completionProvider));
    context.subscriptions.push(vscode.languages.registerHoverProvider({ language: 'mist' }, completionProvider));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider({ language: 'mist' }, completionProvider));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(event => {
        if (event.textEditor.document.languageId === 'mist') {
            completionProvider.selectionDidChange(event.textEditor);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'mist') {
            let textEditor = vscode.window.visibleTextEditors.find(e => e.document === event.document);
            completionProvider.documentDidChange(textEditor, event);
        }
    }));
    vscode.commands.registerCommand("mist.moveToLineEnd", () => {
        let textEditor = vscode.window.activeTextEditor;
        if (!textEditor)
            return;
        let pos = textEditor.selection.end.translate(0, 2);
        textEditor.selection = new vscode.Selection(pos, pos);
    });
    vscode.commands.registerCommand("mist.triggerSuggest", () => {
        let textEditor = vscode.window.activeTextEditor;
        if (!textEditor)
            return;
        let doc = textEditor.document;
        let sel = textEditor.selection.start;
        let items = completionProvider.provideCompletionItems(doc, sel, null);
        if (items && items.length > 0) {
            vscode.commands.executeCommand("editor.action.triggerSuggest");
        }
    });
}
function registerSignatureHelpProvider(context) {
    let signatureHelpProvider = new signatureHelpProvider_1.MistSignatureHelpProvider();
    context.subscriptions.push(vscode.languages.registerSignatureHelpProvider({ language: 'mist' }, signatureHelpProvider, '(', ','));
}
let diagnosticProvider;
function registerDiagnosticProvider(context) {
    diagnosticProvider = new diagnosticProvider_1.default(context);
    context.subscriptions.push(diagnosticProvider);
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        diagnosticProvider.onChange(event.document);
    }));
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => {
        diagnosticProvider.onChange(document);
    }));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
        diagnosticProvider.onChange(document);
    }));
}
function registerValidateWorkspace(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand('mist.validateWorkspace', () => {
        if (!vscode.workspace.rootPath) {
            vscode.window.showWarningMessage("未打开文件夹");
            return;
        }
        vscode.workspace.findFiles("*.mist").then(files => {
            if (files.length === 0) {
                vscode.window.showWarningMessage("没有找到 .mist 模版文件");
                return;
            }
            let promises = files.map(uri => vscode.workspace.openTextDocument(uri).then(doc => diagnosticProvider.validate(doc)));
            Promise.all(promises).then(() => {
                vscode.commands.executeCommand("workbench.action.problems.focus");
            });
        });
    }));
}
function registerFormatter(context) {
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider('mist', {
        provideDocumentFormattingEdits(doc, options, token) {
            return formatter_1.format(doc, null, options);
        }
    }));
    context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider('mist', {
        provideDocumentRangeFormattingEdits(doc, range, options, token) {
            return formatter_1.format(doc, range, options);
        }
    }));
    context.subscriptions.push(vscode.languages.registerOnTypeFormattingEditProvider('mist', {
        provideOnTypeFormattingEdits(doc, pos, ch, options, token) {
            if (ch === '\n') {
                const lineRange = doc.lineAt(pos.translate(-1)).range;
                const p = lineRange.end;
                const edits = formatter_1.format(doc, lineRange, options);
                let text = doc.getText(lineRange);
                // 换行时追加逗号
                if (text.match(/((:\s*(true|false|null|-?\d+(\.\d+)?([eE][+-]?\d+)?|"[.*]"))|["\]}])\s*$/)) {
                    edits.push(new vscode.TextEdit(new vscode.Range(p, p), ','));
                }
                return edits;
            }
            else {
                return formatter_1.format(doc, doc.lineAt(pos).range, options);
            }
        }
    }, '\n', ':', '"', '{', '['));
}
function registerColorDecorations(context) {
    let decorationType = vscode.window.createTextEditorDecorationType({
        before: {
            contentText: ' ',
            border: 'solid 0.1em #000',
            margin: '0.1em 0.2em 0 0.2em',
            width: '0.8em',
            height: '0.8em',
        },
        dark: {
            before: {
                border: 'solid 0.1em #eee'
            }
        }
    });
    context.subscriptions.push(decorationType);
    function _updateColorDecorations(document) {
        if (!document) {
            return;
        }
        let textEditor = vscode.window.visibleTextEditors.find(e => e.document === document);
        if (!textEditor) {
            return;
        }
        if (document.languageId !== 'mist') {
            textEditor.setDecorations(decorationType, []);
            return;
        }
        let colorResults = [];
        let text = document.getText();
        let colorRE = /#((([a-fA-F0-9]{2}){3,4})|([a-fA-F0-9]{3,4}))\b/mg;
        let match;
        while (match = colorRE.exec(text)) {
            colorResults.push({ color: match[0], offset: match.index });
        }
        textEditor.setDecorations(decorationType, []);
        textEditor.setDecorations(decorationType, colorResults.map(c => {
            let position = document.positionAt(c.offset);
            let cl = color.cssColor(c.color);
            return {
                range: new vscode.Range(position, position),
                renderOptions: {
                    before: {
                        backgroundColor: cl
                    }
                }
            };
        }));
    }
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        _updateColorDecorations(event.document);
    }));
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => {
        _updateColorDecorations(document);
    }));
    vscode.window.onDidChangeVisibleTextEditors(editors => {
        for (let editor of editors) {
            _updateColorDecorations(editor.document);
        }
    }, null, [decorationType]);
    function updateAllEditors() {
        vscode.window.visibleTextEditors.forEach(editor => {
            if (editor.document) {
                _updateColorDecorations(editor.document);
            }
        });
    }
    updateAllEditors();
}
//# sourceMappingURL=mistMain.js.map