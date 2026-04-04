import multer from 'multer'

// Configure multer for logo uploads using memory storage for R2 streaming
const storage = multer.memoryStorage()

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