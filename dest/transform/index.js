"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const consts_1 = require("../consts");
exports.transformer = {
    transform: (result, { pathname, isVdActived, vd, rootPath }) => {
        let { type, data = {} } = result;
        if (type === consts_1.FileType.NOT_FOUND) {
            return { type };
        }
        if (type === consts_1.FileType.DIRECTORY) {
            return exports.transformer.transformDirectory({
                files: data.files,
                vd,
                isVdActived,
                pathname,
                type,
                rootPath,
            });
        }
        if (type === consts_1.FileType.FILE) {
            return {
                type,
                filename: data.filename,
                content: data.content,
            };
        }
        else {
            // type === FileType.ERROR
            return {
                type,
                content: data.content,
            };
        }
    },
    transformDirectory: ({ files, vd, isVdActived, type, pathname, rootPath, }) => {
        let { fileMapList, pathList } = helpers_1.prepareDirectoryData(files, {
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
