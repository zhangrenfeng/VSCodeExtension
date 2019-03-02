'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const json = require("jsonc-parser");
const mistDocument_1 = require("./mistDocument");
const template_schema_1 = require("./template_schema");
class MistDiagnosticProvider {
    constructor(context) {
        this.context = context;
        this._waiting = false;
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('mist');
        vscode.workspace.textDocuments.forEach(d => this.validate(d));
    }
    dispose() {
        this.diagnosticCollection.dispose();
    }
    validate(document) {
        return __awaiter(this, void 0, void 0, function* () {
            if (document.languageId !== 'mist') {
                return;
            }
            let mistDoc = mistDocument_1.MistDocument.getDocumentByUri(document.uri);
            yield template_schema_1.NodeSchema.setCurrentDir(mistDoc.dir());
            let errors = [];
            let objectStack = [];
            let exps = [];
            let mistexpPath = this.context.asAbsolutePath('./bin/mistexp');
            let currentProperty;
            let range = (offset, length) => {
                let start = document.positionAt(offset);
                return new vscode.Range(start, start.translate(0, length));
            };
            function checkString(offset, length) {
                let jsonString = new mistDocument_1.JsonString(document.getText().substr(offset + 1, length - 2));
                if (jsonString.errors.length > 0) {
                    jsonString.errors.forEach(e => {
                        errors.push(new vscode.Diagnostic(range(offset + e.offset + 1, e.length), e.description, vscode.DiagnosticSeverity.Error));
                    });
                }
            }
            json.visit(document.getText(), {
                onError(error, offset, length) {
                    errors.push(new vscode.Diagnostic(range(offset, length), json.getParseErrorMessage(error), vscode.DiagnosticSeverity.Error));
                },
                onObjectBegin(offset, length) {
                    objectStack.push([]);
                },
                onObjectEnd(offset, length) {
                    objectStack.pop();
                },
                onObjectProperty(property, offset, length) {
                    checkString(offset, length);
                    currentProperty = property;
                    let object = objectStack[objectStack.length - 1];
                    if (object.indexOf(property) >= 0) {
                        errors.push(new vscode.Diagnostic(range(offset, length), `Duplicate object key '${property}'`, vscode.DiagnosticSeverity.Warning));
                    }
                    object.push(property);
                },
                onLiteralValue(value, offset, length) {
                    if (typeof value === 'string') {
                        checkString(offset, length);
                        let match = value.match(/\$\{(?:[^}]|[\r\n])*/m);
                        if (match && match[0].length === value.length) {
                            errors.push(new vscode.Diagnostic(range(offset + length - 1, 1), 'unclosed expression', vscode.DiagnosticSeverity.Error));
                        }
                    }
                }
            });
            let expAnalyseErrors = mistDoc ? mistDoc.validate() : [];
            Promise.all([errors, expAnalyseErrors]).then(values => {
                let diagnostics = values.reduce((p, c, i, a) => {
                    return p.concat(c);
                }, []);
                this.diagnosticCollection.set(document.uri, diagnostics);
            });
        });
    }
    onChange(document) {
        if (!this._waiting) {
            this._waiting = true;
            setTimeout(() => {
                this._waiting = false;
                this.validate(document);
            }, 200);
        }
    }
}
exports.default = MistDiagnosticProvider;
//# sourceMappingURL=diagnosticProvider.js.map