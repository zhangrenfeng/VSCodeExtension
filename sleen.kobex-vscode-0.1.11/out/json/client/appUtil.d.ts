import * as vscode from 'vscode';
interface ItemInfo {
    path: string;
    isComponent: boolean;
}
interface AppInfo {
    items: {
        [path: string]: ItemInfo;
    };
}
export interface AppMap {
    [appPath: string]: AppInfo;
}
export declare class AppUtil {
    private static TRIGGER_DELAY;
    private static delayTimer?;
    static appMap: AppMap;
    private static watcherMap;
    /**
     * 页面/组件发生变化
     */
    static onChange: () => void;
    /**
     * 扫描工作区的应用，并记录所有页面、组件，监听文件变化
     */
    static init(context: vscode.ExtensionContext): Promise<void>;
    /**
     * 释放资源：停止监听文件
     */
    static dispose(): void;
    /**
     * 获取当前路径所在的应用根目录
     */
    static getAppPath(filePath: string): string | null;
    private static initWorkspace;
    private static clean;
    private static getAppInfo;
    private static initApp;
    private static removeApp;
    private static addItem;
    private static removeItem;
    private static changeItem;
    private static loadItem;
    private static triggerChange;
    private static visitDir;
}
export {};
