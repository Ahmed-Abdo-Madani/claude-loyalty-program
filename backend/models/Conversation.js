import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

const Conversation = sequelize.define('Conversation', {
    // Businesses receive email notifications; conversations are maintained for admin audit trail only
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    conversation_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    business_id: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    admin_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    subject: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('open', 'closed', 'archived'),
        defaultValue: 'open'
    },
    last_message_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    unread_count_admin: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    unread_count_business: {
        type: DataTypes.INTEGER,
        defaultValue: 0
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
    tableName: 'conversations',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        beforeValidate: async (conversation) => {
            if (!conversation.conversation_id) {
                conversation.conversation_id = SecureIDGenerator.generateConversationID();
            }
        }
    },
    indexes: [
        {
            fields: ['business_id']
        },
        {
            fields: ['admin_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['last_message_at']
        }
    ]
})

// Instance methods
Conversation.prototype.updateLastMessage = async function () {
    this.last_message_at = new Date()
    return await this.save()
}

Conversation.prototype.incrementUnreadCount = async function (userType) {
    if (userType === 'admin') {
        this.unread_count_admin += 1
    } else if (userType === 'business') {
        // DEPRECATED: Businesses receive emails, not inbox notifications
        // this.unread_count_business += 1
    }
    return await this.save()
}

Conversation.prototype.resetUnreadCount = async function (userType) {
    if (userType === 'admin') {
        this.unread_count_admin = 0
    } else if (userType === 'business') {
        // DEPRECATED: Businesses receive emails, not inbox notifications
        // this.unread_count_business = 0
    }
    return await this.save()
}

export default Conversation
