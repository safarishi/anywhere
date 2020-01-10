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
const helpers_1 = require("../helpers");
const util_1 = require("util");
const consts_1 = require("../consts");
let readdir = util_1.promisify(fs_1.default.readdir);
let reader = {
    /**
     * @return {object}
     * { type: '404|file|directory|error', data: { filename, content, files } }
     */
    read: (pathname, { rootPath }) => __awaiter(void 0, void 0, void 0, function* () {
        let filename = path_1.default.join(rootPath, pathname);
        let { isFile, isDirectory } = yield helpers_1.readFileInfo(filename);
        let type = isFile
            ? consts_1.FileType.FILE
            : isDirectory
                ? consts_1.FileType.DIRECTORY
                : consts_1.FileType.NOT_FOUND;
        let data = { filename };
        try {
            if (isDirectory) {
                data.files = yield reader.readDirectory(filename);
            }
            return {
                type,
                data,
            };
        }
        catch (error) {
            return {
                type: consts_1.FileType.ERROR,
                data: Object.assign(Object.assign({}, data), { content: error.message }),
            };
        }
    }),
    readDirectory: (filename) => __awaiter(void 0, void 0, void 0, function* () {
        let files = yield readdir(filename);
        let fileListInfo = yield Promise.all(files.map((file) => __awaiter(void 0, void 0, void 0, function* () {
            let { isFile, isDirectory } = yield helpers_1.getFileInfo(path_1.default.join(filename, file));
            return {
                name: file,
                isFile,
                isDirectory,
            };
        })));
        return fileListInfo;
    }),
};
exports.default = reader;
