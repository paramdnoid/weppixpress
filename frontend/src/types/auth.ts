// Authentication & User types
export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: UserRole
  avatar?: string
  settings?: UserSettings
  createdAt: string
  updatedAt: string
  lastLogin?: string
  isActive: boolean
  twoFactorEnabled: boolean
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer'
}

export interface UserSettings {
  theme?: 'light' | 'dark' | 'auto'
  language?: string
  notifications?: NotificationSettings
  preferences?: Record<string, unknown>
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  inApp: boolean
  digest?: 'none' | 'daily' | 'weekly'
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
  twoFactorCode?: string
}

export interface RegisterData {
  email: string
  password: string
  firstName?: string
  lastName?: string
  acceptTerms: boolean
}

export interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  newPassword: string
  confirmPassword: string
}
