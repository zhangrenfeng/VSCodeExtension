import { Hover, TextDocument, Position } from "vscode-languageserver";
export declare class AXMLHover {
    doHover(document: TextDocument, position: Position): Promise<Hover>;
    private doHoverTag;
    private doHoverAttribute;
    private doHoverAttributeValue;
}
