import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    message_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    conversation_id: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    sender_type: {
        type: DataTypes.ENUM('admin', 'business'),
        allowNull: false
    },
    sender_id: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    recipient_id: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    subject: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    message_body: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    message_type: {
        type: DataTypes.ENUM('inquiry', 'response', 'notification'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('sent', 'read', 'archived'),
        defaultValue: 'sent'
    },
    attachments: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
    },
    read_at: {
        type: DataTypes.DATE,
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
    },
    // Email Notification Tracking
    email_notification_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    email_notification_sent_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    email_notification_status: {
        type: DataTypes.ENUM('pending', 'sent', 'failed', 'bounced'),
        allowNull: true
    },
    unsubscribe_token: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true
    }
}, {
    tableName: 'messages',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        beforeValidate: async (message) => {
            if (!message.message_id) {
                message.message_id = SecureIDGenerator.generateMessageID()
            }
        }
    },
    indexes: [
        {
            fields: ['conversation_id']
        },
        {
            fields: ['sender_id']
        },
        {
            fields: ['recipient_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['created_at']
        }
    ]
})

// Instance methods
Message.prototype.markAsRead = async function () {
    this.status = 'read'
    this.read_at = new Date()
    return await this.save()
}

export default Message
