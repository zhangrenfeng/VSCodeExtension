"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const type_1 = require("./type");
var UnaryOp;
(function (UnaryOp) {
    UnaryOp[UnaryOp["None"] = 0] = "None";
    UnaryOp[UnaryOp["Negative"] = 1] = "Negative";
    UnaryOp[UnaryOp["Positive"] = 2] = "Positive";
    UnaryOp[UnaryOp["Not"] = 3] = "Not";
})(UnaryOp = exports.UnaryOp || (exports.UnaryOp = {}));
var BinaryOp;
(function (BinaryOp) {
    BinaryOp[BinaryOp["None"] = 0] = "None";
    BinaryOp[BinaryOp["Add"] = 1] = "Add";
    BinaryOp[BinaryOp["Sub"] = 2] = "Sub";
    BinaryOp[BinaryOp["Mul"] = 3] = "Mul";
    BinaryOp[BinaryOp["Div"] = 4] = "Div";
    BinaryOp[BinaryOp["Mod"] = 5] = "Mod";
    BinaryOp[BinaryOp["And"] = 6] = "And";
    BinaryOp[BinaryOp["Or"] = 7] = "Or";
    BinaryOp[BinaryOp["Equal"] = 8] = "Equal";
    BinaryOp[BinaryOp["NotEqual"] = 9] = "NotEqual";
    BinaryOp[BinaryOp["GreaterThan"] = 10] = "GreaterThan";
    BinaryOp[BinaryOp["LessThan"] = 11] = "LessThan";
    BinaryOp[BinaryOp["GreaterOrEqual"] = 12] = "GreaterOrEqual";
    BinaryOp[BinaryOp["LessOrEqual"] = 13] = "LessOrEqual";
    BinaryOp[BinaryOp["Index"] = 14] = "Index";
})(BinaryOp = exports.BinaryOp || (exports.BinaryOp = {}));
var ExpressionErrorLevel;
(function (ExpressionErrorLevel) {
    ExpressionErrorLevel[ExpressionErrorLevel["Error"] = 0] = "Error";
    ExpressionErrorLevel[ExpressionErrorLevel["Warning"] = 1] = "Warning";
    ExpressionErrorLevel[ExpressionErrorLevel["Info"] = 2] = "Info";
})(ExpressionErrorLevel = exports.ExpressionErrorLevel || (exports.ExpressionErrorLevel = {}));
class ExpressionError {
    constructor(node, description, level = ExpressionErrorLevel.Error) {
        this.offset = node.offset;
        this.length = node.length;
        this.description = description;
        this.level = level;
    }
}
exports.ExpressionError = ExpressionError;
class ExpressionContext {
    constructor() {
        this.table = {};
    }
    push(key, value) {
        let array = this.table[key];
        if (array === null || array === undefined) {
            array = [];
            this.table[key] = array;
        }
        array.push(value);
    }
    pushDict(dict) {
        if (dict) {
            Object.keys(dict).forEach(k => this.push(k, dict[k]));
        }
    }
    pop(key) {
        let array = this.table[key];
        if (array) {
            array.pop();
        }
    }
    popDict(dict) {
        if (dict && dict instanceof Object) {
            Object.keys(dict).forEach(k => this.pop(k));
        }
    }
    has(key) {
        let array = this.table[key];
        return array && array.length > 0;
    }
    get(key) {
        let array = this.table[key];
        if (array && array.length > 0) {
            return array[array.length - 1];
        }
        return null;
    }
    getAll() {
        return Object.keys(this.table).filter(k => this.table[k].length > 0).reduce((p, c) => {
            let arr = this.table[c];
            p[c] = arr[arr.length - 1];
            return p;
        }, {});
    }
    set(key, value) {
        let array = this.table[key];
        if (array && array.length > 0) {
            array[array.length - 1] = value;
        }
    }
    clear() {
        this.table = {};
    }
}
exports.ExpressionContext = ExpressionContext;
class ExpressionNode {
    setRange(offset, length) {
        this.offset = offset;
        this.length = length;
        return this;
    }
    setRangeWithToken(token) {
        this.offset = token.offset;
        this.length = token.length;
        return this;
    }
}
exports.ExpressionNode = ExpressionNode;
class NoneClass {
}
exports.NoneClass = NoneClass;
exports.None = new NoneClass();
class LiteralNode extends ExpressionNode {
    constructor(value) {
        super();
        this.value = value;
    }
    compute(context) {
        return this.value;
    }
    computeValue(context) {
        return this.value;
    }
    getType(context) {
        // return IType.typeof(this.value);
        return new type_1.LiteralType(this.value);
    }
    check(context) {
        return [];
    }
    toString(prettyPrinted) {
        if (typeof (this.value) === 'string') {
            return stringLiteral(this.value);
        }
        else {
            return JSON.stringify(this.value);
        }
    }
}
exports.LiteralNode = LiteralNode;
class IdentifierNode extends ExpressionNode {
    constructor(identifier) {
        super();
        this.identifier = identifier;
    }
    compute(context) {
        if (!context.has(this.identifier)) {
            return exports.None;
        }
        let value = context.get(this.identifier);
        return value instanceof type_1.IType ? exports.None : value;
    }
    computeValue(context) {
        if (!context.has(this.identifier)) {
            return null;
        }
        let value = context.get(this.identifier);
        return value instanceof type_1.IType ? null : value;
    }
    getType(context) {
        let type = type_1.IType.typeof(context.get(this.identifier)) || type_1.Type.Any;
        if (type === type_1.Type.Null) {
            type = type_1.Type.Any;
        }
        return type;
    }
    check(context) {
        if (context.get(this.identifier) === type_1.Type.Null) {
            return [new ExpressionError(this, `当前范围不存在符号 \`${this.identifier}\``)];
        }
        return [];
    }
    toString(prettyPrinted) {
        return this.identifier;
    }
}
exports.IdentifierNode = IdentifierNode;
class ArrayExpressionNode extends ExpressionNode {
    constructor(list) {
        super();
        this.list = list;
    }
    compute(context) {
        let list = this.list.map(v => v.compute(context));
        return list.every(i => i !== exports.None) ? list : exports.None;
    }
    computeValue(context) {
        let list = this.list.map(v => v.computeValue(context));
        return list.filter(i => i !== null);
    }
    getType(context) {
        return type_1.ArrayType.tuple(this.list.map(v => v.getType(context)));
        // return new ArrayType(UnionType.type(this.list.map(v => v.getType(context))));
    }
    check(context) {
        return this.list.map(i => i.check(context)).reduce((p, c) => p.concat(c), []);
    }
    toString(prettyPrinted) {
        return `[${this.list.map(i => i.toString(prettyPrinted)).join(prettyPrinted ? ', ' : ',')}]`;
    }
}
exports.ArrayExpressionNode = ArrayExpressionNode;
class ObjectExpressionNode extends ExpressionNode {
    constructor(list) {
        super();
        this.list = list;
    }
    compute(context) {
        let computed = this.list.map(t => [t[0].compute(context), t[1].compute(context)]);
        if (computed.some(l => l.some(i => i === exports.None))) {
            return exports.None;
        }
        return computed.reduce((p, c) => { p[c[0]] = c[1]; return p; }, {});
    }
    computeValue(context) {
        let computed = this.list.map(t => [t[0].computeValue(context), t[1].computeValue(context)]);
        return computed.reduce((p, c) => {
            var key = c[0];
            if (key) {
                p[key] = c[1];
            }
            return p;
        }, {});
    }
    getType(context) {
        return new type_1.ObjectType(this.list.filter(t => t[0] instanceof LiteralNode).map(t => [t[0].compute(context), t[1].getType(context)]).reduce((p, c) => { p[c[0]] = c[1]; return p; }, {}));
    }
    check(context) {
        return this.list.map(i => {
            let errors = [];
            if (i[0] instanceof LiteralNode) {
                let type = typeof (i[0].value);
                if (type !== 'string' && type !== 'number') {
                    errors.push(new ExpressionError(i[0], '字典的 key 必须是 `string` 或 `number` 类型'));
                }
            }
            else {
                errors.push(new ExpressionError(i[0], '字典的 key 必须是字面值'));
            }
            return errors.concat(i[1].check(context));
        }).reduce((p, c) => p.concat(c), []);
    }
    toString(prettyPrinted) {
        let space = prettyPrinted ? ' ' : '';
        // TODO number keys?
        return `{${space}${this.list.map(l => propertyName(l[0].value) + (prettyPrinted ? ': ' : ':') + l[1].toString(prettyPrinted)).join(prettyPrinted ? ', ' : ',')}${space}}`;
    }
}
exports.ObjectExpressionNode = ObjectExpressionNode;
class ConditionalExpressionNode extends ExpressionNode {
    static isNull(exp) {
        return exp instanceof LiteralNode && exp.value === null;
    }
    constructor(condition, truePart, falsePart) {
        super();
        this.condition = condition;
        this.truePart = truePart;
        this.falsePart = falsePart;
    }
    compute(context) {
        let r = this.condition.compute(context);
        if (r === exports.None) {
            return exports.None;
        }
        return r ? (this.truePart ? this.truePart.compute(context) : r) : this.falsePart.compute(context);
    }
    computeValue(context) {
        let r = this.condition.computeValue(context);
        return r ? (this.truePart ? this.truePart.computeValue(context) : r) : this.falsePart.computeValue(context);
    }
    getType(context) {
        let truePart = this.truePart || this.condition;
        if (ConditionalExpressionNode.isNull(truePart)) {
            return this.falsePart.getType(context);
        }
        if (ConditionalExpressionNode.isNull(this.falsePart)) {
            return truePart.getType(context);
        }
        return type_1.UnionType.type([truePart.getType(context), this.falsePart.getType(context)]);
    }
    check(context) {
        let errors = this.condition.check(context);
        if (this.truePart)
            errors = errors.concat(this.truePart.check(context));
        errors = errors.concat(this.falsePart.check(context));
        return errors;
    }
    toString(prettyPrinted) {
        let space = prettyPrinted ? ' ' : '';
        if (this.truePart) {
            return `${this.condition.toString(prettyPrinted)}${space}?${space}${this.truePart.toString(prettyPrinted)}${space}:${space}${this.falsePart.toString(prettyPrinted)}`;
        }
        else {
            return `${this.condition.toString(prettyPrinted)}${space}?:${space}${this.falsePart.toString(prettyPrinted)}`;
        }
    }
}
exports.ConditionalExpressionNode = ConditionalExpressionNode;
class UnaryExpressionNode extends ExpressionNode {
    constructor(operator, oprand) {
        super();
        this.operator = operator;
        this.oprand = oprand;
    }
    compute(context) {
        let r = this.oprand.compute(context);
        if (r === exports.None) {
            return exports.None;
        }
        switch (this.operator) {
            case UnaryOp.Not:
                return !boolValue(r);
            case UnaryOp.Negative:
                {
                    if (isNumber(r)) {
                        return -numberValue(r);
                    }
                    // unary operator '-' only supports on number type
                    return exports.None;
                }
            case UnaryOp.Positive:
                {
                    if (isNumber(r)) {
                        return +numberValue(r);
                    }
                    // unary operator '+' only supports on number type
                    return exports.None;
                }
            default:
                // unknown unary operator
                return exports.None;
        }
    }
    computeValue(context) {
        let r = this.oprand.computeValue(context);
        switch (this.operator) {
            case UnaryOp.Not:
                return !boolValue(r);
            case UnaryOp.Negative:
                {
                    if (isNumber(r)) {
                        return -numberValue(r);
                    }
                    // unary operator '-' only supports on number type
                    return null;
                }
            case UnaryOp.Positive:
                {
                    if (isNumber(r)) {
                        return +numberValue(r);
                    }
                    // unary operator '+' only supports on number type
                    return null;
                }
            default:
                // unknown unary operator
                return null;
        }
    }
    getType(context) {
        switch (this.operator) {
            case UnaryOp.Not:
                return type_1.Type.Boolean;
            case UnaryOp.Negative:
            case UnaryOp.Positive:
                return type_1.Type.Number;
            default:
                // unknown unary operator
                return null;
        }
    }
    check(context) {
        let errors = this.oprand.check(context);
        switch (this.operator) {
            case UnaryOp.Not:
                break;
            case UnaryOp.Negative:
            case UnaryOp.Positive:
                let type = this.oprand.getType(context);
                if (!type.kindof(type_1.Type.Number)) {
                    errors.push(new ExpressionError(this, `\`${this.operatorName()}\` 运算符只能用于 \`number\` 类型`));
                }
                break;
            default:
                // unknown unary operator
                break;
        }
        return errors;
    }
    operatorName() {
        switch (this.operator) {
            case UnaryOp.Not: return '!';
            case UnaryOp.Negative: return '-';
            case UnaryOp.Positive: return '+';
        }
        return '??';
    }
    toString(prettyPrinted) {
        return `${this.operatorName()}${this.oprand.toString(prettyPrinted)}`;
    }
}
exports.UnaryExpressionNode = UnaryExpressionNode;
class BinaryExpressionNode extends ExpressionNode {
    constructor(operator, oprand1, oprand2) {
        super();
        this.operator = operator;
        this.oprand1 = oprand1;
        this.oprand2 = oprand2;
    }
    compute(context) {
        let value1 = this.oprand1.compute(context);
        let value2 = this.oprand2.compute(context);
        if (value1 === exports.None || value2 === exports.None) {
            if (BinaryOp.And === this.operator) {
                if (value1 === false || value2 === false) {
                    return false;
                }
            }
            else if (BinaryOp.Or === this.operator) {
                if (value1 === true || value2 === true) {
                    return true;
                }
            }
            return exports.None;
        }
        // subscript operation
        if (BinaryOp.Index === this.operator) {
            if (!value1) {
                return null;
            }
            else if (value1 instanceof Array) {
                if (typeof (value2) !== 'number') {
                    // only numbers are allowed to access an array
                    return exports.None;
                }
                return value2 < value1.length ? value1[value2] : exports.None;
            }
            else if (value1 && value1 instanceof Object) {
                return value1[value2];
            }
            else if (typeof (value1) === 'string') {
                return value1[value2];
            }
            else {
                // [] operator can not be used on value1
                return exports.None;
            }
        }
        // comparision operation
        if (BinaryOp.Equal === this.operator) {
            return isEqual(value1, value2);
        }
        else if (BinaryOp.NotEqual === this.operator) {
            return !isEqual(value1, value2);
        }
        // string operation
        if (BinaryOp.Add === this.operator && (typeof (value1 === 'string') || typeof (value2 === 'string'))) {
            if (isNull(value1))
                value1 = "";
            if (isNull(value2))
                value2 = "";
            return value1 + value2;
        }
        // logical operation
        else if (BinaryOp.And === this.operator) {
            return boolValue(value1) && boolValue(value2);
        }
        else if (BinaryOp.Or === this.operator) {
            return boolValue(value1) || boolValue(value2);
        }
        if ((value1 && typeof (value1) !== 'number') || (value2 && typeof (value2) !== 'number')) {
            // invalid operands
            return null;
        }
        value1 = numberValue(value1);
        value2 = numberValue(value2);
        switch (this.operator) {
            case BinaryOp.Add:
                return value1 + value2;
            case BinaryOp.Sub:
                return value1 - value2;
            case BinaryOp.Mul:
                return value1 * value2;
            case BinaryOp.Div:
                return value1 / value2;
            case BinaryOp.Mod:
                {
                    if (value2 === 0) {
                        // should not mod with zero
                        return 0;
                    }
                    return Math.floor(value1) % Math.floor(value2);
                }
            case BinaryOp.GreaterThan:
                return value1 > value2;
            case BinaryOp.LessThan:
                return value1 < value2;
            case BinaryOp.GreaterOrEqual:
                return value1 >= value2;
            case BinaryOp.LessOrEqual:
                return value1 <= value2;
            default:
                // unknown binary operator
                return null;
        }
    }
    computeValue(context) {
        let value1 = this.oprand1.computeValue(context);
        let value2 = this.oprand2.computeValue(context);
        // subscript operation
        if (BinaryOp.Index === this.operator) {
            if (!value1) {
                return null;
            }
            else if (value1 instanceof Array) {
                if (typeof (value2) !== 'number') {
                    // only numbers are allowed to access an array
                    return null;
                }
                return value2 < value1.length ? value1[value2] : null;
            }
            else if (value1 && value1 instanceof Object) {
                return value1[value2];
            }
            else if (typeof (value1) === 'string') {
                return value1[value2];
            }
            else {
                // [] operator can not be used on value1
                return null;
            }
        }
        // comparision operation
        if (BinaryOp.Equal === this.operator) {
            return isEqual(value1, value2);
        }
        else if (BinaryOp.NotEqual === this.operator) {
            return !isEqual(value1, value2);
        }
        // string operation
        if (BinaryOp.Add === this.operator && (typeof (value1 === 'string') || typeof (value2 === 'string'))) {
            if (isNull(value1))
                value1 = "";
            if (isNull(value2))
                value2 = "";
            return value1 + value2;
        }
        // logical operation
        else if (BinaryOp.And === this.operator) {
            return boolValue(value1) && boolValue(value2);
        }
        else if (BinaryOp.Or === this.operator) {
            return boolValue(value1) || boolValue(value2);
        }
        if ((value1 && typeof (value1) !== 'number') || (value2 && typeof (value2) !== 'number')) {
            // invalid operands
            return null;
        }
        value1 = numberValue(value1);
        value2 = numberValue(value2);
        switch (this.operator) {
            case BinaryOp.Add:
                return value1 + value2;
            case BinaryOp.Sub:
                return value1 - value2;
            case BinaryOp.Mul:
                return value1 * value2;
            case BinaryOp.Div:
                return value1 / value2;
            case BinaryOp.Mod:
                {
                    if (value2 === 0) {
                        // should not mod with zero
                        return 0;
                    }
                    return Math.floor(value1) % Math.floor(value2);
                }
            case BinaryOp.GreaterThan:
                return value1 > value2;
            case BinaryOp.LessThan:
                return value1 < value2;
            case BinaryOp.GreaterOrEqual:
                return value1 >= value2;
            case BinaryOp.LessOrEqual:
                return value1 <= value2;
            default:
                // unknown binary operator
                return null;
        }
    }
    getType(context) {
        let type1 = this.oprand1.getType(context);
        let type2 = this.oprand2.getType(context);
        switch (this.operator) {
            case BinaryOp.And:
            case BinaryOp.Or:
            case BinaryOp.GreaterThan:
            case BinaryOp.GreaterOrEqual:
            case BinaryOp.LessThan:
            case BinaryOp.LessOrEqual:
            case BinaryOp.Equal:
            case BinaryOp.NotEqual:
                return type_1.Type.Boolean;
            case BinaryOp.Sub:
            case BinaryOp.Mul:
            case BinaryOp.Div:
            case BinaryOp.Mod:
                return type_1.Type.Number;
            case BinaryOp.Add:
                if (type1.kindof(type_1.Type.Number, true) && type2.kindof(type_1.Type.Number, true)) {
                    return type_1.Type.Number;
                }
                if (type1.kindof(type_1.Type.String, true) || type2.kindof(type_1.Type.String, true)) {
                    return type_1.Type.String;
                }
                return type_1.Type.Any;
            case BinaryOp.Index:
                if (type1 instanceof type_1.ObjectType) {
                    if (this.oprand2 instanceof LiteralNode) {
                        let p = type1.getProperty(this.oprand2.value);
                        return p ? p.type : type_1.Type.Any;
                    }
                    return type_1.Type.Any;
                }
                return type1.getTypeAtIndex(type2);
            default:
                return type_1.Type.Any;
        }
    }
    operatorName() {
        switch (this.operator) {
            case BinaryOp.Add: return '+';
            case BinaryOp.Sub: return '-';
            case BinaryOp.Mul: return '*';
            case BinaryOp.Div: return '/';
            case BinaryOp.Mod: return '%';
            case BinaryOp.And: return '&&';
            case BinaryOp.Or: return '||';
            case BinaryOp.Equal: return '==';
            case BinaryOp.NotEqual: return '!=';
            case BinaryOp.GreaterThan: return '>';
            case BinaryOp.LessThan: return '<';
            case BinaryOp.GreaterOrEqual: return '>=';
            case BinaryOp.LessOrEqual: return '<=';
            case BinaryOp.Index: return '[]';
        }
        return '??';
    }
    check(context) {
        const StringOrNumberType = type_1.UnionType.type([type_1.Type.String, type_1.Type.Number]);
        let errors = this.oprand1.check(context).concat(this.oprand2.check(context));
        let type1 = this.oprand1.getType(context);
        let type2 = this.oprand2.getType(context);
        switch (this.operator) {
            case BinaryOp.And:
            case BinaryOp.Or:
            case BinaryOp.Equal:
            case BinaryOp.NotEqual:
                break;
            case BinaryOp.GreaterThan:
            case BinaryOp.GreaterOrEqual:
            case BinaryOp.LessThan:
            case BinaryOp.LessOrEqual:
            case BinaryOp.Sub:
            case BinaryOp.Mul:
            case BinaryOp.Div:
            case BinaryOp.Mod:
                if (!type1.kindof(type_1.Type.Number) || !type2.kindof(type_1.Type.Number)) {
                    errors.push(new ExpressionError(this, `\`${this.operatorName()}\` 运算符只能用于 \`number\` 类型`));
                }
                break;
            case BinaryOp.Add:
                if (!type1.kindof(StringOrNumberType) || !type2.kindof(StringOrNumberType)) {
                    errors.push(new ExpressionError(this, `\`+\` 运算符只能用于 \`number\` 或 \`string\` 类型`));
                }
                break;
            case BinaryOp.Index:
                if (type1 instanceof type_1.ObjectType || type1 === type_1.Type.Object || type1 === type_1.Type.Any) {
                    if (!type2.kindof(StringOrNumberType)) {
                        errors.push(new ExpressionError(this.oprand2, `索引类型只能为 \`string\` 或 \`number\` 类型`));
                    }
                }
                else if (type1.kindof(new type_1.ArrayType(type_1.Type.Any)) || type1 === type_1.Type.Array || type1.kindof(type_1.Type.String)) {
                    if (!type2.kindof(type_1.Type.Number)) {
                        errors.push(new ExpressionError(this.oprand2, `索引类型只能为 \`number\` 类型`));
                    }
                }
                else {
                    errors.push(new ExpressionError(this.oprand1, `类型 \`${type1.getName()}\` 不能被索引`));
                }
                break;
        }
        return errors;
    }
    toString(prettyPrinted) {
        let space = prettyPrinted ? ' ' : '';
        if (this.operator === BinaryOp.Index) {
            return `${this.oprand1.toString(prettyPrinted)}[${this.oprand2.toString(prettyPrinted)}]`;
        }
        return `${this.oprand1.toString(prettyPrinted)}${space}${this.operatorName()}${space}${this.oprand2.toString(prettyPrinted)}`;
    }
}
exports.BinaryExpressionNode = BinaryExpressionNode;
class FunctionExpressionNode extends ExpressionNode {
    constructor(target, action, parameters) {
        super();
        this.target = target;
        this.action = action;
        this.parameters = parameters;
    }
    compute(context) {
        let target = this.target ? this.target.compute(context) : type_1.Type.Global;
        if (target === exports.None) {
            return exports.None;
        }
        if (!this.parameters) {
            let type = type_1.Type.typeof(target);
            if (type instanceof type_1.ObjectType) {
                return target[this.action.identifier];
            }
            else {
                let prop = type.getProperty(this.action.identifier);
                if (prop && prop.jsEquivalent) {
                    return prop.jsEquivalent(target);
                }
            }
        }
        else {
            let type = type_1.Type.typeof(target);
            let method = type.getMethod(this.action.identifier, this.parameters.length);
            if (method && method.jsEquivalent) {
                let params = this.parameters.map(p => p.compute(context));
                if (params.some(p => p === exports.None))
                    return exports.None;
                if (target === type_1.Type.Global) {
                    if (this.action.identifier === 'eval') {
                        return exports.None;
                    }
                    return method.jsEquivalent(...params);
                }
                else {
                    return method.jsEquivalent(target, ...params);
                }
            }
        }
        return exports.None;
    }
    computeValue(context) {
        let target = this.target ? this.target.computeValue(context) : type_1.Type.Global;
        if (target === null || target === undefined) {
            return null;
        }
        if (!this.parameters) {
            let type = type_1.Type.typeof(target);
            if (type instanceof type_1.ObjectType) {
                return target[this.action.identifier];
            }
            else {
                let prop = type.getProperty(this.action.identifier);
                if (prop && prop.jsEquivalent) {
                    return prop.jsEquivalent(target);
                }
            }
        }
        else {
            let type = type_1.Type.typeof(target);
            let method = type.getMethod(this.action.identifier, this.parameters.length);
            if (method && method.jsEquivalent) {
                let params = this.parameters.map(p => p.computeValue(context));
                if (target === type_1.Type.Global) {
                    if (this.action.identifier === 'eval') {
                        params.push(context);
                    }
                    return method.jsEquivalent(...params);
                }
                else {
                    return method.jsEquivalent(target, ...params);
                }
            }
            if (this.parameters.length === 0) {
                let prop = type.getProperty(this.action.identifier);
                if (prop && prop.jsEquivalent) {
                    return prop.jsEquivalent(target);
                }
            }
        }
        return null;
    }
    getType(context) {
        let targetType;
        if (this.target) {
            targetType = this.target.getType(context);
        }
        else if (this.parameters) {
            targetType = type_1.Type.Global;
        }
        else {
            return type_1.Type.Any;
        }
        if (this.parameters) {
            let method = targetType.getMethod(this.action.identifier, this.parameters.length);
            if (method) {
                return method.type;
            }
            if (this.parameters.length === 0) {
                let prop = targetType.getProperty(this.action.identifier);
                if (prop) {
                    return prop.type;
                }
            }
            return type_1.Type.Any;
        }
        else {
            let p = targetType.getProperty(this.action.identifier);
            if (p) {
                return p.type;
            }
            let method = targetType.getMethod(this.action.identifier, 0);
            if (method) {
                return method.type;
            }
            return type_1.Type.Any;
        }
    }
    check(context) {
        let errors = [];
        if (this.parameters) {
            this.parameters.forEach(p => errors.push(...p.check(context)));
        }
        let targetType;
        if (this.target) {
            errors.push(...this.target.check(context));
            targetType = this.target.getType(context);
        }
        else if (this.parameters) {
            targetType = type_1.Type.Global;
        }
        else {
            return errors;
        }
        if (targetType === type_1.Type.Any) {
            return errors;
        }
        if (this.parameters) {
            let method = targetType.getMethod(this.action.identifier, this.parameters.length);
            if (!method) {
                let prop = targetType.getProperty(this.action.identifier);
                if (this.parameters.length > 0 || !prop) {
                    let methods = targetType.getMethods(this.action.identifier);
                    if ((!methods || methods.length === 0) && !prop) {
                        errors.push(new ExpressionError(this.action, `${targetType === type_1.Type.Global ? '' : `类型 \`${targetType.getName()}\` 上`}不存在方法 \`${this.action.identifier}\``));
                    }
                    else {
                        errors.push(new ExpressionError(this, `方法 \`${this.action.identifier}\` 参数数量不匹配`));
                    }
                }
            }
            else {
                const params = method.params;
                params.forEach((p, i) => {
                    let type = this.parameters[i].getType(context);
                    if (!type.kindof(p.type)) {
                        errors.push(new ExpressionError(this.parameters[i], `类型 \`${type.getName()}\` 的参数不能赋给类型 \`${p.type.getName()}\` 的参数 \`${p.name}\``));
                    }
                });
            }
        }
        else {
            let p = targetType.getProperty(this.action.identifier);
            if (!p && !targetType.getMethod(this.action.identifier, 0)) {
                errors.push(new ExpressionError(this.action, `${targetType === type_1.Type.Global ? '' : `类型 \`${targetType.getName()}\` 上`}不存在属性 \`${this.action.identifier}\``, ExpressionErrorLevel.Warning));
            }
        }
        return errors;
    }
    toString(prettyPrinted) {
        let params = this.parameters ? `(${this.parameters.map(p => p.toString(prettyPrinted)).join(prettyPrinted ? ', ' : ',')})` : '';
        return `${this.target ? this.target.toString(prettyPrinted) + '.' : ''}${this.action.toString(prettyPrinted)}${params}`;
    }
}
exports.FunctionExpressionNode = FunctionExpressionNode;
function boolValue(obj) {
    if (obj === null || obj === undefined || obj === 0 || obj === '') {
        return false;
    }
    switch (typeof (obj)) {
        case 'number':
            return obj !== 0;
        case 'boolean':
            return obj;
        default:
            return obj !== null && obj !== undefined;
    }
}
exports.boolValue = boolValue;
function isNull(obj) {
    return obj === null || obj === undefined;
}
function isNumber(obj) {
    return isNull(obj) || typeof (obj) === 'number';
}
function numberValue(obj) {
    if (typeof (obj) === 'number')
        return obj;
    return 0;
}
function isEqual(a, b) {
    if (typeof (a) === typeof (b)) {
        return a === b;
    }
    if (isNumber(a) && isNumber(b)) {
        return numberValue(a) === numberValue(b);
    }
    return false;
}
function stringLiteral(text) {
    return "'" + text.replace(/\\/mg, '\\\\')
        .replace(/\n/mg, '\\n')
        .replace(/\t/mg, '\\t')
        .replace(/\r/mg, '\\r')
        .replace(/\u0008/mg, '\\b')
        .replace(/\f/mg, '\\f')
        .replace(/'/mg, "\\'")
        .replace(/[\u0001-\u001F]/mg, c => `\\u${('000' + c.charCodeAt(0).toString(16)).slice(-4)}`) + "'";
}
function propertyName(name) {
    if (typeof (name) !== 'string')
        return '' + name;
    if (name.match(/^[_$a-zA-Z][_$a-zA-Z0-9]*$/)) {
        return name;
    }
    return stringLiteral(name);
}
exports.propertyName = propertyName;
//# sourceMappingURL=exp.js.map