"use strict";
/*! Copyright (c) Microsoft Corporation. All rights reserved. */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const logger_1 = require("../util/logger");
const telemetry_1 = require("../util/telemetry");
class ModelProvider {
    constructor(languageName, analyzerName, intelliCodeService, modelCache) {
        this.languageName = languageName;
        this.analyzerName = analyzerName;
        this.intelliCodeService = intelliCodeService;
        this.modelCache = modelCache;
        this.modelUpdatedCallback = (model) => { };
    }
    getModelAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            let telemetryEvent = telemetry_1.Instance.startTimedEvent(telemetry_1.TelemetryEventNames.MODEL_REQUEST_END_TO_END, true);
            logger_1.Instance.write(`Acquiring model '${this.analyzerName}' for ${this.languageName}`);
            try {
                let result = yield this.getModelAsyncInternal();
                telemetryEvent.end(telemetry_1.TelemetryResult.Success);
                return result;
            }
            catch (err) {
                telemetry_1.Instance.sendFault(telemetry_1.TelemetryEventNames.MODEL_REQUEST_END_TO_END_FAULT, telemetry_1.FaultType.Error, "Error in getModelAsync()", err);
                telemetryEvent.end(telemetry_1.TelemetryResult.IndeterminateFailure);
                vscode.window.showErrorMessage(`Couldn't download IntelliCode model. Please check your network connectivity or firewall settings.`);
                logger_1.Instance.write(`Couldn't download IntelliCode model. Please check your network connectivity or firewall settings. ${logger_1.Instance.formatErrorForLogging(err)}`);
                return undefined;
            }
        });
    }
    getModelAsyncInternal() {
        return __awaiter(this, void 0, void 0, function* () {
            let bestCandidate;
            try {
                bestCandidate = yield this.queryForUpdatedModelAsync();
            }
            catch (err) {
                logger_1.Instance.write("Could not reach the IntelliCode service. Checking the local model cache.");
                let cachedCandidates = yield this.modelCache.FindAsync(this.languageName, this.analyzerName);
                if (cachedCandidates.length > 0) {
                    logger_1.Instance.write("Recent model was found in cache.");
                    telemetry_1.Instance.sendTelemetryEvent(telemetry_1.TelemetryEventNames.MODEL_CACHE_HIT_FRESH);
                    bestCandidate = cachedCandidates.sort((a, b) => new Date(a.modifiedTimeUtc).getTime() - new Date(b.modifiedTimeUtc).getTime())[0];
                }
                else {
                    logger_1.Instance.write("None of the cached models match.");
                    throw err;
                }
            }
            let descriptor = yield this.modelCache.LoadAsync(bestCandidate);
            return descriptor;
        });
    }
    queryForUpdatedModelAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.intelliCodeService.GetLatestModelAsync(this.languageName, this.analyzerName)
                .catch((err) => {
                throw err;
            });
            let modelQueryResult = result;
            if (yield this.modelCache.ContainsAsync(modelQueryResult.ModelInfo.identity)) {
                logger_1.Instance.write("Cached model is up to date.");
                telemetry_1.Instance.sendTelemetryEvent(telemetry_1.TelemetryEventNames.MODEL_CACHE_HIT_STALE_CURRENT);
                return Promise.resolve(modelQueryResult.ModelInfo.identity);
            }
            telemetry_1.Instance.sendTelemetryEvent(telemetry_1.TelemetryEventNames.MODEL_CACHE_MISS_OR_STALE_OUTDATED);
            logger_1.Instance.write("Downloading model.");
            yield this.modelCache.StoreFromBlobAsync(modelQueryResult.ModelInfo, modelQueryResult.BlobUri);
            return Promise.resolve(modelQueryResult.ModelInfo.identity);
        });
    }
}
exports.ModelProvider = ModelProvider;
//# sourceMappingURL=ModelProvider.js.map