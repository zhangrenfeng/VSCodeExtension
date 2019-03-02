import { ASTNode, ElementNode, AXMLError } from "../parser";
import { Component, WhenContext } from "./component";
import { FileEvent, TextDocument } from "vscode-languageserver";
export interface IDefinition {
    uri: string;
    range: {
        start: number;
        end: number;
    };
}
declare type DataType = {
    [name: string]: {
        type: string;
        required: boolean;
        enums?: any[];
        documentation?: string;
        definition: IDefinition;
    };
};
export declare class PageDocument {
    appPath: string;
    path: string;
    config: {
        component?: boolean;
        usingComponents?: {
            [name: string]: string;
        };
    };
    private axmlTree?;
    private axmlErrors;
    private styles;
    data: DataType;
    props?: DataType;
    methods: {
        [name: string]: {
            type: string;
            documentation?: string;
            definition: IDefinition;
        };
    };
    slots?: {
        name: string;
        props: DataType;
    }[];
    documentation?: string;
    private static map;
    private static globalStylesMap;
    private static textDocuments;
    readonly isComponent: boolean;
    readonly axmlUri: string;
    private constructor();
    static getTextDocument(uri: string): Promise<TextDocument>;
    static onTextDocumentChange(textDocument: TextDocument): void;
    static onFileChange(event: FileEvent): Promise<void>;
    static getPagePath(filePath: string): string;
    static getDocument(uriOrFilePath: string): Promise<PageDocument>;
    getAxmlTree(): Promise<ElementNode>;
    getAxmlErrors(): Promise<AXMLError[]>;
    getAvailableComponents(whenContext?: WhenContext): Promise<{
        [x: string]: Component;
    }>;
    getAvailableAttributes(node: ASTNode, excludeExists?: boolean): Promise<{
        [key: string]: import("./component").AttributeDefinition;
    }>;
    static getElementNode(node: ASTNode): ElementNode;
    getComponentPath(name: string): string;
    getStyles(): Promise<PageDocument['styles']>;
    getWhenContext(element: ElementNode, parent?: ElementNode): WhenContext;
    static doValidation(uri: string): void;
    private static updateTextDocument;
    private static doValidationReferenced;
    private static findAppRootPath;
    private getGlobalStyle;
    private extractBlock;
    private getElementInfo;
    private getComponentDefinition;
    private getAttributeDefinitions;
    private loadConfigJson;
    private loadAxml;
    private loadAcss;
    private static loadAcssFromPath;
    private getValueType;
    private findSlot;
    private loadDataType;
    private loadDataTypeFromTS;
    private loadDataTypeFromJS;
    private getDataType;
    private resolveMethods;
}
export {};
