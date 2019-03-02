export declare enum ErrorCode {
    None = 0,
    GreaterThanExpected = 1,
    UnknownCharacter = 2,
    AttributeValueExpected = 3,
    UnclosedString = 4,
    UnclosedComment = 5,
    UnclosedExpression = 6,
    InvalidTagName = 7,
    TagNotMatch = 8,
    UnexpectedTerminal = 9,
    EndTagExpected = 10
}
export interface Range {
    offset: number;
    length: number;
}
export interface XmlVisitor {
    onTagStart?(range: Range, tagName: string): void;
    onTagEnd?(range: Range, tagName: string): void;
    onTagStartClose?(range: Range): void;
    onAttributeName?(range: Range, key: string): void;
    onAttributeValue?(range: Range, value: string): void;
    onText?(range: Range, text: string): void;
    onComment?(range: Range, comment: string): void;
    onError?(range: Range, error: ErrorCode): void;
}
export declare function parseAxml(axml: string, visitor: XmlVisitor): void;
export declare function getErrorMessage(errorCode: ErrorCode): string;
