import multer from 'multer'

// Configure multer for PDF uploads using memory storage for R2 streaming
const storage = multer.memoryStorage()

// File filter for PDF only
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true)
    } else {
        cb(new Error('Invalid file type. Only PDF files are allowed.'), false)
    }
}

// Configure multer with size limits and validation
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
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
                message: 'File size too large. Maximum size is 10MB.'
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
                message: 'Unexpected field name. Use "menu" as the field name.'
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
