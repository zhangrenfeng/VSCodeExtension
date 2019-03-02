declare type Version = string;
interface Availability {
    kobexOnly?: boolean;
    minVersion?: Version;
    maxVersion?: Version;
    deprecatedVersion?: Version;
    deprecatedMessage?: string;
}
export declare type AttributeType = 'enum' | 'string' | 'number' | 'boolean' | 'color' | 'array' | 'any' | 'event';
declare type ExpType = 'both' | 'never' | 'always';
export interface AttributeDefinition extends Availability {
    type: AttributeType;
    required?: boolean;
    description?: string;
    enum?: any[];
    enumDescriptions?: string[];
    default?: any;
    snippet?: string;
    dependencies?: string[];
    when?: string;
    additionalAttributes?: boolean;
    definition?: {
        uri: string;
        range: {
            start: number;
            end: number;
        };
    };
    expType?: ExpType;
}
interface ComponentDefinition extends Availability {
    extends?: string;
    when?: string;
    attributes: {
        [name: string]: AttributeDefinition;
    };
    allowedChildren?: string[];
    singleTag?: boolean;
    snippet?: string;
    description?: string;
}
interface WhenContextElementInfo {
    tag: string;
    attributes: {
        [name: string]: string | boolean;
    };
    isRef: boolean;
}
export interface WhenContext {
    $this: WhenContextElementInfo;
    $parent: WhenContextElementInfo;
    $parentView: WhenContextElementInfo;
    $prev: WhenContextElementInfo;
}
export declare class Component implements ComponentDefinition {
    extends?: string;
    when?: string;
    attributes: {
        [name: string]: AttributeDefinition;
    };
    allowedChildren?: string[];
    singleTag: boolean;
    additionalAttributes: boolean;
    snippet?: string;
    description?: string;
    kobexOnly: boolean;
    expType: ExpType;
    minVersion?: string;
    maxVersion?: string;
    deprecatedVersion?: string;
    deprecatedMessage?: string;
    isRef: boolean;
    private static map;
    private static availableMap;
    constructor(definition: ComponentDefinition, isRef?: boolean);
    static getAllComponents(whenContext?: WhenContext): {
        [name: string]: Component;
    };
    static getComponent(name: string): Component;
    getAvailableAttributes(whenContext: WhenContext): {
        [key: string]: AttributeDefinition;
    };
    isAvailable(whenContext: WhenContext): boolean;
    static pushComponent(name: string, component: Component): void;
    static resolveCustomComponent(componentPath: string): Promise<Component>;
    private static resolveWhen;
    private static resolveComponentAttributes;
    private static resolveComponentIsSingleTag;
}
export {};
