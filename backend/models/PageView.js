import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const PageView = sequelize.define('PageView', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  session_id: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  page_path: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  page_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  referrer_path: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  visited_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'page_views',
  timestamps: false,
  indexes: [
    {
      fields: ['session_id']
    },
    {
      fields: ['page_path']
    },
    {
      fields: ['visited_at']
    }
  ]
})

export default PageView
