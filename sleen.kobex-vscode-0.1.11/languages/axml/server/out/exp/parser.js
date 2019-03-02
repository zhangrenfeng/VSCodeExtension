"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lexer_1 = require("./lexer");
const exp_1 = require("./exp");
var ParserErrorCode;
(function (ParserErrorCode) {
    ParserErrorCode[ParserErrorCode["None"] = 0] = "None";
    ParserErrorCode[ParserErrorCode["LexerError"] = 1] = "LexerError";
    ParserErrorCode[ParserErrorCode["EmptyExpression"] = 2] = "EmptyExpression";
    ParserErrorCode[ParserErrorCode["ExpressionExpected"] = 3] = "ExpressionExpected";
    ParserErrorCode[ParserErrorCode["IdentifierExpected"] = 4] = "IdentifierExpected";
    ParserErrorCode[ParserErrorCode["ArgumentExpressionExpected"] = 5] = "ArgumentExpressionExpected";
    ParserErrorCode[ParserErrorCode["ArgumentIdentifierExpected"] = 6] = "ArgumentIdentifierExpected";
    ParserErrorCode[ParserErrorCode["ColonExpected"] = 7] = "ColonExpected";
    ParserErrorCode[ParserErrorCode["CloseBracketExpected"] = 8] = "CloseBracketExpected";
    ParserErrorCode[ParserErrorCode["CloseBraceExpected"] = 9] = "CloseBraceExpected";
    ParserErrorCode[ParserErrorCode["CloseParenExpected"] = 10] = "CloseParenExpected";
    ParserErrorCode[ParserErrorCode["UnexpectedComma"] = 11] = "UnexpectedComma";
    ParserErrorCode[ParserErrorCode["UnexpectedToken"] = 12] = "UnexpectedToken";
    ParserErrorCode[ParserErrorCode["Unknown"] = 13] = "Unknown";
})(ParserErrorCode = exports.ParserErrorCode || (exports.ParserErrorCode = {}));
let errors = [
    "no error",
    "lexer error",
    "empty expression",
    "expression expected",
    "identifier expected",
    "argument expression expected",
    "argument identifier expected",
    "':' expected",
    "']' expected",
    "'}' expected",
    "')' expected",
    "unexpected ','",
    "unexpected token",
    "unknown error",
];
let BIN_OP_PRIORITY = [
    [0, 0],
    [6, 6], [6, 6], [7, 7], [7, 7], [7, 7],
    [2, 2], [1, 1],
    [3, 3], [3, 3], [3, 3], [3, 3], [3, 3], [3, 3],
];
class Parser {
    constructor(code) {
        this.lexer = new lexer_1.Lexer(code);
        this.lexer.next();
        if (this.lexer.token.type) {
            this.error = ParserErrorCode.None;
        }
        else {
            this.error = ParserErrorCode.EmptyExpression;
        }
    }
    parse() {
        if (this.error) {
            return null;
        }
        let exp = this.parseExpression();
        if (this.lexer.error) {
            this.error = ParserErrorCode.LexerError;
            exp = null;
        }
        if (!this.error && this.lexer.token.type) {
            this.error = ParserErrorCode.UnexpectedToken;
            exp = null;
        }
        if (!this.error && !exp) {
            this.error = ParserErrorCode.Unknown;
        }
        return exp;
    }
    parseExpression() {
        return this.parseConditionalExpression();
    }
    parseOperator(op) {
        if (this.lexer.token.type === op) {
            let token = this.lexer.token;
            this.lexer.next();
            return token;
        }
        return null;
    }
    requireOperator(op, err) {
        let result = this.parseOperator(op);
        if (!result) {
            this.error = err;
        }
        return result;
    }
    requireExpression() {
        let expression = this.parseExpression();
        if (!expression) {
            this.error = ParserErrorCode.ExpressionExpected;
        }
        return expression;
    }
    parseConditionalExpression() {
        let expression = this.parseSubExpression();
        if (expression) {
            if (this.lexer.token.type === lexer_1.TokenType.Question) {
                this.lexer.next();
                let trueExpression = null;
                if (!this.parseOperator(lexer_1.TokenType.Colon)) {
                    if (!(trueExpression = this.requireExpression()))
                        return null;
                    if (!this.requireOperator(lexer_1.TokenType.Colon, ParserErrorCode.ColonExpected))
                        return null;
                }
                let falseExpression = this.parseConditionalExpression();
                if (!falseExpression) {
                    if (!this.error)
                        this.error = ParserErrorCode.ExpressionExpected;
                    return null;
                }
                return new exp_1.ConditionalExpressionNode(expression, trueExpression, falseExpression).setRange(expression.offset, falseExpression.offset + falseExpression.length - expression.offset);
            }
            return expression;
        }
        return null;
    }
    getUnaryOp(type) {
        switch (type) {
            case lexer_1.TokenType.Sub:
                return exp_1.UnaryOp.Negative;
            case lexer_1.TokenType.Add:
                return exp_1.UnaryOp.Positive;
            case lexer_1.TokenType.Not:
                return exp_1.UnaryOp.Not;
            default:
                return exp_1.UnaryOp.None;
        }
    }
    getBinaryOp(type) {
        switch (type) {
            case lexer_1.TokenType.Add:
                return exp_1.BinaryOp.Add;
            case lexer_1.TokenType.Sub:
                return exp_1.BinaryOp.Sub;
            case lexer_1.TokenType.Mul:
                return exp_1.BinaryOp.Mul;
            case lexer_1.TokenType.Div:
                return exp_1.BinaryOp.Div;
            case lexer_1.TokenType.Mod:
                return exp_1.BinaryOp.Mod;
            case lexer_1.TokenType.And:
                return exp_1.BinaryOp.And;
            case lexer_1.TokenType.Or:
                return exp_1.BinaryOp.Or;
            case lexer_1.TokenType.Equal:
                return exp_1.BinaryOp.Equal;
            case lexer_1.TokenType.NotEqual:
                return exp_1.BinaryOp.NotEqual;
            case lexer_1.TokenType.GreaterThan:
                return exp_1.BinaryOp.GreaterThan;
            case lexer_1.TokenType.LessThan:
                return exp_1.BinaryOp.LessThan;
            case lexer_1.TokenType.GreaterOrEqual:
                return exp_1.BinaryOp.GreaterOrEqual;
            case lexer_1.TokenType.LessOrEqual:
                return exp_1.BinaryOp.LessOrEqual;
            default:
                return exp_1.BinaryOp.None;
        }
    }
    parseSubExpression(priorityLimit = 0) {
        let binOp;
        let unOp;
        let exp;
        let type = this.lexer.token.type;
        unOp = this.getUnaryOp(type);
        if (unOp !== exp_1.UnaryOp.None) {
            let start = this.lexer.token.offset;
            this.lexer.next();
            exp = this.parseSubExpression(8);
            if (!exp) {
                return null;
            }
            exp = new exp_1.UnaryExpressionNode(unOp, exp).setRange(start, exp.offset + exp.length - start);
        }
        else {
            exp = this.parsePostfixExpression();
        }
        if (!exp) {
            return null;
        }
        type = this.lexer.token.type;
        binOp = this.getBinaryOp(type);
        while (binOp && BIN_OP_PRIORITY[binOp][0] > priorityLimit) {
            this.lexer.next();
            let subexp = this.parseSubExpression(BIN_OP_PRIORITY[binOp][1]);
            if (!subexp) {
                if (!this.error) {
                    this.error = ParserErrorCode.ExpressionExpected;
                }
                return null;
            }
            exp = new exp_1.BinaryExpressionNode(binOp, exp, subexp).setRange(exp.offset, subexp.offset + subexp.length - exp.offset);
            type = this.lexer.token.type;
            binOp = this.getBinaryOp(type);
        }
        return exp;
    }
    parsePostfixExpression() {
        let expression = this.parsePrimaryExpression();
        if (!expression)
            return null;
        return this.parsePostfixExpression2(expression);
    }
    parsePostfixExpression2(operand1) {
        if (this.parseOperator(lexer_1.TokenType.OpenBracket)) {
            let operand2;
            if (!(operand2 = this.requireExpression()))
                return null;
            let op = this.requireOperator(lexer_1.TokenType.CloseBracket, ParserErrorCode.CloseBracketExpected);
            if (!op)
                return null;
            let binaryExpression = new exp_1.BinaryExpressionNode(exp_1.BinaryOp.Index, operand1, operand2).setRange(operand1.offset, op.offset + op.length - operand1.offset);
            return this.parsePostfixExpression2(binaryExpression);
        }
        else if (this.parseOperator(lexer_1.TokenType.Dot)) {
            let action = this.parseIdentifier();
            if (!action) {
                if (!this.error) {
                    this.error = ParserErrorCode.IdentifierExpected;
                }
                return null;
            }
            let parameters = null;
            let closeParen;
            if (this.parseOperator(lexer_1.TokenType.OpenParen)) {
                parameters = this.parseExpressionList();
                if (!parameters)
                    return null;
                closeParen = this.requireOperator(lexer_1.TokenType.CloseParen, ParserErrorCode.CloseParenExpected);
                if (!closeParen)
                    return null;
            }
            let length = closeParen ? closeParen.offset + closeParen.length - operand1.offset : (action.offset + action.length - operand1.offset);
            let fun = new exp_1.FunctionExpressionNode(operand1, action, parameters).setRange(operand1.offset, length);
            return this.parsePostfixExpression2(fun);
        }
        return operand1;
    }
    parseExpressionList() {
        if (this.lexer.token.type === lexer_1.TokenType.Comma) {
            this.error = ParserErrorCode.UnexpectedComma;
            return null;
        }
        let list = [];
        let expression = this.parseExpression();
        if (expression) {
            list.push(expression);
        }
        else {
            if (this.error) {
                return null;
            }
            return list;
        }
        return this.parseExpressionList2(list);
    }
    parseExpressionList2(list) {
        if (this.parseOperator(lexer_1.TokenType.Comma)) {
            let expression;
            if (!(expression = this.requireExpression()))
                return null;
            list.push(expression);
            return this.parseExpressionList2(list);
        }
        return list;
    }
    parseKeyValueList() {
        if (this.lexer.token.type === lexer_1.TokenType.Comma) {
            this.error = ParserErrorCode.UnexpectedComma;
            return null;
        }
        let list = [];
        let key = this.parseExpression();
        if (!key)
            return list;
        if (!this.requireOperator(lexer_1.TokenType.Colon, ParserErrorCode.ColonExpected))
            return null;
        let value;
        if (!(value = this.requireExpression()))
            return null;
        list.push([key, value]);
        return this.parseKeyValueList2(list);
    }
    parseKeyValueList2(list) {
        if (this.parseOperator(lexer_1.TokenType.Comma)) {
            let key;
            if (!(key = this.requireExpression()))
                return null;
            if (!this.requireOperator(lexer_1.TokenType.Colon, ParserErrorCode.ColonExpected))
                return null;
            let value;
            if (!(value = this.requireExpression()))
                return null;
            list.push([key, value]);
            return this.parseKeyValueList2(list);
        }
        return list;
    }
    parsePrimaryExpression() {
        let expression;
        let type = this.lexer.token.type;
        switch (type) {
            case lexer_1.TokenType.String:
            case lexer_1.TokenType.Number:
            case lexer_1.TokenType.Boolean:
            case lexer_1.TokenType.Null:
                {
                    let node = new exp_1.LiteralNode(this.lexer.token.value).setRangeWithToken(this.lexer.token);
                    this.lexer.next();
                    return node;
                }
            case lexer_1.TokenType.OpenParen:
                this.lexer.next();
                if (!(expression = this.requireExpression()))
                    return null;
                if (!this.requireOperator(lexer_1.TokenType.CloseParen, ParserErrorCode.CloseParenExpected))
                    return null;
                return expression;
            case lexer_1.TokenType.OpenBracket:
                {
                    let open = this.lexer.token;
                    this.lexer.next();
                    let list = this.parseExpressionList();
                    if (!list) {
                        if (!this.error)
                            this.error = ParserErrorCode.ExpressionExpected;
                    }
                    let close = this.requireOperator(lexer_1.TokenType.CloseBracket, ParserErrorCode.CloseBracketExpected);
                    if (!close)
                        return null;
                    return new exp_1.ArrayExpressionNode(list).setRange(open.offset, close.offset + close.length - open.offset);
                }
            case lexer_1.TokenType.OpenBrace:
                {
                    let open = this.lexer.token;
                    this.lexer.next();
                    let list = this.parseKeyValueList();
                    if (!list) {
                        if (!this.error)
                            this.error = ParserErrorCode.ExpressionExpected;
                    }
                    let close = this.requireOperator(lexer_1.TokenType.CloseBrace, ParserErrorCode.CloseBraceExpected);
                    if (!close)
                        return null;
                    return new exp_1.ObjectExpressionNode(list).setRange(open.offset, close.offset + close.length - open.offset);
                }
            case lexer_1.TokenType.Id:
                {
                    let identifier = this.parseIdentifier();
                    if (this.parseOperator(lexer_1.TokenType.OpenParen)) {
                        let list = this.parseExpressionList();
                        if (!list) {
                            if (!this.error)
                                this.error = ParserErrorCode.ExpressionExpected;
                        }
                        if (this.lexer.token.type === lexer_1.TokenType.Comma && !this.error) {
                            this.error = ParserErrorCode.ArgumentExpressionExpected;
                            return null;
                        }
                        let closeParen = this.requireOperator(lexer_1.TokenType.CloseParen, ParserErrorCode.CloseParenExpected);
                        if (!closeParen)
                            return null;
                        return new exp_1.FunctionExpressionNode(null, identifier, list).setRange(identifier.offset, closeParen.offset + closeParen.length - identifier.offset);
                    }
                    return identifier;
                }
            case lexer_1.TokenType.None:
                return null;
            case lexer_1.TokenType.Add:
            case lexer_1.TokenType.Sub:
            case lexer_1.TokenType.Mul:
            case lexer_1.TokenType.Div:
            case lexer_1.TokenType.Mod:
            case lexer_1.TokenType.LessThan:
            case lexer_1.TokenType.GreaterThan:
            case lexer_1.TokenType.LessOrEqual:
            case lexer_1.TokenType.GreaterOrEqual:
            case lexer_1.TokenType.Equal:
            case lexer_1.TokenType.NotEqual:
            case lexer_1.TokenType.Add:
            case lexer_1.TokenType.Or:
            case lexer_1.TokenType.Comma:
                {
                    this.error = ParserErrorCode.ExpressionExpected;
                    return null;
                }
        }
        return null;
    }
    parseIdentifier() {
        if (this.lexer.token.type === lexer_1.TokenType.Id) {
            let token = this.lexer.token;
            this.lexer.next();
            return new exp_1.IdentifierNode(token.value).setRangeWithToken(token);
        }
        return null;
    }
    static parse(code) {
        if (code === null || code === undefined) {
            code = '';
        }
        let parser = new Parser(code);
        let expression = parser.parse();
        if (parser.error) {
            let result = { parserError: parser.error, lexerError: parser.lexer.error };
            let message = result.lexerError ? lexer_1.Lexer.errorMessage(result.lexerError) : this.errorMessage(result.parserError);
            return Object.assign({}, result, { errorMessage: message, errorOffset: parser.lexer.token.offset, errorLength: parser.lexer.token.length });
        }
        else {
            return { expression: expression };
        }
    }
    static errorMessage(errorCode) {
        return errors[errorCode];
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map