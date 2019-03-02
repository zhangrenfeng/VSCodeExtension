import { TextDocument, Position, WorkspaceEdit, Range } from "vscode-languageserver";
export declare class AXMLRename {
    doRename(document: TextDocument, position: Position, newName: string): Promise<WorkspaceEdit>;
    doPrepareRename(document: TextDocument, position: Position): Promise<Range>;
    private getNodeAtPosition;
}
