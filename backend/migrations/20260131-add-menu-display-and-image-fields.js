/**
 * Migration: Add Menu Display and Image Management Fields
 * 
 * Adds fields to businesses table for PDF menu and display mode support along with
 * enhanced image management fields for products (multi-res, filename, size).
 * 
 * Fields added to businesses:
 * - menu_display_mode: ENUM('grid', 'list', 'pdf')
 * - menu_pdf_url: URL to PDF menu
 * - menu_pdf_filename: Original filename
 * - menu_pdf_uploaded_at: Upload timestamp
 * 
 * Fields added to products:
 * - image_original_url: Full resolution URL
 * - image_large_url: Optimized desktop version
 * - image_thumbnail_url: Mobile/lazy load version
 * - image_filename: Original filename
 * - image_uploaded_at: Upload timestamp
 * - image_file_size: Size in bytes
 * 
 * Index added:
 * - idx_products_image_uploaded_at on products(image_uploaded_at)
 * 
 * Usage:
 * - Run: node backend/migrations/20260131-add-menu-display-and-image-fields.js
 * - Rollback: node backend/migrations/20260131-add-menu-display-and-image-fields.js down
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

async function up() {
    const queryInterface = sequelize.getQueryInterface()

    logger.info('🔄 Starting migration: Add menu display and image management fields...')

    try {
        // 1. Add Business table fields

        // Check menu_display_mode
        const [menuDisplayMode] = await sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'menu_display_mode'"
        )
        if (menuDisplayMode.length === 0) {
            // Use VARCHAR + CHECK constraint as per README policy
            await queryInterface.addColumn('businesses', 'menu_display_mode', {
                type: sequelize.Sequelize.STRING(20),
                defaultValue: 'grid',
                allowNull: false
            })

            await sequelize.query(`
                ALTER TABLE businesses 
                ADD CONSTRAINT check_menu_display_mode 
                CHECK (menu_display_mode IN ('grid', 'list', 'pdf'))
            `)
            logger.info('✅ Added menu_display_mode with CHECK constraint to businesses table')
        }

        // Check menu_pdf_url
        const [menuPdfUrl] = await sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'menu_pdf_url'"
        )
        if (menuPdfUrl.length === 0) {
            await queryInterface.addColumn('businesses', 'menu_pdf_url', {
                type: sequelize.Sequelize.STRING(500),
                allowNull: true
            })
            logger.info('✅ Added menu_pdf_url to businesses table')
        }

        // Check menu_pdf_filename
        const [menuPdfFilename] = await sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'menu_pdf_filename'"
        )
        if (menuPdfFilename.length === 0) {
            await queryInterface.addColumn('businesses', 'menu_pdf_filename', {
                type: sequelize.Sequelize.STRING(255),
                allowNull: true
            })
            logger.info('✅ Added menu_pdf_filename to businesses table')
        }

        // Check menu_pdf_uploaded_at
        const [menuPdfUploadedAt] = await sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'menu_pdf_uploaded_at'"
        )
        if (menuPdfUploadedAt.length === 0) {
            await queryInterface.addColumn('businesses', 'menu_pdf_uploaded_at', {
                type: sequelize.Sequelize.DATE,
                allowNull: true
            })
            logger.info('✅ Added menu_pdf_uploaded_at to businesses table')
        }

        // 2. Add Product table fields

        // Check image_original_url
        const [imageOriginalUrl] = await sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_original_url'"
        )
        if (imageOriginalUrl.length === 0) {
            await queryInterface.addColumn('products', 'image_original_url', {
                type: sequelize.Sequelize.STRING(500),
                allowNull: true
            })
            logger.info('✅ Added image_original_url to products table')
        }

        // Check image_large_url
        const [imageLargeUrl] = await sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_large_url'"
        )
        if (imageLargeUrl.length === 0) {
            await queryInterface.addColumn('products', 'image_large_url', {
                type: sequelize.Sequelize.STRING(500),
                allowNull: true
            })
            logger.info('✅ Added image_large_url to products table')
        }

        // Check image_thumbnail_url
        const [imageThumbnailUrl] = await sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_thumbnail_url'"
        )
        if (imageThumbnailUrl.length === 0) {
            await queryInterface.addColumn('products', 'image_thumbnail_url', {
                type: sequelize.Sequelize.STRING(500),
                allowNull: true
            })
            logger.info('✅ Added image_thumbnail_url to products table')
        }

        // Check image_filename
        const [imageFilename] = await sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_filename'"
        )
        if (imageFilename.length === 0) {
            await queryInterface.addColumn('products', 'image_filename', {
                type: sequelize.Sequelize.STRING(255),
                allowNull: true
            })
            logger.info('✅ Added image_filename to products table')
        }

        // Check image_uploaded_at
        const [imageUploadedAt] = await sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_uploaded_at'"
        )
        if (imageUploadedAt.length === 0) {
            await queryInterface.addColumn('products', 'image_uploaded_at', {
                type: sequelize.Sequelize.DATE,
                allowNull: true
            })
            logger.info('✅ Added image_uploaded_at to products table')
        }

        // Check image_file_size
        const [imageFileSize] = await sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_file_size'"
        )
        if (imageFileSize.length === 0) {
            await queryInterface.addColumn('products', 'image_file_size', {
                type: sequelize.Sequelize.INTEGER,
                allowNull: true
            })
            logger.info('✅ Added image_file_size to products table')
        }

        // 3. Add index on products.image_uploaded_at
        const [indexExists] = await sequelize.query(
            "SELECT * FROM pg_indexes WHERE tablename = 'products' AND indexname = 'idx_products_image_uploaded_at'"
        )
        if (indexExists.length === 0) {
            await queryInterface.addIndex('products', ['image_uploaded_at'], {
                name: 'idx_products_image_uploaded_at'
            })
            logger.info('✅ Added index idx_products_image_uploaded_at')
        }

        // 4. Backward compatibility verification
        const [imageUrlCheck] = await sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_url'"
        )
        if (imageUrlCheck.length > 0) {
            logger.info('✅ Backward compatibility verified: image_url field exists')
        } else {
            logger.warn('⚠️ Warning: image_url field missing from products table!')
        }

        logger.info('✅ Migration completed successfully!')

    } catch (error) {
        logger.error('❌ Migration failed:', error)
        throw error
    }
}

async function down() {
    const queryInterface = sequelize.getQueryInterface()
    logger.info('🔄 Rolling back migration: Remove menu display and image fields...')

    try {
        // Business table fields
        const businessFields = ['menu_display_mode', 'menu_pdf_url', 'menu_pdf_filename', 'menu_pdf_uploaded_at']
        for (const field of businessFields) {
            const [exists] = await sequelize.query(
                `SELECT column_name FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = '${field}'`
            )
            if (exists.length > 0) {
                await queryInterface.removeColumn('businesses', field)
                logger.info(`✅ Removed ${field} from businesses`)
            }
        }

        // Product table fields
        const productFields = ['image_original_url', 'image_large_url', 'image_thumbnail_url', 'image_filename', 'image_uploaded_at', 'image_file_size']
        for (const field of productFields) {
            const [exists] = await sequelize.query(
                `SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = '${field}'`
            )
            if (exists.length > 0) {
                await queryInterface.removeColumn('products', field)
                logger.info(`✅ Removed ${field} from products`)
            }
        }

        // Drop index
        try {
            await queryInterface.removeIndex('products', 'idx_products_image_uploaded_at')
            logger.info('✅ Removed index idx_products_image_uploaded_at')
        } catch (error) {
            // Index might be gone already if column was removed? Or if it didn't exist.
            // Ignore error if it doesn't exist.
        }

        // 4. Drop CHECK constraint for menu_display_mode
        try {
            await sequelize.query('ALTER TABLE businesses DROP CONSTRAINT IF EXISTS check_menu_display_mode')
            logger.info('✅ Dropped CHECK constraint check_menu_display_mode')
        } catch (error) {
            logger.warn('⚠️ Could not drop check_menu_display_mode constraint')
        }

        logger.info('✅ Rollback completed successfully!')

    } catch (error) {
        logger.error('❌ Rollback failed:', error)
        throw error
    }
}

// Run migration if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    (async () => {
        try {
            await sequelize.authenticate()
            logger.info('✅ Database connection established')

            const command = process.argv[2]

            if (command === 'down') {
                await down()
            } else {
                await up()
            }

            await sequelize.close()
            logger.info('✅ Database connection closed')
            process.exit(0)

        } catch (error) {
            logger.error('❌ Migration script failed:', error)
            process.exit(1)
        }
    })()
}

export { up, down }
