(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Device {
        constructor(model, system, version, width, height, scale) {
            this.model = model;
            this.system = system;
            this.version = version;
            this.width = width;
            this.height = height;
            this.scale = scale;
        }
    }
    exports.default = Device;
});
//# sourceMappingURL=previewDevice.js.map