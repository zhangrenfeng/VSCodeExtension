"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axmlParser_1 = require("./axmlParser");
const vscode_languageserver_types_1 = require("vscode-languageserver-types");
class ASTNodeImpl {
    constructor(parent, offset, length) {
        this.offset = 0;
        this.length = Number.MAX_SAFE_INTEGER;
        this.parent = parent;
        this.offset = offset;
        if (length !== undefined) {
            this.length = length;
        }
    }
    get children() {
        return [];
    }
    toString() {
        return 'type: ' + this.type + ' (' + this.offset + '/' + this.length + ')' + (this.parent ? ' parent: {' + this.parent.toString() + '}' : '');
    }
}
class ElementNodeImpl extends ASTNodeImpl {
    constructor(parent, offset) {
        super(parent, offset);
        this.type = 'element';
        this.childNodes = [];
    }
    get children() {
        return [this.tagStart, ...(this.tagEnd ? [this.tagEnd] : []), ...this.childNodes];
    }
}
class TextNodeImpl extends ASTNodeImpl {
    constructor(parent, offset) {
        super(parent, offset);
        this.type = 'text';
    }
}
class StringNodeImpl extends ASTNodeImpl {
    constructor(parent, offset) {
        super(parent, offset);
        this.type = 'string';
        this.text = '';
    }
}
class TagNodeImpl extends ASTNodeImpl {
    constructor(parent, isEndTag, offset) {
        super(parent, offset);
        this.type = 'tag';
        this.attributes = [];
        this.isEndTag = isEndTag;
    }
    get children() {
        return [this.tagTextNode, ...this.attributes];
    }
}
class AttributeNodeImpl extends ASTNodeImpl {
    constructor(parent, offset) {
        super(parent, offset);
        this.type = 'attribute';
    }
    get children() {
        return [this.name, ...(this.value ? [this.value] : [])];
    }
}
function parseAxmlTree(axml, errors) {
    const rootNode = new ElementNodeImpl(null, 0);
    rootNode.length = axml.length;
    rootNode.tagStart = new TagNodeImpl(rootNode, false, 0);
    rootNode.tagStart.length = 0;
    rootNode.tagStart.tagTextNode = new StringNodeImpl(rootNode.tagStart, 0);
    let currentNode = rootNode;
    function pushError(range, severity, code) {
        if (errors) {
            errors.push({
                location: range,
                severity,
                code,
                message: axmlParser_1.getErrorMessage(code),
            });
        }
    }
    axmlParser_1.parseAxml(axml, {
        onTagStart(range, tagName) {
            const newNode = new ElementNodeImpl(currentNode, range.offset);
            const tagStartNode = new TagNodeImpl(newNode, false, range.offset);
            const tagTextNode = new StringNodeImpl(tagStartNode, range.offset + 1);
            tagTextNode.text = tagName;
            tagTextNode.length = range.length - 1;
            tagStartNode.tagTextNode = tagTextNode;
            tagStartNode.length = range.length;
            newNode.tagStart = tagStartNode;
            currentNode.childNodes.push(newNode);
            currentNode = newNode;
        },
        onTagStartClose(range) {
            currentNode.tagStart.length = range.offset + range.length - currentNode.tagStart.offset;
        },
        onTagEnd(range, tagName) {
            if (!currentNode.parent) {
            }
            else if (!(currentNode.parent instanceof ElementNodeImpl)) {
            }
            else {
                if (tagName) {
                    const tagEndNode = new TagNodeImpl(currentNode, true, range.offset);
                    const tagTextNode = new StringNodeImpl(tagEndNode, range.offset + 2);
                    tagTextNode.text = tagName;
                    tagTextNode.length = range.length - 3;
                    tagEndNode.tagTextNode = tagTextNode;
                    tagEndNode.length = range.length;
                    currentNode.tagEnd = tagEndNode;
                }
                currentNode.length = range.offset + range.length - currentNode.offset;
                currentNode = currentNode.parent;
            }
        },
        onAttributeName(range, key) {
            const attrNode = new AttributeNodeImpl(currentNode.tagStart, range.offset);
            const keyNode = new StringNodeImpl(attrNode, range.offset);
            keyNode.length = range.length;
            keyNode.text = key;
            attrNode.name = keyNode;
            attrNode.length = range.length;
            currentNode.tagStart.attributes.push(attrNode);
        },
        onAttributeValue(range, value) {
            const attrNode = currentNode.tagStart.attributes[currentNode.tagStart.attributes.length - 1];
            const valueNode = new StringNodeImpl(attrNode, range.offset);
            valueNode.length = range.length;
            valueNode.text = value;
            attrNode.value = valueNode;
            attrNode.length = valueNode.offset + valueNode.length - attrNode.offset;
        },
        onText(range, text) {
            const textNode = new TextNodeImpl(currentNode, range.offset);
            textNode.length = range.length;
            textNode.text = text;
            currentNode.childNodes.push(textNode);
        },
        onError(range, error) {
            if (error === axmlParser_1.ErrorCode.EndTagExpected) {
                currentNode.length = range.offset + range.length - currentNode.offset;
                range.offset = currentNode.tagStart.offset;
                range.length = currentNode.tagStart.length;
                currentNode = currentNode.parent;
            }
            pushError(range, vscode_languageserver_types_1.DiagnosticSeverity.Error, error);
        },
    });
    return rootNode;
}
exports.parseAxmlTree = parseAxmlTree;
function nodeAtOffset(node, offset) {
    if (node.children) {
        for (const child of node.children) {
            if (child.offset <= offset && child.offset + child.length > offset) {
                return nodeAtOffset(child, offset);
            }
        }
    }
    return node;
}
exports.nodeAtOffset = nodeAtOffset;
//# sourceMappingURL=index.js.map