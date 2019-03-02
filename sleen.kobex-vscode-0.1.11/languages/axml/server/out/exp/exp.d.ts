import { IType } from "./type";
import { Token } from "./lexer";
export declare enum UnaryOp {
    None = 0,
    Negative = 1,
    Positive = 2,
    Not = 3
}
export declare enum BinaryOp {
    None = 0,
    Add = 1,
    Sub = 2,
    Mul = 3,
    Div = 4,
    Mod = 5,
    And = 6,
    Or = 7,
    Equal = 8,
    NotEqual = 9,
    GreaterThan = 10,
    LessThan = 11,
    GreaterOrEqual = 12,
    LessOrEqual = 13,
    Index = 14
}
export declare enum ExpressionErrorLevel {
    Error = 0,
    Warning = 1,
    Info = 2
}
export declare class ExpressionError {
    description: string;
    offset: number;
    length: number;
    level: ExpressionErrorLevel;
    constructor(node: ExpressionNode, description: string, level?: ExpressionErrorLevel);
}
export declare class ExpressionContext {
    private table;
    constructor();
    push(key: string, value: any): void;
    pushDict(dict: {
        [key: string]: any;
    }): void;
    pop(key: string): void;
    popDict(dict: {
        [key: string]: any;
    }): void;
    has(key: string): boolean;
    get(key: string): any;
    getAll(): {
        [key: string]: any;
    };
    set(key: string, value: any): void;
    clear(): void;
}
export declare abstract class ExpressionNode {
    offset: number;
    length: number;
    setRange(offset: number, length: number): this;
    setRangeWithToken(token: Token): this;
    abstract compute(context: ExpressionContext): any;
    abstract computeValue(context: ExpressionContext): any;
    abstract getType(context: ExpressionContext): IType;
    abstract check(context: ExpressionContext): ExpressionError[];
    abstract toString(prettyPrinted: boolean): string;
}
export declare class NoneClass {
}
export declare let None: NoneClass;
export declare class LiteralNode extends ExpressionNode {
    value: any;
    constructor(value: any);
    compute(context: ExpressionContext): any;
    computeValue(context: ExpressionContext): any;
    getType(context: ExpressionContext): IType;
    check(context: ExpressionContext): ExpressionError[];
    toString(prettyPrinted: boolean): string;
}
export declare class IdentifierNode extends ExpressionNode {
    identifier: string;
    constructor(identifier: string);
    compute(context: ExpressionContext): any;
    computeValue(context: ExpressionContext): any;
    getType(context: ExpressionContext): IType;
    check(context: ExpressionContext): ExpressionError[];
    toString(prettyPrinted: boolean): string;
}
export declare class ArrayExpressionNode extends ExpressionNode {
    list: ExpressionNode[];
    constructor(list: ExpressionNode[]);
    compute(context: ExpressionContext): NoneClass;
    computeValue(context: ExpressionContext): any[];
    getType(context: ExpressionContext): IType;
    check(context: ExpressionContext): ExpressionError[];
    toString(prettyPrinted: boolean): string;
}
export declare class ObjectExpressionNode extends ExpressionNode {
    list: [ExpressionNode, ExpressionNode][];
    constructor(list: [ExpressionNode, ExpressionNode][]);
    compute(context: ExpressionContext): any;
    computeValue(context: ExpressionContext): any;
    getType(context: ExpressionContext): IType;
    check(context: ExpressionContext): ExpressionError[];
    toString(prettyPrinted: boolean): string;
}
export declare class ConditionalExpressionNode extends ExpressionNode {
    condition: ExpressionNode;
    truePart?: ExpressionNode;
    falsePart: ExpressionNode;
    private static isNull;
    constructor(condition: ExpressionNode, truePart: ExpressionNode, falsePart: ExpressionNode);
    compute(context: ExpressionContext): any;
    computeValue(context: ExpressionContext): any;
    getType(context: ExpressionContext): IType;
    check(context: ExpressionContext): ExpressionError[];
    toString(prettyPrinted: boolean): string;
}
export declare class UnaryExpressionNode extends ExpressionNode {
    operator: UnaryOp;
    oprand: ExpressionNode;
    constructor(operator: UnaryOp, oprand: ExpressionNode);
    compute(context: ExpressionContext): NoneClass;
    computeValue(context: ExpressionContext): number | boolean;
    getType(context: ExpressionContext): IType;
    check(context: ExpressionContext): ExpressionError[];
    operatorName(): "!" | "-" | "+" | "??";
    toString(prettyPrinted: boolean): string;
}
export declare class BinaryExpressionNode extends ExpressionNode {
    operator: BinaryOp;
    oprand1: ExpressionNode;
    oprand2: ExpressionNode;
    constructor(operator: BinaryOp, oprand1: ExpressionNode, oprand2: ExpressionNode);
    compute(context: ExpressionContext): any;
    computeValue(context: ExpressionContext): any;
    getType(context: ExpressionContext): IType;
    operatorName(): "/" | "<" | "[]" | "-" | "+" | "??" | "*" | "%" | "&&" | "||" | "==" | "!=" | ">" | ">=" | "<=";
    check(context: ExpressionContext): ExpressionError[];
    toString(prettyPrinted: boolean): string;
}
export declare class FunctionExpressionNode extends ExpressionNode {
    target: ExpressionNode;
    action: IdentifierNode;
    parameters: ExpressionNode[];
    constructor(target: ExpressionNode, action: IdentifierNode, parameters: ExpressionNode[]);
    compute(context: ExpressionContext): any;
    computeValue(context: ExpressionContext): any;
    getType(context: ExpressionContext): IType;
    check(context: ExpressionContext): ExpressionError[];
    toString(prettyPrinted: boolean): string;
}
export declare function boolValue(obj: any): boolean;
export declare function propertyName(name: string): string;
