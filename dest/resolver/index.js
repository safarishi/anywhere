"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = __importDefault(require("url"));
const querystring_1 = __importDefault(require("querystring"));
let resolver = {
    resolve: (requestUrl, vd) => {
        let { pathname, query } = url_1.default.parse(requestUrl);
        pathname = decodeURIComponent(pathname || '');
        let isVdActived = requestUrl.startsWith(vd);
        let { disable_vd: disableVd, disable_public_path: disablePublicPath, } = querystring_1.default.parse(query || '');
        if (disableVd === '1') {
            isVdActived = false;
        }
        if (isVdActived) {
            pathname = pathname.replace(vd, '');
        }
        let isPublicPathDisabled = disablePublicPath === '1';
        return { pathname, isVdActived, disablePublicPath: isPublicPathDisabled };
    },
};
exports.default = resolver;
