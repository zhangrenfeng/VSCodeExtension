"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axmlCompletion_1 = require("./axmlCompletion");
const axmlValidation_1 = require("./axmlValidation");
const axmlHover_1 = require("./axmlHover");
const axmlDefinition_1 = require("./axmlDefinition");
const axmlCodeAction_1 = require("./axmlCodeAction");
const axmlRename_1 = require("./axmlRename");
const axmlFolding_1 = require("./axmlFolding");
const axmlDocumentSymbol_1 = require("./axmlDocumentSymbol");
const axmlHightlight_1 = require("./axmlHightlight");
function getLanguageService() {
    const completion = new axmlCompletion_1.AXMLCompletion();
    const validation = new axmlValidation_1.AXMLValidation();
    const hover = new axmlHover_1.AXMLHover();
    const definition = new axmlDefinition_1.AXMLDefinition();
    const codeAction = new axmlCodeAction_1.AXMLCodeAction();
    const rename = new axmlRename_1.AXMLRename();
    const folding = new axmlFolding_1.AXMLFolding();
    const documentSymbol = new axmlDocumentSymbol_1.AXMLDocumentSymbol();
    const highlight = new axmlHightlight_1.AXMLHighlight();
    return {
        doComplete: completion.doComplete.bind(completion),
        doResolve: completion.doResolve.bind(completion),
        doValidation: validation.doValidation.bind(validation),
        doHover: hover.doHover.bind(hover),
        doDefinition: definition.doDefinition.bind(definition),
        doCodeAction: codeAction.doCodeAction.bind(codeAction),
        doRename: rename.doRename.bind(rename),
        doPrepareRename: rename.doPrepareRename.bind(rename),
        doFoldingRanges: folding.doFoldingRanges.bind(folding),
        doDocumentSymbol: documentSymbol.doDocumentSymbol.bind(documentSymbol),
        doHighlight: highlight.doHighlight.bind(highlight),
    };
}
exports.getLanguageService = getLanguageService;
//# sourceMappingURL=index.js.map