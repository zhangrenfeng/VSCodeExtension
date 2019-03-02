"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ImageInfo {
    static findImage(images, name, scale) {
        if (name.endsWith('.png'))
            name = name.substr(0, name.length - 4);
        let match = name.match(/@(\d)x(\.\w+)?$/);
        if (match) {
            name = name.replace(/@(\d)x/, '');
            scale = parseInt(match[1]);
        }
        let image = images.find(i => i.name === name);
        if (image) {
            let file = image.getFile(scale);
            if (file) {
                if (match && file.scale !== scale)
                    return null;
                return file;
            }
        }
        return null;
    }
    constructor(name, files) {
        this.name = name;
        this.files = files;
    }
    getFile(scale) {
        scale = Math.round(scale);
        if (scale in this.files) {
            return {
                scale: scale,
                file: this.files[scale]
            };
        }
        let scales = Object.keys(this.files);
        if (scales.length > 0) {
            let scale = parseInt(scales[scales.length - 1]);
            return {
                scale: scale,
                file: this.files[scale]
            };
        }
        return null;
    }
}
exports.ImageInfo = ImageInfo;
//# sourceMappingURL=image.js.map