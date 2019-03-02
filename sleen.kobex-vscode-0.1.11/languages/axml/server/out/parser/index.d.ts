import { ErrorCode } from "./axmlParser";
import { ASTNode, ElementNode } from "./types";
import { DiagnosticSeverity } from "vscode-languageserver-types";
export * from './types';
export interface AXMLError {
    location: {
        offset: number;
        length: number;
    };
    severity: DiagnosticSeverity;
    code?: ErrorCode;
    message: string;
}
export declare function parseAxmlTree(axml: string, errors: AXMLError[]): ElementNode;
export declare function nodeAtOffset(node: ASTNode, offset: number): ASTNode;
