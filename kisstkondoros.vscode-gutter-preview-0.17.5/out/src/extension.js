"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const ts = require("typescript");
const vscode_languageclient_1 = require("vscode-languageclient");
const vscode_1 = require("vscode");
const protocol_1 = require("./common/protocol");
const decorator_1 = require("./decorator");
const configuration_1 = require("./util/configuration");
const pathCache = {};
const loadPathsFromTSConfig = (workspaceFolder, currentFileFolder) => {
    if (pathCache[currentFileFolder]) {
        return pathCache[currentFileFolder];
    }
    const paths = {};
    let tsConfigFilePath = ts.findConfigFile(currentFileFolder, ts.sys.fileExists, 'tsconfig.json');
    let jsConfigFilePath = ts.findConfigFile(currentFileFolder, ts.sys.fileExists, 'jsconfig.json');
    let configFilePath = tsConfigFilePath;
    if (tsConfigFilePath == null || (jsConfigFilePath != null && jsConfigFilePath.length > tsConfigFilePath.length)) {
        configFilePath = jsConfigFilePath;
    }
    if (!configFilePath) {
        pathCache[currentFileFolder] = paths;
        return paths;
    }
    let configResult = ts.readConfigFile(configFilePath, ts.sys.readFile);
    if (!configResult.error) {
        const config = configResult.config.compilerOptions;
        if (config) {
            const tsConfigPaths = config.paths || {};
            const baseUrl = path.relative(workspaceFolder, path.resolve(path.dirname(configFilePath), config.baseUrl || '.'));
            Object.keys(tsConfigPaths).forEach(alias => {
                let mapping = tsConfigPaths[alias];
                const lastIndexOfSlash = alias.lastIndexOf('/');
                let aliasWithoutWildcard = alias;
                if (lastIndexOfSlash > 0) {
                    aliasWithoutWildcard = alias.substr(0, lastIndexOfSlash);
                }
                if (aliasWithoutWildcard == '*') {
                    aliasWithoutWildcard = '';
                }
                if (!paths[aliasWithoutWildcard]) {
                    if (!Array.isArray(mapping)) {
                        mapping = [mapping];
                    }
                    const resolvedMapping = [];
                    mapping.forEach((element) => {
                        if (element.endsWith('*')) {
                            element = element.substring(0, element.length - 1);
                        }
                        resolvedMapping.push(path.join(baseUrl, element));
                    });
                    paths[aliasWithoutWildcard] = resolvedMapping;
                }
            });
        }
    }
    pathCache[currentFileFolder] = paths;
    return paths;
};
function activate(context) {
    let serverModule = context.asAbsolutePath(path.join('out', 'src', 'server', 'server.js'));
    let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
    let serverOptions = {
        run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
        debug: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc, options: debugOptions }
    };
    var output = vscode_1.window.createOutputChannel('gutter-preview');
    let error = (error, message, count) => {
        output.appendLine(message.jsonrpc);
        return undefined;
    };
    let clientOptions = {
        documentSelector: ['*'],
        errorHandler: {
            error: error,
            closed: () => {
                return undefined;
            }
        },
        synchronize: {
            configurationSection: 'gutterpreview'
        }
    };
    let client = new vscode_languageclient_1.LanguageClient('gutterpreview parser', serverOptions, clientOptions);
    let disposable = client.start();
    context.subscriptions.push(disposable);
    let symbolUpdater = (document, visibleLines, token) => {
        let paths = configuration_1.getConfiguredProperty(document, 'paths', {});
        const folder = vscode_1.workspace.getWorkspaceFolder(document.uri);
        let workspaceFolder;
        if (folder && folder.uri) {
            workspaceFolder = folder.uri.fsPath;
        }
        if (workspaceFolder && document.uri && document.uri.fsPath) {
            paths = Object.assign(loadPathsFromTSConfig(workspaceFolder, path.dirname(document.uri.fsPath)), paths);
        }
        return client
            .onReady()
            .then(() => {
            return client.sendRequest(protocol_1.GutterPreviewImageRequestType, {
                uri: document.uri.toString(),
                visibleLines: visibleLines,
                fileName: document.fileName,
                workspaceFolder: workspaceFolder,
                additionalSourcefolder: configuration_1.getConfiguredProperty(document, 'sourceFolder', ''),
                paths: paths
            }, token);
        })
            .catch(e => {
            console.warn('Connection was not yet ready when requesting image previews.');
            return {
                images: []
            };
        });
    };
    decorator_1.imageDecorator(symbolUpdater, context, client);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map