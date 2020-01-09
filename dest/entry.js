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
const os_1 = __importDefault(require("os"));
const url_1 = __importDefault(require("url"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const querystring_1 = __importDefault(require("querystring"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const mime_types_1 = __importDefault(require("mime-types"));
const style_1 = __importDefault(require("./style"));
let pkg = require('../package.json');
let argvList = process.argv;
// 打印当前版本
if (['--version', '-v'].includes(argvList[2]) && pkg.version) {
    console.log(pkg.version);
    // 退出node进程
    process.exit();
}
// 获取命令行输入参数
let args = getCommandArgs();
// 读取 pathname 对应的文件类型
let FileType = {
    FILE: 'file',
    NOT_FOUND: '404',
    DIRECTORY: 'directory',
    // 读取文件发生错误
    ERROR: 'error',
};
let cwd = process.cwd();
let lstat = util_1.promisify(fs_1.default.lstat);
let exists = util_1.promisify(fs_1.default.exists);
let readdir = util_1.promisify(fs_1.default.readdir);
let realpath = util_1.promisify(fs_1.default.realpath);
let renderer = {
    render: (data = {}) => {
        let { type, fileMapList, pathList, content } = data;
        if (type === FileType.DIRECTORY) {
            let html = renderer.renderDirectory({ fileMapList, pathList });
            return html;
        }
        if (type === FileType.NOT_FOUND) {
            return 'Page 404';
        }
        return content;
    },
    renderDirectory: ({ pathList = [], fileMapList = [] }) => {
        if (!pathList.length && !fileMapList.length) {
            return renderer.renderToHtml();
        }
        let title = '';
        let nav = '';
        let content = '';
        if (pathList.length) {
            title = pathList[pathList.length - 1].relativePath;
            nav = `
        <h1>
          ${pathList
                .map(({ name, href }) => {
                return ` <a href="${href}">${name}</a> /`;
            })
                .join('')}
        </h1>
      `;
        }
        if (fileMapList.length) {
            content = `
        <ul id="files">
          ${fileMapList
                .map(({ name, href, clzName }) => {
                return `
                <li>
                  <a class="${clzName}" href="${href}">
                    <span class="name">${name}</span>
                  </a>
                </li>
              `;
            })
                .join('')}
        </ul>
      `;
        }
        return renderer.renderToHtml({
            title,
            nav,
            content,
        });
    },
    renderToHtml: ({ title = '', nav = '', content = '' } = {}) => {
        return `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
          />
          <link rel="icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEYAAAA5CAYAAAH8XW0GAAAAAXNSR0IArs4c6QAAA8pJREFUaAXtm0trFEEQx6snG6OJEpCAQiCeBfFi/ACJmmySJeAhH0DQk+Ri9OBFUBCMRIRcFL2IFy8+QDfZGJL4CULMwYNKQPCBgh4UEvPabf+92rvZ2anMzD5mF1MDS09Xd1fV/Lp6enp6lghHf0ovmp859zrUwJQe0ZrGvAqNTBGtOFyhlWuiZt9KpnLEleA8UWJWt5vU62hz6IcaeKmHdYbOosLXyT7V61VRASKukj/QUPlWMs0jRhDInC+n5An1WQ3O6KObG+QZS+byeTiFJbH0Jp0qFOVzfpzzNQOi3NqAOw8EiWu8VV6HitrbaHyri6Wco2sz2e7F3WIe4yBmlTQ10tCzk+qdzfulMdO97oG0tkFv0TBw/AQaZtt5AkvxsnsKd4OpspUYL0VJcV8JkyoxyQ4y3MgPYDznRnGxLV6SnQlM8UBK/8IY2MdXzZfA6thEn7qUl1TuTCVS+kKG6FYolYpWJ+NqT6g2ASrHtMJ9bNsHBQ8tmnaHmfY8NBSJMBtfq8ggKtJcggA3/Ct144zxX5zhelHICBmOACevs5hRtMJ5GrXcmehVd4BnJGrDbnstrdScnfqH3+umpSV6jDmqw10pl1c0g8mxqk6r/ll9iNbpQ86oz0mYBaaPqqJiJ4wjpjWWQakiLRUShB5NmF3jeBgbrJD9AjVlL7UKtJWQwXPMq4m46jZNQ5Mpwd62TUC6yz6o1dwZ6yli8UbdOANCx+vGGUNInLFx4k6FjJuIzQsZS8KdChk3EZsXMpaEOxUybiI2L2QsCXcqZNxEbL6eyCw7eNf50XpWy1Q5dNXBkrUDa9z1WjoCIE+w5p/PrrWNI0NaN/yeo4NROuWkST/vUV+szZwzg9O6M52hh3hKP2wLy0mh2GwL3kz2qcvl6KlV2ywYLOhm4UB3NZyAgTRWsMeSceW5a14Nm5XQ6SSm9JlqQTEOYoekIaPpdWJan66Ew1HpiMHx/VEYy6TpKSLT7IonEUV3GzW9aWylb1HY5my0rJF+0KVWvcpL2kv0UhRYpikBPAlzu1//GbhVVSouQ2u2s/5px5C/j88uzt/rVBv1NGFX5eLDKMXEc+7Td1rBF1dHoo+YMJ7Wou7f72quS8R4wEfk7BUwHmCMSMAIGIYAI5aIETAMAUYsESNgGAKMWCJGwDAEGLFEjIBhCDBiiRgBwxBgxBIxAoYhwIglYgQMQ4ARO46iBaZsx4rxUnzBedGr5mIO9exYCq4Lx9bObXzeehFp/jD/s8VfZEexS9aNLY5d+ZL/+wwRsoj3vKP41PuRvdI/VZ3jJIt8wn4AAAAASUVORK5CYII=" type="image/x-icon" />
          <title>${title}</title>
          ${style_1.default}
        </head>
        <body class="directory">
          ${nav}
          ${content}
        </body>
      </html>
    `;
    },
};
main();
function main() {
    let port = args['--port'] || args['-p'] || 9900;
    let options = {
        publicPath: '/',
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
        console.log('Server is running at ' + serverAddress);
        let argsKeys = Object.keys(args);
        if (argsKeys.includes('-s') || argsKeys.includes(('--s'))) {
            // don't open browser
            return;
        }
        openBrowser(serverAddress);
    });
}
function staticServer(options) {
    let { vd, publicPath } = options;
    let finalRenderer = options.renderer || renderer;
    return (req, res) => __awaiter(this, void 0, void 0, function* () {
        // 1 url-resolver req.url -> { pathname }
        let { pathname, isVdActived, disablePublicPath } = resolver.resolve(
        // @ts-ignore
        req.url, vd);
        let rootPath = path_1.default.join(cwd, publicPath);
        if (disablePublicPath) {
            rootPath = cwd;
        }
        // 2 fs-reader pathname -> result
        let result = yield reader.read(pathname, { rootPath });
        // 3 transformer result -> renderableData, just name data
        let data = transformer.transform(result, {
            pathname,
            isVdActived,
            vd,
            rootPath,
        });
        // 4.1 send static file
        if (data.type === FileType.FILE) {
            let ext = path_1.default.extname(data.filename) || '.txt';
            let contentType = mime_types_1.default.contentType(ext);
            res.setHeader('Content-Type', contentType);
            fs_1.default.createReadStream(data.filename).pipe(res);
            return;
        }
        let isError = FileType.ERROR === data.type;
        // 4.2 show directory / not-found / error
        if (data.type === FileType.DIRECTORY || data.type === FileType.NOT_FOUND || isError) {
            let html = finalRenderer.render(data);
            if (isError) {
                res.statusCode = 500;
            }
            res.setHeader('Content-Type', mime_types_1.default.contentType('.html') || '');
            res.end(html);
        }
    });
}
let resolver = {
    resolve: (requestUrl, vd) => {
        let { pathname, query } = url_1.default.parse(requestUrl);
        pathname = decodeURIComponent(pathname);
        let isVdActived = requestUrl.startsWith(vd);
        let { disable_vd: disableVd, disable_public_path: disablePublicPath, } = querystring_1.default.parse(query);
        if (disableVd === '1') {
            isVdActived = false;
        }
        if (isVdActived) {
            pathname = pathname.replace(vd, '');
        }
        // @ts-ignore
        disablePublicPath = disablePublicPath === '1';
        return { pathname, isVdActived, disablePublicPath };
    },
};
let reader = {
    /**
     * @return {object}
     * { type: '404|file|directory|error', data: { filename, content, files } }
     */
    read: (pathname, { rootPath }) => __awaiter(void 0, void 0, void 0, function* () {
        let filename = path_1.default.join(rootPath, pathname);
        let { isFile, isDirectory } = yield readFileInfo(filename);
        let type = isFile
            ? FileType.FILE
            : isDirectory
                ? FileType.DIRECTORY
                : FileType.NOT_FOUND;
        let data = { filename };
        try {
            if (isDirectory) {
                // @ts-ignore
                data.files = yield reader.readDirectory(filename);
            }
            return {
                type,
                data,
            };
        }
        catch (error) {
            return {
                type: FileType.ERROR,
                data: {
                    content: error.message,
                },
            };
        }
    }),
    readDirectory: (filename) => __awaiter(void 0, void 0, void 0, function* () {
        let files = yield readdir(filename);
        // @ts-ignore
        files = yield Promise.all(files.map((file) => __awaiter(void 0, void 0, void 0, function* () {
            let { isFile, isDirectory } = yield getFileInfo(path_1.default.join(filename, file));
            return {
                name: file,
                isFile,
                isDirectory,
            };
        })));
        return files;
    }),
};
function readFileInfo(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        let isExist = yield exists(filename);
        if (!isExist)
            return { isExist };
        let { isFile, isDirectory } = yield getFileInfo(filename);
        return { isFile, isDirectory };
    });
}
function getFileInfo(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        let stat = yield lstat(filename);
        let isFile = stat.isFile();
        let isDirectory = stat.isDirectory();
        let isSymbolicLink = stat.isSymbolicLink();
        if (isSymbolicLink) {
            let realFilename = yield realpath(filename);
            return getFileInfo(realFilename);
        }
        return {
            isFile,
            isDirectory,
        };
    });
}
let transformer = {
    transform: (result, { pathname, isVdActived, vd, rootPath }) => {
        let { type, data = {} } = result;
        if (type === FileType.NOT_FOUND) {
            return { type };
        }
        if (type === FileType.DIRECTORY) {
            return transformer.transformDirectory({
                files: data.files,
                vd,
                isVdActived,
                pathname,
                type,
                rootPath,
            });
        }
        if (type === FileType.FILE) {
            return {
                type,
                filename: data.filename,
                content: data.content,
            };
        }
        if (type === FileType.ERROR) {
            return {
                type,
                content: data.content,
            };
        }
        return {};
    },
    transformDirectory: ({ files, vd, isVdActived, type, pathname, rootPath, }) => {
        let { fileMapList, pathList } = prepareDirectoryData(files, {
            pathname,
            isVdActived,
            vd,
            rootPath,
        });
        return {
            type,
            pathList,
            fileMapList,
        };
    },
};
function prepareDirectoryData(files, { pathname, vd, isVdActived, rootPath, }) {
    if (pathname !== '/' && pathname !== '') {
        files = [{ name: '..', isDirectory: true, isFile: false }, ...files];
    }
    let fileMapList = files
        .map((item) => {
        let { name } = item;
        let relativePath = path_1.default.join(pathname, name);
        let href = isVdActived ? path_1.default.join(vd, relativePath) : relativePath;
        if (!isVdActived && relativePath.startsWith(vd)) {
            href += '?disable_vd=1';
        }
        let filename = path_1.default.join(rootPath, relativePath);
        return Object.assign(Object.assign({}, item), { relativePath,
            href,
            filename });
    })
        .map(addClassNameProp);
    let pathList = createPathList(pathname, { vd, isVdActived });
    return {
        fileMapList,
        pathList,
    };
}
function addClassNameProp(obj) {
    let clzName = 'icon';
    let { isFile, isDirectory } = obj;
    if (isDirectory) {
        clzName += ' icon-directory';
    }
    else if (isFile) {
        clzName += ' icon-file';
    }
    return Object.assign(Object.assign({}, obj), { clzName });
}
function createPathList(pathname, { isVdActived, vd }) {
    let pathList = pathname
        .split('/')
        .filter(Boolean)
        .map((_) => '/' + _)
        // { name, href }
        .map(mapValue)
        .map((item) => {
        let { href } = item;
        let relativePath = href;
        let nextHref = isVdActived ? path_1.default.join(vd, href) : relativePath;
        if (!isVdActived && relativePath.startsWith(vd)) {
            nextHref += '?disable_vd=1';
        }
        return Object.assign(Object.assign({}, item), { relativePath, href: nextHref });
    });
    // 去首页path链接对象
    pathList.unshift({
        name: '~',
        relativePath: '/',
        href: isVdActived ? path_1.default.join(vd, '/') : '/',
    });
    pathList = pathList.map((item, index, array) => {
        if (index === array.length - 1) {
            return Object.assign({}, item);
        }
        return item;
    });
    return pathList;
}
function mapValue(value, index, array) {
    let href = value;
    for (let i = index - 1; i >= 0; i--) {
        href = array[i] + href;
    }
    return { href, name: value.slice(1) };
}
/**
 * 打开默认浏览器
 */
function openBrowser(href) {
    let command = 'open';
    let osType = os_1.default.type();
    if (osType === 'Linux') {
        command = 'x-www-browser';
    }
    else if (osType === 'Windows_NT') {
        command = 'start';
    }
    child_process_1.exec(`${command} ${href}`);
}
function getCommandArgs() {
    let args1 = argvList.reduce((acc, cur, idx, src) => {
        if (cur.startsWith('-')) {
            acc[cur] = src[idx + 1];
        }
        return acc;
    }, {});
    let args2 = argvList.filter((_) => _.startsWith('--'))
        .reduce((acc, cur) => {
        let [key, value] = cur.split('=');
        acc[key] = value;
        return acc;
    }, {});
    return Object.assign(Object.assign({}, args1), args2);
}
