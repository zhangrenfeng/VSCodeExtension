"use strict";
/*! Copyright (c) Microsoft Corporation. All rights reserved. */
Object.defineProperty(exports, "__esModule", { value: true });
const ModelProviderFactory_1 = require("./models/ModelProviderFactory");
class IntelliCode {
    constructor(extensionRoot, tags) {
        this.ModelAcquisitionService = new ModelAcquisitionService(extensionRoot, tags);
    }
}
exports.IntelliCode = IntelliCode;
class ModelAcquisitionService {
    constructor(extensionRoot, tags = []) {
        this.extensionRoot = extensionRoot;
    }
    getModelProvider(languageName, analyzerName) {
        return ModelProviderFactory_1.CreateModelProvider(languageName, analyzerName, this.extensionRoot);
    }
}
exports.ModelAcquisitionService = ModelAcquisitionService;
//# sourceMappingURL=intellicode-api.js.map