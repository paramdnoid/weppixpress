import { Schema } from 'joi';
import { Request, Response, NextFunction } from 'express';

// Validation Types
export interface ValidationSchema {
  body?: Schema;
  query?: Schema;
  params?: Schema;
  headers?: Schema;
}

export interface ValidationOptions {
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  context?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  value?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  type: string;
  value?: any;
}

export type ValidationMiddleware = (
  schema: ValidationSchema,
  options?: ValidationOptions
) => (req: Request, res: Response, next: NextFunction) => void;

// Validator Functions
export interface Validators {
  isEmail(email: string): boolean;
  isURL(url: string, options?: URLValidationOptions): boolean;
  isUUID(uuid: string, version?: '3' | '4' | '5'): boolean;
  isAlphanumeric(str: string): boolean;
  isNumeric(str: string): boolean;
  isBase64(str: string): boolean;
  isJSON(str: string): boolean;
  isMobilePhone(phone: string, locale?: string): boolean;
  isStrongPassword(password: string, options?: PasswordStrengthOptions): boolean;
  sanitize(input: string, options?: SanitizationOptions): string;
}

export interface URLValidationOptions {
  protocols?: string[];
  require_tld?: boolean;
  require_protocol?: boolean;
  require_host?: boolean;
  require_valid_protocol?: boolean;
  allow_underscores?: boolean;
  allow_trailing_dot?: boolean;
  allow_protocol_relative_urls?: boolean;
}

export interface PasswordStrengthOptions {
  minLength?: number;
  minLowercase?: number;
  minUppercase?: number;
  minNumbers?: number;
  minSymbols?: number;
}

export interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  textFilter?: (text: string) => string;
}

// Field Validators
export interface FieldValidator {
  field: string;
  rules: ValidationRule[];
  message?: string;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message?: string;
  validator?: (value: any) => boolean | Promise<boolean>;
}

// Schema Builders
export interface SchemaBuilder {
  string(field: string): StringSchemaBuilder;
  number(field: string): NumberSchemaBuilder;
  boolean(field: string): BooleanSchemaBuilder;
  array(field: string): ArraySchemaBuilder;
  object(field: string): ObjectSchemaBuilder;
  date(field: string): DateSchemaBuilder;
  file(field: string): FileSchemaBuilder;
}

export interface StringSchemaBuilder {
  required(message?: string): this;
  email(message?: string): this;
  url(message?: string): this;
  min(length: number, message?: string): this;
  max(length: number, message?: string): this;
  pattern(regex: RegExp, message?: string): this;
  enum(values: string[], message?: string): this;
  alphanum(message?: string): this;
  trim(): this;
  lowercase(): this;
  uppercase(): this;
}

export interface NumberSchemaBuilder {
  required(message?: string): this;
  min(value: number, message?: string): this;
  max(value: number, message?: string): this;
  integer(message?: string): this;
  positive(message?: string): this;
  negative(message?: string): this;
  precision(limit: number, message?: string): this;
}

export interface BooleanSchemaBuilder {
  required(message?: string): this;
  truthy(values: any[], message?: string): this;
  falsy(values: any[], message?: string): this;
}

export interface ArraySchemaBuilder {
  required(message?: string): this;
  min(length: number, message?: string): this;
  max(length: number, message?: string): this;
  items(schema: any): this;
  unique(message?: string): this;
}

export interface ObjectSchemaBuilder {
  required(message?: string): this;
  keys(schema: Record<string, any>): this;
  unknown(allow?: boolean): this;
}

export interface DateSchemaBuilder {
  required(message?: string): this;
  min(date: Date | string, message?: string): this;
  max(date: Date | string, message?: string): this;
  iso(message?: string): this;
}

export interface FileSchemaBuilder {
  required(message?: string): this;
  maxSize(bytes: number, message?: string): this;
  mimeTypes(types: string[], message?: string): this;
  extensions(exts: string[], message?: string): this;
}