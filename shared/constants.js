"use strict";
/**
 * Shared constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLORS = exports.BREAKPOINTS = exports.TIMEZONES = exports.CURRENCIES = exports.LANGUAGES = exports.COUNTRIES = exports.ERROR_CODES = exports.DEFAULTS = exports.REGEX = exports.SIZE = exports.TIME = exports.KEY_CODES = exports.FILE_EXTENSIONS = exports.MIME_TYPES = exports.HTTP_STATUS = void 0;
// HTTP Status Codes
exports.HTTP_STATUS = {
    // 2xx Success
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    RESET_CONTENT: 205,
    PARTIAL_CONTENT: 206,
    // 3xx Redirection
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    SEE_OTHER: 303,
    NOT_MODIFIED: 304,
    TEMPORARY_REDIRECT: 307,
    PERMANENT_REDIRECT: 308,
    // 4xx Client Error
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 410,
    LENGTH_REQUIRED: 411,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    URI_TOO_LONG: 414,
    UNSUPPORTED_MEDIA_TYPE: 415,
    RANGE_NOT_SATISFIABLE: 416,
    EXPECTATION_FAILED: 417,
    IM_A_TEAPOT: 418,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    // 5xx Server Error
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    HTTP_VERSION_NOT_SUPPORTED: 505,
};
// Common MIME types
exports.MIME_TYPES = {
    // Text
    TEXT_PLAIN: 'text/plain',
    TEXT_HTML: 'text/html',
    TEXT_CSS: 'text/css',
    TEXT_JAVASCRIPT: 'text/javascript',
    TEXT_CSV: 'text/csv',
    TEXT_XML: 'text/xml',
    // Application
    APPLICATION_JSON: 'application/json',
    APPLICATION_XML: 'application/xml',
    APPLICATION_PDF: 'application/pdf',
    APPLICATION_ZIP: 'application/zip',
    APPLICATION_GZIP: 'application/gzip',
    APPLICATION_OCTET_STREAM: 'application/octet-stream',
    APPLICATION_FORM_URLENCODED: 'application/x-www-form-urlencoded',
    MULTIPART_FORM_DATA: 'multipart/form-data',
    // Image
    IMAGE_PNG: 'image/png',
    IMAGE_JPEG: 'image/jpeg',
    IMAGE_GIF: 'image/gif',
    IMAGE_SVG: 'image/svg+xml',
    IMAGE_WEBP: 'image/webp',
    IMAGE_ICO: 'image/x-icon',
    // Audio
    AUDIO_MPEG: 'audio/mpeg',
    AUDIO_OGG: 'audio/ogg',
    AUDIO_WAV: 'audio/wav',
    AUDIO_WEBM: 'audio/webm',
    // Video
    VIDEO_MP4: 'video/mp4',
    VIDEO_MPEG: 'video/mpeg',
    VIDEO_WEBM: 'video/webm',
    VIDEO_OGG: 'video/ogg',
    VIDEO_QUICKTIME: 'video/quicktime',
    // Font
    FONT_WOFF: 'font/woff',
    FONT_WOFF2: 'font/woff2',
    FONT_TTF: 'font/ttf',
    FONT_OTF: 'font/otf',
};
// File extensions
exports.FILE_EXTENSIONS = {
    // Documents
    DOCUMENTS: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp', '.txt', '.rtf'],
    // Images
    IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff'],
    // Videos
    VIDEOS: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v', '.mpg', '.mpeg'],
    // Audio
    AUDIO: ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma', '.opus'],
    // Archives
    ARCHIVES: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
    // Code
    CODE: ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.sass', '.less', '.json', '.xml', '.yaml', '.yml', '.md'],
};
// Keyboard keys
exports.KEY_CODES = {
    BACKSPACE: 8,
    TAB: 9,
    ENTER: 13,
    SHIFT: 16,
    CTRL: 17,
    ALT: 18,
    PAUSE: 19,
    CAPS_LOCK: 20,
    ESCAPE: 27,
    SPACE: 32,
    PAGE_UP: 33,
    PAGE_DOWN: 34,
    END: 35,
    HOME: 36,
    ARROW_LEFT: 37,
    ARROW_UP: 38,
    ARROW_RIGHT: 39,
    ARROW_DOWN: 40,
    INSERT: 45,
    DELETE: 46,
    KEY_0: 48,
    KEY_1: 49,
    KEY_2: 50,
    KEY_3: 51,
    KEY_4: 52,
    KEY_5: 53,
    KEY_6: 54,
    KEY_7: 55,
    KEY_8: 56,
    KEY_9: 57,
    KEY_A: 65,
    KEY_B: 66,
    KEY_C: 67,
    KEY_D: 68,
    KEY_E: 69,
    KEY_F: 70,
    KEY_G: 71,
    KEY_H: 72,
    KEY_I: 73,
    KEY_J: 74,
    KEY_K: 75,
    KEY_L: 76,
    KEY_M: 77,
    KEY_N: 78,
    KEY_O: 79,
    KEY_P: 80,
    KEY_Q: 81,
    KEY_R: 82,
    KEY_S: 83,
    KEY_T: 84,
    KEY_U: 85,
    KEY_V: 86,
    KEY_W: 87,
    KEY_X: 88,
    KEY_Y: 89,
    KEY_Z: 90,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,
};
// Time constants
exports.TIME = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
    YEAR: 365 * 24 * 60 * 60 * 1000,
};
// Size constants
exports.SIZE = {
    BYTE: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
};
// Regular expressions
exports.REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    PHONE: /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
    PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    USERNAME: /^[a-zA-Z0-9_-]{3,16}$/,
    HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    IPV4: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    BASE64: /^[A-Za-z0-9+/]*={0,2}$/,
    JWT: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
    CREDIT_CARD: /^[0-9]{13,19}$/,
    MAC_ADDRESS: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
    SEMVER: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
};
// Default values
exports.DEFAULTS = {
    PAGINATION: {
        PAGE: 1,
        PER_PAGE: 20,
        MAX_PER_PAGE: 100,
    },
    PASSWORD: {
        MIN_LENGTH: 8,
        MAX_LENGTH: 128,
    },
    USERNAME: {
        MIN_LENGTH: 3,
        MAX_LENGTH: 20,
    },
    FILE_UPLOAD: {
        MAX_SIZE: 10 * 1024 * 1024, // 10MB
        CHUNK_SIZE: 1024 * 1024, // 1MB
    },
    CACHE: {
        TTL: 60 * 60, // 1 hour in seconds
        MAX_AGE: 86400, // 1 day in seconds
    },
    TIMEOUT: {
        REQUEST: 30000, // 30 seconds
        UPLOAD: 120000, // 2 minutes
        DOWNLOAD: 60000, // 1 minute
    },
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY: 1000, // 1 second
        BACKOFF: 2,
    },
};
// Error codes
exports.ERROR_CODES = {
    // Authentication errors
    AUTH_INVALID_CREDENTIALS: 'AUTH001',
    AUTH_TOKEN_EXPIRED: 'AUTH002',
    AUTH_TOKEN_INVALID: 'AUTH003',
    AUTH_UNAUTHORIZED: 'AUTH004',
    AUTH_FORBIDDEN: 'AUTH005',
    AUTH_2FA_REQUIRED: 'AUTH006',
    AUTH_2FA_INVALID: 'AUTH007',
    // Validation errors
    VALIDATION_REQUIRED: 'VAL001',
    VALIDATION_INVALID_FORMAT: 'VAL002',
    VALIDATION_MIN_LENGTH: 'VAL003',
    VALIDATION_MAX_LENGTH: 'VAL004',
    VALIDATION_MIN_VALUE: 'VAL005',
    VALIDATION_MAX_VALUE: 'VAL006',
    VALIDATION_UNIQUE: 'VAL007',
    VALIDATION_EXISTS: 'VAL008',
    // File errors
    FILE_NOT_FOUND: 'FILE001',
    FILE_TOO_LARGE: 'FILE002',
    FILE_INVALID_TYPE: 'FILE003',
    FILE_UPLOAD_FAILED: 'FILE004',
    FILE_DOWNLOAD_FAILED: 'FILE005',
    FILE_DELETE_FAILED: 'FILE006',
    // Database errors
    DB_CONNECTION_FAILED: 'DB001',
    DB_QUERY_FAILED: 'DB002',
    DB_TRANSACTION_FAILED: 'DB003',
    DB_DUPLICATE_ENTRY: 'DB004',
    DB_FOREIGN_KEY_VIOLATION: 'DB005',
    // Network errors
    NETWORK_TIMEOUT: 'NET001',
    NETWORK_OFFLINE: 'NET002',
    NETWORK_DNS_FAILED: 'NET003',
    NETWORK_CONNECTION_REFUSED: 'NET004',
    // Server errors
    SERVER_INTERNAL_ERROR: 'SRV001',
    SERVER_MAINTENANCE: 'SRV002',
    SERVER_OVERLOADED: 'SRV003',
    SERVER_NOT_IMPLEMENTED: 'SRV004',
    // Business logic errors
    BUSINESS_INVALID_OPERATION: 'BUS001',
    BUSINESS_INSUFFICIENT_FUNDS: 'BUS002',
    BUSINESS_QUOTA_EXCEEDED: 'BUS003',
    BUSINESS_RATE_LIMITED: 'BUS004',
    BUSINESS_EXPIRED: 'BUS005',
};
// Countries (ISO 3166-1 alpha-2)
exports.COUNTRIES = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'JP', name: 'Japan' },
    { code: 'CN', name: 'China' },
    { code: 'IN', name: 'India' },
    { code: 'BR', name: 'Brazil' },
    { code: 'RU', name: 'Russia' },
    { code: 'MX', name: 'Mexico' },
    { code: 'KR', name: 'South Korea' },
    // Add more as needed
];
// Languages (ISO 639-1)
exports.LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'German' },
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    // Add more as needed
];
// Currencies (ISO 4217)
exports.CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    // Add more as needed
];
// Timezones (common)
exports.TIMEZONES = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Europe/Berlin', label: 'Berlin' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Shanghai', label: 'Beijing' },
    { value: 'Asia/Kolkata', label: 'New Delhi' },
    { value: 'Australia/Sydney', label: 'Sydney' },
    // Add more as needed
];
// Breakpoints (responsive design)
exports.BREAKPOINTS = {
    XS: 0,
    SM: 576,
    MD: 768,
    LG: 992,
    XL: 1200,
    XXL: 1400,
};
// Colors (common UI colors)
exports.COLORS = {
    // Primary colors
    PRIMARY: '#0066CC',
    SECONDARY: '#6C757D',
    // Status colors
    SUCCESS: '#28A745',
    DANGER: '#DC3545',
    WARNING: '#FFC107',
    INFO: '#17A2B8',
    // Neutral colors
    LIGHT: '#F8F9FA',
    DARK: '#343A40',
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    // Gray scale
    GRAY_100: '#F8F9FA',
    GRAY_200: '#E9ECEF',
    GRAY_300: '#DEE2E6',
    GRAY_400: '#CED4DA',
    GRAY_500: '#ADB5BD',
    GRAY_600: '#6C757D',
    GRAY_700: '#495057',
    GRAY_800: '#343A40',
    GRAY_900: '#212529',
};
//# sourceMappingURL=constants.js.map