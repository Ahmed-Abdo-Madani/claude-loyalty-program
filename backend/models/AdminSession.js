import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const AdminSession = sequelize.define('AdminSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'platform_admins',
      key: 'id'
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
  }
}, {
  tableName: 'admin_sessions',
  timestamps: true,
  underscored: true,
  updatedAt: false // Only track creation time
})

export default AdminSession