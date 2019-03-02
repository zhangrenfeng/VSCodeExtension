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
const host_1 = require("@vsintellicode/typescript-intellicode-plugin/lib/vscode/host");
function activate(api) {
    return __awaiter(this, void 0, void 0, function* () {
        const modelProvider = api.ModelAcquisitionService.getModelProvider("javascript", "intellisense-members");
        const model = yield modelProvider.getModelAsync();
        if (!model) {
            console.log('failed to retrieve model');
            return;
        }
        host_1.activate(model.modelPath);
    });
}
exports.activate = activate;
//# sourceMappingURL=typescript-extension.js.map