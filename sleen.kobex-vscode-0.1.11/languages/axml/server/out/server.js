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
const service_1 = require("./service");
const document_1 = require("./service/document");
var FileChangeNotification;
(function (FileChangeNotification) {
    FileChangeNotification.type = new vscode_languageserver_1.NotificationType('kobex/fileEvent');
})(FileChangeNotification || (FileChangeNotification = {}));
var KobexCommands;
(function (KobexCommands) {
    KobexCommands.saveFile = 'kobex.saveFile';
})(KobexCommands = exports.KobexCommands || (exports.KobexCommands = {}));
// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = vscode_languageserver_1.createConnection(vscode_languageserver_1.ProposedFeatures.all);
// Create a simple text document manager. The text document manager
// supports full document sync only
let documents = new vscode_languageserver_1.TextDocuments();
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
connection.onInitialize((params) => {
    let capabilities = params.capabilities;
    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
    hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            completionProvider: {
                resolveProvider: true
            },
            hoverProvider: true,
            definitionProvider: true,
            codeActionProvider: true,
            executeCommandProvider: {
                commands: [KobexCommands.saveFile]
            },
            renameProvider: {
                prepareProvider: true
            },
            foldingRangeProvider: true,
            documentSymbolProvider: true,
            documentHighlightProvider: true,
        }
    };
});
connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(vscode_languageserver_1.DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});
// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings = { maxNumberOfProblems: 1000 };
let globalSettings = defaultSettings;
// Cache the settings of all open documents
let documentSettings = new Map();
connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    }
    else {
        globalSettings = ((change.settings.languageServerExample || defaultSettings));
    }
    // Revalidate all open text documents
    documents.all().forEach(validateTextDocument);
});
const languageService = service_1.getLanguageService();
// Only keep settings for open documents
documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
});
documents.onDidChangeContent(change => {
    document_1.PageDocument.onTextDocumentChange(change.document);
    validateTextDocument(change.document);
});
function validateTextDocument(textDocument) {
    return __awaiter(this, void 0, void 0, function* () {
        const diagnostics = yield languageService.doValidation(textDocument);
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    });
}
connection.onNotification(FileChangeNotification.type, event => {
    document_1.PageDocument.onFileChange(event);
});
document_1.PageDocument.doValidation = uri => {
    const textDocument = documents.get(uri);
    if (textDocument) {
        validateTextDocument(textDocument);
    }
};
connection.onCompletion(textDocumentPosition => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    return languageService.doComplete(document, textDocumentPosition.position);
});
connection.onCompletionResolve(languageService.doResolve);
connection.onHover(textDocumentPosition => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    return languageService.doHover(document, textDocumentPosition.position);
});
connection.onDefinition(textDocumentPosition => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    return languageService.doDefinition(document, textDocumentPosition.position);
});
connection.onCodeAction(codeAction => {
    const document = documents.get(codeAction.textDocument.uri);
    return languageService.doCodeAction(document, codeAction.range, codeAction.context);
});
connection.onPrepareRename(params => {
    const document = documents.get(params.textDocument.uri);
    return languageService.doPrepareRename(document, params.position).catch(err => new vscode_languageserver_1.ResponseError(3001, err));
});
connection.onRenameRequest(params => {
    const document = documents.get(params.textDocument.uri);
    return languageService.doRename(document, params.position, params.newName);
});
connection.onFoldingRanges(params => {
    const document = documents.get(params.textDocument.uri);
    return languageService.doFoldingRanges(document);
});
connection.onDocumentSymbol(params => {
    const document = documents.get(params.textDocument.uri);
    return languageService.doDocumentSymbol(document);
});
connection.onExecuteCommand(command => {
    connection.console.log(command.command);
    connection.sendNotification(command.command, command.arguments);
});
connection.onDocumentHighlight(params => {
    const document = documents.get(params.textDocument.uri);
    return languageService.doHighlight(document, params.position);
});
/*
connection.onDidOpenTextDocument((params) => {
    // A text document got opened in VSCode.
    // params.uri uniquely identifies the document. For documents store on disk this is a file URI.
    // params.text the initial full content of the document.
    connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
    // The content of a text document did change in VSCode.
    // params.uri uniquely identifies the document.
    // params.contentChanges describe the content changes to the document.
    connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
    // A text document got closed in VSCode.
    // params.uri uniquely identifies the document.
    connection.console.log(`${params.textDocument.uri} closed.`);
});
*/
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);
// Listen on the connection
connection.listen();
//# sourceMappingURL=server.js.map