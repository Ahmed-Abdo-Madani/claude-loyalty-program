import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const SaleItem = sequelize.define('SaleItem', {
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
    }
  },
  product_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'products',
      key: 'public_id'
    }
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
    allowNull: false,
    validate: {
      min: 1
    }
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
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'sale_items',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['sale_id']
    },
    {
      fields: ['product_id']
    },
    {
      fields: ['sale_id', 'product_id'],
      name: 'sale_product_idx'
    }
  ]
})

// Instance methods
SaleItem.prototype.calculateLineTotal = function() {
  // Calculate subtotal (quantity × unit_price)
  const subtotal = parseFloat(this.unit_price) * this.quantity
  
  // Calculate tax amount
  const taxRate = parseFloat(this.tax_rate) / 100
  const taxAmount = subtotal * taxRate
  
  // Calculate total (subtotal + tax)
  const total = subtotal + taxAmount
  
  this.subtotal = Math.round(subtotal * 100) / 100
  this.tax_amount = Math.round(taxAmount * 100) / 100
  this.total = Math.round(total * 100) / 100
  
  return this
}

SaleItem.prototype.applyDiscount = function(amount) {
  this.discount_amount = amount
  
  // Recalculate total with discount
  const subtotal = parseFloat(this.subtotal)
  const taxAmount = parseFloat(this.tax_amount)
  const discount = parseFloat(amount)
  
  this.total = Math.round((subtotal + taxAmount - discount) * 100) / 100
  
  return this
}

export default SaleItem
