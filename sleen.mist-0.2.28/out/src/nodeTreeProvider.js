'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const json = require("jsonc-parser");
const json_1 = require("./utils/json");
const path = require("path");
class MistNodeTreeProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        vscode.window.onDidChangeActiveTextEditor(editor => {
            this.update();
        });
        vscode.workspace.onDidChangeTextDocument(e => {
        });
        this.parseTree();
    }
    update() {
        this.parseTree();
        this._onDidChangeTreeData.fire();
    }
    getChildren(node) {
        if (node) {
            return Promise.resolve(this._getChildren(node));
        }
        else {
            return Promise.resolve(this.tree ? [this.tree] : []);
        }
    }
    getTreeItem(node) {
        let treeItem = new vscode.TreeItem(this.getLabel(node), this.getProp(node, 'children') ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
        treeItem.command = {
            command: 'mist.openNodeSelection',
            title: '',
            arguments: [new vscode.Range(this.editor.document.positionAt(node.offset), this.editor.document.positionAt(node.offset + node.length))]
        };
        treeItem.iconPath = this.getIcon(node);
        // treeItem.contextValue = this.getNodeType(node);
        return treeItem;
    }
    select(range) {
        this.editor.selection = new vscode.Selection(range.start, range.end);
        this.editor.revealRange(this.editor.selection);
        this.editor.show();
    }
    provideDocumentSymbols(document) {
        let errors = [];
        let tpl = json_1.parseJson(document.getText(), errors);
        if (errors.length > 0) {
            console.log("json parse error: ", errors.map(err => json.getParseErrorMessage(err)));
        }
        let symbols = [];
        for (let i = 0; i < tpl.children.length; i++) {
            let prop = tpl.children[i];
            let key = prop.children[0].value;
            let location = new vscode.Location(document.uri, document.positionAt(prop.children[0].offset));
            symbols.push(new vscode.SymbolInformation(key, vscode.SymbolKind.Property, '<template>', location));
            switch (key) {
                case "state":
                case "styles":
                case "data":
                    symbols = symbols.concat(prop.children[1].children.map(prop => {
                        return new vscode.SymbolInformation('\t' + prop.children[0].value, vscode.SymbolKind.Field, '<' + key + '>', new vscode.Location(document.uri, document.positionAt(prop.children[0].offset)));
                    }));
                    break;
                case "layout":
                    symbols = symbols.concat(this._provideNodeSymbols(prop.children[1], document));
                    break;
            }
        }
        return symbols;
    }
    onDocumentChanged(changeEvent) {
        if (changeEvent.document.uri.toString() === this.editor.document.uri.toString()) {
            for (const change of changeEvent.contentChanges) {
            }
        }
    }
    getProp(node, key) {
        if (node && node.type === "object") {
            let r = node.children.find(p => p.children[0].value === key);
            if (r) {
                return r.children[1];
            }
        }
        return null;
    }
    getType(node) {
        if (node.type === 'object') {
            let childrenNode = this.getProp(node, 'children');
            let typeNode = this.getProp(node, 'type');
            return typeNode ? typeNode.value : childrenNode ? 'stack' : 'node';
        }
        else if (node.type === 'string' && node.value.match(/^\${.+}$/)) {
            return "exp";
        }
        else {
            return "unknown";
        }
    }
    getStringValue(node, key) {
        let prop = this.getProp(node, key);
        return prop && prop.type === 'string' ? prop.value : null;
    }
    parseTree() {
        this.tree = null;
        this.editor = vscode.window.activeTextEditor || vscode.window.visibleTextEditors[0];
        if (this.editor && this.editor.document && this.editor.document.languageId === 'mist') {
            let tpl = json_1.parseJson(this.editor.document.getText());
            this.tree = this.getProp(tpl, 'layout');
        }
    }
    _getChildren(node) {
        let childrenNode = this.getProp(node, 'children');
        if (childrenNode) {
            return childrenNode.children;
        }
        return [];
    }
    toArrayValueNode(node) {
        if (node.type === 'array' || node.type === 'object') {
            return node.children;
        }
        node['arrayValue'] = true;
        return [node];
    }
    getDesc(node) {
        if (node.type !== 'object') {
            return node.value;
        }
        let type = this.getType(node);
        let desc;
        let style = this.getProp(node, 'style');
        switch (type) {
            case 'stack':
                desc = [this.getStringValue(style, 'direction'),
                    this.getStringValue(style, 'background-color')].filter(n => !!n).join(' - ');
                break;
            case 'text':
                {
                    let text = this.getStringValue(style, 'html-text')
                        || this.getStringValue(style, 'text');
                    desc = text ? '"' + text + '"' : null;
                    break;
                }
            case 'button':
                {
                    desc = [this.getStringValue(style, 'title'),
                        this.getStringValue(style, 'image')].filter(n => !!n).map(t => `"${t}"`).join(' - ');
                    break;
                }
            case 'image':
                {
                    let text = this.getStringValue(style, 'image-url')
                        || this.getStringValue(style, 'image');
                    desc = text ? '"' + text + '"' : null;
                    break;
                }
            case 'scroll':
                desc = this.getStringValue(style, 'scroll-direction');
                break;
            case 'paging':
                desc = this.getStringValue(style, 'direction');
                break;
            case 'indicator':
                desc = this.getStringValue(style, 'color');
                break;
            case 'line':
                desc = this.getStringValue(style, 'color');
                break;
            default:
                desc = this.getStringValue(style, 'background-color');
                break;
        }
        if (!desc) {
            desc = '';
        }
        let events = node.children.filter(p => p.children[0].value.startsWith('on-')).map(s => '[' + s.children[0].value + ']').join(' ');
        if (events) {
            desc = events + ' ' + desc;
        }
        if (this.getProp(node, 'repeat')) {
            desc = "[repeat] " + desc;
        }
        return desc;
    }
    _getFullLineComment(line, document) {
        let text = document.lineAt(line).text;
        if (text.match(/^\s*\/\//)) {
            return text.trim();
        }
        if (text.match(/^\s*\/\*.*\*\/\s*$/)) {
            return text.trim();
        }
        return null;
    }
    _getLineTailComment(line, document) {
        if (line < 0) {
            return null;
        }
        let text = document.lineAt(line).text;
        let matches = text.match(/\/\/.*$/);
        if (matches && matches.length > 0) {
            return matches[0];
        }
        matches = text.match(/\/\*.*\*\/\s*$/);
        if (matches && matches.length > 0) {
            return matches[0];
        }
        return null;
    }
    getComment(node, document) {
        let lines = [];
        lines.push(document.positionAt(node.offset).line);
        if (node.children && node.children.length > 0) {
            lines.push(document.positionAt(node.children[0].offset).line);
        }
        let typeNode = this.getProp(node, 'type');
        if (typeNode) {
            lines.push(document.positionAt(typeNode.offset).line);
        }
        let linesSet = new Set(lines);
        for (let line of linesSet) {
            let comment = this._getFullLineComment(line - 1, document);
            if (comment) {
                return comment;
            }
            comment = this._getLineTailComment(line, document);
            if (comment) {
                return comment;
            }
        }
        return null;
    }
    boldText(str) {
        var ret = '';
        for (var i = 0; i < str.length; i++) {
            let c = str.charCodeAt(i);
            if (c >= 0x61 && c <= 0x7A) {
                c += 0x1D5EE - 0x61;
            }
            else if (c >= 0x41 && c <= 0x5A) {
                c += 0x1D5D4 - 0x41;
            }
            ret += String.fromCodePoint(c);
        }
        return ret;
    }
    getLabel(node) {
        let type = this.getType(node);
        let desc = this.getDesc(node) || '';
        let comment = this.getComment(node, this.editor.document) || '';
        let ret = this.boldText(type || 'unknown');
        if (desc.length > 0 || comment.length > 0) {
            ret += ' ∙ ';
            if (desc)
                ret += desc + ' ';
            if (comment)
                ret += comment + ' ';
        }
        return ret;
    }
    getIcon(node) {
        let type = this.getType(node);
        let fileName = type || 'unknown';
        return {
            light: this.context.asAbsolutePath(path.join('media', 'light', `${fileName}.svg`)),
            dark: this.context.asAbsolutePath(path.join('media', 'dark', `${fileName}.svg`))
        };
    }
    // symbols provider
    _provideNodeSymbols(node, document, indent = 0) {
        let symbols = [];
        let childrenNode = this.getProp(node, 'children');
        let type = this.getType(node);
        let desc = this.getDesc(node);
        let comment = this.getComment(node, document);
        let label = `${desc || ''} ${comment || ''}`;
        let offset = node.offset;
        if (node.type === 'object') {
            let typeNode = this.getProp(node, 'type');
            if (typeNode) {
                offset = typeNode.offset;
            }
            else if (node.children.length > 0) {
                offset = node.children[0].offset;
            }
        }
        symbols.push(new vscode.SymbolInformation('\t'.repeat(indent) + type, vscode.SymbolKind.Object, label, new vscode.Location(document.uri, document.positionAt(offset))));
        if (childrenNode) {
            let children = childrenNode.children;
            for (let i = 0; i < children.length; i++) {
                symbols = symbols.concat(this._provideNodeSymbols(children[i], document, indent + 1));
            }
        }
        return symbols;
    }
}
exports.default = MistNodeTreeProvider;
//# sourceMappingURL=nodeTreeProvider.js.map