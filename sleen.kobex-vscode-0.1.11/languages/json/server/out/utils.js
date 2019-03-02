"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
function getAppPath(appMap, filePath) {
    while (filePath && filePath.length > 1) {
        const dir = path.dirname(filePath);
        if (appMap[dir]) {
            return dir;
        }
        filePath = dir;
    }
    return null;
}
exports.getAppPath = getAppPath;
function isValidPath(filePath) {
    return filePath.indexOf('*') < 0;
}
exports.isValidPath = isValidPath;
function getComponentPath(appPath, itemPath, componentName) {
    if (componentName.startsWith('/')) {
        return path.join(appPath, componentName);
    }
    else if (componentName.startsWith('.')) {
        return path.resolve(path.dirname(itemPath), componentName);
    }
    else {
        return path.resolve(appPath, 'node_modules', componentName);
    }
}
exports.getComponentPath = getComponentPath;
//# sourceMappingURL=utils.js.map