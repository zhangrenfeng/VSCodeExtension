'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const json = require("jsonc-parser");
function getPropertyNode(node, property) {
    if (node.type === 'object') {
        let propertyNode = node.children.find(n => n.type === 'property' && n.children[0].value === property);
        if (propertyNode) {
            return propertyNode.children[1];
        }
    }
    return null;
}
exports.getPropertyNode = getPropertyNode;
// `json.parseTree` sometimes produces incorrect result
function parseJson(text, errors) {
    let currentNode;
    function onNode(node, end) {
        if (currentNode) {
            node.parent = currentNode;
            if (currentNode.type === "array") {
                currentNode.children.push(node);
            }
            else if (currentNode.type === "object") {
                let property = currentNode.children[currentNode.children.length - 1];
                if (property.children.length === 1) {
                    property.children.push(node);
                    node.parent = property;
                    property.length = end - property.offset;
                }
            }
        }
        else {
            currentNode = node;
        }
    }
    function endNode() {
        let parent = currentNode.parent;
        if (parent) {
            if (parent.type === "property") {
                parent = parent.parent;
            }
        }
        if (parent) {
            currentNode = parent;
        }
    }
    json.visit(text, {
        onObjectBegin(offset, length) {
            let object = {
                type: "object",
                offset: offset,
                length: length,
                children: []
            };
            onNode(object, offset + length);
            currentNode = object;
        },
        onObjectProperty(key, offset, length) {
            let property = {
                type: "property",
                offset: offset,
                length: length,
                parent: currentNode,
                children: [
                    {
                        type: "string",
                        offset: offset,
                        length: length,
                        value: key
                    }
                ]
            };
            property.children[0].parent = property;
            currentNode.children.push(property);
        },
        onObjectEnd(offset, length) {
            currentNode.length = offset + length - currentNode.offset;
            endNode();
        },
        onArrayBegin(offset, length) {
            let array = {
                type: "array",
                offset: offset,
                length: length,
                children: []
            };
            onNode(array, offset + length);
            currentNode = array;
        },
        onArrayEnd(offset, length) {
            currentNode.length = offset + length - currentNode.offset;
            endNode();
        },
        onLiteralValue(value, offset, length) {
            let node = {
                type: value == null ? "null" : typeof value,
                offset: offset,
                length: length,
                value: value
            };
            onNode(node, offset + length);
        },
        onError(error, offset, length) {
            if (errors) {
                errors.push(error);
            }
        }
    });
    return currentNode;
}
exports.parseJson = parseJson;
function getNodeValue(node) {
    if (node.type === 'array') {
        return node.children.map(getNodeValue);
    }
    else if (node.type === 'object') {
        let obj = {};
        for (let prop of node.children) {
            if (prop.children.length === 2) {
                obj[prop.children[0].value] = getNodeValue(prop.children[1]);
            }
        }
        return obj;
    }
    return node.value;
}
exports.getNodeValue = getNodeValue;
//# sourceMappingURL=json.js.map