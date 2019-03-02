"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mistDocument_1 = require("./mistDocument");
class MistSignatureHelpProvider {
    provideSignatureHelp(document, position, token) {
        return mistDocument_1.MistDocument.getDocumentByUri(document.uri).provideSignatureHelp(position, token);
    }
}
exports.MistSignatureHelpProvider = MistSignatureHelpProvider;
//# sourceMappingURL=signatureHelpProvider.js.map