"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const image_1 = require("./browser/image");
function findXcodeProjectPath(dir) {
    while (dir.length > 1) {
        let files = fs.readdirSync(dir);
        files = files.filter(f => f.endsWith('.xcodeproj'));
        if (files.length > 0) {
            return dir + '/' + files[0];
        }
        dir = path.dirname(dir);
    }
    return null;
}
function readXcodeProjSection(section, content) {
    let re = new RegExp(`/\\* Begin ${section} section \\*/(.|\\n)*?/\\* End ${section} section \\*/`, "m");
    let match = re.exec(content);
    if (match) {
        return match[0];
    }
    return null;
}
function getGroups(content) {
    const re = /(\w+)(?: \/\* (.+) \*\/)? = \{\n((?:.|\n)*?)};/mg;
    let match;
    re.lastIndex = 0;
    let groups = [];
    while (match = re.exec(content)) {
        let id = match[1];
        let name = match[2];
        let str = match[3];
        let property = p => {
            let match = str.match(new RegExp(`${p} = ((?:.|\\n)*?);`));
            if (match) {
                return match[1];
            }
            return null;
        };
        let path = property('path');
        let childrenStr = property('children');
        if (path && path.startsWith('"')) {
            path = path.substr(1, path.length - 2);
        }
        else if (!path) {
            path = name;
        }
        let children = [];
        if (childrenStr) {
            let re = /^\s*([0-9a-fA-F]{24})/mg;
            let match;
            while (match = re.exec(childrenStr)) {
                children.push(match[1]);
            }
        }
        let group = {
            id: id,
            path: path,
            children: children
        };
        groups.push(group);
    }
    return groups;
}
function getImageFiles(dir) {
    let xcodeproj = findXcodeProjectPath(dir);
    if (!xcodeproj) {
        return [];
    }
    dir = path.dirname(xcodeproj);
    let pbxprojPath = xcodeproj + '/project.pbxproj';
    let pbxproj = fs.readFileSync(pbxprojPath).toString();
    // let resourcesSection = readXcodeProjSection('PBXResourcesBuildPhase', pbxproj);
    let groupSection = readXcodeProjSection('PBXGroup', pbxproj);
    let groups = getGroups(groupSection);
    let pathForId = id => {
        let group;
        let path = "";
        while (true) {
            group = groups.find(g => g.children.indexOf(id) >= 0);
            if (group && group.path) {
                path = group.path + '/' + path;
                id = group.id;
            }
            else {
                break;
            }
        }
        return path;
    };
    let re = /\w+ \/\* (.*?) in Resources \*\/.* fileRef = (\w+)/mg;
    let match;
    var resources = [];
    const resourcesExts = ['.xcassets', '.bundle'];
    while (match = re.exec(pbxproj)) {
        let file = match[1];
        let id = match[2];
        if (resourcesExts.indexOf(path.extname(file)) >= 0) {
            resources.push({ file: file, id: id });
        }
    }
    resources = resources.map(r => dir + '/' + pathForId(r.id) + r.file);
    let images = [];
    let readAssetsDir = dir => {
        let files = fs.readdirSync(dir);
        files.forEach(f => {
            let file = dir + '/' + f;
            if (f.endsWith('.imageset')) {
                let contentsJson = fs.readFileSync(file + '/Contents.json').toString();
                let contents = JSON.parse(contentsJson);
                let imageList = contents.images || [];
                let info = new image_1.ImageInfo(f.replace(/\.[^/.]+$/, ''), imageList.reduce((p, c) => { p[parseInt(c.scale)] = file + '/' + c.filename; return p; }, {}));
                images.push(info);
            }
            else if (fs.statSync(file).isDirectory()) {
                readAssetsDir(file);
            }
        });
    };
    let readBundle = dir => {
        let files = fs.readdirSync(dir);
        files.forEach(f => {
            let file = dir + '/' + f;
            let ext = path.extname(f);
            const extensions = ['.png', '.jpg', '.jpeg', '.gif'];
            if (extensions.indexOf(ext) >= 0) {
                const re = /^(.*?)(?:@(.*))?\.\w+$/;
                let match = f.match(re);
                if (match) {
                    let name = path.basename(dir) + '/' + match[1];
                    if (ext !== '.png')
                        name += ext;
                    let info = images.find(info => info.name === name);
                    let scale = parseInt(match[2] || "1x");
                    if (!info) {
                        info = new image_1.ImageInfo(name, {});
                        images.push(info);
                    }
                    info.files[scale] = file;
                }
            }
        });
    };
    resources.map(r => {
        if (r.endsWith('.xcassets')) {
            readAssetsDir(r);
        }
        else if (r.endsWith('.bundle')) {
            readBundle(r);
        }
    });
    return images;
}
class ImageHelper {
    static getImageFiles(document) {
        let dir = document.fileName ? path.dirname(document.fileName) : vscode.workspace.rootPath;
        if (!dir) {
            return [];
        }
        return getImageFiles(dir);
    }
    static imageUriWithName(document, name, scale) {
        let dir = document.fileName ? path.dirname(document.fileName) : vscode.workspace.rootPath;
        if (!dir) {
            return null;
        }
        let images = getImageFiles(dir);
        return image_1.ImageInfo.findImage(images, name, scale);
    }
    static provideCompletionItems(document, token) {
        let dir = document.dir();
        if (!dir) {
            return [];
        }
        let images = getImageFiles(dir);
        return images.map(info => {
            let item = new vscode.CompletionItem(info.name, vscode.CompletionItemKind.File);
            item.detail = info.name;
            item.documentation = Object.keys(info.files).map(k => info.files[k]).join('\n');
            return item;
        });
    }
}
exports.ImageHelper = ImageHelper;
//# sourceMappingURL=imageHelper.js.map