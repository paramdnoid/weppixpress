"use strict";
// Shared Type Definitions - Used by both Frontend and Backend
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileCategory = exports.UserStatus = exports.UserRole = void 0;
exports.isString = isString;
exports.isNumber = isNumber;
exports.isBoolean = isBoolean;
exports.isObject = isObject;
exports.isArray = isArray;
exports.isApiResponse = isApiResponse;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["MODERATOR"] = "moderator";
    UserRole["USER"] = "user";
    UserRole["GUEST"] = "guest";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["DELETED"] = "deleted";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var FileCategory;
(function (FileCategory) {
    FileCategory["DOCUMENT"] = "document";
    FileCategory["IMAGE"] = "image";
    FileCategory["VIDEO"] = "video";
    FileCategory["AUDIO"] = "audio";
    FileCategory["ARCHIVE"] = "archive";
    FileCategory["CODE"] = "code";
    FileCategory["SPREADSHEET"] = "spreadsheet";
    FileCategory["PRESENTATION"] = "presentation";
    FileCategory["PDF"] = "pdf";
    FileCategory["TEXT"] = "text";
    FileCategory["FOLDER"] = "folder";
    FileCategory["OTHER"] = "other";
})(FileCategory || (exports.FileCategory = FileCategory = {}));
// Type Guards
function isString(value) {
    return typeof value === 'string';
}
function isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
}
function isBoolean(value) {
    return typeof value === 'boolean';
}
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isArray(value) {
    return Array.isArray(value);
}
function isApiResponse(value) {
    return (isObject(value) &&
        'success' in value &&
        isBoolean(value.success) &&
        'timestamp' in value &&
        isNumber(value.timestamp) &&
        'requestId' in value &&
        isString(value.requestId));
}
//# sourceMappingURL=index.js.map