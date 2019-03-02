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
const path = require("path");
const colorSchema = {
    type: 'string',
    pattern: '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$'
};
const windowProperties = {
    defaultTitle: {
        type: 'string',
        description: '页面标题'
    },
    pullRefresh: {
        type: 'boolean',
        description: '是否允许下拉刷新。默认 `false`'
    },
    transparentTitle: {
        type: 'string',
        enum: ['always', 'never', 'auto'],
        enumDescriptions: ['总是透明', '不透明', '自动。一开始透明，页面往上滑一段距离后变为不透明。iOS 端暂不支持'],
        description: '导航栏背景是否透明，默认为 `never`。'
    },
    pageScroll: {
        type: 'boolean',
        description: '页面是否可滚动。默认 `false`'
    },
};
function pageSchema(appPath, itemPath, components) {
    return __awaiter(this, void 0, void 0, function* () {
        const usingComponentsItemSchema = {
            type: 'string'
        };
        if (components) {
            const enumValues = [];
            components.forEach(c => {
                if (c === itemPath)
                    return;
                const p = path.relative(appPath, c);
                const nodeModulesPrefix = 'node_modules/';
                if (p.startsWith(nodeModulesPrefix)) {
                    enumValues.push(p.slice(nodeModulesPrefix.length));
                }
                else {
                    enumValues.push('/' + p);
                    let relativePath = path.relative(path.dirname(itemPath), c);
                    if (relativePath[0] !== '.')
                        relativePath = './' + relativePath;
                    enumValues.push(relativePath);
                }
            });
            usingComponentsItemSchema.enum = enumValues;
        }
        const schema = {
            type: 'object',
            additionalProperties: false,
            properties: Object.assign({}, windowProperties, { 
                // optionMenu: {
                //   type: 'object',
                //   description: '设置导航栏格外图标',
                //   required: [
                //     'icon'
                //   ],
                //   additionalProperties: false,
                //   properties: {
                //     icon: {
                //       type: 'string',
                //       pattern: '^(https?://|data:image(/png)?,base64,)',
                //       description: '图标 url（以 https/http 开头）或 base64 字符串，大小建议 30*30'
                //     }
                //   },
                // },
                component: {
                    type: 'boolean',
                    description: '是否是组件。默认为 `false`'
                }, usingComponents: {
                    type: 'object',
                    description: '当前页面/组件引用的组件列表。key 为组件使用的标签名称，value 为组件路径',
                    additionalProperties: false,
                    patternProperties: {
                        '^[A-Za-z_][-\\w]*$': usingComponentsItemSchema
                    },
                } })
        };
        return schema;
    });
}
exports.pageSchema = pageSchema;
function appSchema(appPath, pages) {
    return __awaiter(this, void 0, void 0, function* () {
        const pagesItemSchema = {
            type: 'string'
        };
        if (pages) {
            pagesItemSchema.enum = pages.map(p => path.relative(appPath, p));
        }
        const schema = {
            type: 'object',
            additionalProperties: false,
            required: ['pages'],
            properties: {
                pages: {
                    type: 'array',
                    items: pagesItemSchema,
                    minItems: 1,
                    uniqueItems: true,
                    description: '设置页面路径'
                },
                window: {
                    type: 'object',
                    additionalProperties: false,
                    description: '设置默认页面的窗口表现',
                    properties: windowProperties
                },
            }
        };
        return schema;
    });
}
exports.appSchema = appSchema;
//# sourceMappingURL=schemas.js.map