"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const axml = require("./axml/client");
const json = require("./json/client");
const createPage_1 = require("./commands/createPage");
const jumpTo_1 = require("./commands/jumpTo");
function activate(context) {
    axml.activate(context);
    json.activate(context);
    context.subscriptions.push(vscode.commands.registerCommand('kobex.createPage', uri => {
        createPage_1.createPageCommand(uri);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('kobex.createComponent', uri => {
        createPage_1.createPageCommand(uri, true);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('kobex.jumpTo', (uri, isComponent) => {
        jumpTo_1.jumpTo(uri, isComponent);
    }));
}
exports.activate = activate;
function deactivate() {
    axml.deactivate();
    json.deactivate();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map