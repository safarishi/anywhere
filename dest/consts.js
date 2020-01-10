"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 读取 pathname 对应的文件类型
var FileType;
(function (FileType) {
    FileType["FILE"] = "file";
    FileType["NOT_FOUND"] = "404";
    FileType["DIRECTORY"] = "directory";
    // 读取文件发生错误
    FileType["ERROR"] = "error";
})(FileType = exports.FileType || (exports.FileType = {}));
