import path from 'path'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'

// Enhanced file validation
export function validateFileUpload(req, res, next) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files provided' })
  }

  const errors = []
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 104857600 // 100MB
  const maxFiles = parseInt(process.env.MAX_FILES_PER_REQUEST) || 10

  // Check file count
  if (req.files.length > maxFiles) {
    return res.status(400).json({ 
      error: `Too many files. Maximum ${maxFiles} files allowed` 
    })
  }

  // Dangerous file extensions - expanded list
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', 
    '.jar', '.sh', '.php', '.pl', '.py', '.rb', '.ps1', '.msi',
    '.deb', '.rpm', '.dmg', '.pkg', '.app', '.ipa', '.apk',
    '.gadget', '.hta', '.reg', '.lnk', '.cpl', '.inf', '.scf'
  ]

  // Allowed MIME types
  const allowedMimeTypes = [
    'image/', 'video/', 'audio/', 'text/', 'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument',
    'application/zip', 'application/x-rar-compressed'
  ]

  req.files.forEach((file, index) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const mimeType = file.mimetype

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File ${index + 1}: Size exceeds ${maxSize} bytes`)
    }

    // Check dangerous extensions
    if (dangerousExtensions.includes(ext)) {
      errors.push(`File ${index + 1}: File type ${ext} not allowed`)
    }

    // Check MIME type
    const isAllowedMime = allowedMimeTypes.some(allowed => 
      mimeType.startsWith(allowed)
    )
    if (!isAllowedMime) {
      errors.push(`File ${index + 1}: MIME type ${mimeType} not allowed`)
    }

    // Check for double extensions
    const nameParts = file.originalname.split('.')
    if (nameParts.length > 2) {
      const hasExecutable = nameParts.some(part => 
        dangerousExtensions.includes('.' + part.toLowerCase())
      )
      if (hasExecutable) {
        errors.push(`File ${index + 1}: Suspicious filename`)
      }
    }

    // Generate file hash for deduplication
    file.hash = createHash('sha256')
      .update(`${file.originalname}-${file.size}-${Date.now()}`)
      .digest('hex')

    // Content-based security scanning
    try {
      const fileBuffer = readFileSync(file.path)
      const fileContent = fileBuffer.toString('utf8', 0, Math.min(1024, fileBuffer.length))
      
      // Check for suspicious content patterns
      const maliciousPatterns = [
        /eval\s*\(/gi,
        /exec\s*\(/gi,
        /system\s*\(/gi,
        /shell_exec\s*\(/gi,
        /passthru\s*\(/gi,
        /file_get_contents\s*\(/gi,
        /<?php/gi,
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /data:text\/html/gi,
        /\.prototype[\s\S]*?=/gi,
        /require\s*\(['"`]/gi,
        /import\s+.*?\s+from/gi
      ]

      const suspiciousFound = maliciousPatterns.some(pattern => pattern.test(fileContent))
      
      if (suspiciousFound) {
        errors.push(`File ${index + 1}: Contains suspicious content`)
      }

      // Check magic bytes for common executable formats
      const magicBytes = fileBuffer.subarray(0, 4)
      const executableSignatures = [
        [0x4D, 0x5A], // PE executable (Windows .exe)
        [0x7F, 0x45, 0x4C, 0x46], // ELF executable (Linux)
        [0xCA, 0xFE, 0xBA, 0xBE], // Java class file
        [0xFE, 0xED, 0xFA], // Mach-O executable (macOS)
        [0x50, 0x4B, 0x03, 0x04], // ZIP/JAR (potential executable)
      ]

      for (const signature of executableSignatures) {
        if (magicBytes.subarray(0, signature.length).every((byte, idx) => byte === signature[idx])) {
          errors.push(`File ${index + 1}: Executable file format detected`)
          break
        }
      }
    } catch (scanError) {
      console.warn(`Content scan failed for file ${index + 1}:`, scanError.message)
    }
  })

  if (errors.length > 0) {
    return res.status(400).json({ error: 'File validation failed', details: errors })
  }

  next()
}

// Path traversal protection
export function validatePath(req, res, next) {
  const { path } = req.query
  
  if (path) {
    // Remove any path traversal attempts
    const sanitized = path
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*\x00-\x1F]/g, '')
      .replace(/^\/+/, '')
    
    req.query.path = sanitized
  }

  next()
}

// Rate limiting for file operations
import rateLimit from 'express-rate-limit'

export const fileUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 uploads per windowMs
  message: {
    error: 'Too many upload attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
})

export const fileOperationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 file operations per minute
  message: {
    error: 'Too many file operations, please slow down'
  }
})

// Updated upload controller with security
import { validateFileUpload, fileUploadLimiter } from '../middleware/fileValidation.js'

// backend/routes/upload.js - Add security middleware
router.post('/', 
  authenticate, 
  fileUploadLimiter,
  upload.array('files'), 
  validateFileUpload,
  uploadFile
)