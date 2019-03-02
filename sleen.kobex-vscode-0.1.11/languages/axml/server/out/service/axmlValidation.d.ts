import { TextDocument, Diagnostic } from 'vscode-languageserver';
import { ElementNode, TextNode } from '../parser';
import { Component } from './component';
import { PageDocument } from './document';
export declare class AXMLValidation {
    private static selectorRegex;
    doValidation(textDocument: TextDocument): Promise<Diagnostic[]>;
    doValidationElement(element: ElementNode | TextNode, textDocument: TextDocument, doc: PageDocument, components: {
        [name: string]: Component;
    }, diagnostics: Diagnostic[], styles: string[]): Promise<void>;
    private doValidationAttributeValue;
    private doValidationSelector;
    private doValidationValueType;
    private doValidationValueExp;
    private doValidationExp;
    private doValidationEvent;
    private error;
    private getValueType;
    private isKindOfType;
    private isExp;
}
