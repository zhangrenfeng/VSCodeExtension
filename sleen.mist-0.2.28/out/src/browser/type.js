"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Parameter {
    constructor(name, type, description) {
        this.name = name;
        this.type = type;
        this.description = description;
    }
}
exports.Parameter = Parameter;
class Method {
    static isSame(a, b) {
        return IType.isSame(a.type, b.type) && a.params.length === b.params.length && a.params.every((p, i) => IType.isSame(p.type, b.params[i].type));
    }
    constructor(type, description, params = [], jsEquivalent) {
        this.type = type;
        this.description = description;
        this.params = params;
        this.jsEquivalent = jsEquivalent;
    }
    registerToType(type) {
        this.ownerType = type;
    }
}
exports.Method = Method;
class Property {
    constructor(type, description, readonly, jsEquivalent) {
        this.type = type;
        this.description = description;
        this.readonly = readonly;
        this.jsEquivalent = jsEquivalent;
    }
    registerToType(type) {
        this.ownerType = type;
    }
}
exports.Property = Property;
class IType {
    static isSame(a, b) {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        if (a.constructor !== b.constructor) {
            return false;
        }
        if (a instanceof CombinedType && b instanceof CombinedType) {
            return CombinedType.isSame(a, b);
        }
        if (a instanceof ArrayType && b instanceof ArrayType) {
            return ArrayType.isSame(a, b);
        }
        if (a instanceof ObjectType && b instanceof ObjectType) {
            return ObjectType.isSame(a, b);
        }
        if (a instanceof LiteralType && b instanceof LiteralType) {
            return LiteralType.isSame(a, b);
        }
        if (a instanceof ArrowType && b instanceof ArrowType) {
            return ArrowType.isSame(a, b);
        }
        return false;
    }
    static typeof(obj, isConst = false) {
        if (obj instanceof IType) {
            return obj;
        }
        if (obj === undefined || obj === null) {
            if (isConst && obj === null)
                return new LiteralType(null);
            return Type.Any;
        }
        let type = typeof (obj);
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return isConst ? new LiteralType(obj) : Type.getType(type);
        }
        if (obj instanceof Array) {
            let types = obj.map(o => this.typeof(o, isConst));
            return isConst && obj.length > 0 ? ArrayType.tuple(types) : new ArrayType(UnionType.type(types));
        }
        return new ObjectType(Object.keys(obj).reduce((ret, k) => { ret[k] = this.typeof(obj[k], isConst); return ret; }, {}));
    }
    getTypeAtIndex(index) {
        return Type.Any;
    }
    kindof(type, unionCheck = false) {
        // everything kindof array
        if (type === Type.Any) {
            return true;
        }
        else if (this instanceof Type && this === Type.Any) {
            return !unionCheck;
        }
        else if (IType.isSame(this, type)) {
            return true;
        }
        else if (type instanceof IntersectionType) {
            return type.getTypes().every(t => this.kindof(t, unionCheck));
        }
        else if (this instanceof IntersectionType) {
            return this.getTypes().some(t => t.kindof(type, unionCheck));
        }
        else if (this instanceof UnionType) {
            return this.getTypes().every(t => t.kindof(type, unionCheck));
        }
        else if (type instanceof UnionType) {
            return type.getTypes().some(t => this.kindof(t, unionCheck));
        }
        else if (this instanceof LiteralType) {
            // currently all types accept the null value
            if (this.getValue() === null)
                return true;
            return this.getType().kindof(type, unionCheck);
        }
        else if (this instanceof ArrayType && type instanceof ArrayType) {
            if (type.isTuple()) {
                if (this.isTuple() && this.getElementsType().kindof(type.getElementsType(), unionCheck)) {
                    let thisTupleTypes = this.getTupleTypes();
                    let tupleTypes = type.getTupleTypes();
                    return thisTupleTypes.length >= tupleTypes.length && tupleTypes.every((t, i) => thisTupleTypes[i].kindof(t));
                }
                return false;
            }
            else {
                return this.getElementsType().kindof(type.getElementsType(), unionCheck);
            }
        }
        else if (this instanceof ObjectType && type instanceof ObjectType) {
            let t = this;
            let required = type.getRequiredProperties();
            return Object.keys(type.getMap()).every(k => {
                let thisKeyType = t.getMap()[k];
                if (thisKeyType) {
                    return thisKeyType.kindof(type.getMap()[k], unionCheck);
                }
                else {
                    return required.indexOf(k) < 0;
                }
            });
        }
        else if (this instanceof ArrowType && type instanceof ArrowType) {
            return this.returnType.kindof(type.returnType)
                && this.params.length === type.params.length
                && this.params.every((t, i) => t.type.kindof(type.params[i].type));
        }
        return false;
    }
    getMethod(name, paramsCount) {
        let methods = this.getMethods(name);
        if (methods) {
            return methods.find(m => m.params.length === paramsCount);
        }
        return null;
    }
}
exports.IType = IType;
class Type extends IType {
    constructor(name, description) {
        super();
        this.name = name;
        this.description = description;
        this.properties = {};
        this.methods = {};
        this.classMethods = {};
    }
    static registerType(type) {
        this.types[type.name] = type;
        return this.types[type.name];
    }
    registerProperty(name, property) {
        this.properties[name] = property;
        property.registerToType(this);
        return this;
    }
    registerPropertys(properties) {
        Object.keys(properties).forEach(k => this.registerProperty(k, properties[k]));
        return this;
    }
    registerMethod(name, method) {
        let methods = this.methods[name];
        let methodsToRegister = method instanceof Method ? [method] : method;
        methodsToRegister.forEach(m => {
            if (!methods) {
                methods = [];
                this.methods[name] = methods;
            }
            methods.push(m);
            m.registerToType(this);
        });
        return this;
    }
    registerMethods(methods) {
        Object.keys(methods).forEach(k => this.registerMethod(k, methods[k]));
        return this;
    }
    static getType(name) {
        return this.types[name];
    }
    getName() {
        return this.name;
    }
    getAllProperties() {
        return this.properties;
    }
    getAllMethods() {
        return this.methods;
    }
    getProperty(name) {
        return this.properties[name];
    }
    getMethods(name) {
        return this.methods[name];
    }
    getMethod(name, paramsCount) {
        let methods = this.methods[name];
        if (!methods)
            return null;
        return methods.find(m => m.params.length === paramsCount);
    }
    getClassMethods(name) {
        return this.classMethods[name];
    }
    getClassMethod(name, paramsCount) {
        return this.classMethods[name].find(m => m.params.length === paramsCount);
    }
    getTypeAtIndex(index) {
        if (this === Type.String) {
            return Type.String;
        }
        return super.getTypeAtIndex(index);
    }
}
Type.types = {};
Type.Boolean = Type.registerType(new Type('boolean'));
Type.Number = Type.registerType(new Type('number'));
Type.String = Type.registerType(new Type('string'));
Type._dummy = Type.Number.registerPropertys({
    "intValue": new Property(Type.Number, "数字的整数值", true, n => Math.floor(n)),
    "doubleValue": new Property(Type.Number, "数字的浮点数值", true, n => n),
    "floatValue": new Property(Type.Number, "数字的浮点数值", true, n => n),
    "boolValue": new Property(Type.Boolean, "数字的布尔值", true, n => n !== 0),
}).registerMethods({
    "toFixed": new Method(Type.String, '返回数字的定点数表示形式', [new Parameter('fractionDigits', Type.Number, '保留小数位数')], (n, fractionDigits) => n.toFixed(fractionDigits)),
    "toPrecision": new Method(Type.String, '返回数字的浮点数表示，指定有效数字', [new Parameter('precision', Type.Number, '有效数字位数')], (n, precision) => n.toPrecision(precision)),
});
Type._dummy2 = Type.String.registerPropertys({
    "length": new Property(Type.Number, "字符串长度", true, str => str.length),
    "intValue": new Property(Type.Number, "字符串的整数值", true, str => parseInt(str)),
    "doubleValue": new Property(Type.Number, "字符串的浮点数值", true, str => parseFloat(str)),
    "floatValue": new Property(Type.Number, "字符串的浮点数值", true, str => parseFloat(str)),
    "boolValue": new Property(Type.Boolean, "字符串的布尔值", true, (s) => /^\s*[TtYy1-9]/.test(s)),
});
Type.Any = Type.registerType(new Type('any'));
Type.Null = Type.registerType(new Type('null'));
Type.Void = Type.registerType(new Type('void'));
Type.Global = Type.registerType(new Type('global'));
Type.Array = Type.registerType(new Type('array')).registerPropertys({
    "count": new Property(Type.Number, "数组元素数量", true, list => list.length),
});
Type.Object = Type.registerType(new Type('object')).registerPropertys({
    "count": new Property(Type.Number, "字典元素数量", true, obj => Object.keys(obj).length),
});
exports.Type = Type;
class LiteralType extends IType {
    constructor(value, discription) {
        super();
        this.value = value;
        this.discription = discription;
    }
    static isSame(a, b) {
        return a.value === b.value;
    }
    getValue() {
        return this.value;
    }
    getType() {
        if (this.value === null)
            return Type.Null;
        return IType.typeof(this.value);
    }
    getName() {
        return JSON.stringify(this.value);
    }
    getAllProperties() {
        return Type.typeof(this.value).getAllProperties();
    }
    getProperty(name) {
        return Type.typeof(this.value).getProperty(name);
    }
    getAllMethods() {
        return Type.typeof(this.value).getAllMethods();
    }
    getMethods(name) {
        return Type.typeof(this.value).getMethods(name);
    }
}
exports.LiteralType = LiteralType;
class CombinedType extends IType {
    static isSame(a, b) {
        return a.types.length === b.types.length && a.types.every(t => b.types.indexOf(t) >= 0);
    }
    constructor(...types) {
        super();
        this.types = types;
    }
    getTypes() {
        return this.types;
    }
}
exports.CombinedType = CombinedType;
class IntersectionType extends CombinedType {
    static type(types) {
        if (types.length === 0) {
            return Type.Any;
        }
        let ts = types.map(t => t instanceof IntersectionType ? t.types : [t]).reduce((p, c) => p.concat(c), []);
        if (ts.indexOf(Type.Any) >= 0) {
            return Type.Any;
        }
        ts = [...new Set(ts)];
        ts = ts.filter((t, i) => ts.findIndex(s => IType.isSame(t, s)) === i);
        let objectTypes = ts.filter(t => t instanceof ObjectType);
        if (objectTypes.length >= 2) {
            let newObjectType = new ObjectType(objectTypes.reduce((p, c) => {
                let map = c.getMap();
                Object.keys(map).forEach(k => {
                    if (k in p) {
                        p[k] = IntersectionType.type([p[k], map[k]]);
                    }
                    else {
                        p[k] = map[k];
                    }
                });
                return p;
            }, {}));
            ts = ts.filter(t => !(t instanceof ObjectType));
            ts.push(newObjectType);
        }
        let arrayTypes = ts.filter(t => t instanceof ArrayType);
        if (arrayTypes.length >= 2) {
            let newArrayType = new ArrayType(IntersectionType.type(arrayTypes.map(t => t.getElementsType())));
            ts = ts.filter(t => !(t instanceof ArrayType));
            ts.push(newArrayType);
        }
        if (ts.length === 0) {
            return Type.Any;
        }
        else if (ts.length === 1) {
            return ts[0];
        }
        else {
            return new IntersectionType(...ts);
        }
    }
    constructor(...types) {
        super(...types);
    }
    getName() {
        return this.types.map(t => t.getName()).join(' & ');
    }
    getAllProperties() {
        let propertiesList = this.types.map(t => t.getAllProperties());
        let names = [...new Set(propertiesList.map(ps => Object.keys(ps)).reduce((p, c) => p.concat(c), []))];
        let properties = {};
        names.forEach(n => {
            let ps = propertiesList.map(ps => ps[n]).filter(p => p);
            let p;
            if (ps.length === 0) {
                p = null;
            }
            else if (ps.length === 1) {
                p = ps[0];
            }
            else {
                p = new Property(IntersectionType.type(ps.map(p => p.type)), ps[0].description, ps.every(p => p.readonly));
            }
            if (p) {
                properties[n] = p;
            }
        });
        return properties;
    }
    getProperty(name) {
        let ps = this.types.map(t => t.getProperty(name)).filter(p => p);
        if (ps.length === 0) {
            return null;
        }
        else if (ps.length === 1) {
            return ps[0];
        }
        else {
            return new Property(IntersectionType.type(ps.map(p => p.type)), ps[0].description, ps.every(p => p.readonly));
        }
    }
    getAllMethods() {
        let methodsList = this.types.map(t => t.getAllMethods());
        let names = [...new Set(methodsList.map(ms => Object.keys(ms)).reduce((p, c) => p.concat(c), []))];
        let methods = {};
        names.forEach(name => {
            let ms = methodsList.map(ms => ms[name]).filter(p => p).reduce((p, c) => p.concat(c), []);
            ms = ms.reduce((p, c) => {
                let index = p.findIndex(n => Method.isSame(c, n));
                if (index >= 0) {
                    let m = p[index];
                    p[index] = new Method(m.type, m.description, m.params, m.jsEquivalent);
                }
                else {
                    p.push(c);
                }
                return p;
            }, []);
            // let ms = this.getMethods(name);
            if (ms.length > 0) {
                methods[name] = ms;
            }
        });
        return methods;
    }
    getMethods(name) {
        let ms = this.types.map(t => t.getMethods(name)).filter(p => p).reduce((p, c) => p.concat(c), []);
        ms = ms.reduce((p, c) => {
            let index = p.findIndex(name => Method.isSame(c, name));
            if (index >= 0) {
                let m = p[index];
                p[index] = new Method(m.type, m.description, m.params, m.jsEquivalent);
            }
            else {
                p.push(c);
            }
            return p;
        }, []);
        return ms;
    }
}
exports.IntersectionType = IntersectionType;
class UnionType extends CombinedType {
    static type(types) {
        if (types.length === 0) {
            return Type.Any;
        }
        let ts = types.map(t => t instanceof UnionType ? t.types : [t]).reduce((p, c) => p.concat(c), []);
        if (ts.indexOf(Type.Any) >= 0) {
            return Type.Any;
        }
        ts = [...new Set(ts)];
        // 去掉多余的类型，比如 'abc' | string => string
        for (var i = 0; i < ts.length; i++) {
            for (var j = i + 1; j < ts.length; j++) {
                if (ts[i].kindof(ts[j], true)) {
                    ts.splice(i, 1);
                    i--;
                    break;
                }
                else if (ts[j].kindof(ts[i], true)) {
                    ts.splice(j, 1);
                    break;
                }
            }
        }
        if (ts.length === 0) {
            return Type.Any;
        }
        else if (ts.length === 1) {
            return ts[0];
        }
        else {
            return new UnionType(...ts);
        }
    }
    constructor(...types) {
        super(...types);
    }
    getName() {
        return this.types.map(t => t.getName()).join(' | ');
    }
    getAllProperties() {
        let propertiesList = this.types.map(t => t.getAllProperties());
        let names = [...new Set(propertiesList.map(ps => Object.keys(ps)).reduce((p, c) => p.concat(c), []))];
        let properties = {};
        names.forEach(n => {
            let ps = propertiesList.map(ps => ps[n]).filter(p => p);
            let p;
            if (ps.length === this.types.length) {
                p = new Property(UnionType.type(ps.map(p => p.type)), ps[0].description, ps.every(p => p.readonly));
            }
            else {
                p = null;
            }
            if (p) {
                properties[n] = p;
            }
        });
        return properties;
    }
    getProperty(name) {
        let ps = this.types.map(t => t.getProperty(name)).filter(p => p);
        if (ps.length === this.types.length) {
            return new Property(UnionType.type(ps.map(p => p.type)), ps[0].description, ps.every(p => p.readonly));
        }
        else {
            return null;
        }
    }
    getAllMethods() {
        let methodsList = this.types.map(t => t.getAllMethods());
        let names = methodsList.map(ms => Object.keys(ms)).reduce((p, c) => p.filter(m => c.indexOf(m) >= 0, []));
        let methods = {};
        names.forEach(name => {
            let msList = methodsList.map(ms => ms[name]).filter(p => p);
            let ms = msList.slice(1).reduce((p, c) => {
                let ret = [];
                p.forEach((v, i) => {
                    let method = c.find(m => v.params.length === m.params.length && v.params.every((p, i) => IType.isSame(p.type, m.params[i].type)));
                    if (method) {
                        ret.push(new Method(UnionType.type([v.type, method.type]), v.description, v.params, v.jsEquivalent));
                    }
                });
                return ret;
            }, [...msList[0]]);
            // let ms = this.getMethods(name);
            if (ms.length > 0) {
                methods[name] = ms;
            }
        });
        return methods;
    }
    getMethods(name) {
        let msList = this.types.map(t => t.getMethods(name)).filter(p => p);
        if (msList.length === 0)
            return [];
        let ms = msList.slice(1).reduce((p, c) => {
            let ret = [];
            p.forEach((v, i) => {
                let method = c.find(m => v.params.length === m.params.length && v.params.every((p, i) => IType.isSame(p.type, m.params[i].type)));
                if (method) {
                    ret.push(new Method(UnionType.type([v.type, method.type]), v.description, v.params, v.jsEquivalent));
                }
            });
            return ret;
        }, [...msList[0]]);
        return ms;
    }
    getTypeAtIndex(index) {
        return UnionType.type(this.types.map(t => t.getTypeAtIndex(index)));
    }
}
exports.UnionType = UnionType;
class ArrayType extends IType {
    static tuple(types) {
        let type = new ArrayType(UnionType.type(types));
        type.tupleTypes = types;
        return type;
    }
    static isSame(a, b) {
        return IType.isSame(a.elementsType, b.elementsType);
    }
    constructor(elementsType) {
        super();
        this.elementsType = elementsType;
    }
    getName() {
        const getTypeName = (t) => t instanceof UnionType || t instanceof IntersectionType ? `(${t.getName()})` : t.getName();
        return this.tupleTypes ? `[${this.tupleTypes.map(t => t.getName()).join(', ')}]` : (getTypeName(this.elementsType) + '[]');
    }
    getElementsType() {
        return this.elementsType;
    }
    getTupleTypes() {
        return this.tupleTypes;
    }
    isTuple() {
        return !!this.tupleTypes;
    }
    getAllProperties() {
        return Type.getType('array').getAllProperties();
    }
    getProperty(name) {
        return Type.getType('array').getProperty(name);
    }
    getAllMethods() {
        return Type.getType('array').getAllMethods();
    }
    getMethods(name) {
        return Type.getType('array').getMethods(name);
    }
    getTypeAtIndex(index) {
        if (!index.kindof(Type.Number)) {
            return Type.Any;
        }
        if (index instanceof LiteralType && this.isTuple()) {
            let i = index.getValue();
            let tupleTypes = this.getTupleTypes();
            if (i < tupleTypes.length) {
                return tupleTypes[i];
            }
        }
        return this.getElementsType();
    }
}
exports.ArrayType = ArrayType;
class ObjectType extends IType {
    constructor(map, requiredProperties, indexType) {
        super();
        this.map = map;
        this.indexType = indexType;
        this.required = requiredProperties || [];
    }
    static isSame(a, b) {
        let keysA = Object.keys(a.map);
        let keysB = Object.keys(b.map);
        let indexTypeA = a.indexType ? a.indexType.type : null;
        let indexTypeB = b.indexType ? b.indexType.type : null;
        return indexTypeA === indexTypeB && keysA.length === keysB.length && keysA.every(k => IType.isSame(a.map[k], b.map[k]));
    }
    setIndexType(name = 'key', type = Type.Any) {
        this.indexType = { name: name, type: type };
        return this;
    }
    getMap() {
        return this.map;
    }
    getName() {
        let keys = Object.keys(this.map);
        if (keys.length === 0 && !this.indexType) {
            return '{}';
        }
        let props = keys.map(k => `"${k}"${this.required.indexOf(k) >= 0 ? '!' : ''}: ${this.map[k].getName()};`);
        if (this.indexType) {
            props.splice(0, 0, `[${this.indexType.name}: string]: ${this.indexType.type.getName()};`);
        }
        return `{
    ${props.join('\n').replace(/\n/mg, '\n    ')}
}`;
    }
    getAllProperties() {
        return Object.keys(this.map).reduce((p, c) => { p[c] = new Property(this.map[c]); return p; }, {});
    }
    getRequiredProperties() {
        return this.required;
    }
    getProperty(name) {
        if (name in this.map) {
            return new Property(this.map[name]);
        }
        if (this.indexType) {
            return new Property(this.indexType.type);
        }
        return null;
    }
    getAllMethods() {
        return ObjectType.methods;
    }
    getMethods(name) {
        return ObjectType.methods[name];
    }
}
ObjectType.properties = {};
ObjectType.methods = {};
exports.ObjectType = ObjectType;
class ArrowType extends IType {
    static isSame(a, b) {
        return IType.isSame(a.returnType, b.returnType)
            && a.params.length === b.params.length
            && a.params.every((p, i) => IType.isSame(p.type, b.params[i].type));
    }
    constructor(returnType, params) {
        super();
        this.returnType = returnType;
        this.params = params;
    }
    getName() {
        return `(${this.params.map(p => `${p.name}: ${p.type.getName()}`).join(', ')}) => ${this.returnType.getName()}`;
    }
    getAllProperties() {
        return {};
    }
    getProperty(name) {
        return null;
    }
    getAllMethods() {
        return {};
    }
    getMethods(name) {
        return [];
    }
}
exports.ArrowType = ArrowType;
//# sourceMappingURL=type.js.map