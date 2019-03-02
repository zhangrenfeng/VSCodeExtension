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
const parser_1 = require("../parser");
const component_1 = require("./component");
const fs = require("fs-extra");
const ts = require("typescript");
const path = require("path");
const jsonc = require("jsonc-parser");
const vscode_languageserver_1 = require("vscode-languageserver");
const util_1 = require("./util");
class PageDocument {
    constructor(path, appPath) {
        this.axmlErrors = [];
        this.methods = {};
        this.path = path;
        this.appPath = appPath;
    }
    get isComponent() { return this.config.component; }
    get axmlUri() { return `file://${this.path}.axml`; }
    static getTextDocument(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            let doc = this.textDocuments[uri];
            if (!doc) {
                doc = vscode_languageserver_1.TextDocument.create(uri, '', 0, yield fs.readFile(util_1.pathFromUri(uri), 'utf8'));
                this.textDocuments[uri] = doc;
            }
            return doc;
        });
    }
    static onTextDocumentChange(textDocument) {
        const uri = textDocument.uri;
        if (uri.endsWith('.axml')) {
            this.textDocuments[uri] = textDocument;
            const filePath = util_1.pathFromUri(uri);
            const pagePath = this.getPagePath(filePath);
            const doc = this.map[pagePath];
            if (doc) {
                doc.axmlTree = null;
                doc.axmlErrors = [];
            }
        }
    }
    static onFileChange(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = util_1.pathFromUri(event.uri);
            yield this.updateTextDocument(event.uri);
            if (filePath.endsWith('/app.acss')) {
                this.globalStylesMap[filePath] = yield PageDocument.loadAcssFromPath(filePath);
                for (const k in this.map) {
                    const doc = this.map[k];
                    this.doValidation(doc.axmlUri);
                }
                return;
            }
            const ext = path.extname(filePath);
            const pagePath = this.getPagePath(filePath);
            const doc = this.map[pagePath];
            if (doc) {
                if (event.type === ts.FileWatcherEventKind.Deleted && ext === '.axml') {
                    delete this.map[pagePath];
                    this.doValidationReferenced(doc);
                    return;
                }
                switch (ext) {
                    case '.js':
                    case '.ts':
                        yield doc.loadDataType();
                        this.doValidation(doc.axmlUri);
                        this.doValidationReferenced(doc);
                        break;
                    case '.json':
                        yield doc.loadConfigJson();
                        this.doValidation(doc.axmlUri);
                        break;
                    case '.acss':
                        yield doc.loadAcss();
                        this.doValidation(doc.axmlUri);
                        break;
                }
            }
        });
    }
    static getPagePath(filePath) {
        return path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)));
    }
    static getDocument(uriOrFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = util_1.pathFromUri(uriOrFilePath);
            const pagePath = this.getPagePath(filePath);
            let doc = this.map[pagePath];
            if (!doc) {
                if (yield fs.pathExists(pagePath + '.axml')) {
                    const appPath = yield this.findAppRootPath(filePath);
                    doc = new PageDocument(pagePath, appPath);
                    yield doc.loadConfigJson();
                    yield doc.loadDataType();
                    yield doc.loadAxml();
                    yield doc.loadAcss();
                    this.map[pagePath] = doc;
                }
            }
            return doc;
        });
    }
    getAxmlTree() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.axmlTree) {
                const doc = yield PageDocument.getTextDocument(this.axmlUri);
                let content = doc.getText();
                this.axmlTree = parser_1.parseAxmlTree(content, this.axmlErrors);
            }
            return this.axmlTree;
        });
    }
    getAxmlErrors() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.getAxmlTree();
            return this.axmlErrors;
        });
    }
    getAvailableComponents(whenContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const components = Object.assign({}, component_1.Component.getAllComponents(whenContext));
            if (this.isComponent) {
                components['slot'] = component_1.Component.getComponent('$slot');
            }
            const { usingComponents } = this.config;
            if (usingComponents && Object.keys(usingComponents).length > 0) {
                for (const name in usingComponents) {
                    const componentPath = this.getComponentPath(name);
                    const doc = yield PageDocument.getDocument(componentPath);
                    if (doc && doc.isComponent) {
                        const component = doc.getComponentDefinition();
                        if (component) {
                            components[name] = component;
                        }
                    }
                }
            }
            return components;
        });
    }
    getAvailableAttributes(node, excludeExists = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const element = PageDocument.getElementNode(node);
            const tagName = util_1.getTagName(element);
            const components = yield this.getAvailableComponents();
            const component = components[tagName];
            if (component) {
                const attributes = component.getAvailableAttributes(this.getWhenContext(element));
                if (excludeExists) {
                    element.tagStart.attributes.forEach(attr => delete attributes[attr.name.text]);
                }
                return attributes;
            }
            return {};
        });
    }
    static getElementNode(node) {
        while (node) {
            if (node.type === 'element') {
                return node;
            }
            node = node.parent;
        }
        return null;
    }
    getComponentPath(name) {
        const { usingComponents = {} } = this.config;
        const relativePath = usingComponents[name];
        // 项目绝对路径以 / 开头，相对路径以 ./ 或者 ../ 开头，npm 路径不以 / 开头
        if (relativePath.startsWith('/')) {
            return path.resolve(this.appPath, relativePath.slice(1));
        }
        else if (relativePath.startsWith('./') || relativePath.startsWith('../')) {
            return path.resolve(path.dirname(this.path), relativePath);
        }
        else {
            return path.resolve(this.appPath, `node_modules/${relativePath}`);
        }
    }
    getStyles() {
        return __awaiter(this, void 0, void 0, function* () {
            const styles = this.styles;
            const globalStyles = yield this.getGlobalStyle();
            const combinedStyles = Object.assign({}, globalStyles);
            for (const selector in styles) {
                combinedStyles[selector] = [...(combinedStyles[selector] || []), ...styles[selector]];
            }
            return combinedStyles;
        });
    }
    getWhenContext(element, parent = element.parent) {
        let prev;
        if (parent) {
            const index = parent.childNodes.indexOf(element);
            if (index > 0) {
                prev = parent.childNodes[index - 1];
            }
        }
        return {
            $this: this.getElementInfo(element),
            $parent: this.getElementInfo(parent),
            $parentView: this.getElementInfo(this.extractBlock(parent)),
            $prev: this.getElementInfo(prev),
        };
    }
    static doValidation(uri) {
        // to be overwrite
    }
    static updateTextDocument(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = this.textDocuments[uri];
            if (doc) {
                this.textDocuments[uri] = vscode_languageserver_1.TextDocument.create(uri, doc.languageId, doc.version + 1, yield fs.readFile(util_1.pathFromUri(uri), 'utf8'));
            }
        });
    }
    static doValidationReferenced(doc) {
        if (doc.isComponent) {
            for (const name in this.map) {
                const page = this.map[name];
                const { usingComponents = {} } = page.config;
                if (Object.keys(usingComponents).find(name => page.getComponentPath(name) === doc.path)) {
                    this.doValidation(page.axmlUri);
                }
            }
        }
    }
    static findAppRootPath(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            while (filePath) {
                const dir = path.dirname(filePath);
                if (yield fs.pathExists(path.join(dir, 'app.json'))) {
                    return dir;
                }
                filePath = dir;
            }
            return null;
        });
    }
    getGlobalStyle() {
        return __awaiter(this, void 0, void 0, function* () {
            const acssPath = path.join(this.appPath, 'app.acss');
            let styles = PageDocument.globalStylesMap[acssPath];
            if (!styles) {
                styles = yield PageDocument.loadAcssFromPath(acssPath);
                PageDocument.globalStylesMap[acssPath] = styles;
            }
            return styles;
        });
    }
    extractBlock(element) {
        while (element && element.tagStart.tagTextNode.text === 'block') {
            element = element.parent;
        }
        return element;
    }
    getElementInfo(element) {
        if (element && element.type === 'element') {
            const tag = util_1.getTagName(element);
            const attributes = {};
            element.tagStart.attributes.forEach(attr => {
                attributes[attr.name.text] = attr.value ? attr.value.text : true;
            });
            return {
                tag,
                attributes,
                isRef: this.config.usingComponents && tag in this.config.usingComponents,
            };
        }
        return {
            tag: '',
            attributes: {},
            isRef: false
        };
    }
    getComponentDefinition() {
        if (this.isComponent) {
            return new component_1.Component({
                extends: '$base-node',
                attributes: this.getAttributeDefinitions(this.props),
                description: this.documentation || `引用组件 \`${path.relative(this.appPath, this.path)}\``,
                singleTag: !(this.slots && this.slots.length > 0)
            }, true);
        }
        return null;
    }
    getAttributeDefinitions(data) {
        const attributes = {};
        for (const key in data) {
            const info = data[key];
            attributes[key] = {
                type: info.type,
                required: info.required,
                enum: info.enums,
                description: info.documentation || '组件 props',
                definition: info.definition
            };
        }
        return attributes;
    }
    loadConfigJson() {
        return __awaiter(this, void 0, void 0, function* () {
            const jsonPath = this.path + '.json';
            const doc = yield PageDocument.getTextDocument(`file://${jsonPath}`);
            const content = doc.getText();
            this.config = jsonc.parse(content, [], { allowTrailingComma: true });
        });
    }
    loadAxml() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isComponent) {
                this.slots = [];
                this.findSlot(yield this.getAxmlTree());
            }
        });
    }
    loadAcss() {
        return __awaiter(this, void 0, void 0, function* () {
            const acssPath = this.path + '.acss';
            this.styles = yield PageDocument.loadAcssFromPath(acssPath);
        });
    }
    static loadAcssFromPath(acssPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const styles = {};
            if (yield fs.pathExists(acssPath)) {
                const doc = yield this.getTextDocument(`file://${acssPath}`);
                let content = doc.getText();
                content = content.replace(/\/\*(.|\n)*?\*\//gm, s => ' '.repeat(s.length)); // replace comments to spaces
                const styleRe = /(.*?)(\s|\n)*\{((?:.|\n)*?)\}/g;
                let match;
                while ((match = styleRe.exec(content))) {
                    const startIndex = match.index;
                    const selectorText = match[1];
                    const selectorRe = /[-\.#\w]+/g;
                    while ((match = selectorRe.exec(selectorText))) {
                        const selector = match[0];
                        const start = startIndex + match.index;
                        const length = selector.length;
                        styles[selector] = [...(styles[selector] || []), {
                                uri: doc.uri,
                                range: {
                                    start,
                                    end: start + length
                                }
                            }];
                    }
                }
            }
            return styles;
        });
    }
    getValueType(valueNode) {
        if (valueNode) {
            return 'string';
        }
        return 'boolean';
    }
    findSlot(node) {
        const $slot = component_1.Component.getComponent('$slot');
        if (node && node.type === 'element') {
            const tagName = util_1.getTagName(node);
            if (tagName === 'slot') {
                const nameAttr = node.tagStart.attributes.find(attr => attr.name.text === 'name');
                const propsAttrs = node.tagStart.attributes.filter(attr => !(attr.name.text in $slot.attributes));
                const name = nameAttr && nameAttr.value ? nameAttr.value.text : null;
                const props = propsAttrs.reduce((p, c) => (Object.assign({}, p, { [c.name.text]: this.getValueType(c.value) })), {});
                this.slots.push({
                    name,
                    props,
                });
            }
            else {
                node.childNodes.forEach(child => this.findSlot(child));
            }
        }
    }
    loadDataType() {
        return __awaiter(this, void 0, void 0, function* () {
            let path;
            if (yield fs.pathExists(path = this.path + '.d.ts')) {
                ({ data: this.data, props: this.props } = yield this.loadDataTypeFromTS(path));
            }
            else if (yield fs.pathExists(path = this.path + '.ts')) {
                ({ data: this.data, props: this.props } = yield this.loadDataTypeFromTS(path));
            }
            else if (yield fs.pathExists(path = this.path + '.js')) {
                ({ data: this.data, props: this.props } = yield this.loadDataTypeFromJS(path));
            }
            else {
                this.data = {};
                this.props = {};
            }
        });
    }
    loadDataTypeFromTS(scriptPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const program = ts.createProgram([
                scriptPath,
                path.resolve(this.appPath, '@types/index.d.ts'),
                path.resolve(this.appPath, 'typings/index.d.ts'),
            ], {});
            const checker = program.getTypeChecker();
            let dataType;
            let propsType;
            program.getSourceFile(scriptPath).forEachChild(node => {
                if (!(ts.isClassDeclaration(node) || ts.isExportDeclaration(node))) {
                    return;
                }
                const flags = ts.getCombinedModifierFlags(node);
                if ((flags & ts.ModifierFlags.ExportDefault) === 0) {
                    return;
                }
                if (ts.isClassDeclaration(node)) {
                    const className = this.isComponent ? 'TinyComponent' : 'TinyPage';
                    const extendedClass = node.heritageClauses ? node.heritageClauses[0].types[0] : null;
                    if (extendedClass && ts.isIdentifier(extendedClass.expression) && extendedClass.expression.text === className && extendedClass.typeArguments) {
                        if (this.isComponent) {
                            if (extendedClass.typeArguments.length > 0) {
                                propsType = checker.getTypeAtLocation(extendedClass.typeArguments[0]);
                            }
                            if (extendedClass.typeArguments.length > 1) {
                                dataType = checker.getTypeAtLocation(extendedClass.typeArguments[1]);
                            }
                        }
                        else if (extendedClass.typeArguments.length > 0) {
                            dataType = checker.getTypeAtLocation(extendedClass.typeArguments[0]);
                        }
                        // checker.getSymbolAtLocation() not work on anonymous class
                        const classSymbol = checker.getTypeAtLocation(node).symbol;
                        this.documentation = ts.displayPartsToString(classSymbol.getDocumentationComment(checker));
                    }
                    this.resolveMethods(checker.getTypeAtLocation(node), checker);
                }
            });
            return {
                data: this.getDataType(dataType, checker),
                props: this.getDataType(propsType, checker),
            };
        });
    }
    loadDataTypeFromJS(scriptPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const program = ts.createProgram([scriptPath], {
                allowJs: true
            });
            const checker = program.getTypeChecker();
            let dataType;
            let propsType;
            program.getSourceFile(scriptPath).forEachChild(node => {
                if (ts.isExpressionStatement(node)) {
                    let jsDoc = node.jsDoc;
                    if (jsDoc) {
                        this.documentation = ts.displayPartsToString(jsDoc.map(d => ({
                            text: d.comment
                        })));
                    }
                    node = node.expression;
                }
                if (!ts.isCallExpression(node)) {
                    return;
                }
                if (!ts.isIdentifier(node.expression)) {
                    return;
                }
                const funcName = this.isComponent ? 'Component' : 'Page';
                if (node.expression.text !== funcName) {
                    return;
                }
                if (node.arguments.length < 1) {
                    return;
                }
                const obj = node.arguments[0];
                if (!ts.isObjectLiteralExpression(obj)) {
                    return;
                }
                const propWithName = (name) => obj.properties.find(p => p.name && ts.isIdentifier(p.name) && p.name.text === name);
                const dataProperty = propWithName('data');
                if (dataProperty && ts.isPropertyAssignment(dataProperty)) {
                    dataType = checker.getTypeAtLocation(dataProperty.initializer);
                }
                if (this.isComponent) {
                    const propsProperty = propWithName('props');
                    if (propsProperty && ts.isPropertyAssignment(propsProperty)) {
                        propsType = checker.getTypeAtLocation(propsProperty.initializer);
                    }
                }
                if (this.isComponent) {
                    const methodsProp = propWithName('methods');
                    if (methodsProp) {
                        this.resolveMethods(checker.getTypeAtLocation(methodsProp), checker);
                    }
                }
                else {
                    this.resolveMethods(checker.getTypeAtLocation(obj), checker);
                }
            });
            return {
                data: this.getDataType(dataType, checker),
                props: this.getDataType(propsType, checker),
            };
        });
    }
    getDataType(type, checker) {
        if (!type) {
            return {};
        }
        const dataType = {};
        const properties = type.getApparentProperties();
        for (const prop of properties) {
            const name = prop.name;
            const declaration = prop.declarations[0];
            let propType = checker.getTypeAtLocation(declaration);
            let enums = undefined;
            let isPureEnums = false;
            if (propType.isUnion()) {
                enums = propType.types.filter(t => t.isLiteral()).map((t) => t.value);
                isPureEnums = enums.length === propType.types.length;
            }
            propType = checker.getBaseTypeOfLiteralType(propType);
            let typeString = checker.typeToString(propType);
            if (['string', 'number', 'boolean'].indexOf(typeString) < 0) {
                typeString = 'any';
            }
            if (util_1.isEventAttr(name)) {
                typeString = 'event';
            }
            if (isPureEnums) {
                typeString = 'enum';
            }
            let required = false;
            if (ts.isTypeElement(declaration)) {
                required = !declaration.questionToken;
            }
            dataType[name] = {
                type: typeString,
                required,
                enums,
                documentation: ts.displayPartsToString(prop.getDocumentationComment(checker)),
                definition: {
                    uri: `file://${declaration.getSourceFile().fileName}`,
                    range: {
                        start: declaration.getStart(),
                        end: declaration.getEnd(),
                    }
                },
            };
        }
        return dataType;
    }
    resolveMethods(type, checker) {
        const blacklist = this.isComponent ? ['didMount', 'didUnmount', 'didUpdate']
            : ['onLoad', 'onShow', 'onHide', 'onReady', 'onUnload'];
        this.methods = {};
        type.getApparentProperties().forEach(p => {
            if (blacklist.indexOf(p.name) >= 0)
                return;
            const declaration = p.declarations[0];
            const type = checker.getTypeAtLocation(declaration);
            if (type.getCallSignatures().length === 0)
                return;
            this.methods[p.name] = {
                type: checker.typeToString(type),
                documentation: ts.displayPartsToString(p.getDocumentationComment(checker)),
                definition: {
                    uri: `file://${declaration.getSourceFile().fileName}`,
                    range: {
                        start: declaration.getStart(),
                        end: declaration.getEnd(),
                    }
                },
            };
        });
    }
}
PageDocument.map = {};
PageDocument.globalStylesMap = {};
PageDocument.textDocuments = {};
exports.PageDocument = PageDocument;
//# sourceMappingURL=document.js.map