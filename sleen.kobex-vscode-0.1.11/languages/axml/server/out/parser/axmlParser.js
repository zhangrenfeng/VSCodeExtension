"use strict";
/*
    小程序 AXML 解析
    - 支持没有值的属性，如 <button disabled/>
    - 对 & 不作转义处理
    - 字符串、内容中可以出现 < & 等符号
    - 不支持 CDATA
    - 文本 trim
    - 支持表达式不带双引号，如 <tag prop={{exp}} />
*/
Object.defineProperty(exports, "__esModule", { value: true });
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["None"] = 0] = "None";
    ErrorCode[ErrorCode["GreaterThanExpected"] = 1] = "GreaterThanExpected";
    ErrorCode[ErrorCode["UnknownCharacter"] = 2] = "UnknownCharacter";
    ErrorCode[ErrorCode["AttributeValueExpected"] = 3] = "AttributeValueExpected";
    ErrorCode[ErrorCode["UnclosedString"] = 4] = "UnclosedString";
    ErrorCode[ErrorCode["UnclosedComment"] = 5] = "UnclosedComment";
    ErrorCode[ErrorCode["UnclosedExpression"] = 6] = "UnclosedExpression";
    ErrorCode[ErrorCode["InvalidTagName"] = 7] = "InvalidTagName";
    ErrorCode[ErrorCode["TagNotMatch"] = 8] = "TagNotMatch";
    ErrorCode[ErrorCode["UnexpectedTerminal"] = 9] = "UnexpectedTerminal";
    ErrorCode[ErrorCode["EndTagExpected"] = 10] = "EndTagExpected";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
function parseAxml(axml, visitor) {
    let State;
    (function (State) {
        State[State["Text"] = 0] = "Text";
        State[State["TagStart"] = 1] = "TagStart";
        State[State["TagEnd"] = 2] = "TagEnd";
        State[State["Comment"] = 3] = "Comment";
    })(State || (State = {}));
    const length = axml.length;
    let offset = 0;
    let char = 0;
    let state = State.Text;
    let tagStack = [];
    let textStart = 0;
    let commentStart = -1;
    let start = 0;
    let end = 0;
    next();
    while (true) {
        if (char === CharCode.EOF) {
            break;
        }
        switch (state) {
            case State.Text: {
                if (char === CharCode.LessThan) {
                    const tagStart = offset - 1;
                    next();
                    char = char + 0; // make tsc happy
                    if (char === CharCode.Slash) {
                        end = tagStart;
                        onText();
                        next();
                        const tagName = readName();
                        start = tagStart;
                        end = offset;
                        if (tagName !== tagStack[tagStack.length - 1]) {
                            onError(ErrorCode.TagNotMatch);
                        }
                        onTagEnd(tagName);
                        state = State.TagEnd;
                    }
                    else if (char === CharCode.Exclamation) {
                        next();
                        char = char + 0; // make tsc happy
                        if (char === CharCode.Minus) {
                            next();
                            if (char === CharCode.Minus) {
                                commentStart = offset;
                                end = offset - 4;
                                onText();
                                next();
                                state = State.Comment;
                                continue;
                            }
                        }
                    }
                    else if (isNameStartChar(char)) {
                        end = tagStart;
                        onText();
                        start = tagStart;
                        const tagName = readName();
                        end = offset - 1;
                        onTagStart(tagName);
                        state = State.TagStart;
                        continue;
                    }
                    continue;
                    // onError(ErrorCode.InvalidTagName);
                    // return;
                }
                else if (isControlChar(char)) {
                    start = offset - 1;
                    end = offset;
                    onError(ErrorCode.UnknownCharacter);
                    next();
                }
                else {
                    next();
                }
                break;
            }
            case State.TagStart: {
                if (char === CharCode.Slash) {
                    next();
                    char = char + 0; // make tsc happy
                    if (char === CharCode.GreaterThan) {
                        next();
                        state = State.Text;
                        start = offset - 3;
                        end = offset - 1;
                        onTagEnd(null);
                    }
                    else {
                        start = offset - 2;
                        end = offset - 1;
                        onError(ErrorCode.GreaterThanExpected);
                        start = offset - 2;
                        end = offset - 1;
                        onTagEnd(null);
                    }
                }
                else if (char === CharCode.GreaterThan) {
                    textStart = offset;
                    next();
                    onTagStartClose(offset - 2);
                    state = State.Text;
                }
                else if (isWhitespace(char) || isLineBreak(char)) {
                    next();
                    continue;
                }
                else if (isNameStartChar(char)) {
                    start = offset - 1;
                    const name = readName();
                    end = offset - 1;
                    onAttributeName(name);
                    skipWhitespaces();
                    if (char === CharCode.Equals) {
                        next();
                        skipWhitespaces();
                        start = offset - 1;
                        char = char + 0; // make tsc happy
                        if (char === CharCode.SingleQuote || char === CharCode.DoubleQuote) {
                            const value = readString(char);
                            if (value === null) {
                                return;
                            }
                            end = offset - 1;
                            onAttributeValue(value);
                        }
                        else if (char === CharCode.OpenBrace) {
                            const value = readExpString();
                            if (value === null) {
                                return;
                            }
                            end = offset - 1;
                            onAttributeValue(value);
                        }
                        else {
                            end = start;
                            onError(ErrorCode.AttributeValueExpected);
                        }
                    }
                }
                else {
                    start = offset - 1;
                    end = offset;
                    onError(ErrorCode.UnknownCharacter);
                    next();
                }
                break;
            }
            case State.TagEnd: {
                if (char === CharCode.GreaterThan) {
                    next();
                    state = State.Text;
                }
                else if (isWhitespace(char) || isLineBreak(char)) {
                    next();
                    continue;
                }
                else {
                    start = offset - 2;
                    end = offset - 1;
                    onError(ErrorCode.UnknownCharacter);
                    return;
                }
                break;
            }
            case State.Comment: {
                if (char === CharCode.Minus
                    && offset + 1 < length
                    && axml.charCodeAt(offset) === CharCode.Minus
                    && axml.charCodeAt(offset + 1) === CharCode.GreaterThan) {
                    start = commentStart - 4;
                    end = offset + 2;
                    onComment(axml.slice(commentStart, offset - 1));
                    next();
                    next();
                    next();
                    textStart = offset - 1;
                    state = State.Text;
                }
                else {
                    next();
                }
            }
        }
    }
    if (state === State.Text) {
        end = offset;
        onText();
    }
    else {
        start = offset;
        end = offset;
        onError(ErrorCode.UnexpectedTerminal);
    }
    while (tagStack.length > 0) {
        start = offset;
        end = offset;
        onError(ErrorCode.EndTagExpected);
        tagStack.pop();
    }
    function getRange() {
        return { offset: start, length: end - start };
    }
    function onError(error) {
        if (visitor.onError) {
            visitor.onError(getRange(), error);
        }
    }
    function onTagStart(tagName) {
        tagStack.push(tagName);
        if (visitor.onTagStart) {
            visitor.onTagStart(getRange(), tagName);
        }
    }
    function onTagStartClose(offset) {
        if (visitor.onTagStartClose) {
            visitor.onTagStartClose({ offset, length: 1 });
        }
    }
    function onTagEnd(tagName) {
        if (!tagName) {
            onTagStartClose(end - 1);
        }
        textStart = offset;
        tagStack.pop();
        if (visitor.onTagEnd) {
            visitor.onTagEnd(getRange(), tagName);
        }
    }
    function onAttributeName(key) {
        if (visitor.onAttributeName) {
            visitor.onAttributeName(getRange(), key);
        }
    }
    function onAttributeValue(value) {
        if (visitor.onAttributeValue) {
            visitor.onAttributeValue(getRange(), value);
        }
    }
    function onText() {
        if (end > textStart) {
            const text = axml.slice(textStart, end).trim();
            if (!text) {
                return;
            }
            if (visitor.onText) {
                visitor.onText({ offset: textStart, length: end - textStart }, text);
            }
        }
    }
    function onComment(comment) {
        comment = comment.trim();
        if (comment && visitor.onComment) {
            visitor.onComment(getRange(), comment);
        }
    }
    function next() {
        if (offset >= length) {
            char = CharCode.EOF;
        }
        else {
            char = axml.charCodeAt(offset++);
        }
    }
    function skipWhitespaces() {
        while (isWhitespace(char) || isLineBreak(char)) {
            next();
        }
    }
    function readName() {
        const start = offset - 1;
        while (isNameChar(char)) {
            next();
        }
        return axml.slice(start, offset - 1);
    }
    function readString(quote) {
        let ret = '';
        let start = offset;
        next();
        while (true) {
            if (char === CharCode.EOF) {
                onError(ErrorCode.UnclosedString);
                break;
            }
            else if (char === quote) {
                ret += axml.substring(start, offset - 1);
                next();
                return ret;
            }
            next();
        }
        return null;
    }
    function readExpString() {
        let ret = '';
        let start = offset - 1;
        next();
        while (true) {
            if (char === CharCode.EOF) {
                onError(ErrorCode.UnclosedExpression);
                break;
            }
            else if (char === CharCode.CloseBrace && axml.charCodeAt(offset) === CharCode.CloseBrace) {
                next();
                next();
                ret += axml.substring(start, offset - 1);
                return ret;
            }
            next();
        }
        return null;
    }
}
exports.parseAxml = parseAxml;
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case ErrorCode.None: return 'no error';
        case ErrorCode.GreaterThanExpected: return "'>' expected";
        case ErrorCode.UnknownCharacter: return 'unknown character';
        case ErrorCode.AttributeValueExpected: return 'attribute value expected';
        case ErrorCode.UnclosedString: return "unclosed string literal";
        case ErrorCode.UnclosedComment: return "'-->' expected";
        case ErrorCode.UnclosedExpression: return "unclosed expression, '}}' expected";
        case ErrorCode.InvalidTagName: return "invalid tag name";
        case ErrorCode.TagNotMatch: return "tag not match";
        case ErrorCode.UnexpectedTerminal: return "unexpected terminal";
        case ErrorCode.EndTagExpected: return "end tag expected";
        default: return 'unknown error';
    }
}
exports.getErrorMessage = getErrorMessage;
function isWhitespace(c) {
    return c === CharCode.Space
        || c === CharCode.Tab
        || c === CharCode.VerticalTab
        || c === CharCode.FormFeed;
}
function isLineBreak(c) {
    return c === CharCode.LineFeed || c === CharCode.CarriageReturn;
}
// NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
function isNameStartChar(c) {
    return (c >= CharCode.a && c <= CharCode.z)
        || (c >= CharCode.A && c <= CharCode.Z)
        || c === CharCode.Colon || c === CharCode._;
}
// NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
function isNameChar(c) {
    return isNameStartChar(c)
        || c === CharCode.Minus
        || c === CharCode.Dot
        || (c >= CharCode._0 && c <= CharCode._9);
}
function isControlChar(c) {
    return c < 32 && !isWhitespace(c) && !isLineBreak(c);
}
var CharCode;
(function (CharCode) {
    CharCode[CharCode["EOF"] = 0] = "EOF";
    CharCode[CharCode["Tab"] = 9] = "Tab";
    CharCode[CharCode["LineFeed"] = 10] = "LineFeed";
    CharCode[CharCode["VerticalTab"] = 11] = "VerticalTab";
    CharCode[CharCode["FormFeed"] = 12] = "FormFeed";
    CharCode[CharCode["CarriageReturn"] = 13] = "CarriageReturn";
    CharCode[CharCode["Space"] = 32] = "Space";
    CharCode[CharCode["Exclamation"] = 33] = "Exclamation";
    CharCode[CharCode["DoubleQuote"] = 34] = "DoubleQuote";
    CharCode[CharCode["Ampersand"] = 38] = "Ampersand";
    CharCode[CharCode["SingleQuote"] = 39] = "SingleQuote";
    CharCode[CharCode["Minus"] = 45] = "Minus";
    CharCode[CharCode["Dot"] = 46] = "Dot";
    CharCode[CharCode["Slash"] = 47] = "Slash";
    CharCode[CharCode["_0"] = 48] = "_0";
    CharCode[CharCode["_9"] = 57] = "_9";
    CharCode[CharCode["Colon"] = 58] = "Colon";
    CharCode[CharCode["LessThan"] = 60] = "LessThan";
    CharCode[CharCode["Equals"] = 61] = "Equals";
    CharCode[CharCode["GreaterThan"] = 62] = "GreaterThan";
    CharCode[CharCode["Question"] = 63] = "Question";
    CharCode[CharCode["A"] = 65] = "A";
    CharCode[CharCode["Z"] = 90] = "Z";
    CharCode[CharCode["_"] = 95] = "_";
    CharCode[CharCode["a"] = 97] = "a";
    CharCode[CharCode["z"] = 122] = "z";
    CharCode[CharCode["OpenBrace"] = 123] = "OpenBrace";
    CharCode[CharCode["CloseBrace"] = 125] = "CloseBrace";
})(CharCode || (CharCode = {}));
//# sourceMappingURL=axmlParser.js.map