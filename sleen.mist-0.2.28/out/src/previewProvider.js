'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const json = require("jsonc-parser");
const fs = require("fs");
const http = require("http");
const ws = require("ws");
const mistDocument_1 = require("./mistDocument");
const imageHelper_1 = require("./imageHelper");
const statusBarManager_1 = require("./statusBarManager");
function isMistFile(document) {
    return document.languageId === 'mist'
        && document.uri.scheme !== 'mist-preview'; // prevent processing of own documents
}
exports.isMistFile = isMistFile;
function getMistUri(uri) {
    return uri.with({ scheme: 'mist', path: uri.path + '.rendered', query: uri.toString() });
}
exports.getMistUri = getMistUri;
class MistContentProvider {
    constructor(context) {
        this.context = context;
        this._config = new Map();
        this._clients = [];
        this._updateTimer = null;
        let httpServer = http.createServer((request, response) => {
            let uri = vscode.Uri.parse(request.url);
            if (uri.path === '/') {
                var content = this.pageHtml(vscode.Uri.parse('shared'));
                content = content.replace(/<base [^>]*>/m, '')
                    .replace(/<a id="open-in-browser".*<\/a>/, '')
                    .replace('data-type="vscode"', 'data-type="browser-socket"');
                response.end(content);
            }
            else {
                let file = uri.path;
                if (file.startsWith('/getImage/')) {
                    file = file.substr(10);
                }
                else if (file === '/favicon.ico') {
                    file = this.getResourcePath('media/mist.png');
                }
                else {
                    file = this.getResourcePath(file);
                }
                fs.readFile(file, (err, data) => {
                    if (!err) {
                        response.end(data);
                    }
                    else {
                        response.statusCode = 404;
                        response.end();
                    }
                });
            }
        });
        this._listening = new Promise((resolve, reject) => httpServer.listen(0, null, null, err => err ? reject(err) : resolve(httpServer.address().port)));
        this._server = new ws.Server({ server: httpServer });
        this._server.on('connection', client => {
            client.on('message', message => {
                let data = JSON.parse(message);
                switch (data.type) {
                    case 'open':
                        this._clients.push({
                            client,
                            config: {
                                device: data.device,
                            }
                        });
                        this.render();
                        break;
                    case 'select':
                        {
                            this.revealNode(vscode.Uri.parse(data.path), data.index);
                            break;
                        }
                    case 'selectData':
                        {
                            let mistDoc = mistDocument_1.MistDocument.getDocumentByUri(vscode.Uri.parse(data.path));
                            if (mistDoc) {
                                mistDoc.setData(data.name);
                                statusBarManager_1.StatusBarManager.updateDataItemForDocument(mistDoc);
                            }
                            break;
                        }
                }
            });
            client.on('close', () => {
                let index = this._clients.findIndex(c => c.client === client);
                if (index >= 0)
                    this._clients.splice(index, 1);
            });
        });
    }
    static get sharedInstance() {
        if (!this._sharedInstance) {
            this._sharedInstance = new MistContentProvider(this.context);
        }
        return this._sharedInstance;
    }
    provideTextDocumentContent(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            this._port = yield this._listening;
            const sourceUri = vscode.Uri.parse(decodeURI(uri.query));
            if (uri) {
                let mistDoc = mistDocument_1.MistDocument.getDocumentByUri(sourceUri);
                let nodeHtml = this.pageHtml(vscode.Uri.parse('shared'));
                return nodeHtml;
            }
            return null;
        });
    }
    send(type, params) {
        if (this._clients.length > 0) {
            this._clients.forEach(c => {
                c.client.send(JSON.stringify(Object.assign({ type }, params)));
            });
        }
    }
    render() {
        let mistDoc = this.getDocument();
        if (!mistDoc)
            return;
        let template = mistDoc.getTemplate();
        let images = imageHelper_1.ImageHelper.getImageFiles(mistDoc.document);
        let data = mistDoc.getData();
        let dataName = data ? data.description() : null;
        this.send('data', {
            path: mistDoc.document.uri.toString(),
            template,
            images,
            datas: mistDoc.getDatas().map(d => {
                return {
                    name: d.description(),
                    data: d.data
                };
            }),
            selectedData: dataName
        });
    }
    update(uri) {
        if (this._updateTimer) {
            clearTimeout(this._updateTimer);
            this._updateTimer = null;
        }
        this._updateTimer = setTimeout((thiz) => {
            thiz._updateTimer = null;
            thiz.render(decodeURI(uri));
        }, 100, this);
    }
    selectionDidChange(textEditor) {
        if (this._updateTimer)
            return;
        let doc = textEditor.document;
        if (this._clients.length === 0)
            return;
        let sel = textEditor.selection.end;
        let path = [...json.getLocation(doc.getText(), doc.offsetAt(sel)).path];
        let indexes = [];
        if (path.length === 0 || path[0] !== 'layout') {
            indexes = null;
        }
        else {
            path.splice(0, 1);
            while (path.length >= 2 && path[0] === 'children') {
                indexes.push(path[1]);
                path.splice(0, 2);
            }
        }
        let index = indexes ? indexes.join(',') : null;
        this.send('select', { index });
    }
    revealNode(uri, nodeIndex) {
        vscode.workspace.openTextDocument(uri).then(doc => {
            let mistDoc = mistDocument_1.MistDocument.getDocumentByUri(uri);
            if (!mistDoc)
                return;
            let rootNode = mistDoc.getRootNode();
            var node = json.findNodeAtLocation(rootNode, ['layout']);
            if (!node)
                return;
            let indexes = nodeIndex ? nodeIndex.split(',') : [];
            for (var i of indexes) {
                if (node.type === 'object') {
                    node = json.findNodeAtLocation(node, ['children', parseInt(i)]);
                }
                else {
                    break;
                }
            }
            if (!node)
                return;
            vscode.window.showTextDocument(doc).then(editor => {
                let range = new vscode.Range(doc.positionAt(node.offset), doc.positionAt(node.offset + node.length));
                editor.selection = new vscode.Selection(range.start, range.end);
                editor.revealRange(editor.selection);
            });
        });
    }
    getResourcePath(file) {
        return this.context.asAbsolutePath(file);
    }
    pageHtml(uri) {
        return `
    <head>
        <base href="${this.getResourcePath('preview.html')}">
        <title>Mist Preview</title>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="lib/bootstrap.min.css">
        <link rel="stylesheet" href="css/preview.css">
        <script type="text/javascript" src="http://at.alicdn.com/t/font_532796_cdkfbxvwvky2pgb9.js"></script>
        <style type="text/css">
            .icon {
            width: 1em; height: 1em;
            vertical-align: -0.15em;
            fill: currentColor;
            overflow: hidden;
            }
        </style>
        <script type="text/javascript" src="lib/jquery.min.js"></script>
        <script type="text/javascript" src="lib/bootstrap.min.js"></script>
        <script type="text/javascript" src="lib/require.js"></script>
        <script type="text/javascript" src="lib/shortcut.js"></script>
        <script>
            require.config({
                paths: {
                    'previewClient': 'out/browser/previewClient',
                    'previewDevice': 'out/browser/previewDevice',
                    'render': 'out/browser/render',
                    'template': 'out/browser/template',
                    'lexer': 'out/browser/lexer',
                    'parser': 'out/browser/parser',
                    'type': 'out/browser/type',
                    'functions': 'out/browser/functions',
                    'image': 'out/browser/image',
                    '../../lib/FlexLayout': 'lib/FlexLayout',
                }
            });
            require(['previewClient'], function(main) {
                main.default();
            }, function (err) {
                var footer = document.getElementById('footer');
                footer.classList.remove('hidden');
                footer.textContent = '脚本加载失败：' + JSON.stringify(err);
            });
        </script>
    </head>
    
    <body data-port="${this._port}" data-path="${uri.toString()}" data-type="vscode">
    <div style="width:100%; height:100%; display:flex; flex-direction:column">
    <div id="navi-bar">
        <a id="inspect-element" class="navi-icon" title="检查元素"><svg class="icon" aria-hidden="true"><use xlink:href="#icon-select"></use></svg></i></a>
        <a id="show-frames" class="navi-icon" title="显示边框"><svg class="icon" aria-hidden="true"><use xlink:href="#icon-frame"></use></svg></i></a>
        <a id="open-in-browser" class="navi-icon" title="在浏览器打开" href="http://localhost:${this._port}"><svg class="icon" aria-hidden="true"><use xlink:href="#icon-chrome"></use></svg></i></a>
        <div class="navi-line"></div>
    </div>
    
    <div style="display:flex;align-items:flex-start;overflow:auto;flex-grow:1;">
    <div class="screen hidden">
    <div class="screen-header">
    
    <div class="screen-status">
        <div style="display:flex; height:20px; color:white; align-items:center; justify-content:center; padding-left:5px">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div style="color:white; font-size:12px; margin-left:5px;">中国移动</div>
        </div>
        <div class="screen-status-time" style="display:flex; margin:auto; color:white; font-size:12px;">上午12:00</div>
        <div style="display:flex; visibility:hidden; height:20px; color:white; align-items:center; justify-content:center; padding-left:5px">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div style="color:white; font-size:12px; margin-left:5px;">中国移动</div>
        </div>
    </div>
    <div class="screen-navi">
        <div id="preview" style="display:flex; color:white; font-size:18px;">Preview</div>
    </div>
    </div>
    <div class="mist-main"></div>
    </div>
    </div>
    <div id="footer" class="hidden"></div>
    <div id="mist-selects" class="overlay"></div>
    <div class="overlay"><div id="mist-hover" class="anim"></div></div>

    </body>
        `;
    }
    getDocument() {
        let editor = vscode.window.visibleTextEditors.find(e => e.document.languageId === 'mist');
        if (editor) {
            return mistDocument_1.MistDocument.getDocumentByUri(editor.document.uri);
        }
        return null;
    }
}
exports.MistContentProvider = MistContentProvider;
//# sourceMappingURL=previewProvider.js.map