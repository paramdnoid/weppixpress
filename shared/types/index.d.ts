export interface User {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    role: UserRole;
    status: UserStatus;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
    settings?: UserSettings;
}
export declare enum UserRole {
    ADMIN = "admin",
    MODERATOR = "moderator",
    USER = "user",
    GUEST = "guest"
}
export declare enum UserStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended",
    DELETED = "deleted"
}
export interface UserSettings {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    notifications: NotificationSettings;
    privacy: PrivacySettings;
}
export interface NotificationSettings {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
    digest: 'daily' | 'weekly' | 'monthly' | 'never';
}
export interface PrivacySettings {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showActivity: boolean;
    allowMessages: boolean;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
}
export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
    twoFactorCode?: string;
}
export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
    agreeToTerms: boolean;
}
export interface FileItem {
    id: string;
    name: string;
    path: string;
    size: number;
    type: FileType;
    mimeType: string;
    extension: string;
    isDirectory: boolean;
    parentId?: string;
    ownerId: string;
    permissions: FilePermissions;
    metadata: FileMetadata;
    tags: string[];
    starred: boolean;
    shared: boolean;
    sharedWith: string[];
    version: number;
    createdAt: Date;
    updatedAt: Date;
    lastAccessedAt?: Date;
    deletedAt?: Date;
}
export interface FileType {
    category: FileCategory;
    icon: string;
    color: string;
}
export declare enum FileCategory {
    DOCUMENT = "document",
    IMAGE = "image",
    VIDEO = "video",
    AUDIO = "audio",
    ARCHIVE = "archive",
    CODE = "code",
    SPREADSHEET = "spreadsheet",
    PRESENTATION = "presentation",
    PDF = "pdf",
    TEXT = "text",
    FOLDER = "folder",
    OTHER = "other"
}
export interface FilePermissions {
    owner: PermissionLevel;
    group: PermissionLevel;
    public: PermissionLevel;
    inherited: boolean;
}
export interface PermissionLevel {
    read: boolean;
    write: boolean;
    delete: boolean;
    share: boolean;
    download: boolean;
}
export interface FileMetadata {
    width?: number;
    height?: number;
    duration?: number;
    bitrate?: number;
    codec?: string;
    pages?: number;
    words?: number;
    thumbnail?: string;
    preview?: string;
    checksum?: string;
    virusScanStatus?: 'pending' | 'clean' | 'infected' | 'error';
    virusScanDate?: Date;
    customMetadata?: Record<string, unknown>;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    message?: string;
    timestamp: number;
    requestId: string;
    duration?: number;
}
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
    field?: string;
    validationErrors?: ValidationError[];
    retryable?: boolean;
    retryAfter?: number;
}
export interface ValidationError {
    field: string;
    message: string;
    code: string;
    value?: unknown;
    constraints?: Record<string, unknown>;
}
export interface PaginatedResponse<T> {
    items: T[];
    pagination: PaginationMeta;
}
export interface PaginationMeta {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor?: string;
    previousCursor?: string;
}
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;
export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
export declare function isString(value: unknown): value is string;
export declare function isNumber(value: unknown): value is number;
export declare function isBoolean(value: unknown): value is boolean;
export declare function isObject(value: unknown): value is Record<string, unknown>;
export declare function isArray<T>(value: unknown): value is T[];
export declare function isApiResponse<T>(value: unknown): value is ApiResponse<T>;
//# sourceMappingURL=index.d.ts.map