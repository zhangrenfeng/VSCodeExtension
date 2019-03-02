/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const Json = require("jsonc-parser");
const vscode_1 = require("vscode");
function format(document, range, options) {
    const documentText = document.getText();
    let initialIndentLevel;
    let formatText;
    let formatTextStart;
    let rangeStart, rangeEnd;
    if (range) {
        rangeStart = document.offsetAt(range.start);
        rangeEnd = document.offsetAt(range.end);
        let startPosition = new vscode_1.Position(range.start.line, 0);
        formatTextStart = document.offsetAt(startPosition);
        let endOffset = document.offsetAt(new vscode_1.Position(range.end.line + 1, 0));
        let endLineStart = document.offsetAt(new vscode_1.Position(range.end.line, 0));
        while (endOffset > endLineStart && isEOL(documentText, endOffset - 1)) {
            endOffset--;
        }
        range = new vscode_1.Range(startPosition, document.positionAt(endOffset));
        formatText = documentText.substring(formatTextStart, endOffset);
        initialIndentLevel = computeIndentLevel(formatText, 0, options);
    }
    else {
        formatText = documentText;
        range = new vscode_1.Range(new vscode_1.Position(0, 0), document.positionAt(formatText.length));
        initialIndentLevel = 0;
        formatTextStart = 0;
        rangeStart = 0;
        rangeEnd = documentText.length;
    }
    let eol = getEOL(document);
    let lineBreak = false;
    let indentLevel = 0;
    let indentValue;
    if (options.insertSpaces) {
        indentValue = repeat(' ', options.tabSize);
    }
    else {
        indentValue = '\t';
    }
    let scanner = Json.createScanner(formatText, false);
    let hasError = false;
    function newLineAndIndent() {
        return eol + repeat(indentValue, initialIndentLevel + indentLevel);
    }
    function scanNext() {
        let token = scanner.scan();
        lineBreak = false;
        while (token === Json.SyntaxKind.Trivia || token === Json.SyntaxKind.LineBreakTrivia) {
            lineBreak = lineBreak || (token === Json.SyntaxKind.LineBreakTrivia);
            token = scanner.scan();
        }
        hasError = token === Json.SyntaxKind.Unknown || scanner.getTokenError() !== Json.ScanError.None;
        return token;
    }
    let editOperations = [];
    function addEdit(text, startOffset, endOffset) {
        if (!hasError && startOffset < rangeEnd && endOffset > rangeStart && documentText.substring(startOffset, endOffset) !== text) {
            let replaceRange = new vscode_1.Range(document.positionAt(startOffset), document.positionAt(endOffset));
            editOperations.push(vscode_1.TextEdit.replace(replaceRange, text));
        }
    }
    let firstToken = scanNext();
    if (firstToken !== Json.SyntaxKind.EOF) {
        let firstTokenStart = scanner.getTokenOffset() + formatTextStart;
        let initialIndent = repeat(indentValue, initialIndentLevel);
        addEdit(initialIndent, formatTextStart, firstTokenStart);
    }
    while (firstToken !== Json.SyntaxKind.EOF) {
        let firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
        let secondToken = scanNext();
        let replaceContent = '';
        while (!lineBreak && (secondToken === Json.SyntaxKind.LineCommentTrivia || secondToken === Json.SyntaxKind.BlockCommentTrivia)) {
            // comments on the same line: keep them on the same line, but ignore them otherwise
            let commentTokenStart = scanner.getTokenOffset() + formatTextStart;
            addEdit(' ', firstTokenEnd, commentTokenStart);
            firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
            replaceContent = secondToken === Json.SyntaxKind.LineCommentTrivia ? newLineAndIndent() : '';
            secondToken = scanNext();
        }
        if (secondToken === Json.SyntaxKind.CloseBraceToken) {
            if (firstToken !== Json.SyntaxKind.OpenBraceToken) {
                indentLevel--;
                replaceContent = newLineAndIndent();
            }
        }
        else if (secondToken === Json.SyntaxKind.CloseBracketToken) {
            if (firstToken !== Json.SyntaxKind.OpenBracketToken) {
                indentLevel--;
                replaceContent = newLineAndIndent();
            }
        }
        else {
            switch (firstToken) {
                case Json.SyntaxKind.OpenBracketToken:
                case Json.SyntaxKind.OpenBraceToken:
                    indentLevel++;
                    replaceContent = newLineAndIndent();
                    break;
                case Json.SyntaxKind.CommaToken:
                case Json.SyntaxKind.LineCommentTrivia:
                    replaceContent = newLineAndIndent();
                    break;
                case Json.SyntaxKind.BlockCommentTrivia:
                    if (lineBreak) {
                        replaceContent = newLineAndIndent();
                    }
                    else {
                        // symbol following comment on the same line: keep on same line, separate with ' '
                        replaceContent = ' ';
                    }
                    break;
                case Json.SyntaxKind.ColonToken:
                    replaceContent = ' ';
                    break;
                case Json.SyntaxKind.StringLiteral:
                    if (secondToken === Json.SyntaxKind.ColonToken) {
                        replaceContent = '';
                        break;
                    }
                // fall through
                // tslint:disable-next-line:no-switch-case-fall-through
                case Json.SyntaxKind.NullKeyword:
                case Json.SyntaxKind.TrueKeyword:
                case Json.SyntaxKind.FalseKeyword:
                case Json.SyntaxKind.NumericLiteral:
                case Json.SyntaxKind.CloseBraceToken:
                case Json.SyntaxKind.CloseBracketToken:
                    if (secondToken === Json.SyntaxKind.LineCommentTrivia || secondToken === Json.SyntaxKind.BlockCommentTrivia) {
                        replaceContent = ' ';
                    }
                    else if (secondToken !== Json.SyntaxKind.CommaToken && secondToken !== Json.SyntaxKind.EOF) {
                        hasError = true;
                    }
                    break;
            }
            if (lineBreak && (secondToken === Json.SyntaxKind.LineCommentTrivia || secondToken === Json.SyntaxKind.BlockCommentTrivia)) {
                replaceContent = newLineAndIndent();
            }
        }
        let secondTokenStart = scanner.getTokenOffset() + formatTextStart;
        addEdit(replaceContent, firstTokenEnd, secondTokenStart);
        firstToken = secondToken;
    }
    return editOperations;
}
exports.format = format;
const tokensAfterValue = [Json.SyntaxKind.LineCommentTrivia, Json.SyntaxKind.BlockCommentTrivia, Json.SyntaxKind.CommaToken];
function repeat(s, count) {
    let result = '';
    for (let i = 0; i < count; i++) {
        result += s;
    }
    return result;
}
function computeIndentLevel(content, offset, options) {
    let i = 0;
    let nChars = 0;
    let tabSize = options.tabSize || 4;
    while (i < content.length) {
        let ch = content.charAt(i);
        if (ch === ' ') {
            nChars++;
        }
        else if (ch === '\t') {
            nChars += tabSize;
        }
        else {
            break;
        }
        i++;
    }
    return Math.floor(nChars / tabSize);
}
function getEOL(document) {
    let text = document.getText();
    if (document.lineCount > 1) {
        let to = document.offsetAt(new vscode_1.Position(1, 0));
        let from = to;
        while (from > 0 && isEOL(text, from - 1)) {
            from--;
        }
        return text.substr(from, to - from);
    }
    return '\n';
}
function isEOL(text, offset) {
    return '\r\n'.indexOf(text.charAt(offset)) !== -1;
}
//# sourceMappingURL=formatter.js.map