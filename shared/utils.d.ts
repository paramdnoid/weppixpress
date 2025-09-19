/**
 * Shared utility functions
 */
export declare const formatDate: (date: Date | string, format?: string) => string;
export declare const formatRelativeTime: (date: Date | string) => string;
export declare const capitalize: (str: string) => string;
export declare const titleCase: (str: string) => string;
export declare const camelCase: (str: string) => string;
export declare const snakeCase: (str: string) => string;
export declare const kebabCase: (str: string) => string;
export declare const truncate: (str: string, length: number, suffix?: string) => string;
export declare const slugify: (str: string) => string;
export declare const formatNumber: (num: number, decimals?: number) => string;
export declare const formatCurrency: (amount: number, currency?: string, locale?: string) => string;
export declare const formatBytes: (bytes: number, decimals?: number) => string;
export declare const formatPercentage: (value: number, decimals?: number) => string;
export declare const clamp: (value: number, min: number, max: number) => number;
export declare const randomInt: (min: number, max: number) => number;
export declare const randomFloat: (min: number, max: number, decimals?: number) => number;
export declare const chunk: <T>(array: T[], size: number) => T[][];
export declare const unique: <T>(array: T[]) => T[];
export declare const uniqueBy: <T>(array: T[], key: keyof T) => T[];
export declare const groupBy: <T>(array: T[], key: keyof T) => Record<string, T[]>;
export declare const shuffle: <T>(array: T[]) => T[];
export declare const flatten: <T>(array: (T | T[])[]) => T[];
export declare const difference: <T>(array1: T[], array2: T[]) => T[];
export declare const intersection: <T>(array1: T[], array2: T[]) => T[];
export declare const pick: <T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]) => Pick<T, K>;
export declare const omit: <T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]) => Omit<T, K>;
export declare const deepClone: <T>(obj: T) => T;
export declare const deepMerge: <T extends Record<string, any>>(target: T, ...sources: Partial<T>[]) => T;
export declare const isObject: (item: any) => item is Record<string, any>;
export declare const isEmpty: (obj: any) => boolean;
export declare const parseQueryString: (queryString: string) => Record<string, string>;
export declare const buildQueryString: (params: Record<string, any>) => string;
export declare const joinPaths: (...paths: string[]) => string;
export declare const hexToRgb: (hex: string) => {
    r: number;
    g: number;
    b: number;
} | null;
export declare const rgbToHex: (r: number, g: number, b: number) => string;
export declare const lightenColor: (color: string, amount: number) => string;
export declare const darkenColor: (color: string, amount: number) => string;
export declare const sleep: (ms: number) => Promise<void>;
export declare const retry: <T>(fn: () => Promise<T>, options?: {
    retries?: number;
    delay?: number;
    backoff?: number;
}) => Promise<T>;
export declare const debounce: <T extends (...args: any[]) => any>(fn: T, delay: number) => (...args: Parameters<T>) => void;
export declare const throttle: <T extends (...args: any[]) => any>(fn: T, limit: number) => (...args: Parameters<T>) => void;
export declare const generateUuid: () => string;
export declare const hash: (message: string, algorithm?: "SHA-1" | "SHA-256" | "SHA-512") => Promise<string>;
export declare const base64Encode: (str: string) => string;
export declare const base64Decode: (str: string) => string;
export declare const isDevelopment: () => boolean;
export declare const isProduction: () => boolean;
export declare const isTest: () => boolean;
export declare const isBrowser: () => boolean;
export declare const isNode: () => boolean;
//# sourceMappingURL=utils.d.ts.map