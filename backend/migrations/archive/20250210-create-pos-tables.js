/**
 * =====================================================
 * Migration: Create POS System Tables
 * =====================================================
 * Date: 2025-02-10
 * Purpose: Create product_categories, products, sales, sale_items, and receipts tables
 * 
 * This migration creates all five POS tables in the correct order to respect
 * foreign key dependencies. Tables are created with all indexes, constraints,
 * and foreign key relationships defined.
 * 
 * Related Files:
 * - backend/models/ProductCategory.js
 * - backend/models/Product.js
 * - backend/models/Sale.js
 * - backend/models/SaleItem.js
 * - backend/models/Receipt.js
 * 
 * Dependencies:
 * - Existing tables: businesses, branches, customers
 * 
 * Note: Creates tables in dependency order to avoid foreign key errors
 * =====================================================
 */

import { DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
  console.log('🔧 Starting POS system tables creation migration...')
  
  const transaction = await queryInterface.sequelize.transaction()
  
  try {
    // ========================================
    // 1. Check if tables already exist
    // ========================================
    const [tables] = await queryInterface.sequelize.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name IN ('product_categories', 'products', 'sales', 'sale_items', 'receipts')`,
      { transaction }
    )
    
    const existingTables = tables.map(t => t.table_name)
    
    // ========================================
    // 2. Create product_categories table (no dependencies)
    // ========================================
    if (!existingTables.includes('product_categories')) {
      console.log('   📋 Creating product_categories table...')
      
      await queryInterface.createTable('product_categories', {
        public_id: {
          type: DataTypes.STRING(50),
          primaryKey: true,
          allowNull: false
        },
        business_id: {
          type: DataTypes.STRING(50),
          allowNull: false,
          references: {
            model: 'businesses',
            key: 'public_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        name_ar: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        display_order: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM('active', 'inactive'),
          defaultValue: 'active',
          allowNull: false
        },
        product_count: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()')
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()')
        }
      }, { transaction })
      
      // Create indexes for product_categories
      await queryInterface.addIndex('product_categories', ['business_id'], { transaction })
      await queryInterface.addIndex('product_categories', ['status'], { transaction })
      await queryInterface.addIndex('product_categories', ['display_order'], { transaction })
      
      console.log('   ✅ product_categories table created')
    }
    
    // ========================================
    // 3. Create products table (depends on product_categories, businesses, branches)
    // ========================================
    if (!existingTables.includes('products')) {
      console.log('   📋 Creating products table...')
      
      await queryInterface.createTable('products', {
        public_id: {
          type: DataTypes.STRING(50),
          primaryKey: true,
          allowNull: false
        },
        business_id: {
          type: DataTypes.STRING(50),
          allowNull: false,
          references: {
            model: 'businesses',
            key: 'public_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        branch_id: {
          type: DataTypes.STRING(50),
          allowNull: true,
          references: {
            model: 'branches',
            key: 'public_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        category_id: {
          type: DataTypes.STRING(50),
          allowNull: true,
          references: {
            model: 'product_categories',
            key: 'public_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        name_ar: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        sku: {
          type: DataTypes.STRING(100),
          allowNull: true
        },
        price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        cost: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true
        },
        tax_rate: {
          type: DataTypes.DECIMAL(5, 2),
          defaultValue: 15.00,
          allowNull: false
        },
        tax_included: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM('active', 'inactive', 'out_of_stock'),
          defaultValue: 'active',
          allowNull: false
        },
        image_url: {
          type: DataTypes.STRING(500),
          allowNull: true
        },
        display_order: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        total_sold: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        total_revenue: {
          type: DataTypes.DECIMAL(10, 2),
          defaultValue: 0.00,
          allowNull: false
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()')
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()')
        }
      }, { transaction })
      
      // Create indexes for products
      await queryInterface.addIndex('products', ['business_id'], { transaction })
      await queryInterface.addIndex('products', ['branch_id'], { transaction })
      await queryInterface.addIndex('products', ['category_id'], { transaction })
      await queryInterface.addIndex('products', ['status'], { transaction })
      await queryInterface.addIndex('products', ['sku'], { transaction })
      
      // Create unique constraint for business_id + sku (where sku is not null)
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX unique_business_sku ON products (business_id, sku) WHERE sku IS NOT NULL`,
        { transaction }
      )
      
      console.log('   ✅ products table created')
    }
    
    // ========================================
    // 4. Create sales table (depends on businesses, branches, customers)
    // ========================================
    if (!existingTables.includes('sales')) {
      console.log('   📋 Creating sales table...')
      
      await queryInterface.createTable('sales', {
        public_id: {
          type: DataTypes.STRING(50),
          primaryKey: true,
          allowNull: false
        },
        sale_number: {
          type: DataTypes.STRING(50),
          unique: true,
          allowNull: false
        },
        business_id: {
          type: DataTypes.STRING(50),
          allowNull: false,
          references: {
            model: 'businesses',
            key: 'public_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        branch_id: {
          type: DataTypes.STRING(50),
          allowNull: false,
          references: {
            model: 'branches',
            key: 'public_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        customer_id: {
          type: DataTypes.STRING(50),
          allowNull: true,
          references: {
            model: 'customers',
            key: 'customer_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        subtotal: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        tax_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        discount_amount: {
          type: DataTypes.DECIMAL(10, 2),
          defaultValue: 0.00,
          allowNull: false
        },
        total_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        payment_method: {
          type: DataTypes.ENUM('cash', 'card', 'gift_offer', 'mixed'),
          allowNull: false
        },
        payment_details: {
          type: DataTypes.JSON,
          allowNull: true
        },
        status: {
          type: DataTypes.ENUM('completed', 'cancelled', 'refunded'),
          defaultValue: 'completed',
          allowNull: false
        },
        sale_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()')
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        loyalty_discount_amount: {
          type: DataTypes.DECIMAL(10, 2),
          defaultValue: 0.00,
          allowNull: false
        },
        loyalty_redeemed: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false
        },
        created_by_manager: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()')
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()')
        }
      }, { transaction })
      
      // Create indexes for sales
      await queryInterface.addIndex('sales', ['business_id'], { transaction })
      await queryInterface.addIndex('sales', ['branch_id'], { transaction })
      await queryInterface.addIndex('sales', ['customer_id'], { transaction })
      await queryInterface.addIndex('sales', ['sale_date'], { transaction })
      await queryInterface.addIndex('sales', ['status'], { transaction })
      await queryInterface.addIndex('sales', ['payment_method'], { transaction })
      await queryInterface.addIndex('sales', ['sale_number'], { transaction })
      await queryInterface.addIndex('sales', ['business_id', 'sale_date'], { 
        name: 'business_sale_date_idx', 
        transaction 
      })
      
      console.log('   ✅ sales table created')
    }
    
    // ========================================
    // 5. Create sale_items table (depends on sales, products)
    // ========================================
    if (!existingTables.includes('sale_items')) {
      console.log('   📋 Creating sale_items table...')
      
      await queryInterface.createTable('sale_items', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        sale_id: {
          type: DataTypes.STRING(50),
          allowNull: false,
          references: {
            model: 'sales',
            key: 'public_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        product_id: {
          type: DataTypes.STRING(50),
          allowNull: false,
          references: {
            model: 'products',
            key: 'public_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        product_name: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        product_sku: {
          type: DataTypes.STRING(100),
          allowNull: true
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        unit_price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        tax_rate: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false
        },
        tax_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        subtotal: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        total: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        discount_amount: {
          type: DataTypes.DECIMAL(10, 2),
          defaultValue: 0.00,
          allowNull: false
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()')
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()')
        }
      }, { transaction })
      
      // Create indexes for sale_items
      await queryInterface.addIndex('sale_items', ['sale_id'], { transaction })
      await queryInterface.addIndex('sale_items', ['product_id'], { transaction })
      await queryInterface.addIndex('sale_items', ['sale_id', 'product_id'], { 
        name: 'sale_product_idx', 
        transaction 
      })
      
      console.log('   ✅ sale_items table created')
    }
    
    // ========================================
    // 6. Create receipts table (depends on sales)
    // ========================================
    if (!existingTables.includes('receipts')) {
      console.log('   📋 Creating receipts table...')
      
      await queryInterface.createTable('receipts', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        sale_id: {
          type: DataTypes.STRING(50),
          unique: true,
          allowNull: false,
          references: {
            model: 'sales',
            key: 'public_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        receipt_number: {
          type: DataTypes.STRING(50),
          unique: true,
          allowNull: false
        },
        format: {
          type: DataTypes.ENUM('thermal', 'a4', 'digital'),
          allowNull: false
        },
        content_json: {
          type: DataTypes.JSON,
          allowNull: false
        },
        printed_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        emailed_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        email_recipient: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        print_count: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()')
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()')
        }
      }, { transaction })
      
      // Create indexes for receipts
      await queryInterface.addIndex('receipts', ['sale_id'], { transaction })
      await queryInterface.addIndex('receipts', ['receipt_number'], { transaction })
      await queryInterface.addIndex('receipts', ['printed_at'], { transaction })
      
      console.log('   ✅ receipts table created')
    }
    
    await transaction.commit()
    console.log('✅ POS system tables migration completed successfully!')
    
  } catch (error) {
    await transaction.rollback()
    console.error('❌ POS system tables migration failed:', error.message)
    throw error
  }
}

export async function down(queryInterface, Sequelize) {
  console.log('🔧 Rolling back POS system tables migration...')
  
  const transaction = await queryInterface.sequelize.transaction()
  
  try {
    // Drop tables in reverse order (respecting foreign key dependencies)
    
    // Check and drop receipts table
    const [receiptsTables] = await queryInterface.sequelize.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'receipts'`,
      { transaction }
    )
    
    if (receiptsTables.length > 0) {
      console.log('   🗑️  Dropping receipts table...')
      await queryInterface.dropTable('receipts', { transaction })
    }
    
    // Check and drop sale_items table
    const [saleItemsTables] = await queryInterface.sequelize.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'sale_items'`,
      { transaction }
    )
    
    if (saleItemsTables.length > 0) {
      console.log('   🗑️  Dropping sale_items table...')
      await queryInterface.dropTable('sale_items', { transaction })
    }
    
    // Check and drop sales table
    const [salesTables] = await queryInterface.sequelize.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'sales'`,
      { transaction }
    )
    
    if (salesTables.length > 0) {
      console.log('   🗑️  Dropping sales table...')
      await queryInterface.dropTable('sales', { transaction })
    }
    
    // Check and drop products table
    const [productsTables] = await queryInterface.sequelize.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'products'`,
      { transaction }
    )
    
    if (productsTables.length > 0) {
      console.log('   🗑️  Dropping products table...')
      await queryInterface.dropTable('products', { transaction })
    }
    
    // Check and drop product_categories table
    const [categoriesTables] = await queryInterface.sequelize.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'product_categories'`,
      { transaction }
    )
    
    if (categoriesTables.length > 0) {
      console.log('   🗑️  Dropping product_categories table...')
      await queryInterface.dropTable('product_categories', { transaction })
    }
    
    await transaction.commit()
    console.log('✅ POS system tables rollback completed successfully!')
    
  } catch (error) {
    await transaction.rollback()
    console.error('❌ POS system tables rollback failed:', error.message)
    throw error
  }
}

// Allow running this migration directly
import sequelize from '../config/database.js'

if (import.meta.url === `file://${process.argv[1]}`) {
  const queryInterface = sequelize.getQueryInterface()
  
  up(queryInterface, sequelize.Sequelize)
    .then(() => {
      console.log('Migration completed successfully')
      return sequelize.close()
    })
    .then(() => {
      process.exit(0)
    })
    .catch(error => {
      console.error('Migration failed:', error)
      sequelize.close().then(() => process.exit(1))
    })
}
