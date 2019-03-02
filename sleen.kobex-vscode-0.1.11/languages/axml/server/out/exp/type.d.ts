export declare class Parameter {
    name: string;
    type: IType;
    description?: string;
    constructor(name: string, type: IType, description?: string);
}
export declare class Method {
    type?: IType;
    ownerType?: Type;
    description?: string;
    params: Parameter[];
    jsEquivalent: (...params: any[]) => any;
    static isSame(a: Method, b: Method): boolean;
    constructor(type: IType, description?: string, params?: Parameter[], jsEquivalent?: (...params: any[]) => any);
    registerToType(type: Type): void;
}
export declare class Property {
    type: IType;
    ownerType?: Type;
    description?: string;
    readonly: boolean;
    jsEquivalent: (...params: any[]) => any;
    constructor(type: IType, description?: string, readonly?: boolean, jsEquivalent?: (...params: any[]) => any);
    registerToType(type: Type): void;
}
export declare abstract class IType {
    static isSame(a: IType, b: IType): boolean;
    static typeof(obj: any, isConst?: boolean): IType;
    abstract getName(): string;
    abstract getAllProperties(): {
        [name: string]: Property;
    };
    abstract getProperty(name: string): Property;
    abstract getAllMethods(): {
        [name: string]: Method[];
    };
    abstract getMethods(name: string): Method[];
    getTypeAtIndex(index: IType): IType;
    kindof(type: IType, unionCheck?: boolean): boolean;
    getMethod(name: string, paramsCount: number): Method;
}
export declare class Type extends IType {
    static readonly types: {
        [name: string]: Type;
    };
    static registerType(type: Type): Type;
    registerProperty(name: string, property: Property): this;
    registerPropertys(properties: {
        [name: string]: Property;
    }): this;
    registerMethod(name: string, method: Method | Method[]): this;
    registerMethods(methods: {
        [name: string]: Method | Method[];
    }): this;
    static Boolean: Type;
    static Number: Type;
    static String: Type;
    private static _dummy;
    private static _dummy2;
    static Any: Type;
    static Null: Type;
    static Void: Type;
    static Global: Type;
    static Array: Type;
    static Object: Type;
    private name;
    private description?;
    private properties;
    private methods;
    private classMethods;
    static getType(name: string): Type;
    constructor(name: string, description?: string);
    getName(): string;
    getAllProperties(): {
        [name: string]: Property;
    };
    getAllMethods(): {
        [name: string]: Method[];
    };
    getProperty(name: string): Property;
    getMethods(name: string): Method[];
    getMethod(name: string, paramsCount: number): Method;
    getClassMethods(name: string): Method[];
    getClassMethod(name: string, paramsCount: number): Method;
    getTypeAtIndex(index: IType): IType;
}
export declare class LiteralType extends IType {
    private value;
    private discription?;
    static isSame(a: LiteralType, b: LiteralType): boolean;
    constructor(value: any, discription?: string);
    getValue(): any;
    getType(): IType;
    getName(): string;
    getAllProperties(): {
        [name: string]: Property;
    };
    getProperty(name: string): Property;
    getAllMethods(): {
        [name: string]: Method[];
    };
    getMethods(name: string): Method[];
}
export declare abstract class CombinedType extends IType {
    protected types: IType[];
    static isSame(a: CombinedType, b: CombinedType): boolean;
    constructor(...types: IType[]);
    getTypes(): IType[];
}
export declare class IntersectionType extends CombinedType {
    static type(types: IType[]): IType;
    constructor(...types: IType[]);
    getName(): string;
    getAllProperties(): {
        [name: string]: Property;
    };
    getProperty(name: string): Property;
    getAllMethods(): {
        [name: string]: Method[];
    };
    getMethods(name: string): Method[];
}
export declare class UnionType extends CombinedType {
    static type(types: IType[]): IType;
    constructor(...types: IType[]);
    getName(): string;
    getAllProperties(): {
        [name: string]: Property;
    };
    getProperty(name: string): Property;
    getAllMethods(): {
        [name: string]: Method[];
    };
    getMethods(name: string): Method[];
    getTypeAtIndex(index: IType): IType;
}
export declare class ArrayType extends IType {
    private elementsType;
    private tupleTypes;
    static tuple(types: IType[]): ArrayType;
    static isSame(a: ArrayType, b: ArrayType): boolean;
    constructor(elementsType: IType);
    getName(): string;
    getElementsType(): IType;
    getTupleTypes(): IType[];
    isTuple(): boolean;
    getAllProperties(): {
        [name: string]: Property;
    };
    getProperty(name: string): Property;
    getAllMethods(): {
        [name: string]: Method[];
    };
    getMethods(name: string): Method[];
    getTypeAtIndex(index: IType): IType;
}
export declare class ObjectType extends IType {
    private static properties;
    private static methods;
    private map;
    private required;
    private indexType;
    static isSame(a: ObjectType, b: ObjectType): boolean;
    constructor(map: {
        [key: string]: IType;
    }, requiredProperties?: string[], indexType?: {
        name: string;
        type: IType;
    });
    setIndexType(name?: string, type?: IType): this;
    getMap(): {
        [key: string]: IType;
    };
    getName(): string;
    getAllProperties(): Record<string, Property>;
    getRequiredProperties(): string[];
    getProperty(name: string): Property;
    getAllMethods(): {
        [name: string]: Method[];
    };
    getMethods(name: string): Method[];
}
