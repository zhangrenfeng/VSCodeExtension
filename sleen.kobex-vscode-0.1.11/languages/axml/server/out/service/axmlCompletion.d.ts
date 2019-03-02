import { CompletionItem, TextDocument, Position } from 'vscode-languageserver';
export declare class AXMLCompletion {
    doComplete(document: TextDocument, position: Position): Promise<CompletionItem[]>;
    doResolve(item: CompletionItem): Promise<CompletionItem>;
    private doCompleteTag;
    private doCompleteAttribute;
    private doCompleteAttributeValue;
    private doCompleteSelector;
    private doCompleteEvent;
    private markdownDocumentation;
}
