import * as vscode from 'vscode';
export declare function createPageCommand(folderUri: vscode.Uri, isComponent?: boolean): Promise<void>;
export declare function createPage(pagePath: string, isComponent: boolean): Promise<void>;
