"use strict";
/*! Copyright (c) Microsoft Corporation. All rights reserved. */
Object.defineProperty(exports, "__esModule", { value: true });
class ModelIdentity {
    constructor(modelId, outputId, modifiedTimeUtc) {
        this.modelId = modelId;
        this.outputId = outputId;
        this.modifiedTimeUtc = modifiedTimeUtc;
    }
    static Equals(a, b) {
        try {
            return a.modelId === b.modelId
                && a.outputId === b.outputId
                && new Date(a.modifiedTimeUtc).getTime() === new Date(b.modifiedTimeUtc).getTime();
        }
        catch (_a) {
            return false;
        }
    }
}
exports.ModelIdentity = ModelIdentity;
//# sourceMappingURL=ModelIdentity.js.map