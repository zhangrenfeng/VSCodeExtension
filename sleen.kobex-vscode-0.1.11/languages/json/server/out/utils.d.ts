export interface ItemInfo {
    path: string;
    isComponent: boolean;
}
export interface AppInfo {
    items: {
        [path: string]: ItemInfo;
    };
}
export interface AppMap {
    [appPath: string]: AppInfo;
}
export declare function getAppPath(appMap: AppMap, filePath: string): string | null;
export declare function isValidPath(filePath: string): boolean;
export declare function getComponentPath(appPath: string, itemPath: string, componentName: string): string;
