export declare enum TokenType {
    None = 0,
    String = 1,
    Number = 2,
    Boolean = 3,
    Null = 4,
    Id = 5,
    Add = 6,
    Sub = 7,
    Mul = 8,
    Div = 9,
    Mod = 10,
    And = 11,
    Or = 12,
    Equal = 13,
    NotEqual = 14,
    GreaterThan = 15,
    LessThan = 16,
    GreaterOrEqual = 17,
    LessOrEqual = 18,
    Not = 19,
    OpenParen = 20,
    OpenBracket = 21,
    OpenBrace = 22,
    CloseParen = 23,
    CloseBracket = 24,
    CloseBrace = 25,
    Dot = 26,
    Question = 27,
    Colon = 28,
    Comma = 29,
    Unknown = 30
}
export declare enum LexerErrorCode {
    None = 0,
    UnclosedString = 1,
    UnclosedComment = 2,
    InvalidNumber = 3,
    InvalidEscape = 4,
    InvalidUnicode = 5,
    InvalidCharacter = 6,
    UnknownToken = 7
}
export declare class Token {
    type: TokenType;
    offset: number;
    length: number;
    value: any;
}
export declare class Lexer {
    source: string;
    private length;
    private pointer;
    private c;
    private line;
    error: LexerErrorCode;
    token: Token;
    constructor(source: string);
    static errorMessage(errorCode: LexerErrorCode): string;
    next(): boolean;
    static allTokens(source: string, tokens: any[]): LexerErrorCode;
    private _nextChar;
    private _newline;
    private _next;
    private _readNumber;
    private static unicodeRE;
    private _readString;
}
