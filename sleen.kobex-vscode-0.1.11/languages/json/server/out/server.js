"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
const URL = require("url");
const path = require("path");
const jsonc = require("jsonc-parser");
const runner_1 = require("./utils/runner");
const vscode_json_languageservice_1 = require("vscode-json-languageservice");
const languageModelCache_1 = require("./languageModelCache");
const schemas_1 = require("./schemas");
const utils_1 = require("./utils");
var ConfigChangeNotification;
(function (ConfigChangeNotification) {
    ConfigChangeNotification.type = new vscode_languageserver_1.NotificationType('kobex/configChange');
})(ConfigChangeNotification || (ConfigChangeNotification = {}));
// Create a connection for the server
const connection = vscode_languageserver_1.createConnection();
process.on('unhandledRejection', (e) => {
    console.error(runner_1.formatError(`Unhandled exception`, e));
});
process.on('uncaughtException', (e) => {
    console.error(runner_1.formatError(`Unhandled exception`, e));
});
console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);
const workspaceContext = {
    resolveRelativePath: (relativePath, resource) => {
        return URL.resolve(resource, relativePath);
    }
};
// create the JSON language service
let languageService = vscode_json_languageservice_1.getLanguageService({
    workspaceContext,
    contributions: [],
});
// Create a simple text document manager. The text document manager
// supports full document sync only
const documents = new vscode_languageserver_1.TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);
let clientSnippetSupport = false;
// After the server has started the client sends an initialize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities.
connection.onInitialize((params) => {
    languageService = vscode_json_languageservice_1.getLanguageService({
        workspaceContext,
        contributions: [],
        clientCapabilities: params.capabilities
    });
    function getClientCapability(name, def) {
        const keys = name.split('.');
        let c = params.capabilities;
        for (let i = 0; c && i < keys.length; i++) {
            if (!c.hasOwnProperty(keys[i])) {
                return def;
            }
            c = c[keys[i]];
        }
        return c;
    }
    clientSnippetSupport = getClientCapability('textDocument.completion.completionItem.snippetSupport', false);
    const capabilities = {
        // Tell the client that the server works in FULL text document sync mode
        textDocumentSync: documents.syncKind,
        completionProvider: clientSnippetSupport ? { resolveProvider: true, triggerCharacters: ['"', ':'] } : undefined,
        hoverProvider: true,
        documentLinkProvider: {
            resolveProvider: false
        },
    };
    return { capabilities };
});
let appMap = {};
let configJsonMap = {};
connection.onNotification(ConfigChangeNotification.type, map => {
    appMap = map;
    updateConfiguration();
});
function updateConfiguration() {
    return __awaiter(this, void 0, void 0, function* () {
        const languageSettings = {
            validate: true,
            allowComments: true,
            schemas: new Array()
        };
        for (const appPath in appMap) {
            const appInfo = appMap[appPath];
            const pages = Object.keys(appInfo.items).filter(k => !appInfo.items[k].isComponent);
            const components = Object.keys(appInfo.items).filter(k => appInfo.items[k].isComponent);
            languageSettings.schemas.push({
                uri: 'vscode://schemas/kobex/app' + appPath,
                fileMatch: [appPath + '/app.json'],
                schema: yield schemas_1.appSchema(appPath, pages)
            });
            for (const itemPath in appInfo.items) {
                languageSettings.schemas.push({
                    uri: 'vscode://schemas/kobex/page' + itemPath,
                    fileMatch: [itemPath + '.json'],
                    schema: yield schemas_1.pageSchema(appPath, itemPath, components)
                });
            }
        }
        const map = {};
        languageSettings.schemas.forEach(s => {
            const uri = 'file://' + s.fileMatch[0];
            map[uri] = 1;
        });
        configJsonMap = map;
        languageService.configure(languageSettings);
        // Revalidate any open text documents
        documents.all().forEach(triggerValidation);
    });
}
// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
    triggerValidation(change.document);
});
// a document has closed: clear all diagnostics
documents.onDidClose(event => {
    cleanPendingValidation(event.document);
    connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});
const pendingValidationRequests = {};
const validationDelayMs = 500;
function cleanPendingValidation(textDocument) {
    const request = pendingValidationRequests[textDocument.uri];
    if (request) {
        clearTimeout(request);
        delete pendingValidationRequests[textDocument.uri];
    }
}
function triggerValidation(textDocument) {
    cleanPendingValidation(textDocument);
    pendingValidationRequests[textDocument.uri] = setTimeout(() => {
        delete pendingValidationRequests[textDocument.uri];
        validateTextDocument(textDocument);
    }, validationDelayMs);
}
function validateTextDocument(textDocument, callback) {
    const respond = (diagnostics) => {
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
        if (callback) {
            callback(diagnostics);
        }
    };
    // 只对小程序的json配置文件做错误检查
    if (!(textDocument.uri in configJsonMap)) {
        respond([]);
        return;
    }
    if (textDocument.getText().length === 0) {
        respond([]); // ignore empty documents
        return;
    }
    const jsonDocument = getJSONDocument(textDocument);
    const version = textDocument.version;
    const documentSettings = textDocument.languageId === 'jsonc' ? { comments: 'ignore', trailingCommas: 'ignore' } : { comments: 'error', trailingCommas: 'error' };
    languageService.doValidation(textDocument, jsonDocument, documentSettings).then(diagnostics => {
        setTimeout(() => {
            const currDocument = documents.get(textDocument.uri);
            if (currDocument && currDocument.version === version) {
                // json语法错误由自带插件输出，这里不输出
                diagnostics = diagnostics.filter(d => d.source !== 'json');
                respond(diagnostics); // Send the computed diagnostics to VSCode.
            }
        }, 100);
    }, error => {
        connection.console.error(runner_1.formatError(`Error while validating ${textDocument.uri}`, error));
    });
}
const jsonDocuments = languageModelCache_1.getLanguageModelCache(10, 60, document => languageService.parseJSONDocument(document));
documents.onDidClose(e => {
    jsonDocuments.onDocumentRemoved(e.document);
});
connection.onShutdown(() => {
    jsonDocuments.dispose();
});
function getJSONDocument(document) {
    return jsonDocuments.get(document);
}
connection.onCompletion((textDocumentPosition, token) => {
    if (!(textDocumentPosition.textDocument.uri in configJsonMap)) {
        return null;
    }
    return runner_1.runSafeAsync(() => __awaiter(this, void 0, void 0, function* () {
        const document = documents.get(textDocumentPosition.textDocument.uri);
        if (document) {
            const jsonDocument = getJSONDocument(document);
            const loc = jsonc.getLocation(document.getText(), document.offsetAt(textDocumentPosition.position));
            const filePath = document.uri.slice('file://'.length);
            const appPath = utils_1.getAppPath(appMap, filePath);
            if (!appPath)
                return null;
            const appInfo = appMap[appPath];
            if (!appInfo)
                return null;
            const itemPath = filePath.slice(0, -5);
            const itemInfo = appInfo.items[itemPath];
            if (!itemInfo)
                return null;
            if (loc.path.length === 2 && loc.path[0] === 'usingComponents' && typeof loc.path[1] === 'string') {
                const components = Object.keys(appInfo.items).filter(k => appInfo.items[k].isComponent);
                const items = [];
                components.forEach(componentPath => {
                    let componentName;
                    const pathToApp = path.relative(appPath, componentPath);
                    const pathToItem = path.relative(path.dirname(itemPath), componentPath);
                    if (pathToApp.startsWith('node_modules/')) {
                        componentName = pathToApp.slice('node_modules/'.length);
                    }
                    else if (pathToItem.startsWith('.')) {
                        componentName = '/' + pathToApp;
                    }
                    else {
                        componentName = './' + pathToItem;
                    }
                    let item;
                    if (loc.isAtPropertyKey) {
                        let tagName = path.basename(componentPath);
                        if (tagName === 'index') {
                            tagName = path.basename(path.dirname(componentPath));
                        }
                        item = {
                            label: `"${tagName}"`,
                            insertText: `"${tagName}": "${componentName}"`,
                            detail: componentName
                        };
                    }
                    else {
                        item = {
                            label: `"${componentName}"`,
                            insertText: `"${componentName}"`
                        };
                    }
                    if (loc.previousNode) {
                        item.insertText = item.insertText.slice(0, -1);
                    }
                    item.kind = vscode_languageserver_1.CompletionItemKind.Enum;
                    items.push(item);
                });
                return items;
            }
            return languageService.doComplete(document, textDocumentPosition.position, jsonDocument);
        }
        return null;
    }), null, `Error while computing completions for ${textDocumentPosition.textDocument.uri}`, token);
});
connection.onCompletionResolve((completionItem, token) => {
    return runner_1.runSafeAsync(() => {
        return languageService.doResolve(completionItem);
    }, completionItem, `Error while resolving completion proposal`, token);
});
connection.onHover((textDocumentPositionParams, token) => {
    if (!(textDocumentPositionParams.textDocument.uri in configJsonMap)) {
        return null;
    }
    return runner_1.runSafeAsync(() => __awaiter(this, void 0, void 0, function* () {
        const document = documents.get(textDocumentPositionParams.textDocument.uri);
        if (document) {
            const jsonDocument = getJSONDocument(document);
            return languageService.doHover(document, textDocumentPositionParams.position, jsonDocument);
        }
        return null;
    }), null, `Error while computing hover for ${textDocumentPositionParams.textDocument.uri}`, token);
});
connection.onDocumentLinks((params, token) => {
    if (!(params.textDocument.uri in configJsonMap)) {
        return null;
    }
    return runner_1.runSafeAsync(() => __awaiter(this, void 0, void 0, function* () {
        const document = documents.get(params.textDocument.uri);
        if (document) {
            const filePath = document.uri.slice('file://'.length);
            const appPath = utils_1.getAppPath(appMap, filePath);
            if (!appPath)
                return null;
            const appInfo = appMap[appPath];
            if (!appInfo)
                return null;
            if (appPath + '/app.json' === filePath) {
                const rootNode = jsonc.parseTree(document.getText());
                const pagesNode = jsonc.findNodeAtLocation(rootNode, ['pages']);
                if (pagesNode && pagesNode.type === 'array') {
                    const links = [];
                    pagesNode.children.forEach(child => {
                        if (child.type !== 'string')
                            return;
                        const pagePath = `${appPath}/${child.value}`;
                        if (utils_1.isValidPath(pagePath)) {
                            links.push({
                                range: {
                                    start: document.positionAt(child.offset + 1),
                                    end: document.positionAt(child.offset + child.length - 1)
                                },
                                target: `command:kobex.jumpTo?${encodeURIComponent(JSON.stringify([pagePath, false]))}`
                            });
                        }
                    });
                    return links;
                }
            }
            else {
                const itemPath = filePath.slice(0, -5);
                const itemInfo = appInfo.items[itemPath];
                if (!itemInfo)
                    return null;
                const rootNode = jsonc.parseTree(document.getText());
                const usingComponentsNode = jsonc.findNodeAtLocation(rootNode, ['usingComponents']);
                if (usingComponentsNode && usingComponentsNode.type === 'object') {
                    const links = [];
                    usingComponentsNode.children.forEach(prop => {
                        const value = prop.children[1];
                        if (!value || value.type !== 'string')
                            return;
                        const componentPath = utils_1.getComponentPath(appPath, itemPath, value.value);
                        if (utils_1.isValidPath(componentPath)) {
                            links.push({
                                range: {
                                    start: document.positionAt(value.offset + 1),
                                    end: document.positionAt(value.offset + value.length - 1)
                                },
                                target: `command:kobex.jumpTo?${encodeURIComponent(JSON.stringify([componentPath, true]))}`
                            });
                        }
                    });
                    return links;
                }
            }
        }
        return null;
    }), null, `Error while computing links for ${params.textDocument.uri}`, token);
});
// Listen on the connection
connection.listen();
//# sourceMappingURL=server.js.map