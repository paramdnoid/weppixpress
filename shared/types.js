"use strict";
// Shared types between frontend and backend
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceType = exports.NotificationType = exports.WebSocketMessageType = exports.EmailFolder = exports.UploadStatus = exports.UserRole = void 0;
const tslib_1 = require("tslib");
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["USER"] = "user";
    UserRole["MODERATOR"] = "moderator";
})(UserRole || (exports.UserRole = UserRole = {}));
var UploadStatus;
(function (UploadStatus) {
    UploadStatus["PENDING"] = "pending";
    UploadStatus["UPLOADING"] = "uploading";
    UploadStatus["PROCESSING"] = "processing";
    UploadStatus["COMPLETED"] = "completed";
    UploadStatus["FAILED"] = "failed";
    UploadStatus["CANCELLED"] = "cancelled";
})(UploadStatus || (exports.UploadStatus = UploadStatus = {}));
var EmailFolder;
(function (EmailFolder) {
    EmailFolder["INBOX"] = "inbox";
    EmailFolder["SENT"] = "sent";
    EmailFolder["DRAFTS"] = "drafts";
    EmailFolder["SPAM"] = "spam";
    EmailFolder["TRASH"] = "trash";
    EmailFolder["ARCHIVE"] = "archive";
})(EmailFolder || (exports.EmailFolder = EmailFolder = {}));
var WebSocketMessageType;
(function (WebSocketMessageType) {
    // File events
    WebSocketMessageType["FILE_UPLOADED"] = "file_uploaded";
    WebSocketMessageType["FILE_DELETED"] = "file_deleted";
    WebSocketMessageType["FILE_MOVED"] = "file_moved";
    WebSocketMessageType["FILE_RENAMED"] = "file_renamed";
    WebSocketMessageType["FILE_SHARED"] = "file_shared";
    // Upload events
    WebSocketMessageType["UPLOAD_PROGRESS"] = "upload_progress";
    WebSocketMessageType["UPLOAD_COMPLETE"] = "upload_complete";
    WebSocketMessageType["UPLOAD_FAILED"] = "upload_failed";
    // Email events
    WebSocketMessageType["EMAIL_RECEIVED"] = "email_received";
    WebSocketMessageType["EMAIL_SENT"] = "email_sent";
    // System events
    WebSocketMessageType["USER_STATUS_CHANGED"] = "user_status_changed";
    WebSocketMessageType["SYSTEM_NOTIFICATION"] = "system_notification";
    WebSocketMessageType["CONNECTION_STATUS"] = "connection_status";
})(WebSocketMessageType || (exports.WebSocketMessageType = WebSocketMessageType = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["INFO"] = "info";
    NotificationType["SUCCESS"] = "success";
    NotificationType["WARNING"] = "warning";
    NotificationType["ERROR"] = "error";
    NotificationType["FILE_SHARED"] = "file_shared";
    NotificationType["EMAIL_RECEIVED"] = "email_received";
    NotificationType["SYSTEM_UPDATE"] = "system_update";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var ResourceType;
(function (ResourceType) {
    ResourceType["FILE"] = "file";
    ResourceType["FOLDER"] = "folder";
    ResourceType["EMAIL"] = "email";
    ResourceType["USER"] = "user";
    ResourceType["SHARE"] = "share";
    ResourceType["SETTINGS"] = "settings";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
// Export all types
tslib_1.__exportStar(require("./index"), exports);
//# sourceMappingURL=types.js.map