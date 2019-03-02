import { TextDocument, Position, DocumentHighlight } from "vscode-languageserver";
export declare class AXMLHighlight {
    doHighlight(document: TextDocument, position: Position): Promise<DocumentHighlight[]>;
    private getNodeAtPosition;
}
