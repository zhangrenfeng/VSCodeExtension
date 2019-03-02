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
const vscode = require("vscode");
const fs = require("fs-extra");
const createPage_1 = require("./createPage");
function jumpTo(itemPath, isComponent = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!itemPath)
            return;
        const type = isComponent ? '组件' : '页面';
        const axmlPath = itemPath + '.axml';
        if (yield fs.pathExists(axmlPath)) {
            const doc = yield vscode.workspace.openTextDocument(axmlPath);
            yield vscode.window.showTextDocument(doc);
        }
        else {
            if (!(yield vscode.window.showInformationMessage(`是否创建小程序${type}(${itemPath})？`, `创建${type}`))) {
                return;
            }
            try {
                yield createPage_1.createPage(itemPath, isComponent);
            }
            catch (e) {
                vscode.window.showErrorMessage(`创建${type}失败。${e}`);
            }
        }
    });
}
exports.jumpTo = jumpTo;
//# sourceMappingURL=jumpTo.js.map