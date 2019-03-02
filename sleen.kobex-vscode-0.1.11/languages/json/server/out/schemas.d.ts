import { JSONSchema } from 'vscode-json-languageservice';
export declare function pageSchema(appPath?: string, itemPath?: string, components?: string[]): Promise<JSONSchema>;
export declare function appSchema(appPath?: string, pages?: string[]): Promise<JSONSchema>;
