/**
 * Shared validation functions
 */
export declare const isValidEmail: (email: string) => boolean;
export declare const isValidPassword: (password: string, options?: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecial?: boolean;
}) => {
    valid: boolean;
    errors: string[];
};
export declare const isValidPhone: (phone: string) => boolean;
export declare const isValidUrl: (url: string) => boolean;
export declare const isValidUuid: (uuid: string) => boolean;
export declare const isValidFileSize: (size: number, maxSizeInMB: number) => boolean;
export declare const isValidFileExtension: (filename: string, allowedExtensions: string[]) => boolean;
export declare const isValidMimeType: (mimeType: string, allowedTypes: string[]) => boolean;
export declare const isValidDate: (date: string | Date) => boolean;
export declare const isValidDateRange: (startDate: string | Date, endDate: string | Date) => boolean;
export declare const isValidCreditCard: (cardNumber: string) => boolean;
export declare const isValidIPv4: (ip: string) => boolean;
export declare const isValidIPv6: (ip: string) => boolean;
export declare const isValidMacAddress: (mac: string) => boolean;
export declare const isValidHexColor: (color: string) => boolean;
export declare const isValidRgbColor: (color: string) => boolean;
export declare const isValidUsername: (username: string, options?: {
    minLength?: number;
    maxLength?: number;
    allowSpecialChars?: boolean;
}) => boolean;
export declare const isValidJson: (str: string) => boolean;
export declare const isValidBase64: (str: string) => boolean;
export declare const isValidJwt: (token: string) => boolean;
export declare const isValidSemver: (version: string) => boolean;
export declare const isValidUsPostalCode: (code: string) => boolean;
export declare const generateStrongPassword: (length?: number) => string;
export declare const userValidationSchema: {
    email: (email: string) => boolean;
    password: (password: string) => boolean;
    first_name: (name: string) => boolean;
    last_name: (name: string) => boolean;
};
export declare const fileValidationSchema: {
    name: (name: string) => boolean;
    size: (size: number) => boolean;
    mime_type: (type: string) => boolean;
};
//# sourceMappingURL=validators.d.ts.map