"use strict";
/**
 * Shared validation functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileValidationSchema = exports.userValidationSchema = exports.generateStrongPassword = exports.isValidUsPostalCode = exports.isValidSemver = exports.isValidJwt = exports.isValidBase64 = exports.isValidJson = exports.isValidUsername = exports.isValidRgbColor = exports.isValidHexColor = exports.isValidMacAddress = exports.isValidIPv6 = exports.isValidIPv4 = exports.isValidCreditCard = exports.isValidDateRange = exports.isValidDate = exports.isValidMimeType = exports.isValidFileExtension = exports.isValidFileSize = exports.isValidUuid = exports.isValidUrl = exports.isValidPhone = exports.isValidPassword = exports.isValidEmail = void 0;
// Email validation
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
// Password validation
const isValidPassword = (password, options) => {
    const errors = [];
    const opts = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecial: true,
        ...options
    };
    if (password.length < opts.minLength) {
        errors.push(`Password must be at least ${opts.minLength} characters long`);
    }
    if (opts.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (opts.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (opts.requireNumbers && !/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (opts.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    return {
        valid: errors.length === 0,
        errors
    };
};
exports.isValidPassword = isValidPassword;
// Phone validation
const isValidPhone = (phone) => {
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};
exports.isValidPhone = isValidPhone;
// URL validation
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
};
exports.isValidUrl = isValidUrl;
// UUID validation
const isValidUuid = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};
exports.isValidUuid = isValidUuid;
// File size validation
const isValidFileSize = (size, maxSizeInMB) => {
    return size <= maxSizeInMB * 1024 * 1024;
};
exports.isValidFileSize = isValidFileSize;
// File extension validation
const isValidFileExtension = (filename, allowedExtensions) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (!extension)
        return false;
    return allowedExtensions.map(ext => ext.toLowerCase()).includes(extension);
};
exports.isValidFileExtension = isValidFileExtension;
// MIME type validation
const isValidMimeType = (mimeType, allowedTypes) => {
    return allowedTypes.some(type => {
        if (type.includes('*')) {
            const [category] = type.split('/');
            return mimeType.startsWith(`${category}/`);
        }
        return mimeType === type;
    });
};
exports.isValidMimeType = isValidMimeType;
// Date validation
const isValidDate = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
};
exports.isValidDate = isValidDate;
// Date range validation
const isValidDateRange = (startDate, endDate) => {
    if (!(0, exports.isValidDate)(startDate) || !(0, exports.isValidDate)(endDate))
        return false;
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    return start <= end;
};
exports.isValidDateRange = isValidDateRange;
// Credit card validation (Luhn algorithm)
const isValidCreditCard = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (!/^\d+$/.test(cleaned))
        return false;
    let sum = 0;
    let isEven = false;
    for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i], 10);
        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        sum += digit;
        isEven = !isEven;
    }
    return sum % 10 === 0;
};
exports.isValidCreditCard = isValidCreditCard;
// IPv4 validation
const isValidIPv4 = (ip) => {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
};
exports.isValidIPv4 = isValidIPv4;
// IPv6 validation
const isValidIPv6 = (ip) => {
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv6Regex.test(ip);
};
exports.isValidIPv6 = isValidIPv6;
// MAC address validation
const isValidMacAddress = (mac) => {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
};
exports.isValidMacAddress = isValidMacAddress;
// Hex color validation
const isValidHexColor = (color) => {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
};
exports.isValidHexColor = isValidHexColor;
// RGB color validation
const isValidRgbColor = (color) => {
    const rgbRegex = /^rgb\(\s*([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\s*\)$/;
    return rgbRegex.test(color);
};
exports.isValidRgbColor = isValidRgbColor;
// Username validation
const isValidUsername = (username, options) => {
    const opts = {
        minLength: 3,
        maxLength: 20,
        allowSpecialChars: false,
        ...options
    };
    if (username.length < opts.minLength || username.length > opts.maxLength) {
        return false;
    }
    const regex = opts.allowSpecialChars
        ? /^[a-zA-Z0-9_.-]+$/
        : /^[a-zA-Z0-9]+$/;
    return regex.test(username);
};
exports.isValidUsername = isValidUsername;
// JSON validation
const isValidJson = (str) => {
    try {
        JSON.parse(str);
        return true;
    }
    catch {
        return false;
    }
};
exports.isValidJson = isValidJson;
// Base64 validation
const isValidBase64 = (str) => {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(str) && str.length % 4 === 0;
};
exports.isValidBase64 = isValidBase64;
// JWT validation
const isValidJwt = (token) => {
    const parts = token.split('.');
    if (parts.length !== 3)
        return false;
    try {
        parts.forEach(part => {
            if (!(0, exports.isValidBase64)(part.replace(/-/g, '+').replace(/_/g, '/'))) {
                throw new Error('Invalid base64');
            }
        });
        return true;
    }
    catch {
        return false;
    }
};
exports.isValidJwt = isValidJwt;
// Semantic version validation
const isValidSemver = (version) => {
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semverRegex.test(version);
};
exports.isValidSemver = isValidSemver;
// Postal code validation (US)
const isValidUsPostalCode = (code) => {
    const usPostalRegex = /^\d{5}(-\d{4})?$/;
    return usPostalRegex.test(code);
};
exports.isValidUsPostalCode = isValidUsPostalCode;
// Strong password generator
const generateStrongPassword = (length = 16) => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = uppercase + lowercase + numbers + special;
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    for (let i = password.length; i < length; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }
    return password.split('').sort(() => Math.random() - 0.5).join('');
};
exports.generateStrongPassword = generateStrongPassword;
// Export validation schemas for complex objects
exports.userValidationSchema = {
    email: (email) => (0, exports.isValidEmail)(email),
    password: (password) => (0, exports.isValidPassword)(password).valid,
    first_name: (name) => name.length >= 1 && name.length <= 50,
    last_name: (name) => name.length >= 1 && name.length <= 50,
};
exports.fileValidationSchema = {
    name: (name) => name.length >= 1 && name.length <= 255,
    size: (size) => size > 0 && size <= 100 * 1024 * 1024, // Max 100MB
    mime_type: (type) => type.length > 0,
};
//# sourceMappingURL=validators.js.map