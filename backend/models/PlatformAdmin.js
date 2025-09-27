import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const PlatformAdmin = sequelize.define('PlatformAdmin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'support'),
    defaultValue: 'admin'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active'
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'platform_admins',
      key: 'id'
    }
  }
}, {
  tableName: 'platform_admins',
  timestamps: true,
  underscored: true
})

export default PlatformAdmin