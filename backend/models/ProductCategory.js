import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

const ProductCategory = sequelize.define('ProductCategory', {
  public_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => SecureIDGenerator.generateCategoryID(),
    allowNull: false
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'public_id'
    }
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
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'product_categories',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['business_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['display_order']
    }
  ]
})

// Instance methods
ProductCategory.prototype.incrementProductCount = async function(options = {}) {
  this.product_count += 1
  await this.save(options)
  return this
}

ProductCategory.prototype.decrementProductCount = async function(options = {}) {
  if (this.product_count > 0) {
    this.product_count -= 1
    await this.save(options)
  }
  return this
}

ProductCategory.prototype.updateProductCount = async function(count, options = {}) {
  this.product_count = count
  await this.save(options)
  return this
}

export default ProductCategory
