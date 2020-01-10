"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mime_types_1 = __importDefault(require("mime-types"));
const http_1 = __importDefault(require("http"));
const reader_1 = __importDefault(require("./reader"));
const consts_1 = require("./consts");
const renderer_1 = __importDefault(require("./renderer"));
const resolver_1 = __importDefault(require("./resolver"));
const transformer_1 = __importDefault(require("./transformer"));
const helpers_1 = require("./helpers");
let pkg = require('../package.json');
/**
 * Node.js 进程时传入的命令行参数
 */
let argvList = process.argv;
// 打印当前版本
if (['--version', '-v'].includes(argvList[2]) && pkg.version) {
    console.log(pkg.version);
    // 退出node进程
    process.exit();
}
// 获取命令行输入参数
let args = helpers_1.getCommandArgs(argvList);
let cwd = process.cwd();
main();
function main() {
    /**
     * Server 监听的端口
     */
    let port = args['--port'] || args['-p'] || 9900;
    let options = {
        publicPath: '/',
        vd: '',
    };
    let virtualDirectory = args['--vd'] || args['-vd'];
    if (virtualDirectory) {
        options.vd = virtualDirectory;
    }
    let publicPath = args['--public-path'] || args['-publicPath'];
    if (publicPath) {
        options.publicPath = publicPath;
    }
    let handleRequest = staticServer(options);
    http_1.default.createServer(handleRequest).listen({ port }, () => {
        let serverAddress = `http://localhost:${port}`;
        console.log(`File system RootPath: ${cwd}`);
        console.log('Server is running at ' + serverAddress);
        let argsKeys = Object.keys(args);
        if (argsKeys.includes('-s') || argsKeys.includes(('--s'))) {
            // don't open browser
            return;
        }
        /**
         * 打开默认浏览器
         */
        helpers_1.openBrowser(serverAddress);
    });
}
function staticServer(options) {
    let { vd, publicPath } = options;
    let finalRenderer = options.renderer || renderer_1.default;
    return (req, res) => __awaiter(this, void 0, void 0, function* () {
        // 1 url-resolver req.url -> { pathname }
        let { pathname, isVdActived, isPublicPathDisabled } = resolver_1.default.resolve(req.url || '', vd);
        let rootPath = path_1.default.join(cwd, publicPath);
        if (isPublicPathDisabled) {
            rootPath = cwd;
        }
        // 2 fs-reader pathname -> result
        let result = yield reader_1.default.read(pathname, { rootPath });
        // 3 transformer result -> renderableData
        let data = transformer_1.default.transform(result, {
            pathname,
            isVdActived,
            vd,
            rootPath,
        });
        // 4.1 send static file
        if (data.type === consts_1.FileType.FILE) {
            let ext = path_1.default.extname(data.filename) || '.txt';
            let contentType = mime_types_1.default.contentType(ext);
            if (typeof contentType === 'string') {
                res.setHeader('Content-Type', contentType);
            }
            fs_1.default.createReadStream(data.filename).pipe(res);
            return;
        }
        let isError = consts_1.FileType.ERROR === data.type;
        // 4.2 show directory / not-found / error
        if (data.type === consts_1.FileType.DIRECTORY || data.type === consts_1.FileType.NOT_FOUND || isError) {
            let html = finalRenderer.render(data);
            if (isError) {
                res.statusCode = 500;
            }
            let contentType = mime_types_1.default.contentType('.html');
            if (typeof contentType === 'string') {
                res.setHeader('Content-Type', contentType);
            }
            res.end(html);
        }
    });
}
