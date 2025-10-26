import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import logger from '../config/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/icons/stamps')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

/**
 * Validate SVG content for security
 * Checks for malicious code patterns in SVG files
 */
export function validateSVGContent(buffer) {
  try {
    const content = buffer.toString('utf8')
    
    // Check for <svg tag
    if (!content.includes('<svg')) {
      return { valid: false, error: 'Not a valid SVG file - missing <svg> tag' }
    }
    
    // Check for suspicious content
    const suspiciousPatterns = [
      /<script/i,           // Script tags
      /javascript:/i,       // JavaScript protocol
      /on\w+\s*=/i,        // Event handlers (onclick, onload, etc.)
      /<iframe/i,           // Iframes
      /<embed/i,            // Embed tags
      /<object/i,           // Object tags
      /xlink:href.*javascript/i, // XLink with JavaScript
    ]
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return { valid: false, error: 'SVG contains potentially malicious content' }
      }
    }
    
    return { valid: true }
  } catch (error) {
    logger.error('Error validating SVG content:', error)
    return { valid: false, error: 'Failed to validate SVG content' }
  }
}

/**
 * Sanitize filename to prevent directory traversal
 */
function sanitizeFilename(filename) {
  // Remove any path components
  const basename = path.basename(filename)
  // Replace any non-alphanumeric characters (except dash, underscore, dot)
  return basename.replace(/[^a-zA-Z0-9-_.]/g, '-').toLowerCase()
}

/**
 * Multer storage configuration for icon uploads
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    // Get icon ID from params (for PUT) or body (for POST)
    const iconId = req.params.id || req.body.id || 'icon'
    // Get variant from field name (filled or stroke)
    const variant = file.fieldname
    
    // Sanitize icon ID
    const safeIconId = sanitizeFilename(iconId)
    
    // Generate filename: {iconId}-{variant}.svg
    const filename = `${safeIconId}-${variant}.svg`
    
    logger.info('Saving icon file:', { iconId, variant, filename })
    cb(null, filename)
  }
})

/**
 * File filter for SVG validation
 */
const fileFilter = (req, file, cb) => {
  try {
    // Check MIME type
    if (file.mimetype !== 'image/svg+xml') {
      logger.warn('Invalid file type attempted upload:', { 
        mimetype: file.mimetype,
        originalname: file.originalname 
      })
      return cb(new Error('Only SVG files are allowed'), false)
    }
    
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext !== '.svg') {
      logger.warn('Invalid file extension:', { ext, originalname: file.originalname })
      return cb(new Error('File must have .svg extension'), false)
    }
    
    cb(null, true)
  } catch (error) {
    logger.error('Error in file filter:', error)
    cb(error, false)
  }
}

/**
 * Multer upload middleware configuration
 * Supports uploading both filled and stroke variants
 */
export const iconUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024, // 500KB max per file
    files: 2              // Maximum 2 files (filled + stroke)
  }
})

/**
 * Error handler for icon upload errors
 * Provides user-friendly error messages
 */
export function handleIconUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    logger.error('Multer error:', err)
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'FILE_TOO_LARGE',
          message: 'File size exceeds 500KB limit. Please use a smaller SVG file.'
        })
      
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'TOO_MANY_FILES',
          message: 'Maximum 2 files allowed (filled and stroke variants).'
        })
      
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'UNEXPECTED_FILE',
          message: 'Unexpected file field. Use "filled" or "stroke" field names.'
        })
      
      default:
        return res.status(400).json({
          success: false,
          error: 'UPLOAD_ERROR',
          message: `Upload error: ${err.message}`
        })
    }
  } else if (err) {
    // Other errors (e.g., from fileFilter)
    logger.error('Upload error:', err)
    
    return res.status(400).json({
      success: false,
      error: 'INVALID_FILE',
      message: err.message || 'Invalid file upload'
    })
  }
  
  next()
}

/**
 * Middleware to validate SVG content after upload
 * Should be used after multer middleware
 */
export function validateUploadedSVGs(req, res, next) {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'NO_FILES',
        message: 'At least one SVG file (filled variant) is required'
      })
    }
    
    // Validate each uploaded file
    const files = Object.values(req.files).flat()
    
    for (const file of files) {
      const buffer = fs.readFileSync(file.path)
      const validation = validateSVGContent(buffer)
      
      if (!validation.valid) {
        // Delete uploaded files
        files.forEach(f => {
          try {
            fs.unlinkSync(f.path)
          } catch (err) {
            logger.error('Error deleting invalid file:', err)
          }
        })
        
        return res.status(400).json({
          success: false,
          error: 'INVALID_SVG',
          message: validation.error
        })
      }
    }
    
    logger.info('SVG validation passed for all files')
    next()
  } catch (error) {
    logger.error('Error validating uploaded SVGs:', error)
    return res.status(500).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Failed to validate uploaded files'
    })
  }
}
