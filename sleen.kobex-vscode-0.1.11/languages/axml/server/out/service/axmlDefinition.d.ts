import { TextDocument, Position, Definition } from "vscode-languageserver-types";
export declare class AXMLDefinition {
    doDefinition(document: TextDocument, position: Position): Promise<Definition>;
    private doDefinitionComponentTag;
    private doDefinitionComponentAttribute;
    private doDefinitionSelector;
    private doDefinitionEvent;
    private createDefinition;
}
