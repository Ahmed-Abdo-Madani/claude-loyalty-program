import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

const Product = sequelize.define('Product', {
  public_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => SecureIDGenerator.generateProductID(),
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
  branch_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    references: {
      model: 'branches',
      key: 'public_id'
    }
  },
  category_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    references: {
      model: 'product_categories',
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
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      notEmpty: {
        msg: 'SKU must be a non-empty string if provided'
      }
    }
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
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['business_id']
    },
    {
      fields: ['branch_id']
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['sku']
    },
    {
      unique: true,
      fields: ['business_id', 'sku'],
      name: 'unique_business_sku',
      where: {
        sku: { [sequelize.Sequelize.Op.ne]: null }
      }
    }
  ]
})

// Instance methods
Product.prototype.calculateTaxAmount = function() {
  const basePrice = this.tax_included 
    ? parseFloat(this.price) / (1 + parseFloat(this.tax_rate) / 100)
    : parseFloat(this.price)
  
  const taxAmount = basePrice * (parseFloat(this.tax_rate) / 100)
  return Math.round(taxAmount * 100) / 100
}

Product.prototype.calculatePriceWithTax = function() {
  if (this.tax_included) {
    return parseFloat(this.price)
  }
  
  const taxAmount = this.calculateTaxAmount()
  return Math.round((parseFloat(this.price) + taxAmount) * 100) / 100
}

Product.prototype.calculatePriceWithoutTax = function() {
  if (!this.tax_included) {
    return parseFloat(this.price)
  }
  
  const basePrice = parseFloat(this.price) / (1 + parseFloat(this.tax_rate) / 100)
  return Math.round(basePrice * 100) / 100
}

Product.prototype.incrementSold = async function(quantity, revenue, options = {}) {
  this.total_sold += quantity
  this.total_revenue = parseFloat(this.total_revenue) + parseFloat(revenue)
  await this.save(options)
  return this
}

Product.prototype.isAvailable = function() {
  return this.status === 'active'
}

export default Product
