"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const util_1 = require("./util");
const document_1 = require("./document");
const parser_1 = require("../exp/parser");
class AXMLValidation {
    doValidation(textDocument) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = yield document_1.PageDocument.getDocument(util_1.pathFromUri(textDocument.uri));
            const rootNode = yield doc.getAxmlTree();
            const errors = yield doc.getAxmlErrors();
            const diagnostics = errors.map(e => {
                const diagnosic = {
                    severity: e.severity,
                    range: util_1.createRange(e.location, textDocument),
                    message: e.message,
                    source: 'axml',
                    code: 1000 + e.code,
                };
                return diagnosic;
            });
            const styles = Object.keys(yield doc.getStyles());
            const components = yield doc.getAvailableComponents();
            yield Promise.all(rootNode.childNodes.map(c => this.doValidationElement(c, textDocument, doc, components, diagnostics, styles)));
            return diagnostics;
        });
    }
    doValidationElement(element, textDocument, doc, components, diagnostics, styles) {
        return __awaiter(this, void 0, void 0, function* () {
            if (element.type !== 'element') {
                const text = textDocument.getText(util_1.createRange(element, textDocument));
                const expRegex = /\{\{((?:.|\n)*?)}}/g;
                let match;
                while (match = expRegex.exec(text)) {
                    this.doValidationExp(match[1], true, element.offset + match.index + 2, textDocument, diagnostics);
                }
                return;
            }
            const tagName = element.tagStart.tagTextNode.text;
            const component = components[tagName];
            if (component) {
                if (!component.isAvailable(doc.getWhenContext(element))) {
                    this.error(diagnostics, 2014, `组件 \`${tagName}\` 在当前环境不可用`, util_1.createRange(element.tagStart.tagTextNode, textDocument));
                }
                const attributes = yield doc.getAvailableAttributes(element);
                const foundAttrs = [];
                element.tagStart.attributes.forEach(attrNode => {
                    const attrName = attrNode.name.text;
                    if (component.additionalAttributes || attrName in attributes) {
                        if (foundAttrs.indexOf(attrName) >= 0) {
                            this.error(diagnostics, 2001, `\`${attrName}\` 属性重复定义`, util_1.createRange(attrNode.name, textDocument));
                        }
                        else {
                            foundAttrs.push(attrName);
                            const attr = attributes[attrName];
                            if (attr) {
                                this.doValidationAttributeValue(attrNode, textDocument, doc, attr, diagnostics, styles);
                                if (attr.dependencies) {
                                    if (attr.dependencies.some(k => !element.tagStart.attributes.find(a => a.name.text === k))) {
                                        const message = `依赖属性 ${attr.dependencies.map(a => '`' + a + '`').join(', ')}`;
                                        this.error(diagnostics, 2002, message, util_1.createRange(attrNode.name, textDocument), true);
                                    }
                                }
                            }
                        }
                    }
                    else if (!attrName.startsWith('data-')) {
                        let message;
                        if (attrName in component.attributes) {
                            message = `属性 \`${attrName}\` 在当前环境不可用`;
                        }
                        else {
                            message = `\`${tagName}\` 上不存在属性 \`${attrName}\``;
                        }
                        this.error(diagnostics, 2003, message, util_1.createRange(attrNode.name, textDocument));
                    }
                });
                const requiredAttributes = Object.keys(attributes).filter(k => attributes[k].required && foundAttrs.indexOf(k) < 0);
                if (requiredAttributes.length > 0) {
                    const message = `缺少必需属性 ${requiredAttributes.map(k => '`' + k + '`').join(', ')}`;
                    this.error(diagnostics, 2004, message, util_1.createRange(element.tagStart, textDocument));
                }
            }
            else {
                this.error(diagnostics, 2005, `不存在组件 \`${tagName}\``, util_1.createRange(element.tagStart.tagTextNode, textDocument));
            }
            element.tagStart.attributes.forEach(attrNode => {
                this.doValidationValueExp(attrNode, textDocument, diagnostics);
            });
            if (element.childNodes) {
                yield Promise.all(element.childNodes.map(c => this.doValidationElement(c, textDocument, doc, components, diagnostics, styles)));
            }
        });
    }
    doValidationAttributeValue(node, textDocument, doc, def, diagnostics, styles) {
        this.doValidationValueType(node, textDocument, def, diagnostics);
        if (!node.value) {
            return;
        }
        const name = node.name.text;
        const value = node.value.text;
        if (util_1.isEventAttr(name)) {
            this.doValidationEvent(node.value, textDocument, doc, diagnostics);
        }
        else if (util_1.isClassAttr(name)) {
            const type = this.getValueType(node.value);
            if (type === 'string') {
                if (!value.trim()) {
                    this.error(diagnostics, 2013, `\`${name}\` 属性中缺少样式名`, util_1.createRange(node.value, textDocument), true);
                    return;
                }
                const valueWithoutExp = value.replace(/[-\w]*\{\{.*?}}[-\w]*/g, s => ' '.repeat(s.length));
                const classRe = /[^\s]+/g;
                let match;
                const foundClasses = [];
                while ((match = classRe.exec(valueWithoutExp))) {
                    const selector = match[0];
                    const offset = match.index + node.value.offset + 1;
                    const range = util_1.createRange({ offset, length: selector.length }, textDocument);
                    if (!selector.match(AXMLValidation.selectorRegex)) {
                        this.error(diagnostics, 2009, `样式名格式错误`, range, true);
                    }
                    else if (foundClasses.indexOf(selector) >= 0) {
                        this.error(diagnostics, 2008, `样式名重复`, range, true);
                    }
                    else {
                        foundClasses.push(selector);
                        this.doValidationSelector('.' + selector, offset, textDocument, diagnostics, styles);
                    }
                }
            }
        }
        else if (name === 'id') {
            if (this.isExp(value)) {
                return;
            }
            else if (value.match(AXMLValidation.selectorRegex)) {
                this.doValidationSelector('#' + value, node.value.offset + 1, textDocument, diagnostics, styles);
            }
            else {
                this.error(diagnostics, 2010, `样式名格式错误`, util_1.createRange(node.value, textDocument), true);
            }
        }
    }
    doValidationSelector(selector, offset, textDocument, diagnostics, styles) {
        if (styles.indexOf(selector) < 0) {
            const range = util_1.createRange({ offset, length: selector.length - 1 }, textDocument);
            this.error(diagnostics, 2007, `找不到样式 \`${selector}\``, range, true);
        }
    }
    doValidationValueType(node, textDocument, def, diagnostics) {
        let type = def.type;
        if (type === 'event' || type === 'color') {
            type = 'string';
        }
        const range = util_1.createRange(node.value || node.name, textDocument);
        const valueType = this.getValueType(node.value);
        if (valueType === 'any' && def.expType === 'never') {
            this.error(diagnostics, 2011, `该属性不能使用表达式`, range);
        }
        else if (valueType !== 'any' && def.expType === 'always') {
            this.error(diagnostics, 2012, `该属性必须使用表达式`, range);
        }
        if (!this.isKindOfType(valueType, type)) {
            this.error(diagnostics, 2006, `属性值类型不匹配，需要 \`${type}\``, range);
        }
        else if (valueType !== 'any' && def.type === 'enum') {
            const value = node.value ? node.value.text : true;
            if (def.enum.indexOf(value) < 0) {
                this.error(diagnostics, 2015, `不支持的枚举值 \`${value}\`\n可用的值为：${def.enum.map(v => `\`${v}\``).join(', ')}`, range);
            }
        }
    }
    doValidationValueExp(node, textDocument, diagnostics) {
        if (!node.value)
            return;
        const firstChar = textDocument.getText(util_1.createRange({ offset: node.value.offset, length: 1 }, textDocument));
        const inQuote = firstChar === '"' || firstChar === "'";
        if (inQuote) {
            const expRegex = /\{\{((?:.|\n)*?)}}/g;
            let match;
            while (match = expRegex.exec(node.value.text)) {
                this.doValidationExp(match[1], true, node.value.offset + match.index + 3, textDocument, diagnostics);
            }
        }
        else {
            this.doValidationExp(node.value.text.slice(2, -2), false, node.value.offset + 2, textDocument, diagnostics);
        }
    }
    doValidationExp(exp, inQuote, offset, textDocument, diagnostics) {
        const result = parser_1.Parser.parse(exp);
        if (result.errorMessage) {
            this.error(diagnostics, 2016, `表达式语法错误：${result.errorMessage}`, util_1.createRange({ offset: offset + result.errorOffset, length: result.errorLength }, textDocument));
        }
    }
    doValidationEvent(node, textDocument, doc, diagnostics) {
        if (this.isExp(node.text))
            return;
        const method = doc.methods[node.text];
        if (!method) {
            this.error(diagnostics, 2017, `不存在方法：\`${node.text}\``, util_1.createRange(node, textDocument));
        }
    }
    error(diagnostics, code, message, range, isWarning = false) {
        diagnostics.push({
            source: 'kobex',
            code,
            message,
            range,
            severity: isWarning ? vscode_languageserver_1.DiagnosticSeverity.Warning : vscode_languageserver_1.DiagnosticSeverity.Error,
        });
    }
    getValueType(node) {
        if (!node) {
            return 'boolean';
        }
        const value = node.text;
        const exp = value.match(/^\{\{.*?}}/);
        if (exp && exp[0].length === value.length) {
            return 'any';
        }
        else {
            return 'string';
        }
    }
    isKindOfType(t1, t2) {
        if (t1 === 'any' || t2 === 'any' || t2 === 'enum') {
            return true;
        }
        return t1 === t2;
    }
    isExp(text) {
        return text.match(/\{\{.*?}}/);
    }
}
AXMLValidation.selectorRegex = /^[_a-zA-Z][-\w]*$/;
exports.AXMLValidation = AXMLValidation;
//# sourceMappingURL=axmlValidation.js.map