"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url = require("url");
const path = require("path");
const fs = require("fs");
const imagecache_1 = require("../util/imagecache");
class RelativeToWorkspaceRootFileUrlMapper {
    constructor() {
        this.additionalSourceFolder = '';
    }
    map(fileName, imagePath) {
        let absoluteImagePath;
        if (this.workspaceFolder) {
            let rootPath = url.parse(this.workspaceFolder);
            const pathName = url.parse(imagePath).pathname;
            if (pathName) {
                const pathsToTest = [pathName];
                if (this.paths['']) {
                    let aliases = this.paths[''];
                    if (!Array.isArray(aliases)) {
                        aliases = [aliases];
                    }
                    aliases.forEach(alias => {
                        const resolvedPath = path.join(alias, pathName);
                        pathsToTest.push(resolvedPath);
                    });
                }
                const segments = pathName.split('/');
                const firstSegment = segments[0];
                if (firstSegment && this.aliases.indexOf(firstSegment) > -1) {
                    let aliases = this.paths[firstSegment];
                    if (!Array.isArray(aliases)) {
                        aliases = [aliases];
                    }
                    aliases.forEach(alias => {
                        segments[0] = alias;
                        const resolvedPath = segments.join('/');
                        pathsToTest.push(resolvedPath);
                    });
                }
                for (let index = 0; index < pathsToTest.length; index++) {
                    const testPath = pathsToTest[index];
                    let testImagePath = path.join(rootPath.href, testPath);
                    if (imagecache_1.ImageCache.has(testImagePath) || fs.existsSync(testImagePath)) {
                        absoluteImagePath = testImagePath;
                    }
                    else {
                        let testImagePath = path.join(rootPath.href, this.additionalSourceFolder, testPath);
                        if (imagecache_1.ImageCache.has(testImagePath) || fs.existsSync(testImagePath)) {
                            absoluteImagePath = testImagePath;
                        }
                    }
                }
            }
        }
        return absoluteImagePath;
    }
    refreshConfig(workspaceFolder, sourcefolder, paths) {
        this.workspaceFolder = workspaceFolder;
        this.additionalSourceFolder = sourcefolder;
        this.paths = paths;
        this.aliases = Object.keys(paths);
    }
}
exports.relativeToWorkspaceRootFileUrlMapper = new RelativeToWorkspaceRootFileUrlMapper();
//# sourceMappingURL=relativetoworkspacerootmapper.js.map