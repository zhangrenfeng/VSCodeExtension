export declare type ASTNode = ElementNode | TextNode | TagNode | AttributeNode | StringNode;
export interface BaseNode {
    readonly type: 'text' | 'element' | 'tag' | 'attribute' | 'string';
    readonly offset: number;
    readonly length: number;
    readonly children?: ASTNode[];
    readonly parent?: ASTNode;
}
export interface ElementNode extends BaseNode {
    readonly type: 'element';
    readonly tagStart: TagNode;
    readonly tagEnd?: TagNode;
    readonly children: ASTNode[];
    readonly childNodes: (ElementNode | TextNode)[];
}
export interface TextNode extends BaseNode {
    readonly type: 'text';
    readonly text: string;
}
export interface StringNode extends BaseNode {
    readonly type: 'string';
    readonly text: string;
}
export interface TagNode extends BaseNode {
    readonly type: 'tag';
    readonly isEndTag: boolean;
    readonly tagTextNode: StringNode;
    readonly attributes: AttributeNode[];
}
export interface AttributeNode extends BaseNode {
    readonly type: 'attribute';
    readonly name: StringNode;
    readonly value?: StringNode;
    readonly equalOffset?: number;
}
