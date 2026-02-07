import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

const MessageTemplate = sequelize.define('MessageTemplate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    template_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    template_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    category: {
        type: DataTypes.ENUM('inquiry', 'response', 'notification', 'announcement', 'support'),
        allowNull: false
    },
    subject_template: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    body_template: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    variables: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    usage_count: {
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
    tableName: 'message_templates',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        beforeCreate: async (template) => {
            if (!template.template_id) {
                template.template_id = SecureIDGenerator.generateTemplateID()
            }
        }
    },
    indexes: [
        {
            fields: ['category']
        },
        {
            fields: ['is_active']
        },
        {
            fields: ['created_by']
        }
    ]
})

// Instance methods
MessageTemplate.prototype.renderTemplate = function (variables) {
    let subject = this.subject_template
    let body = this.body_template

    for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{${key}}`
        subject = subject.replace(new RegExp(placeholder, 'g'), value)
        body = body.replace(new RegExp(placeholder, 'g'), value)
    }

    return { subject, body }
}

// Static methods
MessageTemplate.getActiveTemplatesByCategory = async function (category) {
    return await this.findAll({
        where: {
            category,
            is_active: true
        }
    })
}

export default MessageTemplate
