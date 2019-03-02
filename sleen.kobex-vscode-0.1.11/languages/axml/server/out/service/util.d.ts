import { ElementNode } from "../parser";
import { TextDocument, Position, Range } from "vscode-languageserver";
export declare function pathFromUri(uri: string): string;
export declare function getTagName(element: ElementNode): string;
export declare function getWordAtOffset(text: string, offset: number): string;
export declare function getWordRangeAtOffset(document: TextDocument, position: Position): Range;
export declare function isClassAttr(prop: string): boolean;
export declare function isEventAttr(prop: string): RegExpMatchArray;
export declare function filterObject<T>(obj: {
    [key: string]: T;
}, filter: (key: string, value: T, o: typeof obj) => boolean): {
    [key: string]: T;
};
export declare function createRange(node: {
    offset: number;
    length: number;
}, document: TextDocument): Range;
