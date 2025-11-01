import { DataTypes } from 'sequelize';
import { generateAutoEngagementConfigID } from '../utils/secureIdGenerator.js';

export default (sequelize) => {
  const AutoEngagementConfig = sequelize.define('AutoEngagementConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    config_id: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      defaultValue: () => generateAutoEngagementConfigID()
    },
    business_id: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true, // One config per business
      references: {
        model: 'businesses',
        key: 'public_id'
      }
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    inactivity_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7,
      validate: {
        min: 1,
        max: 365
      }
    },
    message_template: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        header: "We miss you!",
        body: "Come back and earn rewards with us!"
      },
      validate: {
        isValidTemplate(value) {
          if (!value || typeof value !== 'object') {
            throw new Error('Message template must be an object');
          }
          if (!value.header || typeof value.header !== 'string') {
            throw new Error('Message template must have a valid header');
          }
          if (!value.body || typeof value.body !== 'string') {
            throw new Error('Message template must have a valid body');
          }
        }
      }
    },
    channels: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ['wallet'],
      validate: {
        isValidChannels(value) {
          if (!Array.isArray(value) || value.length === 0) {
            throw new Error('Channels must be a non-empty array');
          }
          const validChannels = ['email', 'sms', 'push', 'wallet'];
          const invalid = value.filter(c => !validChannels.includes(c));
          if (invalid.length > 0) {
            throw new Error(`Invalid channels: ${invalid.join(', ')}`);
          }
        }
      }
    },
    last_run_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_run_status: {
      type: DataTypes.ENUM('success', 'failed', 'running'),
      allowNull: true
    },
    last_run_error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    total_customers_notified: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'auto_engagement_configs',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['config_id']
      },
      {
        unique: true,
        fields: ['business_id']
      },
      {
        fields: ['enabled']
      },
      {
        fields: ['last_run_at']
      }
    ]
  });

  // Instance methods
  AutoEngagementConfig.prototype.canRun = function() {
    if (!this.enabled) return false;
    if (this.last_run_status === 'running') return false;
    
    // Check if already run today
    if (this.last_run_at) {
      const lastRun = new Date(this.last_run_at);
      const now = new Date();
      
      // Reset to start of day in UTC for comparison
      lastRun.setUTCHours(0, 0, 0, 0);
      now.setUTCHours(0, 0, 0, 0);
      
      if (lastRun.getTime() === now.getTime()) {
        return false; // Already ran today
      }
    }
    
    return true;
  };

  AutoEngagementConfig.prototype.markAsRunning = async function() {
    this.last_run_status = 'running';
    this.last_run_at = new Date();
    this.last_run_error = null;
    await this.save();
  };

  AutoEngagementConfig.prototype.markAsCompleted = async function(customersNotified = 0) {
    this.last_run_status = 'success';
    this.total_customers_notified += customersNotified;
    await this.save();
  };

  AutoEngagementConfig.prototype.markAsFailed = async function(error) {
    this.last_run_status = 'failed';
    this.last_run_error = error.message || String(error);
    await this.save();
  };

  AutoEngagementConfig.prototype.getMessageTemplate = function() {
    return {
      header: this.message_template.header,
      body: this.message_template.body
    };
  };

  // Hooks
  AutoEngagementConfig.beforeCreate(async (config) => {
    if (!config.config_id) {
      config.config_id = generateAutoEngagementConfigID();
    }
  });

  return AutoEngagementConfig;
};
