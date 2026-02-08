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
  },
  notification_preferences: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      email_notifications: true,
      new_inquiries: true,
      urgent_messages: true,
      daily_digest: false
    }
  }
}, {
  tableName: 'platform_admins',
  timestamps: true,
  underscored: true
})

PlatformAdmin.prototype.updateNotificationPreferences = async function (preferences) {
  this.notification_preferences = {
    ...this.notification_preferences,
    ...preferences
  }
  return await this.save()
}

PlatformAdmin.prototype.canReceiveInquiryNotifications = function () {
  return this.notification_preferences &&
    this.notification_preferences.email_notifications !== false &&
    this.notification_preferences.new_inquiries !== false
}

export default PlatformAdmin