import { CompletionItem, TextDocument, Position, Diagnostic, Hover, Definition, Range, CodeActionContext, Command, CodeAction, WorkspaceEdit, FoldingRange, DocumentSymbol, DocumentHighlight } from "vscode-languageserver-types";
export interface LanguageService {
    doValidation(document: TextDocument): Thenable<Diagnostic[]>;
    doResolve(item: CompletionItem): Thenable<CompletionItem>;
    doComplete(document: TextDocument, position: Position): Thenable<CompletionItem[]>;
    doHover(document: TextDocument, position: Position): Thenable<Hover>;
    doDefinition(document: TextDocument, position: Position): Thenable<Definition>;
    doCodeAction(document: TextDocument, range: Range, context: CodeActionContext): Thenable<(Command | CodeAction)[]>;
    doRename(document: TextDocument, position: Position, newName: string): Thenable<WorkspaceEdit>;
    doPrepareRename(document: TextDocument, position: Position): Promise<Range>;
    doFoldingRanges(document: TextDocument): Thenable<FoldingRange[]>;
    doDocumentSymbol(document: TextDocument): Thenable<DocumentSymbol[]>;
    doHighlight(document: TextDocument, position: Position): Thenable<DocumentHighlight[]>;
}
export declare function getLanguageService(): LanguageService;
