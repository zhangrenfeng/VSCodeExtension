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
const path = require("path");
const fs = require("fs-extra");
const jsonc = require("jsonc-parser");
const pageJs = `\
Page({
  data: {},
  onLoad() {},
});
`;
const componentJs = `
/**
 * 组件描述
 */
Component({
  mixins: [],
  data: {},
  props: {
    /**
     * 属性描述
     */
    example: ''
  },
  didMount() {},
  didUpdate() {},
  didUnmount() {},
  methods: {},
});
`;
const pageTs = `
interface DataType {
  
}

export default class extends TinyPage<DataType> {
  data: DataType = {

  }

  onLoad() {

  }
}
`;
const componentTs = `
interface PropsType {
  /**
   * 属性描述
   */
  example: string;
}

interface DataType {
  
}

/**
 * 组件描述
 */
export default class extends TinyComponent<PropsType, DataType> {
  props: PropsType = {
    example: 'exampe'
  }

  data: DataType = {

  }

  didMount() {

  }

  didUpdate(prevProps: PropsType, prevData: DataType) {

  }

  didUnmount() {

  }
  
  /* 使用 TS 版本时，不需要将事件响应方法放入 \`methods\` 中，编译时会自动转换 */
}
`;
function createPageCommand(folderUri, isComponent = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!folderUri) {
            if (vscode.workspace.rootPath && (yield fs.pathExists(vscode.workspace.rootPath + 'app.json'))) {
                folderUri = vscode.Uri.parse(vscode.workspace.rootPath);
            }
            else if (vscode.window.activeTextEditor) {
                const fileName = vscode.window.activeTextEditor.document.fileName;
                if (path.isAbsolute(fileName)) {
                    const rootPath = yield findAppRootPath(fileName);
                    if (rootPath) {
                        folderUri = vscode.Uri.parse(rootPath);
                    }
                }
            }
            if (!folderUri) {
                vscode.window.showErrorMessage('无法找到应用根目录');
                return;
            }
        }
        const type = isComponent ? '组件' : '页面';
        let name = yield vscode.window.showInputBox({
            prompt: `请输入${type}名称（以“.”结尾表示不创建目录）`,
        });
        if (name) {
            if (name.endsWith('.')) {
                name = name.slice(0, -1);
            }
            else {
                name = path.join(name, 'index');
            }
            const pagePath = path.join(folderUri.fsPath, name);
            try {
                yield createPage(pagePath, isComponent);
            }
            catch (e) {
                vscode.window.showErrorMessage(`创建${type}失败。${e}`);
            }
        }
    });
}
exports.createPageCommand = createPageCommand;
function createPage(pagePath, isComponent) {
    return __awaiter(this, void 0, void 0, function* () {
        yield fs.ensureDir(path.dirname(pagePath));
        const appPath = yield findAppRootPath(pagePath);
        const isTs = appPath ? yield isTypescript(appPath) : false;
        const scriptPath = `${pagePath}.${isTs ? 'ts' : 'js'}`;
        if (isComponent) {
            yield writeFile(`${pagePath}.axml`, `<view>
  New Component
</view>`, true);
            yield writeFile(`${pagePath}.json`, `{
  "component": true
}`);
            yield writeFile(`${pagePath}.acss`, '');
            if (isTs) {
                yield writeFile(scriptPath, componentTs);
            }
            else {
                yield writeFile(scriptPath, componentJs);
            }
        }
        else {
            yield writeFile(`${pagePath}.axml`, `<view>
  New Page
</view>`, true);
            yield writeFile(`${pagePath}.json`, `{}`);
            yield writeFile(`${pagePath}.acss`, '');
            if (isTs) {
                yield writeFile(scriptPath, pageTs);
            }
            else {
                yield writeFile(scriptPath, pageJs);
            }
            // add page name to app.json
            if (appPath) {
                const pageRelativePath = path.relative(appPath, pagePath);
                const appJsonPath = path.join(appPath, 'app.json');
                const doc = yield vscode.workspace.openTextDocument(appJsonPath);
                // avoid to overwrite user edits
                if (doc.isDirty) {
                    return;
                }
                const content = doc.getText();
                const pages = jsonc.parse(content).pages || [];
                if (pages instanceof Array && pages.indexOf(pageRelativePath) < 0) {
                    const edits = jsonc.modify(content, ['pages'], [...pages, pageRelativePath], {
                        formattingOptions: {
                            tabSize: 2,
                            insertSpaces: true,
                        }
                    });
                    if (edits && edits.length > 0) {
                        const newContent = jsonc.applyEdits(content, edits);
                        yield fs.writeFile(appJsonPath, newContent);
                    }
                }
            }
        }
        // open the created page/component
        const doc = yield vscode.workspace.openTextDocument(scriptPath);
        yield vscode.window.showTextDocument(doc);
        // refresh explorer
        yield vscode.commands.executeCommand("workbench.files.action.refreshFilesExplorer");
    });
}
exports.createPage = createPage;
function writeFile(file, content, throwIfExists = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if (yield fs.pathExists(file)) {
            if (throwIfExists) {
                throw `文件已存在："${file}"`;
            }
            return;
        }
        yield fs.writeFile(file, content);
    });
}
function isTypescript(appPath) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield fs.pathExists(path.join(appPath, 'app.ts'));
    });
}
function findAppRootPath(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        while (filePath) {
            const dir = path.dirname(filePath);
            if (yield fs.pathExistsSync(path.join(dir, 'app.json'))) {
                return dir;
            }
            filePath = dir;
        }
        return null;
    });
}
//# sourceMappingURL=createPage.js.map