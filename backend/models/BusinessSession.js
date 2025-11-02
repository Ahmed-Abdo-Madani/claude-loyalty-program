import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const BusinessSession = sequelize.define('BusinessSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'public_id'
    }
  },
  session_token: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'business_sessions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false // We manually update last_used_at
})

export default BusinessSession
