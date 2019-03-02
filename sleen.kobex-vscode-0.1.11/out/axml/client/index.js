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
const path = require("path");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
var FileChangeNotification;
(function (FileChangeNotification) {
    FileChangeNotification.type = new vscode_languageclient_1.NotificationType('kobex/fileEvent');
})(FileChangeNotification || (FileChangeNotification = {}));
var KobexCommands;
(function (KobexCommands) {
    KobexCommands.saveFile = 'kobex.saveFile';
})(KobexCommands = exports.KobexCommands || (exports.KobexCommands = {}));
let client;
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        // The server is implemented in node
        let serverModule = context.asAbsolutePath(path.join('languages', 'axml', 'server', 'out', 'server.js'));
        // The debug options for the server
        // --inspect=6111: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
        let debugOptions = { execArgv: ['--nolazy', '--inspect=6111'] };
        // If the extension is launched in debug mode then the debug server options are used
        // Otherwise the run options are used
        let serverOptions = {
            run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
            debug: {
                module: serverModule,
                transport: vscode_languageclient_1.TransportKind.ipc,
                options: debugOptions
            }
        };
        let clientOptions = {
            documentSelector: [{ scheme: 'file', language: 'axml' }],
            synchronize: {
                fileEvents: vscode_1.workspace.createFileSystemWatcher('**​/*.js')
            }
        };
        function onFileEvent(type, uri) {
            client.sendNotification(FileChangeNotification.type, { uri, type });
        }
        vscode_1.workspace.onDidSaveTextDocument(document => {
            const uri = document.uri.toString();
            if (['.ts', '.js', '.json', '.axml', '.acss'].indexOf(path.extname(uri)) >= 0) {
                onFileEvent(vscode_languageclient_1.FileChangeType.Changed, uri);
            }
        });
        // Create the language client and start the client.
        client = new vscode_languageclient_1.LanguageClient('axmlLanguageServer', 'AXML Language Server', serverOptions, clientOptions);
        // Start the client. This will also launch the server
        client.start();
        yield client.onReady();
        client.onNotification(KobexCommands.saveFile, (file) => __awaiter(this, void 0, void 0, function* () {
            const doc = yield vscode_1.workspace.openTextDocument(file);
            doc.save();
        }));
        context.subscriptions.push(vscode_1.languages.setLanguageConfiguration('axml', {
            onEnterRules: [
                {
                    beforeText: /<([_:\w][_:\w-.\d]*)([^\/>]*(?!\/)>)[^<]*$/i,
                    afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>/i,
                    action: { indentAction: vscode_1.IndentAction.IndentOutdent }
                },
                {
                    beforeText: /<(\w[\w\d]*)([^\/>]*(?!\/)>)[^<]*$/i,
                    action: { indentAction: vscode_1.IndentAction.Indent }
                }
            ],
        }));
    });
}
exports.activate = activate;
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
exports.deactivate = deactivate;
//# sourceMappingURL=index.js.map