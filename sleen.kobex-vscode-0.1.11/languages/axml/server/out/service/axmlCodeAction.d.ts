import { TextDocument, Range, CodeActionContext, Command, CodeAction } from "vscode-languageserver";
export declare class AXMLCodeAction {
    doCodeAction(document: TextDocument, range: Range, context: CodeActionContext): Promise<(Command | CodeAction)[]>;
    private tagNotMatchAction;
    private removeAttributeAction;
    private createSelectorActions;
    private createSelectorAction;
    private createRefactorActions;
    private createWrapAction;
    private createUnwrapAction;
}
