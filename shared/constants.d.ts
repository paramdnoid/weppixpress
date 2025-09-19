/**
 * Shared constants
 */
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly ACCEPTED: 202;
    readonly NO_CONTENT: 204;
    readonly RESET_CONTENT: 205;
    readonly PARTIAL_CONTENT: 206;
    readonly MOVED_PERMANENTLY: 301;
    readonly FOUND: 302;
    readonly SEE_OTHER: 303;
    readonly NOT_MODIFIED: 304;
    readonly TEMPORARY_REDIRECT: 307;
    readonly PERMANENT_REDIRECT: 308;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly PAYMENT_REQUIRED: 402;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly METHOD_NOT_ALLOWED: 405;
    readonly NOT_ACCEPTABLE: 406;
    readonly REQUEST_TIMEOUT: 408;
    readonly CONFLICT: 409;
    readonly GONE: 410;
    readonly LENGTH_REQUIRED: 411;
    readonly PRECONDITION_FAILED: 412;
    readonly PAYLOAD_TOO_LARGE: 413;
    readonly URI_TOO_LONG: 414;
    readonly UNSUPPORTED_MEDIA_TYPE: 415;
    readonly RANGE_NOT_SATISFIABLE: 416;
    readonly EXPECTATION_FAILED: 417;
    readonly IM_A_TEAPOT: 418;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly NOT_IMPLEMENTED: 501;
    readonly BAD_GATEWAY: 502;
    readonly SERVICE_UNAVAILABLE: 503;
    readonly GATEWAY_TIMEOUT: 504;
    readonly HTTP_VERSION_NOT_SUPPORTED: 505;
};
export declare const MIME_TYPES: {
    readonly TEXT_PLAIN: "text/plain";
    readonly TEXT_HTML: "text/html";
    readonly TEXT_CSS: "text/css";
    readonly TEXT_JAVASCRIPT: "text/javascript";
    readonly TEXT_CSV: "text/csv";
    readonly TEXT_XML: "text/xml";
    readonly APPLICATION_JSON: "application/json";
    readonly APPLICATION_XML: "application/xml";
    readonly APPLICATION_PDF: "application/pdf";
    readonly APPLICATION_ZIP: "application/zip";
    readonly APPLICATION_GZIP: "application/gzip";
    readonly APPLICATION_OCTET_STREAM: "application/octet-stream";
    readonly APPLICATION_FORM_URLENCODED: "application/x-www-form-urlencoded";
    readonly MULTIPART_FORM_DATA: "multipart/form-data";
    readonly IMAGE_PNG: "image/png";
    readonly IMAGE_JPEG: "image/jpeg";
    readonly IMAGE_GIF: "image/gif";
    readonly IMAGE_SVG: "image/svg+xml";
    readonly IMAGE_WEBP: "image/webp";
    readonly IMAGE_ICO: "image/x-icon";
    readonly AUDIO_MPEG: "audio/mpeg";
    readonly AUDIO_OGG: "audio/ogg";
    readonly AUDIO_WAV: "audio/wav";
    readonly AUDIO_WEBM: "audio/webm";
    readonly VIDEO_MP4: "video/mp4";
    readonly VIDEO_MPEG: "video/mpeg";
    readonly VIDEO_WEBM: "video/webm";
    readonly VIDEO_OGG: "video/ogg";
    readonly VIDEO_QUICKTIME: "video/quicktime";
    readonly FONT_WOFF: "font/woff";
    readonly FONT_WOFF2: "font/woff2";
    readonly FONT_TTF: "font/ttf";
    readonly FONT_OTF: "font/otf";
};
export declare const FILE_EXTENSIONS: {
    readonly DOCUMENTS: readonly [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp", ".txt", ".rtf"];
    readonly IMAGES: readonly [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".tiff"];
    readonly VIDEOS: readonly [".mp4", ".avi", ".mov", ".wmv", ".flv", ".mkv", ".webm", ".m4v", ".mpg", ".mpeg"];
    readonly AUDIO: readonly [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac", ".wma", ".opus"];
    readonly ARCHIVES: readonly [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"];
    readonly CODE: readonly [".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".scss", ".sass", ".less", ".json", ".xml", ".yaml", ".yml", ".md"];
};
export declare const KEY_CODES: {
    readonly BACKSPACE: 8;
    readonly TAB: 9;
    readonly ENTER: 13;
    readonly SHIFT: 16;
    readonly CTRL: 17;
    readonly ALT: 18;
    readonly PAUSE: 19;
    readonly CAPS_LOCK: 20;
    readonly ESCAPE: 27;
    readonly SPACE: 32;
    readonly PAGE_UP: 33;
    readonly PAGE_DOWN: 34;
    readonly END: 35;
    readonly HOME: 36;
    readonly ARROW_LEFT: 37;
    readonly ARROW_UP: 38;
    readonly ARROW_RIGHT: 39;
    readonly ARROW_DOWN: 40;
    readonly INSERT: 45;
    readonly DELETE: 46;
    readonly KEY_0: 48;
    readonly KEY_1: 49;
    readonly KEY_2: 50;
    readonly KEY_3: 51;
    readonly KEY_4: 52;
    readonly KEY_5: 53;
    readonly KEY_6: 54;
    readonly KEY_7: 55;
    readonly KEY_8: 56;
    readonly KEY_9: 57;
    readonly KEY_A: 65;
    readonly KEY_B: 66;
    readonly KEY_C: 67;
    readonly KEY_D: 68;
    readonly KEY_E: 69;
    readonly KEY_F: 70;
    readonly KEY_G: 71;
    readonly KEY_H: 72;
    readonly KEY_I: 73;
    readonly KEY_J: 74;
    readonly KEY_K: 75;
    readonly KEY_L: 76;
    readonly KEY_M: 77;
    readonly KEY_N: 78;
    readonly KEY_O: 79;
    readonly KEY_P: 80;
    readonly KEY_Q: 81;
    readonly KEY_R: 82;
    readonly KEY_S: 83;
    readonly KEY_T: 84;
    readonly KEY_U: 85;
    readonly KEY_V: 86;
    readonly KEY_W: 87;
    readonly KEY_X: 88;
    readonly KEY_Y: 89;
    readonly KEY_Z: 90;
    readonly F1: 112;
    readonly F2: 113;
    readonly F3: 114;
    readonly F4: 115;
    readonly F5: 116;
    readonly F6: 117;
    readonly F7: 118;
    readonly F8: 119;
    readonly F9: 120;
    readonly F10: 121;
    readonly F11: 122;
    readonly F12: 123;
};
export declare const TIME: {
    readonly SECOND: 1000;
    readonly MINUTE: number;
    readonly HOUR: number;
    readonly DAY: number;
    readonly WEEK: number;
    readonly MONTH: number;
    readonly YEAR: number;
};
export declare const SIZE: {
    readonly BYTE: 1;
    readonly KB: 1024;
    readonly MB: number;
    readonly GB: number;
    readonly TB: number;
};
export declare const REGEX: {
    readonly EMAIL: RegExp;
    readonly URL: RegExp;
    readonly PHONE: RegExp;
    readonly PASSWORD_STRONG: RegExp;
    readonly USERNAME: RegExp;
    readonly HEX_COLOR: RegExp;
    readonly IPV4: RegExp;
    readonly UUID: RegExp;
    readonly BASE64: RegExp;
    readonly JWT: RegExp;
    readonly CREDIT_CARD: RegExp;
    readonly MAC_ADDRESS: RegExp;
    readonly SEMVER: RegExp;
};
export declare const DEFAULTS: {
    readonly PAGINATION: {
        readonly PAGE: 1;
        readonly PER_PAGE: 20;
        readonly MAX_PER_PAGE: 100;
    };
    readonly PASSWORD: {
        readonly MIN_LENGTH: 8;
        readonly MAX_LENGTH: 128;
    };
    readonly USERNAME: {
        readonly MIN_LENGTH: 3;
        readonly MAX_LENGTH: 20;
    };
    readonly FILE_UPLOAD: {
        readonly MAX_SIZE: number;
        readonly CHUNK_SIZE: number;
    };
    readonly CACHE: {
        readonly TTL: number;
        readonly MAX_AGE: 86400;
    };
    readonly TIMEOUT: {
        readonly REQUEST: 30000;
        readonly UPLOAD: 120000;
        readonly DOWNLOAD: 60000;
    };
    readonly RETRY: {
        readonly MAX_ATTEMPTS: 3;
        readonly DELAY: 1000;
        readonly BACKOFF: 2;
    };
};
export declare const ERROR_CODES: {
    readonly AUTH_INVALID_CREDENTIALS: "AUTH001";
    readonly AUTH_TOKEN_EXPIRED: "AUTH002";
    readonly AUTH_TOKEN_INVALID: "AUTH003";
    readonly AUTH_UNAUTHORIZED: "AUTH004";
    readonly AUTH_FORBIDDEN: "AUTH005";
    readonly AUTH_2FA_REQUIRED: "AUTH006";
    readonly AUTH_2FA_INVALID: "AUTH007";
    readonly VALIDATION_REQUIRED: "VAL001";
    readonly VALIDATION_INVALID_FORMAT: "VAL002";
    readonly VALIDATION_MIN_LENGTH: "VAL003";
    readonly VALIDATION_MAX_LENGTH: "VAL004";
    readonly VALIDATION_MIN_VALUE: "VAL005";
    readonly VALIDATION_MAX_VALUE: "VAL006";
    readonly VALIDATION_UNIQUE: "VAL007";
    readonly VALIDATION_EXISTS: "VAL008";
    readonly FILE_NOT_FOUND: "FILE001";
    readonly FILE_TOO_LARGE: "FILE002";
    readonly FILE_INVALID_TYPE: "FILE003";
    readonly FILE_UPLOAD_FAILED: "FILE004";
    readonly FILE_DOWNLOAD_FAILED: "FILE005";
    readonly FILE_DELETE_FAILED: "FILE006";
    readonly DB_CONNECTION_FAILED: "DB001";
    readonly DB_QUERY_FAILED: "DB002";
    readonly DB_TRANSACTION_FAILED: "DB003";
    readonly DB_DUPLICATE_ENTRY: "DB004";
    readonly DB_FOREIGN_KEY_VIOLATION: "DB005";
    readonly NETWORK_TIMEOUT: "NET001";
    readonly NETWORK_OFFLINE: "NET002";
    readonly NETWORK_DNS_FAILED: "NET003";
    readonly NETWORK_CONNECTION_REFUSED: "NET004";
    readonly SERVER_INTERNAL_ERROR: "SRV001";
    readonly SERVER_MAINTENANCE: "SRV002";
    readonly SERVER_OVERLOADED: "SRV003";
    readonly SERVER_NOT_IMPLEMENTED: "SRV004";
    readonly BUSINESS_INVALID_OPERATION: "BUS001";
    readonly BUSINESS_INSUFFICIENT_FUNDS: "BUS002";
    readonly BUSINESS_QUOTA_EXCEEDED: "BUS003";
    readonly BUSINESS_RATE_LIMITED: "BUS004";
    readonly BUSINESS_EXPIRED: "BUS005";
};
export declare const COUNTRIES: readonly [{
    readonly code: "US";
    readonly name: "United States";
}, {
    readonly code: "GB";
    readonly name: "United Kingdom";
}, {
    readonly code: "DE";
    readonly name: "Germany";
}, {
    readonly code: "FR";
    readonly name: "France";
}, {
    readonly code: "IT";
    readonly name: "Italy";
}, {
    readonly code: "ES";
    readonly name: "Spain";
}, {
    readonly code: "CA";
    readonly name: "Canada";
}, {
    readonly code: "AU";
    readonly name: "Australia";
}, {
    readonly code: "JP";
    readonly name: "Japan";
}, {
    readonly code: "CN";
    readonly name: "China";
}, {
    readonly code: "IN";
    readonly name: "India";
}, {
    readonly code: "BR";
    readonly name: "Brazil";
}, {
    readonly code: "RU";
    readonly name: "Russia";
}, {
    readonly code: "MX";
    readonly name: "Mexico";
}, {
    readonly code: "KR";
    readonly name: "South Korea";
}];
export declare const LANGUAGES: readonly [{
    readonly code: "en";
    readonly name: "English";
}, {
    readonly code: "de";
    readonly name: "German";
}, {
    readonly code: "fr";
    readonly name: "French";
}, {
    readonly code: "es";
    readonly name: "Spanish";
}, {
    readonly code: "it";
    readonly name: "Italian";
}, {
    readonly code: "pt";
    readonly name: "Portuguese";
}, {
    readonly code: "ru";
    readonly name: "Russian";
}, {
    readonly code: "ja";
    readonly name: "Japanese";
}, {
    readonly code: "ko";
    readonly name: "Korean";
}, {
    readonly code: "zh";
    readonly name: "Chinese";
}, {
    readonly code: "ar";
    readonly name: "Arabic";
}, {
    readonly code: "hi";
    readonly name: "Hindi";
}];
export declare const CURRENCIES: readonly [{
    readonly code: "USD";
    readonly symbol: "$";
    readonly name: "US Dollar";
}, {
    readonly code: "EUR";
    readonly symbol: "€";
    readonly name: "Euro";
}, {
    readonly code: "GBP";
    readonly symbol: "£";
    readonly name: "British Pound";
}, {
    readonly code: "JPY";
    readonly symbol: "¥";
    readonly name: "Japanese Yen";
}, {
    readonly code: "CHF";
    readonly symbol: "CHF";
    readonly name: "Swiss Franc";
}, {
    readonly code: "CAD";
    readonly symbol: "CA$";
    readonly name: "Canadian Dollar";
}, {
    readonly code: "AUD";
    readonly symbol: "AU$";
    readonly name: "Australian Dollar";
}, {
    readonly code: "CNY";
    readonly symbol: "¥";
    readonly name: "Chinese Yuan";
}, {
    readonly code: "INR";
    readonly symbol: "₹";
    readonly name: "Indian Rupee";
}, {
    readonly code: "BRL";
    readonly symbol: "R$";
    readonly name: "Brazilian Real";
}];
export declare const TIMEZONES: readonly [{
    readonly value: "UTC";
    readonly label: "UTC";
}, {
    readonly value: "America/New_York";
    readonly label: "Eastern Time (US & Canada)";
}, {
    readonly value: "America/Chicago";
    readonly label: "Central Time (US & Canada)";
}, {
    readonly value: "America/Denver";
    readonly label: "Mountain Time (US & Canada)";
}, {
    readonly value: "America/Los_Angeles";
    readonly label: "Pacific Time (US & Canada)";
}, {
    readonly value: "Europe/London";
    readonly label: "London";
}, {
    readonly value: "Europe/Paris";
    readonly label: "Paris";
}, {
    readonly value: "Europe/Berlin";
    readonly label: "Berlin";
}, {
    readonly value: "Asia/Tokyo";
    readonly label: "Tokyo";
}, {
    readonly value: "Asia/Shanghai";
    readonly label: "Beijing";
}, {
    readonly value: "Asia/Kolkata";
    readonly label: "New Delhi";
}, {
    readonly value: "Australia/Sydney";
    readonly label: "Sydney";
}];
export declare const BREAKPOINTS: {
    readonly XS: 0;
    readonly SM: 576;
    readonly MD: 768;
    readonly LG: 992;
    readonly XL: 1200;
    readonly XXL: 1400;
};
export declare const COLORS: {
    readonly PRIMARY: "#0066CC";
    readonly SECONDARY: "#6C757D";
    readonly SUCCESS: "#28A745";
    readonly DANGER: "#DC3545";
    readonly WARNING: "#FFC107";
    readonly INFO: "#17A2B8";
    readonly LIGHT: "#F8F9FA";
    readonly DARK: "#343A40";
    readonly WHITE: "#FFFFFF";
    readonly BLACK: "#000000";
    readonly GRAY_100: "#F8F9FA";
    readonly GRAY_200: "#E9ECEF";
    readonly GRAY_300: "#DEE2E6";
    readonly GRAY_400: "#CED4DA";
    readonly GRAY_500: "#ADB5BD";
    readonly GRAY_600: "#6C757D";
    readonly GRAY_700: "#495057";
    readonly GRAY_800: "#343A40";
    readonly GRAY_900: "#212529";
};
//# sourceMappingURL=constants.d.ts.map