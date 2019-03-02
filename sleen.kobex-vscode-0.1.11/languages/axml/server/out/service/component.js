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
const fs = require("fs-extra");
const ts = require("typescript");
const axmlParser_1 = require("../parser/axmlParser");
const util_1 = require("./util");
class Component {
    constructor(definition, isRef = false) {
        this.attributes = {};
        this.singleTag = false;
        this.additionalAttributes = false;
        this.kobexOnly = false;
        this.expType = 'both';
        this.isRef = false;
        for (const k in definition) {
            const key = k;
            this[key] = definition[key];
        }
        this.isRef = isRef;
        if (definition.extends) {
            const extendedComponent = Component.map[definition.extends];
            if (extendedComponent) {
                this.attributes = Object.assign({}, extendedComponent.attributes, this.attributes);
            }
        }
    }
    static getAllComponents(whenContext) {
        if (whenContext) {
            return util_1.filterObject(this.availableMap, (_, v) => v.isAvailable(whenContext));
        }
        return this.availableMap;
    }
    static getComponent(name) {
        return this.map[name];
    }
    getAvailableAttributes(whenContext) {
        return util_1.filterObject(this.attributes, (_, v) => Component.resolveWhen(v.when, whenContext));
    }
    isAvailable(whenContext) {
        if (!Component.resolveWhen(this.when, whenContext)) {
            return false;
        }
        const thisTag = whenContext.$this.tag;
        const parentTag = whenContext.$parentView.tag;
        if (thisTag && thisTag !== 'block' && parentTag) {
            const component = Component.getComponent(parentTag);
            if (component && component.allowedChildren) {
                return component.allowedChildren.indexOf(thisTag) >= 0;
            }
        }
        return true;
    }
    static pushComponent(name, component) {
        this.map[name] = component;
        if (!name.startsWith('$')) {
            this.availableMap[name] = component;
        }
    }
    static resolveCustomComponent(componentPath) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Component({
                extends: '$base-node',
                attributes: yield this.resolveComponentAttributes(componentPath),
                description: `引用组件`,
                singleTag: yield this.resolveComponentIsSingleTag(componentPath),
            }, true);
        });
    }
    static resolveWhen(when, whenContext) {
        return !when || eval(`
          (function() {
            ${Object.keys(whenContext)
            .map((k) => `var ${k} = ${JSON.stringify(whenContext[k])}`)
            .join(';')}
            try {
              return ${when};
            }
            catch (_) {
              return false;
            }
          })()`);
    }
    static resolveComponentAttributes(componentPath) {
        return __awaiter(this, void 0, void 0, function* () {
            let scriptPath;
            if (yield fs.pathExists(componentPath + '.ts')) {
                scriptPath = componentPath + '.ts';
            }
            else if (yield fs.pathExists(componentPath + '.js')) {
                scriptPath = componentPath + '.js';
            }
            else {
                return {};
            }
            const attributes = {};
            const program = ts.createProgram([scriptPath], {
                allowJs: true
            });
            const checker = program.getTypeChecker();
            function visitNode(node) {
                if (ts.isCallExpression(node)) {
                    if (!ts.isIdentifier(node.expression)) {
                        return;
                    }
                    if (node.expression.text !== 'Component') {
                        return;
                    }
                    const obj = node.arguments[0];
                    if (!ts.isObjectLiteralExpression(obj)) {
                        return;
                    }
                    const propsProperty = obj.properties.find(p => p.name.kind === ts.SyntaxKind.Identifier && p.name.text === 'props');
                    if (!ts.isPropertyAssignment(propsProperty)) {
                        return;
                    }
                    const props = propsProperty.initializer;
                    if (!ts.isObjectLiteralExpression(props)) {
                        return;
                    }
                    props.properties.forEach(p => {
                        if (!ts.isPropertyAssignment(p)) {
                            return;
                        }
                        if (!ts.isIdentifier(p.name)) {
                            return;
                        }
                        const name = p.name.text;
                        let type = checker.getTypeAtLocation(p.initializer);
                        if (type.isLiteral()) {
                            type = checker.getBaseTypeOfLiteralType(type);
                        }
                        let typeString = checker.typeToString(type);
                        if (['string', 'number', 'boolean'].indexOf(typeString) < 0) {
                            typeString = 'any';
                        }
                        if (util_1.isEventAttr(name)) {
                            typeString = 'event';
                        }
                        attributes[name] = {
                            type: typeString,
                            description: `组件 \`props\``
                        };
                    });
                    return;
                }
                else if (ts.isFunctionDeclaration(node)) {
                    return;
                }
                ts.forEachChild(node, visitNode);
            }
            visitNode(program.getSourceFile(scriptPath));
            return attributes;
        });
    }
    static resolveComponentIsSingleTag(componentPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const axml = yield fs.readFile(componentPath + '.axml', 'utf8');
            let hasSlot = false;
            axmlParser_1.parseAxml(axml, {
                onTagStart(range, tagName) {
                    if (tagName === 'slot') {
                        hasSlot = true;
                    }
                }
            });
            return !hasSlot;
        });
    }
}
Component.map = {};
Component.availableMap = {};
exports.Component = Component;
function loadComponents(json) {
    for (const name in json) {
        Component.pushComponent(name, new Component(json[name]));
    }
}
loadComponents(require('../../kobex.components'));
//# sourceMappingURL=component.js.map