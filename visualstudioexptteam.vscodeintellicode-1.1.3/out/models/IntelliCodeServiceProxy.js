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
const ModelQueryResult_1 = require("./ModelQueryResult");
const IntelliCodeHttpClient = require("@vsintellicode/http-client");
const ModelIdentity_1 = require("./ModelIdentity");
const ModelInfo_1 = require("./ModelInfo");
const logger_1 = require("../util/logger");
const telemetry_1 = require("../util/telemetry");
class IntelliCodeServiceProxy {
    constructor() {
    }
    GetLatestModelAsync(languageName, analyzerName) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.Instance.write("Querying IntelliCode service for available models.");
            let telemetryEvent = telemetry_1.Instance.startTimedEvent(telemetry_1.TelemetryEventNames.INTELLICODE_SERVICE_GET_LATEST_MODEL, true);
            telemetryEvent.addProperty(telemetry_1.TelemetryPropertyNames.INTELLICODE_SERVICE_GET_LATEST_MODEL_ANALYZER_NAME, analyzerName);
            telemetryEvent.addProperty(telemetry_1.TelemetryPropertyNames.INTELLICODE_SERVICE_GET_LATEST_MODEL_LANGUAGE_NAME, languageName);
            var modelApi = new IntelliCodeHttpClient.ModelApi(IntelliCodeServiceProxy.Endpoint);
            try {
                var model = yield modelApi.apiV1ModelCommonByLanguageByAnalyzerOutputLatestGet(languageName, analyzerName);
            }
            catch (err) {
                if (err.response && err.response.statusCode && err.response.body) {
                    telemetry_1.Instance.sendFault(telemetry_1.TelemetryEventNames.INTELLICODE_SERVICE_GET_LATEST_MODEL_FAULT, telemetry_1.FaultType.Error, `Server did not return code 200: ${JSON.stringify(err.response)}`, undefined);
                    logger_1.Instance.write(`Service responded with status code ${err.response.statusCode}: ${err.response.body}`);
                }
                else {
                    logger_1.Instance.write(`Couldn't reach service ${logger_1.Instance.formatErrorForLogging(err)}`);
                    telemetry_1.Instance.sendFault(telemetry_1.TelemetryEventNames.INTELLICODE_SERVICE_GET_LATEST_MODEL_FAULT, telemetry_1.FaultType.Error, "Couldn't reach service.", err);
                }
                throw err;
            }
            telemetryEvent.addProperty(telemetry_1.TelemetryPropertyNames.INTELLICODE_SERVICE_GET_LATEST_MODEL_STATUS_CODE, model.response.statusCode);
            if (model.body.output) {
                telemetryEvent.addProperty(telemetry_1.TelemetryPropertyNames.INTELLICODE_SERVICE_GET_LATEST_MODEL_RESULT_ID, model.body.output.modelId);
                telemetryEvent.addProperty(telemetry_1.TelemetryPropertyNames.INTELLICODE_SERVICE_GET_LATEST_MODEL_RESULT_STATUS, model.body.output.status);
                telemetryEvent.addProperty(telemetry_1.TelemetryPropertyNames.INTELLICODE_SERVICE_GET_LATEST_MODEL_RESULT_VERSION, model.body.output.version);
                telemetryEvent.addProperty(telemetry_1.TelemetryPropertyNames.INTELLICODE_SERVICE_GET_LATEST_MODEL_RESULT_UPDATED, model.body.output.updated);
                if (model.body.output.blob) {
                    telemetryEvent.addProperty(telemetry_1.TelemetryPropertyNames.INTELLICODE_SERVICE_GET_LATEST_MODEL_BLOB_NAME, model.body.output.blob.name);
                }
            }
            if (!(model.body.output
                && model.body.output.blob
                && model.body.output.blob.azureBlobStorage
                && model.body.output.blob.azureBlobStorage.readSasToken
                && model.body.model
                && model.body.model.id
                && model.body.output.id
                && model.body.output.updated)) {
                telemetry_1.Instance.sendFault(telemetry_1.TelemetryEventNames.INTELLICODE_SERVICE_GET_LATEST_MODEL_FAULT, telemetry_1.FaultType.Error, "Missing expected properties in service response", model.response);
                telemetryEvent.end(telemetry_1.TelemetryResult.IndeterminateFailure, "Missing expected properties in service response");
                logger_1.Instance.write(`Missing expected properties in service response: ${model.response}`);
                throw new Error("Missing expected properties in service response.");
            }
            var readSasToken = model.body.output.blob.azureBlobStorage.readSasToken;
            let identity = new ModelIdentity_1.ModelIdentity(model.body.model.id, model.body.output.id, model.body.output.updated);
            let info = new ModelInfo_1.ModelInfo(languageName, analyzerName, identity);
            telemetryEvent.end(telemetry_1.TelemetryResult.Success);
            return new ModelQueryResult_1.ModelQueryResult(info, readSasToken);
        });
    }
}
IntelliCodeServiceProxy.Endpoint = (typeof process.env.VSCODE_INTELLICODE_ENDPOINT == 'string') ? process.env.VSCODE_INTELLICODE_ENDPOINT : "https://prod.intellicode.vsengsaas.visualstudio.com";
exports.IntelliCodeServiceProxy = IntelliCodeServiceProxy;
//# sourceMappingURL=IntelliCodeServiceProxy.js.map