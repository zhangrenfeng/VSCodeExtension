import { FoldingRange, TextDocument } from "vscode-languageserver";
export declare class AXMLFolding {
    doFoldingRanges(document: TextDocument): Promise<FoldingRange[]>;
    private visitNode;
}
