import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Ensure uploads directory exists
// Production: Uses UPLOADS_DIR env var pointing to persistent disk mount
// Development: Falls back to ./uploads directory
const uploadsRoot = process.env.UPLOADS_DIR || './uploads'
const uploadsDir = path.join(uploadsRoot, 'logos')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    // Generate unique filename: businessId_timestamp.ext
    const businessId = req.business?.public_id || 'unknown'
    const timestamp = Date.now()
    const ext = path.extname(file.originalname)
    const filename = `${businessId}_${timestamp}${ext}`
    cb(null, filename)
  }
})

// File filter for images only
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false)
  }
}

// Configure multer with size limits and validation
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file
  },
  fileFilter: fileFilter
})

// Middleware to handle upload errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      })
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file is allowed.'
      })
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Use "logo" as the field name.'
      })
    }
  }

  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }

  next(err)
}

export { upload, handleUploadError }