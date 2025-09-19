"use strict";
/**
 * Shared utility functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNode = exports.isBrowser = exports.isTest = exports.isProduction = exports.isDevelopment = exports.base64Decode = exports.base64Encode = exports.hash = exports.generateUuid = exports.throttle = exports.debounce = exports.retry = exports.sleep = exports.darkenColor = exports.lightenColor = exports.rgbToHex = exports.hexToRgb = exports.joinPaths = exports.buildQueryString = exports.parseQueryString = exports.isEmpty = exports.isObject = exports.deepMerge = exports.deepClone = exports.omit = exports.pick = exports.intersection = exports.difference = exports.flatten = exports.shuffle = exports.groupBy = exports.uniqueBy = exports.unique = exports.chunk = exports.randomFloat = exports.randomInt = exports.clamp = exports.formatPercentage = exports.formatBytes = exports.formatCurrency = exports.formatNumber = exports.slugify = exports.truncate = exports.kebabCase = exports.snakeCase = exports.camelCase = exports.titleCase = exports.capitalize = exports.formatRelativeTime = exports.formatDate = void 0;
// Date utilities
const formatDate = (date, format = 'YYYY-MM-DD') => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return format
        .replace('YYYY', String(year))
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
};
exports.formatDate = formatDate;
const formatRelativeTime = (date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'week', seconds: 604800 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 },
        { label: 'second', seconds: 1 }
    ];
    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return count === 1
                ? `1 ${interval.label} ago`
                : `${count} ${interval.label}s ago`;
        }
    }
    return 'just now';
};
exports.formatRelativeTime = formatRelativeTime;
// String utilities
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
exports.capitalize = capitalize;
const titleCase = (str) => {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};
exports.titleCase = titleCase;
const camelCase = (str) => {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
        .replace(/\s+/g, '');
};
exports.camelCase = camelCase;
const snakeCase = (str) => {
    return str
        .replace(/\W+/g, ' ')
        .split(/ |\B(?=[A-Z])/)
        .map(word => word.toLowerCase())
        .join('_');
};
exports.snakeCase = snakeCase;
const kebabCase = (str) => {
    return str
        .replace(/\W+/g, ' ')
        .split(/ |\B(?=[A-Z])/)
        .map(word => word.toLowerCase())
        .join('-');
};
exports.kebabCase = kebabCase;
const truncate = (str, length, suffix = '...') => {
    if (str.length <= length)
        return str;
    return str.substring(0, length - suffix.length) + suffix;
};
exports.truncate = truncate;
const slugify = (str) => {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};
exports.slugify = slugify;
// Number utilities
const formatNumber = (num, decimals = 2) => {
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
exports.formatNumber = formatNumber;
const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency
    }).format(amount);
};
exports.formatCurrency = formatCurrency;
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
exports.formatBytes = formatBytes;
const formatPercentage = (value, decimals = 2) => {
    return `${(value * 100).toFixed(decimals)}%`;
};
exports.formatPercentage = formatPercentage;
const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};
exports.clamp = clamp;
const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
exports.randomInt = randomInt;
const randomFloat = (min, max, decimals = 2) => {
    const num = Math.random() * (max - min) + min;
    return parseFloat(num.toFixed(decimals));
};
exports.randomFloat = randomFloat;
// Array utilities
const chunk = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};
exports.chunk = chunk;
const unique = (array) => {
    return [...new Set(array)];
};
exports.unique = unique;
const uniqueBy = (array, key) => {
    const seen = new Set();
    return array.filter(item => {
        const value = item[key];
        if (seen.has(value))
            return false;
        seen.add(value);
        return true;
    });
};
exports.uniqueBy = uniqueBy;
const groupBy = (array, key) => {
    return array.reduce((groups, item) => {
        const group = String(item[key]);
        if (!groups[group])
            groups[group] = [];
        groups[group].push(item);
        return groups;
    }, {});
};
exports.groupBy = groupBy;
const shuffle = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
exports.shuffle = shuffle;
const flatten = (array) => {
    return array.reduce((flat, item) => {
        return flat.concat(Array.isArray(item) ? (0, exports.flatten)(item) : item);
    }, []);
};
exports.flatten = flatten;
const difference = (array1, array2) => {
    return array1.filter(item => !array2.includes(item));
};
exports.difference = difference;
const intersection = (array1, array2) => {
    return array1.filter(item => array2.includes(item));
};
exports.intersection = intersection;
// Object utilities
const pick = (obj, keys) => {
    return keys.reduce((result, key) => {
        if (key in obj) {
            result[key] = obj[key];
        }
        return result;
    }, {});
};
exports.pick = pick;
const omit = (obj, keys) => {
    const result = { ...obj };
    keys.forEach(key => {
        delete result[key];
    });
    return result;
};
exports.omit = omit;
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (obj instanceof Date)
        return new Date(obj.getTime());
    if (obj instanceof Array)
        return obj.map(item => (0, exports.deepClone)(item));
    if (obj instanceof Object) {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = (0, exports.deepClone)(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
};
exports.deepClone = deepClone;
const deepMerge = (target, ...sources) => {
    if (!sources.length)
        return target;
    const source = sources.shift();
    if ((0, exports.isObject)(target) && (0, exports.isObject)(source)) {
        for (const key in source) {
            if ((0, exports.isObject)(source[key])) {
                if (!target[key])
                    Object.assign(target, { [key]: {} });
                (0, exports.deepMerge)(target[key], source[key]);
            }
            else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }
    return (0, exports.deepMerge)(target, ...sources);
};
exports.deepMerge = deepMerge;
const isObject = (item) => {
    return item && typeof item === 'object' && !Array.isArray(item);
};
exports.isObject = isObject;
const isEmpty = (obj) => {
    if (obj == null)
        return true;
    if (typeof obj === 'string' || Array.isArray(obj))
        return obj.length === 0;
    if (typeof obj === 'object')
        return Object.keys(obj).length === 0;
    return false;
};
exports.isEmpty = isEmpty;
// URL utilities
const parseQueryString = (queryString) => {
    const params = new URLSearchParams(queryString);
    const result = {};
    params.forEach((value, key) => {
        result[key] = value;
    });
    return result;
};
exports.parseQueryString = parseQueryString;
const buildQueryString = (params) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
        }
    });
    return searchParams.toString();
};
exports.buildQueryString = buildQueryString;
const joinPaths = (...paths) => {
    return paths
        .map(path => path.replace(/^\/+|\/+$/g, ''))
        .filter(path => path.length > 0)
        .join('/');
};
exports.joinPaths = joinPaths;
// Color utilities
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        }
        : null;
};
exports.hexToRgb = hexToRgb;
const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
};
exports.rgbToHex = rgbToHex;
const lightenColor = (color, amount) => {
    const rgb = (0, exports.hexToRgb)(color);
    if (!rgb)
        return color;
    const { r, g, b } = rgb;
    const newR = Math.min(255, Math.round(r + (255 - r) * amount));
    const newG = Math.min(255, Math.round(g + (255 - g) * amount));
    const newB = Math.min(255, Math.round(b + (255 - b) * amount));
    return (0, exports.rgbToHex)(newR, newG, newB);
};
exports.lightenColor = lightenColor;
const darkenColor = (color, amount) => {
    const rgb = (0, exports.hexToRgb)(color);
    if (!rgb)
        return color;
    const { r, g, b } = rgb;
    const newR = Math.max(0, Math.round(r * (1 - amount)));
    const newG = Math.max(0, Math.round(g * (1 - amount)));
    const newB = Math.max(0, Math.round(b * (1 - amount)));
    return (0, exports.rgbToHex)(newR, newG, newB);
};
exports.darkenColor = darkenColor;
// Async utilities
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.sleep = sleep;
const retry = async (fn, options = {}) => {
    const { retries = 3, delay = 1000, backoff = 2 } = options;
    try {
        return await fn();
    }
    catch (error) {
        if (retries <= 0)
            throw error;
        await (0, exports.sleep)(delay);
        return (0, exports.retry)(fn, {
            retries: retries - 1,
            delay: delay * backoff,
            backoff
        });
    }
};
exports.retry = retry;
const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};
exports.debounce = debounce;
const throttle = (fn, limit) => {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};
exports.throttle = throttle;
// Crypto utilities
const generateUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
exports.generateUuid = generateUuid;
const hash = async (message, algorithm = 'SHA-256') => {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
exports.hash = hash;
const base64Encode = (str) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
};
exports.base64Encode = base64Encode;
const base64Decode = (str) => {
    return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
};
exports.base64Decode = base64Decode;
// Environment utilities
const isDevelopment = () => {
    return process?.env?.NODE_ENV === 'development';
};
exports.isDevelopment = isDevelopment;
const isProduction = () => {
    return process?.env?.NODE_ENV === 'production';
};
exports.isProduction = isProduction;
const isTest = () => {
    return process?.env?.NODE_ENV === 'test';
};
exports.isTest = isTest;
const isBrowser = () => {
    return typeof globalThis !== 'undefined' && 'window' in globalThis;
};
exports.isBrowser = isBrowser;
const isNode = () => {
    return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
};
exports.isNode = isNode;
//# sourceMappingURL=utils.js.map