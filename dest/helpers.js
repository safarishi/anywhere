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
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
let lstat = util_1.promisify(fs_1.default.lstat);
let exists = util_1.promisify(fs_1.default.exists);
let realpath = util_1.promisify(fs_1.default.realpath);
/**
 * 打开默认浏览器
 */
function openBrowser(href) {
    let command;
    let osType = os_1.default.type();
    if (osType === 'Linux') {
        command = 'x-www-browser';
    }
    else if (osType === 'Windows_NT') {
        command = 'start';
    }
    else if (osType === 'Darwin') {
        // Mac OS
        command = 'open';
    }
    if (command) {
        child_process_1.exec(`${command} ${href}`);
    }
}
exports.openBrowser = openBrowser;
function getCommandArgs(argvList) {
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
exports.getCommandArgs = getCommandArgs;
function mapValue(value, index, array) {
    let href = value;
    for (let i = index - 1; i >= 0; i--) {
        href = array[i] + href;
    }
    return { href, name: value.slice(1) };
}
exports.mapValue = mapValue;
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
exports.createPathList = createPathList;
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
exports.addClassNameProp = addClassNameProp;
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
exports.prepareDirectoryData = prepareDirectoryData;
function readFileInfo(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        let isExist = yield exists(filename);
        if (!isExist)
            return { isExist };
        let { isFile, isDirectory } = yield getFileInfo(filename);
        return { isFile, isDirectory };
    });
}
exports.readFileInfo = readFileInfo;
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
exports.getFileInfo = getFileInfo;
