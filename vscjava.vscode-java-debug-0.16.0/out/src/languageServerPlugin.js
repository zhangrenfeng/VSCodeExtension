"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const commands = require("./commands");
const logger_1 = require("./logger");
const utility = require("./utility");
function resolveMainMethod(uri) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield commands.executeJavaLanguageServerCommand(commands.JAVA_RESOLVE_MAINMETHOD, uri.toString());
        }
        catch (ex) {
            logger_1.logger.log(logger_1.Type.EXCEPTION, utility.formatErrorProperties(ex));
            return [];
        }
    });
}
exports.resolveMainMethod = resolveMainMethod;
function startDebugSession() {
    return commands.executeJavaLanguageServerCommand(commands.JAVA_START_DEBUGSESSION);
}
exports.startDebugSession = startDebugSession;
function resolveClasspath(mainClass, projectName) {
    return commands.executeJavaLanguageServerCommand(commands.JAVA_RESOLVE_CLASSPATH, mainClass, projectName);
}
exports.resolveClasspath = resolveClasspath;
function resolveMainClass(workspaceUri) {
    if (workspaceUri) {
        return commands.executeJavaLanguageServerCommand(commands.JAVA_RESOLVE_MAINCLASS, workspaceUri.toString());
    }
    return commands.executeJavaLanguageServerCommand(commands.JAVA_RESOLVE_MAINCLASS);
}
exports.resolveMainClass = resolveMainClass;
function validateLaunchConfig(workspaceUri, mainClass, projectName, containsExternalClasspaths) {
    return commands.executeJavaLanguageServerCommand(commands.JAVA_VALIDATE_LAUNCHCONFIG, workspaceUri ? workspaceUri.toString() : undefined, mainClass, projectName, containsExternalClasspaths);
}
exports.validateLaunchConfig = validateLaunchConfig;
//# sourceMappingURL=languageServerPlugin.js.map