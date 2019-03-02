(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./previewDevice", "./render", "./template", "./image"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const previewDevice_1 = require("./previewDevice");
    const render_1 = require("./render");
    const template_1 = require("./template");
    const image_1 = require("./image");
    const devices = [
        new previewDevice_1.default('iPhone 4', 'iOS', '10.0.0', 320, 480, 2),
        new previewDevice_1.default('iPhone 5', 'iOS', '10.0.0', 320, 568, 2),
        new previewDevice_1.default('iPhone 6', 'iOS', '10.0.0', 375, 667, 2),
        new previewDevice_1.default('iPhone 6 Plus', 'iOS', '10.0.0', 414, 736, 3),
        new previewDevice_1.default('iPad', 'iOS', '10.0.0', 768, 1024, 1),
        new previewDevice_1.default('iPad Air', 'iOS', '10.0.0', 768, 1024, 2),
        new previewDevice_1.default('iPad Pro 12.9-inch', 'iOS', '10.0.0', 1024, 1366, 2),
    ];
    const scales = [
        { desc: '200%', scale: 2 },
        { desc: '150%', scale: 1.5 },
        { desc: '100%', scale: 1 },
        { desc: '75%', scale: 0.75 },
        { desc: '50%', scale: 0.5 },
        { desc: '33%', scale: 0.33333333333333 },
    ];
    class Dropdown {
        constructor(title, items, emptyText = '<Empty>') {
            this.title = title;
            this.items = items;
            this.emptyText = emptyText;
            this.selectedIndex = 0;
            this.element = this.elementFromHtml(`<div title="${title}" class="dropdown navi-item" id="device-dropdown">
                <button type="button" class="btn dropdown-toggle" data-toggle="dropdown">
                    <span class="dropdown-name"></span>
                    <span class="caret"></span>
                </button>
                <ul class="dropdown-menu" role="menu"></ul>
            </div>`);
            this.buttonElement = this.element.getElementsByTagName('button').item(0);
            this.nameElement = this.element.getElementsByClassName('dropdown-name').item(0);
            this.listElement = this.element.getElementsByTagName('ul').item(0);
            this.updateItems(items);
        }
        get index() {
            return this.selectedIndex;
        }
        select(index) {
            if (index === this.selectedIndex || index >= this.items.length)
                return;
            this.selectedIndex = index;
            this.listElement.getElementsByClassName('selected').item(0).classList.remove('selected');
            this.listElement.children.item(index).classList.add('selected');
            let item = this.items[index];
            this.nameElement.textContent = item.name;
            if (item.callback)
                item.callback();
        }
        updateItems(items) {
            this.items = items;
            while (this.listElement.childElementCount > 0) {
                this.listElement.children.item(0).remove();
            }
            if (this.selectedIndex > items.length) {
                this.selectedIndex = 0;
            }
            if (!items || items.length === 0) {
                this.nameElement.textContent = this.emptyText;
                this.buttonElement.classList.add('disabled');
                return;
            }
            this.buttonElement.classList.remove('disabled');
            items.forEach((item, i) => {
                let el = this.elementFromHtml(`<li role="presentation" class="${i === this.selectedIndex ? 'selected' : ''}">
                    <a role="menuitem" tabindex="-1" style="cursor: pointer">${item.desc || item.name}</a>
                </li>`);
                el.onclick = () => {
                    this.select(i);
                };
                if (i === this.selectedIndex) {
                    this.nameElement.textContent = item.name;
                }
                this.listElement.appendChild(el);
            });
        }
        elementFromHtml(html) {
            let div = document.createElement('div');
            div.innerHTML = html;
            return div.firstChild;
        }
    }
    class CancellationToken {
        constructor(onCancel = null) {
            this.onCancel = onCancel;
        }
        isCancelled() { return this.cancelled; }
        cancel() {
            if (!this.cancelled) {
                this.cancelled = true;
                if (this.onCancel) {
                    this.onCancel();
                }
            }
        }
    }
    class Client {
        constructor(type, port = 0) {
            this.type = type;
            this.port = port;
            this.renderingTokens = [];
            this.hoverOverlay = document.getElementById('mist-hover');
            this.framesOverlay = document.createElement('canvas');
            this.framesOverlay.classList.add('overlay');
            this.nodeStyleWhileShowingFrames = document.createElement('style');
            this.nodeStyleWhileShowingFrames.appendChild(document.createTextNode('.mist-node { pointer-events: none; }'));
            this.prepareButtons();
            this.prepareNaviBar();
            this.prepareSocket();
            this.device = devices[0];
            this.render();
        }
        prepareButtons() {
            let inspectButton = document.getElementById('inspect-element');
            let framesButton = document.getElementById('show-frames');
            let inspectButtonClicked = () => {
                inspectButton.classList.toggle('toggle');
                this.inspecting = inspectButton.classList.contains('toggle');
                if (this.inspecting && this.showFrames) {
                    framesButton.click();
                }
                if (!this.inspecting) {
                    this.hoverOverlay.style.opacity = '0';
                }
            };
            if (this.type !== 'vscode') {
                inspectButton.title += '（⌘⇧C）';
                shortcut.add("Meta+Shift+C", inspectButtonClicked);
            }
            inspectButton.onclick = inspectButtonClicked;
            framesButton.onclick = () => {
                framesButton.classList.toggle('toggle');
                this.showFrames = framesButton.classList.contains('toggle');
                this.drawFrames();
                if (this.inspecting && this.showFrames) {
                    inspectButton.click();
                }
            };
        }
        clearFrames() {
            let context = this.framesOverlay.getContext('2d');
            context.clearRect(0, 0, this.framesOverlay.width, this.framesOverlay.height);
        }
        drawFrames() {
            if (this.showFrames) {
                if (!this.nodeStyleWhileShowingFrames.parentNode)
                    document.getElementsByTagName('head')[0].appendChild(this.nodeStyleWhileShowingFrames);
            }
            else {
                if (this.nodeStyleWhileShowingFrames.parentNode)
                    this.nodeStyleWhileShowingFrames.remove();
            }
            let scale = window.devicePixelRatio;
            this.framesOverlay.width = this.framesOverlay.clientWidth * scale;
            this.framesOverlay.height = this.framesOverlay.clientHeight * scale;
            let context = this.framesOverlay.getContext('2d');
            context.clearRect(0, 0, this.framesOverlay.width, this.framesOverlay.height);
            if (!this.showFrames)
                return;
            context.scale(scale, scale);
            context.strokeStyle = 'rgba(112, 168, 218, 0.88)';
            context.fillStyle = 'rgba(112, 168, 218, 0.16)';
            let nodes = document.getElementsByClassName('mist-node');
            let mainNode = nodes.item(0);
            let mainRect = mainNode.getBoundingClientRect();
            let s = scales[this.scalesDropdown.index].scale;
            let drawNode = (node) => {
                let rect = node.getBoundingClientRect();
                let l = (rect.left - mainRect.left + mainNode.offsetLeft) / s, t = (rect.top - mainRect.top + mainNode.offsetTop) / s, w = rect.width / s, h = rect.height / s;
                context.fillRect(l, t, w, h);
                context.strokeRect(l, t, w, h);
            };
            for (var i = 0; i < nodes.length; i++) {
                drawNode(nodes.item(i));
            }
        }
        getData() {
            if (this.datas && this.datas.length > 0) {
                let data = this.datas.find(d => d.name === this.dataName);
                if (!data) {
                    data = this.datas[0];
                    this.dataName = data.name;
                }
                return data.data;
            }
            return {};
        }
        updateDatasDropdown() {
            this.datasDropdown.updateItems((this.datas || []).map(d => {
                return {
                    name: d.name,
                    callback: () => {
                        this.dataName = d.name;
                        this.render();
                        this.send('selectData', { name: d.name, path: this.path });
                    }
                };
            }));
        }
        setErrorDesc(desc) {
            const footer = document.getElementById('footer');
            footer.classList.remove('hidden');
            footer.textContent = desc;
        }
        prepareNaviBar() {
            let naviBar = document.getElementById('navi-bar');
            this.datasDropdown = new Dropdown('选择数据', [], '无数据');
            naviBar.appendChild(this.datasDropdown.element);
            this.devicesDropdown = new Dropdown('选择设备', devices.map(d => {
                return {
                    name: d.model,
                    desc: `${d.model} (${d.width} x ${d.height})`,
                    callback: () => {
                        this.device = d;
                        this.render();
                    }
                };
            }));
            naviBar.appendChild(this.devicesDropdown.element);
            this.scalesDropdown = new Dropdown('缩放', scales.map(s => {
                return {
                    name: s.desc,
                    callback: () => document.getElementsByClassName('screen')[0].style.transform = `scale(${s.scale})`
                };
            }));
            this.scalesDropdown.select(2);
            naviBar.appendChild(this.scalesDropdown.element);
        }
        prepareSocket() {
            if (this.type !== 'browser') {
                let uri = location.href;
                let host;
                // 1: schema, 2: host, 3: port, 4: request, 5: query, 6: anchor
                const uri_re = /^(\w+):\/\/([^:/?#]+)(?::(\d+))?(\/[^?#]*)?(?:\?([^?#]*))?(?:#(.*)?)?$/;
                let match = uri.match(uri_re);
                if (match) {
                    host = match[2];
                }
                else {
                    host = 'localhost';
                }
                this.socket = new WebSocket(`ws://${host}:${this.port}`);
                this.socket.addEventListener("open", () => {
                    this.send('open');
                });
                let error = false;
                this.socket.addEventListener("error", event => {
                    error = true;
                    this.socket = null;
                    this.setErrorDesc('与宿主连接失败');
                });
                this.socket.addEventListener("close", event => {
                    this.socket = null;
                    if (!error)
                        this.setErrorDesc('与宿主连接已断开');
                });
                this.socket.addEventListener("message", event => {
                    let data = JSON.parse(event.data);
                    this.onMessage(data);
                });
                this.send = (type, params = {}) => {
                    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                        this.socket.send(JSON.stringify(Object.assign({ type }, params)));
                    }
                };
            }
            else {
                window.addEventListener('mist-client', (ev) => {
                    this.onMessage(ev.detail);
                });
                this.send = (type, params = {}) => {
                    let event = new CustomEvent('mist-server', { detail: Object.assign({ type }, params) });
                    window.dispatchEvent(event);
                };
            }
        }
        selectData(name) {
            let index = this.datas.findIndex(d => d.name === name);
            if (index >= 0) {
                this.datasDropdown.select(index);
            }
        }
        onMessage(data) {
            switch (data.type) {
                case 'select':
                    this.selectNode(data.index);
                    break;
                case 'data':
                    this.path = data.path;
                    this.template = data.template;
                    this.images = data.images.map(i => new image_1.ImageInfo(i.name, i.files));
                    this.datas = data.datas;
                    this.updateDatasDropdown();
                    if (data.selectedData) {
                        this.selectData(data.selectedData);
                    }
                    this.render();
                    break;
                case 'selectData':
                    this.selectData(data.name);
                    break;
            }
        }
        selectNode(indexes) {
            var allNodes = document.getElementsByClassName('mist-node');
            var selectedNodes = [];
            for (var i = 0; i < allNodes.length; i++) {
                let node = allNodes.item(i);
                if (node.dataset.nodeIndex === indexes) {
                    selectedNodes.push(node);
                }
            }
            var selects = document.getElementById('mist-selects');
            if (selectedNodes.length > 0) {
                let nodes = [];
                while (selectedNodes.length > selects.childElementCount) {
                    var select = document.createElement('div');
                    select.classList.add('mist-select');
                    selects.appendChild(select);
                }
                for (var i = selectedNodes.length; i < selects.childElementCount; i++) {
                    var select = selects.children.item(i);
                    select.style.opacity = "0";
                }
                if (!this.timer) {
                    for (var i = 0; i < selectedNodes.length; i++) {
                        var select = selects.children.item(i);
                        select.classList.remove('select-anim');
                        select.style.opacity = "0";
                        select.style.transform = "scale(1.2)";
                    }
                }
                else {
                    for (var i = 0; i < selectedNodes.length; i++) {
                        var select = selects.children.item(i);
                        select.style.opacity = "1";
                    }
                }
                for (var i = 0; i < selectedNodes.length; i++) {
                    var select = selects.children.item(i);
                    var node = selectedNodes[i];
                    var nodeRect = node.getBoundingClientRect();
                    select.style.width = nodeRect.width + 'px';
                    select.style.height = nodeRect.height + 'px';
                    select.style.left = nodeRect.left + 'px';
                    select.style.top = nodeRect.top + 'px';
                }
                if (!this.timer) {
                    setTimeout(() => {
                        for (var i = 0; i < selectedNodes.length; i++) {
                            var select = selects.children.item(i);
                            select.style.opacity = "1";
                            select.classList.add('select-anim');
                            select.style.transform = "scale(1)";
                        }
                    }, 0);
                }
                if (this.timer) {
                    clearTimeout(this.timer);
                    this.timer = null;
                }
                this.timer = setTimeout(() => {
                    for (var i = 0; i < selectedNodes.length; i++) {
                        var select = selects.children.item(i);
                        select.style.opacity = "0";
                    }
                    this.timer = null;
                }, 500);
            }
            else {
                if (this.timer) {
                    clearTimeout(this.timer);
                    this.timer = null;
                }
                for (var i = 0; i < selects.childElementCount; i++) {
                    let child = selects.children.item(i);
                    child.style.opacity = "0";
                }
            }
        }
        getBuiltinVars() {
            let isX = this.device.width === 812;
            return {
                _width_: this.device.width,
                _height_: this.device.height,
                _mistitem_: {},
                system: {
                    name: this.device.system,
                    version: this.device.version,
                    deviceName: this.device.model
                },
                screen: {
                    width: this.device.width,
                    height: this.device.height,
                    scale: this.device.scale,
                    statusBarHeight: isX ? 44 : 20,
                    isPlus: this.device.width > 400,
                    isSmall: this.device.width < 350,
                    isX: isX,
                    safeArea: isX ? { top: 44, left: 0, bottom: 34, right: 0 } : {},
                },
                app: {},
                UIScreen: { mainScreen: { scale: this.device.scale } }
            };
        }
        resolveImageFiles(layout) {
            var files = [];
            let imageName = (value) => {
                let image = image_1.ImageInfo.findImage(this.images, value, this.device.scale);
                let ret = '';
                if (image) {
                    if (this.type === 'browser-socket')
                        ret += 'getImage/';
                    ret += image.file;
                    if (image.scale !== this.device.scale) {
                        ret += '?' + image.scale;
                    }
                }
                return ret;
            };
            let _resolveImageFiles = (layout, files) => {
                function convert(propertyName) {
                    var value = layout.style[propertyName];
                    if (value) {
                        if (typeof (value) === 'string') {
                            layout.style[propertyName] = imageName(value);
                            files.push(layout.style[propertyName]);
                        }
                        else if (typeof (value) === 'object' && value.constructor === Object) {
                            for (var key in value) {
                                value[key] = imageName(value[key]);
                                files.push(value[key]);
                            }
                        }
                    }
                }
                if (layout.style) {
                    convert('image');
                    convert('error-image');
                    convert('background-image');
                    if ("html-text" in layout.style) {
                        layout.style["html-text"] = layout.style["html-text"].replace(/src\s*=\s*['"](.*?)['"]/, (s, src) => {
                            let image = image_1.ImageInfo.findImage(this.images, src, this.device.scale);
                            if (image)
                                files.push(image.file);
                            return image ? `srcset="getImage/${image.file} ${image.scale}x"` : '';
                        });
                    }
                }
                if (layout.children instanceof Array) {
                    for (let child of layout.children) {
                        _resolveImageFiles(child, files);
                    }
                }
            };
            _resolveImageFiles(layout, files);
            return files;
        }
        nodeClicked(node) {
            this.inspecting = false;
            let inspectButton = document.getElementById('inspect-element');
            inspectButton.classList.remove('toggle');
            this.hoverOverlay.style.opacity = '0';
            this.send('select', {
                path: this.path,
                index: node.dataset.nodeIndex
            });
        }
        nodeHovering(node) {
            let hover = this.hoverOverlay;
            if (node) {
                var nodeRect = node.getBoundingClientRect();
                hover.style.opacity = "1";
                hover.style.width = nodeRect.width + 'px';
                hover.style.height = nodeRect.height + 'px';
                hover.style.left = nodeRect.left + 'px';
                hover.style.top = nodeRect.top + 'px';
            }
            else {
                hover.style.opacity = "0";
            }
        }
        render() {
            for (let token of this.renderingTokens) {
                token.cancel();
            }
            this.renderingTokens.splice(0, this.renderingTokens.length);
            let token = new CancellationToken();
            this.renderingTokens.push(token);
            let div = document.getElementsByClassName('mist-main')[0];
            this.bindedTemplate = template_1.bindData(this.template, this.getData(), this.getBuiltinVars());
            let imageFiles = this.resolveImageFiles(this.bindedTemplate.layout);
            return render_1.render(this.bindedTemplate.layout, this.device.width, this.device.scale, imageFiles, token).then(r => {
                if (token.isCancelled())
                    return;
                r.onmouseleave = event => {
                    this.nodeHovering(null);
                };
                function getMistNode(event) {
                    var node = event.target;
                    while (!node.classList.contains('mist-node')) {
                        node = node.parentElement;
                    }
                    return node;
                }
                r.onmousemove = event => {
                    if (!this.inspecting)
                        return;
                    var node = getMistNode(event);
                    this.nodeHovering(node);
                };
                r.onmousedown = event => {
                    if (!this.inspecting)
                        return;
                    var node = getMistNode(event);
                    this.nodeClicked(node);
                };
                r.oncontextmenu = event => {
                    var node = getMistNode(event);
                    var overlay = document.createElement('div');
                    overlay.style.position = "absolute";
                    overlay.style.top = '0';
                    overlay.style.left = '0';
                    overlay.style.bottom = '0';
                    overlay.style.right = '0';
                    overlay.style.zIndex = '10000';
                    overlay.onmousedown = event => {
                        if (menu.contains(event.target))
                            return;
                        overlay.remove();
                    };
                    var menu = document.createElement('div');
                    menu.classList.add('dropdown-menu');
                    menu.style.left = "unset";
                    menu.style.display = "block";
                    overlay.appendChild(menu);
                    var inspectItem = document.createElement('div');
                    inspectItem.classList.add('context-item');
                    inspectItem.textContent = '检查元素';
                    inspectItem.style.padding = "3px 20px";
                    inspectItem.style.cursor = "pointer";
                    inspectItem.onclick = event => {
                        overlay.remove();
                        this.nodeClicked(node);
                    };
                    menu.appendChild(inspectItem);
                    menu.style.position = "absolute";
                    document.body.appendChild(overlay);
                    if (event.x + menu.clientWidth > document.body.clientWidth) {
                        menu.style.right = document.body.clientWidth - event.x + 'px';
                        menu.style.left = event.x - menu.clientWidth + 'px';
                    }
                    else {
                        menu.style.left = event.x + 'px';
                    }
                    if (event.y + menu.clientHeight > document.body.clientHeight) {
                        menu.style.bottom = document.body.clientHeight - event.y + 'px';
                        menu.style.top = event.y - menu.clientHeight + 'px';
                    }
                    else {
                        menu.style.top = event.y + 'px';
                    }
                    return false;
                };
                if (div.childElementCount === 0) {
                    div.appendChild(r);
                    div.appendChild(this.framesOverlay);
                }
                else {
                    div.replaceChild(r, div.children.item(0));
                }
                this.framesOverlay.style.minWidth = this.framesOverlay.style.width = div.clientWidth + 'px';
                this.framesOverlay.style.minHeight = this.framesOverlay.style.height = r.clientHeight + r.offsetTop + 'px';
                if (token.isCancelled())
                    return;
                render_1.postRender(r);
                if (token.isCancelled())
                    return;
                this.drawFrames();
                if (token.isCancelled())
                    return;
                this.updateScreen();
            });
        }
        updateScreen() {
            let screen = document.getElementsByClassName('screen').item(0);
            screen.classList.remove('hidden');
            screen.style.minWidth = this.device.width + 'px';
            screen.style.height = this.device.height + 'px';
        }
    }
    var client;
    function main() {
        let type = document.body.dataset.type || 'browser';
        let port = parseInt(document.body.dataset.port);
        client = new Client(type, port);
    }
    exports.default = main;
    document.addEventListener('DOMContentLoaded', main);
});
//# sourceMappingURL=previewClient.js.map