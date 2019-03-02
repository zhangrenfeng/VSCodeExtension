import { LexerErrorCode } from "./lexer";
import { ExpressionNode } from "./exp";
export declare enum ParserErrorCode {
    None = 0,
    LexerError = 1,
    EmptyExpression = 2,
    ExpressionExpected = 3,
    IdentifierExpected = 4,
    ArgumentExpressionExpected = 5,
    ArgumentIdentifierExpected = 6,
    ColonExpected = 7,
    CloseBracketExpected = 8,
    CloseBraceExpected = 9,
    CloseParenExpected = 10,
    UnexpectedComma = 11,
    UnexpectedToken = 12,
    Unknown = 13
}
export declare type ParseResult = {
    expression?: ExpressionNode;
    parserError?: ParserErrorCode;
    lexerError?: LexerErrorCode;
    errorMessage?: string;
    errorOffset?: number;
    errorLength?: number;
};
export declare class Parser {
    private lexer;
    private error;
    private constructor();
    private parse;
    private parseExpression;
    private parseOperator;
    private requireOperator;
    private requireExpression;
    private parseConditionalExpression;
    private getUnaryOp;
    private getBinaryOp;
    private parseSubExpression;
    private parsePostfixExpression;
    private parsePostfixExpression2;
    private parseExpressionList;
    private parseExpressionList2;
    private parseKeyValueList;
    private parseKeyValueList2;
    private parsePrimaryExpression;
    private parseIdentifier;
    static parse(code: string): ParseResult;
    static errorMessage(errorCode: ParserErrorCode): string;
}
