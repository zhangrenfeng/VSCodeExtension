"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TokenType;
(function (TokenType) {
    TokenType[TokenType["None"] = 0] = "None";
    TokenType[TokenType["String"] = 1] = "String";
    TokenType[TokenType["Number"] = 2] = "Number";
    TokenType[TokenType["Boolean"] = 3] = "Boolean";
    TokenType[TokenType["Null"] = 4] = "Null";
    TokenType[TokenType["Id"] = 5] = "Id";
    TokenType[TokenType["Arrow"] = 6] = "Arrow";
    // operators
    TokenType[TokenType["Add"] = 7] = "Add";
    TokenType[TokenType["Sub"] = 8] = "Sub";
    TokenType[TokenType["Mul"] = 9] = "Mul";
    TokenType[TokenType["Div"] = 10] = "Div";
    TokenType[TokenType["Mod"] = 11] = "Mod";
    TokenType[TokenType["And"] = 12] = "And";
    TokenType[TokenType["Or"] = 13] = "Or";
    TokenType[TokenType["Equal"] = 14] = "Equal";
    TokenType[TokenType["NotEqual"] = 15] = "NotEqual";
    TokenType[TokenType["GreaterThan"] = 16] = "GreaterThan";
    TokenType[TokenType["LessThan"] = 17] = "LessThan";
    TokenType[TokenType["GreaterOrEqual"] = 18] = "GreaterOrEqual";
    TokenType[TokenType["LessOrEqual"] = 19] = "LessOrEqual";
    TokenType[TokenType["Not"] = 20] = "Not";
    // punctuations
    TokenType[TokenType["OpenParen"] = 21] = "OpenParen";
    TokenType[TokenType["OpenBracket"] = 22] = "OpenBracket";
    TokenType[TokenType["OpenBrace"] = 23] = "OpenBrace";
    TokenType[TokenType["CloseParen"] = 24] = "CloseParen";
    TokenType[TokenType["CloseBracket"] = 25] = "CloseBracket";
    TokenType[TokenType["CloseBrace"] = 26] = "CloseBrace";
    TokenType[TokenType["Dot"] = 27] = "Dot";
    TokenType[TokenType["Question"] = 28] = "Question";
    TokenType[TokenType["Colon"] = 29] = "Colon";
    TokenType[TokenType["Comma"] = 30] = "Comma";
    TokenType[TokenType["Unknown"] = 31] = "Unknown";
})(TokenType = exports.TokenType || (exports.TokenType = {}));
var LexerErrorCode;
(function (LexerErrorCode) {
    LexerErrorCode[LexerErrorCode["None"] = 0] = "None";
    LexerErrorCode[LexerErrorCode["UnclosedString"] = 1] = "UnclosedString";
    LexerErrorCode[LexerErrorCode["UnclosedComment"] = 2] = "UnclosedComment";
    LexerErrorCode[LexerErrorCode["InvalidNumber"] = 3] = "InvalidNumber";
    LexerErrorCode[LexerErrorCode["InvalidEscape"] = 4] = "InvalidEscape";
    LexerErrorCode[LexerErrorCode["InvalidUnicode"] = 5] = "InvalidUnicode";
    LexerErrorCode[LexerErrorCode["InvalidCharacter"] = 6] = "InvalidCharacter";
    LexerErrorCode[LexerErrorCode["UnknownToken"] = 7] = "UnknownToken";
})(LexerErrorCode = exports.LexerErrorCode || (exports.LexerErrorCode = {}));
const errors = [
    "no error",
    "unclosed string literal",
    "'*/' expected",
    "invalid number format",
    "invalid escaped character in string",
    "invalid unicode sequence in string",
    "invalid characters in string. control characters must be escaped",
    "unknown token",
];
class Token {
}
exports.Token = Token;
var CharCode;
(function (CharCode) {
    CharCode[CharCode["Null"] = 0] = "Null";
    CharCode[CharCode["Tab"] = 9] = "Tab";
    CharCode[CharCode["LineFeed"] = 10] = "LineFeed";
    CharCode[CharCode["CarriageReturn"] = 13] = "CarriageReturn";
    CharCode[CharCode["Space"] = 32] = "Space";
    CharCode[CharCode["Exclamation"] = 33] = "Exclamation";
    CharCode[CharCode["DoubleQuote"] = 34] = "DoubleQuote";
    CharCode[CharCode["$"] = 36] = "$";
    CharCode[CharCode["Percent"] = 37] = "Percent";
    CharCode[CharCode["Ampersand"] = 38] = "Ampersand";
    CharCode[CharCode["SingleQuote"] = 39] = "SingleQuote";
    CharCode[CharCode["OpenParen"] = 40] = "OpenParen";
    CharCode[CharCode["CloseParen"] = 41] = "CloseParen";
    CharCode[CharCode["Asterisk"] = 42] = "Asterisk";
    CharCode[CharCode["Plus"] = 43] = "Plus";
    CharCode[CharCode["Comma"] = 44] = "Comma";
    CharCode[CharCode["Minus"] = 45] = "Minus";
    CharCode[CharCode["Dot"] = 46] = "Dot";
    CharCode[CharCode["Slash"] = 47] = "Slash";
    CharCode[CharCode["_0"] = 48] = "_0";
    CharCode[CharCode["_1"] = 49] = "_1";
    CharCode[CharCode["_9"] = 57] = "_9";
    CharCode[CharCode["Colon"] = 58] = "Colon";
    CharCode[CharCode["LessThan"] = 60] = "LessThan";
    CharCode[CharCode["Equals"] = 61] = "Equals";
    CharCode[CharCode["GreaterThan"] = 62] = "GreaterThan";
    CharCode[CharCode["Question"] = 63] = "Question";
    CharCode[CharCode["A"] = 65] = "A";
    CharCode[CharCode["B"] = 66] = "B";
    CharCode[CharCode["C"] = 67] = "C";
    CharCode[CharCode["D"] = 68] = "D";
    CharCode[CharCode["E"] = 69] = "E";
    CharCode[CharCode["F"] = 70] = "F";
    CharCode[CharCode["G"] = 71] = "G";
    CharCode[CharCode["H"] = 72] = "H";
    CharCode[CharCode["I"] = 73] = "I";
    CharCode[CharCode["J"] = 74] = "J";
    CharCode[CharCode["K"] = 75] = "K";
    CharCode[CharCode["L"] = 76] = "L";
    CharCode[CharCode["M"] = 77] = "M";
    CharCode[CharCode["N"] = 78] = "N";
    CharCode[CharCode["O"] = 79] = "O";
    CharCode[CharCode["P"] = 80] = "P";
    CharCode[CharCode["Q"] = 81] = "Q";
    CharCode[CharCode["R"] = 82] = "R";
    CharCode[CharCode["S"] = 83] = "S";
    CharCode[CharCode["T"] = 84] = "T";
    CharCode[CharCode["U"] = 85] = "U";
    CharCode[CharCode["V"] = 86] = "V";
    CharCode[CharCode["W"] = 87] = "W";
    CharCode[CharCode["X"] = 88] = "X";
    CharCode[CharCode["Y"] = 89] = "Y";
    CharCode[CharCode["Z"] = 90] = "Z";
    CharCode[CharCode["OpenBracket"] = 91] = "OpenBracket";
    CharCode[CharCode["Backslash"] = 92] = "Backslash";
    CharCode[CharCode["CloseBracket"] = 93] = "CloseBracket";
    CharCode[CharCode["_"] = 95] = "_";
    CharCode[CharCode["a"] = 97] = "a";
    CharCode[CharCode["b"] = 98] = "b";
    CharCode[CharCode["c"] = 99] = "c";
    CharCode[CharCode["d"] = 100] = "d";
    CharCode[CharCode["e"] = 101] = "e";
    CharCode[CharCode["f"] = 102] = "f";
    CharCode[CharCode["g"] = 103] = "g";
    CharCode[CharCode["h"] = 104] = "h";
    CharCode[CharCode["i"] = 105] = "i";
    CharCode[CharCode["j"] = 106] = "j";
    CharCode[CharCode["k"] = 107] = "k";
    CharCode[CharCode["l"] = 108] = "l";
    CharCode[CharCode["m"] = 109] = "m";
    CharCode[CharCode["n"] = 110] = "n";
    CharCode[CharCode["o"] = 111] = "o";
    CharCode[CharCode["p"] = 112] = "p";
    CharCode[CharCode["q"] = 113] = "q";
    CharCode[CharCode["r"] = 114] = "r";
    CharCode[CharCode["s"] = 115] = "s";
    CharCode[CharCode["t"] = 116] = "t";
    CharCode[CharCode["u"] = 117] = "u";
    CharCode[CharCode["v"] = 118] = "v";
    CharCode[CharCode["w"] = 119] = "w";
    CharCode[CharCode["x"] = 120] = "x";
    CharCode[CharCode["y"] = 121] = "y";
    CharCode[CharCode["z"] = 122] = "z";
    CharCode[CharCode["OpenBrace"] = 123] = "OpenBrace";
    CharCode[CharCode["Bar"] = 124] = "Bar";
    CharCode[CharCode["CloseBrace"] = 125] = "CloseBrace";
})(CharCode || (CharCode = {}));
let isalpha = c => (c >= CharCode.a && c <= CharCode.z) || (c >= CharCode.A && c <= CharCode.Z);
let isdigit = c => (c >= CharCode._0 && c <= CharCode._9);
let isalnum = c => (c >= CharCode.a && c <= CharCode.z) || (c >= CharCode.A && c <= CharCode.Z) || (c >= CharCode._0 && c <= CharCode._9);
let iscntrl = c => c < 32;
let isNewLine = c => c === CharCode.LineFeed || c === CharCode.CarriageReturn;
let isQuote = c => c === CharCode.SingleQuote || c === CharCode.DoubleQuote;
class Lexer {
    constructor(source) {
        this.source = source;
        this.length = source.length;
        this.line = 0;
        this.error = null;
        this.pointer = -1;
        this.token = null;
        this._nextChar();
    }
    static errorMessage(errorCode) {
        return errors[errorCode];
    }
    next() {
        this.token = new Token();
        this.token.type = this._next();
        this.token.length = this.pointer - this.token.offset;
        if (this.error) {
            this.token.type = TokenType.None;
        }
        return this.token.type !== TokenType.None;
    }
    static allTokens(source, tokens) {
        let lexer = new Lexer(source);
        while (lexer.next()) {
            tokens.push(lexer.token);
        }
        return lexer.error;
    }
    _nextChar() {
        this.pointer++;
        let c = this.source.charCodeAt(this.pointer);
        if (isNaN(c))
            c = 0;
        this.c = c;
        return c;
    }
    _newline() {
        let old = this.c;
        this._nextChar();
        if (isNewLine(this.c) && this.c !== old) {
            this._nextChar();
        }
        this.line++;
    }
    _next() {
        for (;;) {
            this.token.offset = this.pointer;
            let c = this.c;
            switch (c) {
                case CharCode.Null:
                    return TokenType.None;
                case CharCode.Space:
                case CharCode.Tab:
                    this._nextChar();
                    continue;
                case CharCode.LineFeed:
                case CharCode.CarriageReturn:
                    this._newline();
                    continue;
                case CharCode.Ampersand:
                    this._nextChar();
                    if (this.c === CharCode.Ampersand) {
                        this._nextChar();
                        return TokenType.And;
                    }
                    else {
                        return TokenType.Unknown;
                    }
                case CharCode.Bar:
                    this._nextChar();
                    if (this.c === CharCode.Bar) {
                        this._nextChar();
                        return TokenType.Or;
                    }
                    else {
                        return TokenType.Unknown;
                    }
                case CharCode.Equals:
                    this._nextChar();
                    if (this.c === CharCode.Equals) {
                        this._nextChar();
                        return TokenType.Equal;
                    }
                    else {
                        return TokenType.Unknown;
                    }
                case CharCode.Exclamation:
                    this._nextChar();
                    if (this.c === CharCode.Equals) {
                        this._nextChar();
                        return TokenType.NotEqual;
                    }
                    else {
                        return TokenType.Not;
                    }
                case CharCode.GreaterThan:
                    this._nextChar();
                    if (this.c === CharCode.Equals) {
                        this._nextChar();
                        return TokenType.GreaterOrEqual;
                    }
                    else {
                        return TokenType.GreaterThan;
                    }
                case CharCode.LessThan:
                    this._nextChar();
                    if (this.c === CharCode.Equals) {
                        this._nextChar();
                        return TokenType.LessOrEqual;
                    }
                    else {
                        return TokenType.LessThan;
                    }
                case CharCode.Slash:
                    this._nextChar();
                    if (this.c === CharCode.Slash) {
                        let c;
                        do {
                            c = this._nextChar();
                        } while (!isNewLine(c) && c !== CharCode.Null);
                        continue;
                    }
                    else if (this.c === CharCode.Asterisk) {
                        var closed = false;
                        do {
                            this._nextChar();
                            if (isNewLine(this.c)) {
                                this._newline();
                            }
                            else if (this.c === CharCode.Asterisk) {
                                this._nextChar();
                                this.c = this.c;
                                if (this.c === CharCode.Slash) {
                                    closed = true;
                                    this._nextChar();
                                    break;
                                }
                                else {
                                    continue;
                                }
                            }
                        } while (this.c !== CharCode.Null);
                        if (!closed) {
                            this.error = LexerErrorCode.UnclosedComment;
                        }
                        continue;
                    }
                    else {
                        return TokenType.Div;
                    }
                case CharCode.Minus:
                    this._nextChar();
                    if (this.c === CharCode.GreaterThan) {
                        this._nextChar();
                        return TokenType.Arrow;
                    }
                    else {
                        return TokenType.Sub;
                    }
                case CharCode.Plus:
                    this._nextChar();
                    return TokenType.Add;
                case CharCode.Asterisk:
                    this._nextChar();
                    return TokenType.Mul;
                case CharCode.Percent:
                    this._nextChar();
                    return TokenType.Mod;
                case CharCode.OpenParen:
                    this._nextChar();
                    return TokenType.OpenParen;
                case CharCode.CloseParen:
                    this._nextChar();
                    return TokenType.CloseParen;
                case CharCode.OpenBracket:
                    this._nextChar();
                    return TokenType.OpenBracket;
                case CharCode.CloseBracket:
                    this._nextChar();
                    return TokenType.CloseBracket;
                case CharCode.OpenBrace:
                    this._nextChar();
                    return TokenType.OpenBrace;
                case CharCode.CloseBrace:
                    this._nextChar();
                    return TokenType.CloseBrace;
                case CharCode.Dot:
                    this._nextChar();
                    return TokenType.Dot;
                case CharCode.Question:
                    this._nextChar();
                    return TokenType.Question;
                case CharCode.Colon:
                    this._nextChar();
                    return TokenType.Colon;
                case CharCode.Comma:
                    this._nextChar();
                    return TokenType.Comma;
                default:
                    if (this.c === CharCode._ || this.c === CharCode.$ || isalpha(this.c)) {
                        let start = this.pointer;
                        do {
                            this._nextChar();
                            if (!(this.c === CharCode._ || isalnum(this.c))) {
                                break;
                            }
                        } while (this.c);
                        let len = this.pointer - start;
                        let str = this.source.substr(start, len);
                        if (str === 'null' || str === 'nil') {
                            this.token.value = null;
                            return TokenType.Null;
                        }
                        else if (str === 'true') {
                            this.token.value = true;
                            return TokenType.Boolean;
                        }
                        else if (str === 'false') {
                            this.token.value = false;
                            return TokenType.Boolean;
                        }
                        else {
                            this.token.value = str;
                            return TokenType.Id;
                        }
                    }
                    else if (isdigit(this.c)) {
                        this._readNumber();
                        return TokenType.Number;
                    }
                    else if (isQuote(this.c)) {
                        this._readString();
                        return TokenType.String;
                    }
                    else {
                        this.error = LexerErrorCode.UnknownToken;
                        return TokenType.Unknown;
                    }
            }
        }
    }
    _readNumber() {
        let NumberState;
        (function (NumberState) {
            NumberState[NumberState["Start"] = 0] = "Start";
            NumberState[NumberState["Nonzero"] = 1] = "Nonzero";
            NumberState[NumberState["Dot"] = 2] = "Dot";
            NumberState[NumberState["FractionalStart"] = 3] = "FractionalStart";
            NumberState[NumberState["Fractional"] = 4] = "Fractional";
            NumberState[NumberState["ExponentMark"] = 5] = "ExponentMark";
            NumberState[NumberState["ExponentSign"] = 6] = "ExponentSign";
            NumberState[NumberState["ExponentValue"] = 7] = "ExponentValue";
            NumberState[NumberState["Success"] = 8] = "Success";
            NumberState[NumberState["Error"] = 9] = "Error";
        })(NumberState || (NumberState = {}));
        var state = NumberState.Start;
        let start = this.pointer;
        while (state !== NumberState.Success && state !== NumberState.Error) {
            switch (state) {
                case NumberState.Start:
                    if (this.c === CharCode._0) {
                        state = NumberState.Dot;
                        this._nextChar();
                    }
                    else if (this.c >= CharCode._1 && this.c <= CharCode._9) {
                        state = NumberState.Nonzero;
                        this._nextChar();
                    }
                    else {
                        state = NumberState.Error;
                    }
                    break;
                case NumberState.Nonzero:
                    if (this.c >= CharCode._0 && this.c <= CharCode._9) {
                        this._nextChar();
                    }
                    else {
                        state = NumberState.Dot;
                    }
                    break;
                case NumberState.Dot:
                    if (this.c === CharCode.Dot) {
                        state = NumberState.FractionalStart;
                        this._nextChar();
                    }
                    else {
                        state = NumberState.ExponentMark;
                    }
                    break;
                case NumberState.FractionalStart:
                    if (this.c >= CharCode._0 && this.c <= CharCode._9) {
                        state = NumberState.Fractional;
                        this._nextChar();
                    }
                    else {
                        state = NumberState.Error;
                    }
                    break;
                case NumberState.Fractional:
                    if (this.c >= CharCode._0 && this.c <= CharCode._9) {
                        this._nextChar();
                    }
                    else {
                        state = NumberState.ExponentMark;
                    }
                    break;
                case NumberState.ExponentMark:
                    if (this.c === CharCode.E || this.c === CharCode.e) {
                        state = NumberState.ExponentSign;
                        this._nextChar();
                    }
                    else {
                        state = NumberState.Success;
                    }
                    break;
                case NumberState.ExponentSign:
                    if (this.c === CharCode.Plus || this.c === CharCode.Minus) {
                        state = NumberState.ExponentValue;
                        this._nextChar();
                    }
                    else {
                        state = NumberState.ExponentValue;
                    }
                    break;
                case NumberState.ExponentValue:
                    if (this.c >= CharCode._0 && this.c <= CharCode._9) {
                        this._nextChar();
                    }
                    else {
                        state = NumberState.Success;
                    }
                    break;
                default:
                    state = NumberState.Error;
                    break;
            }
        }
        if (state === NumberState.Success) {
            this.token.value = parseFloat(this.source.substring(start, this.pointer));
            return;
        }
        this.error = LexerErrorCode.InvalidNumber;
    }
    _readString() {
        let quote = this.c;
        this._nextChar();
        let start = this.pointer;
        var segmentStart = start;
        var segmentLen = 0;
        var ret = '';
        let pushCurrentSegment = () => {
            if (segmentLen > 0) {
                ret += this.source.substr(segmentStart, segmentLen);
                segmentLen = 0;
            }
            segmentStart = this.pointer + 1;
        };
        while (this.c !== quote) {
            let c = this.c;
            switch (c) {
                case CharCode.Null:
                    this.error = LexerErrorCode.UnclosedString;
                    return;
                case CharCode.LineFeed:
                case CharCode.CarriageReturn:
                    this._newline();
                    this.error = LexerErrorCode.UnclosedString;
                    return;
                case CharCode.Backslash:
                    {
                        this._nextChar();
                        var esc = null;
                        switch (this.c) {
                            case CharCode.DoubleQuote:
                                esc = '"';
                                break;
                            case CharCode.SingleQuote:
                                esc = '\'';
                                break;
                            case CharCode.Backslash:
                                esc = '\\';
                                break;
                            case CharCode.Slash:
                                esc = '/';
                                break;
                            case CharCode.b:
                                esc = '\b';
                                break;
                            case CharCode.f:
                                esc = '\f';
                                break;
                            case CharCode.n:
                                esc = '\n';
                                break;
                            case CharCode.r:
                                esc = '\r';
                                break;
                            case CharCode.t:
                                esc = '\t';
                                break;
                            case CharCode.u:
                                {
                                    if (this.pointer + 4 < this.length) {
                                        Lexer.unicodeRE.lastIndex = 0;
                                        let str = this.source.substr(this.pointer + 1, 4);
                                        if (Lexer.unicodeRE.test(str)) {
                                            esc = String.fromCharCode(parseInt(str, 16));
                                            this.pointer += 4;
                                        }
                                        else {
                                            this.error = LexerErrorCode.InvalidUnicode;
                                        }
                                    }
                                    break;
                                }
                            default:
                                if (this.c === CharCode.LineFeed || this.c === CharCode.Null) {
                                    this.error = LexerErrorCode.UnclosedString;
                                }
                                else {
                                    this.error = LexerErrorCode.InvalidEscape;
                                }
                                continue;
                        }
                        pushCurrentSegment();
                        this._nextChar();
                        ret += esc;
                        break;
                    }
                default:
                    if (iscntrl(this.c)) {
                        this.error = LexerErrorCode.InvalidCharacter;
                    }
                    segmentLen++;
                    this._nextChar();
                    break;
            }
        }
        // assert(this.c === quote);
        this._nextChar();
        if (ret.length > 0) {
            pushCurrentSegment();
            this.token.value = ret;
        }
        else {
            this.token.value = this.source.substr(start, segmentLen);
        }
    }
}
Lexer.unicodeRE = /^[a-fA-F0-9]{4}/;
exports.Lexer = Lexer;
//# sourceMappingURL=lexer.js.map