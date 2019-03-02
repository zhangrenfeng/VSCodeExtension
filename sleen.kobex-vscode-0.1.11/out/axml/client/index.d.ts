import { ExtensionContext } from 'vscode';
export declare namespace KobexCommands {
    const saveFile = "kobex.saveFile";
}
export declare function activate(context: ExtensionContext): Promise<void>;
export declare function deactivate(): Thenable<void> | undefined;
