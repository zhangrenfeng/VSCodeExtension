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
const path = require("path");
const vscode_languageclient_1 = require("vscode-languageclient");
const appUtil_1 = require("./appUtil");
var ConfigChangeNotification;
(function (ConfigChangeNotification) {
    ConfigChangeNotification.type = new vscode_languageclient_1.NotificationType('kobex/configChange');
})(ConfigChangeNotification || (ConfigChangeNotification = {}));
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        let serverModule = context.asAbsolutePath(path.join('languages', 'json', 'server', 'out', 'server.js'));
        // The debug options for the server
        let debugOptions = { execArgv: ['--nolazy', '--inspect=' + (9000 + Math.round(Math.random() * 10000))] };
        // If the extension is launch in debug mode the debug server options are use
        // Otherwise the run options are used
        let serverOptions = {
            run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
            debug: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc, options: debugOptions }
        };
        // Options to control the language client
        let clientOptions = {
            documentSelector: ['json'],
        };
        yield appUtil_1.AppUtil.init(context);
        // Create the language client and start the client.
        let client = new vscode_languageclient_1.LanguageClient('json', 'Kobex JSON Language Server', serverOptions, clientOptions);
        context.subscriptions.push(client.start());
        yield client.onReady();
        client.sendNotification(ConfigChangeNotification.type, appUtil_1.AppUtil.appMap);
        appUtil_1.AppUtil.onChange = () => {
            client.sendNotification(ConfigChangeNotification.type, appUtil_1.AppUtil.appMap);
        };
    });
}
exports.activate = activate;
function deactivate() {
    return __awaiter(this, void 0, void 0, function* () {
        appUtil_1.AppUtil.dispose();
        return null;
    });
}
exports.deactivate = deactivate;
//# sourceMappingURL=index.js.map