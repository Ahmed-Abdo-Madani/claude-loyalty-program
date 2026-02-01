import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Ensure upload directory exists
const UPLOADS_DIR = process.env.UPLOADS_DIR || 'uploads'
const PRODUCTS_DIR = path.join(UPLOADS_DIR, 'products')

if (!fs.existsSync(PRODUCTS_DIR)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true })
}

// Storage configuration
const storage = multer.memoryStorage()

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        const error = new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.')
        error.code = 'LIMIT_FILE_TYPES'
        cb(error, false)
    }
}

// Multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1
    }
})

// Error handler wrapper
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 10MB.'
            })
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files uploaded.'
            })
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected field name. Please use "image".'
            })
        }
    }

    if (err.code === 'LIMIT_FILE_TYPES') {
        return res.status(400).json({
            success: false,
            message: err.message
        })
    }

    if (err) {
        return res.status(500).json({
            success: false,
            message: 'Error uploading file.',
            error: err.message
        })
    }

    next()
}

export { upload, handleUploadError }
