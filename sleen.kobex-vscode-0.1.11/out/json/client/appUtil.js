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
const vscode = require("vscode");
const fs = require("fs-extra");
class AppUtil {
    /**
     * 扫描工作区的应用，并记录所有页面、组件，监听文件变化
     */
    static init(context) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initWorkspace();
            vscode.workspace.onDidChangeWorkspaceFolders(() => this.initWorkspace());
        });
    }
    /**
     * 释放资源：停止监听文件
     */
    static dispose() {
        this.clean();
    }
    /**
     * 获取当前路径所在的应用根目录
     */
    static getAppPath(filePath) {
        while (filePath && filePath.length > 1) {
            const dir = path.dirname(filePath);
            if (this.appMap[dir]) {
                return dir;
            }
            filePath = dir;
        }
        return null;
    }
    static initWorkspace() {
        return __awaiter(this, void 0, void 0, function* () {
            this.clean();
            const folders = vscode.workspace.workspaceFolders;
            if (folders) {
                yield Promise.all(folders.map((f) => __awaiter(this, void 0, void 0, function* () {
                    yield this.visitDir(f.uri.fsPath, true, (file) => __awaiter(this, void 0, void 0, function* () {
                        if (file.endsWith('/app.json')) {
                            yield this.initApp(path.dirname(file));
                        }
                    }));
                })));
            }
            this.triggerChange();
        });
    }
    static clean() {
        Object.keys(this.watcherMap).forEach(k => this.watcherMap[k].dispose());
        this.watcherMap = {};
        this.appMap = {};
    }
    static getAppInfo(filePath) {
        const appPath = this.getAppPath(filePath);
        if (appPath)
            return this.appMap[appPath];
        return null;
    }
    static initApp(appPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const appInfo = {
                items: {}
            };
            this.appMap[appPath] = appInfo;
            console.log('initApp', appPath);
            yield this.visitDir(appPath, false, (file) => __awaiter(this, void 0, void 0, function* () {
                if (file.endsWith('.axml')) {
                    this.addItem(file);
                }
            }));
            const onCreate = (file) => {
                console.log('onCreate', file);
                if (file.endsWith('.axml')) {
                    if (this.addItem(file))
                        this.triggerChange();
                }
                else if (file.endsWith('.json')) {
                    this.changeItem(file);
                }
            };
            const onDelete = (file) => {
                console.log('onDelete', file);
                if (file.endsWith('/app.json')) {
                    this.removeApp(path.dirname(file));
                }
                else if (file.endsWith('.axml')) {
                    this.removeItem(file);
                }
                else if (file.endsWith('.json')) {
                    this.changeItem(file);
                }
                else if (!(path.extname(file) in ['.acss', '.js', '.ts', '.png'])) {
                    // 当做文件夹处理，直接删除文件夹时不会回调里面的文件
                    for (const appPath in this.appMap) {
                        if (appPath.startsWith(file)) {
                            this.removeApp(appPath);
                        }
                        else if (file.startsWith(appPath)) {
                            const items = this.appMap[appPath].items;
                            for (const itemPath in items) {
                                if (itemPath.startsWith(file)) {
                                    this.removeItem(itemPath + '.axml');
                                }
                            }
                        }
                    }
                }
            };
            const onChange = (file) => {
                console.log('onChange', file);
                if (file.endsWith('.json')) {
                    this.changeItem(file);
                }
            };
            const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(appPath, '**/*'));
            this.watcherMap[appPath] = watcher;
            watcher.onDidCreate(uri => onCreate(uri.fsPath));
            watcher.onDidDelete(uri => onDelete(uri.fsPath));
            watcher.onDidChange(uri => onChange(uri.fsPath));
        });
    }
    static removeApp(appPath) {
        if (!this.appMap[appPath])
            return;
        console.log('removeApp', appPath);
        delete this.appMap[appPath];
        if (this.watcherMap[appPath]) {
            this.watcherMap[appPath].dispose();
            delete this.watcherMap[appPath];
            this.triggerChange();
        }
    }
    static addItem(file) {
        const appInfo = this.getAppInfo(file);
        if (!appInfo) {
            return;
        }
        const itemPath = file.slice(0, -5);
        console.log('addItem', itemPath);
        const item = this.loadItem(itemPath);
        if (item) {
            appInfo.items[itemPath] = item;
        }
        return !!item;
    }
    static removeItem(file) {
        const appInfo = this.getAppInfo(file);
        if (!appInfo) {
            return;
        }
        const itemPath = file.slice(0, -5);
        console.log('removeItem', itemPath);
        delete appInfo.items[itemPath];
        this.triggerChange();
    }
    static changeItem(jsonPath) {
        const appInfo = this.getAppInfo(jsonPath);
        if (!appInfo) {
            return;
        }
        const itemPath = jsonPath.slice(0, -5);
        const item = appInfo.items[itemPath];
        if (!item)
            return;
        console.log('changeItem', itemPath);
        let isComponent = item && item.isComponent;
        const newItem = this.loadItem(itemPath);
        if (newItem) {
            appInfo.items[itemPath] = newItem;
        }
        else {
            delete appInfo.items[itemPath];
        }
        if (isComponent !== (newItem && newItem.isComponent)) {
            this.triggerChange();
        }
    }
    static loadItem(itemPath) {
        if (!fs.existsSync(itemPath + '.axml')) {
            return undefined;
        }
        let config = {};
        const jsonPath = itemPath + '.json';
        if (fs.existsSync(jsonPath)) {
            config = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        }
        const itemInfo = {
            path: itemPath,
            isComponent: !!config.component
        };
        return itemInfo;
    }
    static triggerChange() {
        console.log('triggerChange');
        if (this.delayTimer) {
            clearTimeout(this.delayTimer);
        }
        this.delayTimer = setTimeout(() => {
            console.log('real triggerChange');
            this.onChange && this.onChange();
        }, this.TRIGGER_DELAY);
    }
    static visitDir(dir, ignoreNodeModules, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield fs.readdir(dir);
            return Promise.all(files.map((file) => __awaiter(this, void 0, void 0, function* () {
                if (file.startsWith('.')) {
                    return;
                }
                if (ignoreNodeModules && file === 'node_modules') {
                    return;
                }
                const fullPath = path.join(dir, file);
                const stat = yield fs.stat(fullPath);
                if (stat.isDirectory()) {
                    yield this.visitDir(fullPath, ignoreNodeModules, callback);
                }
                else {
                    yield callback(fullPath);
                }
            })));
        });
    }
}
AppUtil.TRIGGER_DELAY = 100;
AppUtil.appMap = {};
AppUtil.watcherMap = {};
exports.AppUtil = AppUtil;
//# sourceMappingURL=appUtil.js.map