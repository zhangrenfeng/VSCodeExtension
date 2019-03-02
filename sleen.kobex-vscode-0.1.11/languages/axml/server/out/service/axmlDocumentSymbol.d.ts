import { TextDocument, DocumentSymbol } from "vscode-languageserver";
export declare class AXMLDocumentSymbol {
    doDocumentSymbol(document: TextDocument): Promise<DocumentSymbol[]>;
    private visitNode;
    private getClassNames;
}
