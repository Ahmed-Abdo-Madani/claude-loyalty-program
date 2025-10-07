import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const WalletPass = sequelize.define('WalletPass', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Relationships
  customer_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'customers',
      key: 'customer_id'
    },
    comment: 'Customer ID (cust_*)'
  },
  progress_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customer_progress',
      key: 'id'
    },
    comment: 'Customer progress record ID'
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'public_id'
    },
    comment: 'Business ID (biz_*)'
  },
  offer_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'offers',
      key: 'public_id'
    },
    comment: 'Offer ID (off_*)'
  },
  // Wallet Type & Identifiers
  wallet_type: {
    type: DataTypes.ENUM('apple', 'google'),
    allowNull: false,
    comment: 'Type of wallet: apple or google'
  },
  wallet_serial: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: 'Apple Wallet pass serial number'
  },
  wallet_object_id: {
    type: DataTypes.STRING(200),
    allowNull: true,
    unique: true,
    comment: 'Google Wallet object ID (e.g., 3388000000023017940.cust_xxx_off_xxx)'
  },
  // Status
  pass_status: {
    type: DataTypes.ENUM('active', 'expired', 'revoked', 'deleted'),
    defaultValue: 'active',
    comment: 'Current status of the wallet pass'
  },
  // Metadata
  device_info: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Device/platform information'
  },
  last_updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time this pass was updated via push notification'
  }
}, {
  tableName: 'wallet_passes',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['customer_id', 'offer_id', 'wallet_type'],
      name: 'unique_customer_offer_wallet'
    },
    {
      fields: ['customer_id'],
      name: 'idx_wallet_passes_customer'
    },
    {
      fields: ['progress_id'],
      name: 'idx_wallet_passes_progress'
    },
    {
      fields: ['business_id'],
      name: 'idx_wallet_passes_business'
    },
    {
      fields: ['wallet_type'],
      name: 'idx_wallet_passes_wallet_type'
    },
    {
      fields: ['pass_status'],
      name: 'idx_wallet_passes_status'
    }
  ]
})

// Instance methods
WalletPass.prototype.isActive = function() {
  return this.pass_status === 'active'
}

WalletPass.prototype.markExpired = async function() {
  this.pass_status = 'expired'
  await this.save()
  return this
}

WalletPass.prototype.revoke = async function() {
  this.pass_status = 'revoked'
  await this.save()
  return this
}

WalletPass.prototype.updateLastPush = async function() {
  this.last_updated_at = new Date()
  await this.save()
  return this
}

// Static methods
WalletPass.findByCustomerAndOffer = async function(customerId, offerId) {
  return await this.findAll({
    where: {
      customer_id: customerId,
      offer_id: offerId,
      pass_status: 'active'
    }
  })
}

WalletPass.getCustomerWalletTypes = async function(customerId, offerId) {
  const wallets = await this.findByCustomerAndOffer(customerId, offerId)
  return wallets.map(w => w.wallet_type)
}

WalletPass.hasWalletType = async function(customerId, offerId, walletType) {
  const count = await this.count({
    where: {
      customer_id: customerId,
      offer_id: offerId,
      wallet_type: walletType,
      pass_status: 'active'
    }
  })
  return count > 0
}

export default WalletPass
