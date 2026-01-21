
import { DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
    // 1. Drop dependent views first to avoid "column used by view" errors
    await queryInterface.sequelize.query(`DROP VIEW IF EXISTS branch_performance CASCADE;`)
    await queryInterface.sequelize.query(`DROP VIEW IF EXISTS branch_offer_summary CASCADE;`)
    await queryInterface.sequelize.query(`DROP VIEW IF EXISTS active_offers CASCADE;`)

    // --- Table: branches ---
    const branchesTable = 'branches'
    // Renames
    await queryInterface.sequelize.query(`ALTER TABLE ${branchesTable} RENAME COLUMN manager TO manager_name;`).catch(() => { })
    await queryInterface.sequelize.query(`ALTER TABLE ${branchesTable} RENAME COLUMN total_customers TO customers;`).catch(() => { })

    // Add missing columns if they don't exist
    const branchColumns = await queryInterface.describeTable(branchesTable)

    if (!branchColumns.region) {
        await queryInterface.addColumn(branchesTable, 'region', { type: DataTypes.STRING(100), allowNull: true })
    }
    if (!branchColumns.district) {
        await queryInterface.addColumn(branchesTable, 'district', { type: DataTypes.STRING(100), allowNull: true })
    }
    if (!branchColumns.country) {
        await queryInterface.addColumn(branchesTable, 'country', { type: DataTypes.STRING(100), defaultValue: 'Saudi Arabia' })
    }
    if (!branchColumns.location_id) {
        await queryInterface.addColumn(branchesTable, 'location_id', { type: DataTypes.STRING(50), allowNull: true })
    }
    if (!branchColumns.location_type) {
        await queryInterface.addColumn(branchesTable, 'location_type', { type: DataTypes.STRING(50), allowNull: true })
    }
    if (!branchColumns.location_hierarchy) {
        await queryInterface.addColumn(branchesTable, 'location_hierarchy', { type: DataTypes.STRING(500), allowNull: true })
    }
    if (!branchColumns.manager_pin) {
        await queryInterface.addColumn(branchesTable, 'manager_pin', { type: DataTypes.STRING(255), allowNull: true })
    }
    if (!branchColumns.manager_pin_enabled) {
        await queryInterface.addColumn(branchesTable, 'manager_pin_enabled', { type: DataTypes.BOOLEAN, defaultValue: false })
    }
    if (!branchColumns.manager_last_login) {
        await queryInterface.addColumn(branchesTable, 'manager_last_login', { type: DataTypes.DATE, allowNull: true })
    }
    if (!branchColumns.active_offers) {
        await queryInterface.addColumn(branchesTable, 'active_offers', { type: DataTypes.INTEGER, defaultValue: 0 })
    }
    if (!branchColumns.latitude) {
        await queryInterface.addColumn(branchesTable, 'latitude', { type: DataTypes.DECIMAL(10, 7), allowNull: true })
    }
    if (!branchColumns.longitude) {
        await queryInterface.addColumn(branchesTable, 'longitude', { type: DataTypes.DECIMAL(10, 7), allowNull: true })
    }

    // --- Table: customers ---
    const customersTable = 'customers'
    // Renames
    await queryInterface.sequelize.query(`ALTER TABLE ${customersTable} RENAME COLUMN whatsapp TO phone;`).catch(() => { })
    await queryInterface.sequelize.query(`ALTER TABLE ${customersTable} RENAME COLUMN birthday TO date_of_birth;`).catch(() => { })

    // Add missing columns
    const customerColumns = await queryInterface.describeTable(customersTable)

    if (!customerColumns.business_id) {
        await queryInterface.addColumn(customersTable, 'business_id', {
            type: DataTypes.STRING(50),
            allowNull: true, // Allow null initially to avoid issues if table has data, but model says false
            references: { model: 'businesses', key: 'public_id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        })
    }
    if (!customerColumns.email) {
        await queryInterface.addColumn(customersTable, 'email', { type: DataTypes.STRING(255), allowNull: true })
    }
    if (!customerColumns.gender) {
        await queryInterface.addColumn(customersTable, 'gender', { type: DataTypes.STRING(20), defaultValue: 'male' })
    }
    if (!customerColumns.status) {
        await queryInterface.addColumn(customersTable, 'status', { type: DataTypes.STRING(20), defaultValue: 'new' })
    }
    if (!customerColumns.lifecycle_stage) {
        await queryInterface.addColumn(customersTable, 'lifecycle_stage', { type: DataTypes.STRING(50), defaultValue: 'prospect' })
    }

    // Stats
    const statsFields = [
        'total_visits', 'total_stamps_earned', 'total_rewards_claimed', 'total_lifetime_value', 'average_days_between_visits'
    ]
    for (const field of statsFields) {
        if (!customerColumns[field]) {
            await queryInterface.addColumn(customersTable, field, {
                type: field === 'total_lifetime_value' ? DataTypes.DECIMAL(10, 2) : DataTypes.INTEGER,
                defaultValue: 0
            })
        }
    }

    // Activity
    const activityFields = ['first_visit_date', 'last_activity_date', 'last_scan_date', 'gdpr_consent_date']
    for (const field of activityFields) {
        if (!customerColumns[field]) {
            await queryInterface.addColumn(customersTable, field, { type: DataTypes.DATE, allowNull: true })
        }
    }

    // JSON/Text
    if (!customerColumns.preferences) {
        await queryInterface.addColumn(customersTable, 'preferences', { type: DataTypes.JSON, defaultValue: {} })
    }
    if (!customerColumns.preferred_language) {
        await queryInterface.addColumn(customersTable, 'preferred_language', { type: DataTypes.STRING(10), defaultValue: 'en' })
    }
    if (!customerColumns.timezone) {
        await queryInterface.addColumn(customersTable, 'timezone', { type: DataTypes.STRING(50), defaultValue: 'Asia/Riyadh' })
    }
    if (!customerColumns.tags) {
        await queryInterface.addColumn(customersTable, 'tags', { type: DataTypes.JSON, defaultValue: [] })
    }
    if (!customerColumns.custom_fields) {
        await queryInterface.addColumn(customersTable, 'custom_fields', { type: DataTypes.JSON, defaultValue: {} })
    }
    if (!customerColumns.notes) {
        await queryInterface.addColumn(customersTable, 'notes', { type: DataTypes.TEXT, allowNull: true })
    }
    if (!customerColumns.referral_code) {
        await queryInterface.addColumn(customersTable, 'referral_code', { type: DataTypes.STRING(50), allowNull: true })
    }
    if (!customerColumns.acquisition_source) {
        await queryInterface.addColumn(customersTable, 'acquisition_source', { type: DataTypes.STRING(50), defaultValue: 'organic' })
    }
    if (!customerColumns.consent_marketing) {
        await queryInterface.addColumn(customersTable, 'consent_marketing', { type: DataTypes.BOOLEAN, defaultValue: false })
    }
    if (!customerColumns.consent_data_processing) {
        await queryInterface.addColumn(customersTable, 'consent_data_processing', { type: DataTypes.BOOLEAN, defaultValue: true })
    }

    // --- Table: offers ---
    const offersTable = 'offers'
    // Renames
    await queryInterface.sequelize.query(`ALTER TABLE ${offersTable} RENAME COLUMN offer_type TO type;`).catch(() => { })
    await queryInterface.sequelize.query(`ALTER TABLE ${offersTable} RENAME COLUMN total_customers TO customers;`).catch(() => { })
    await queryInterface.sequelize.query(`ALTER TABLE ${offersTable} RENAME COLUMN total_redeemed TO redeemed;`).catch(() => { })

    // Fix branch_id type mismatch
    await queryInterface.sequelize.query(`ALTER TABLE ${offersTable} DROP CONSTRAINT IF EXISTS offers_branch_id_fkey;`).catch(() => { })
    await queryInterface.sequelize.query(`ALTER TABLE ${offersTable} ALTER COLUMN branch_id TYPE VARCHAR(50);`).catch(() => { })

    // Add missing columns
    const offerColumns = await queryInterface.describeTable(offersTable)
    if (!offerColumns.branch) {
        await queryInterface.addColumn(offersTable, 'branch', { type: DataTypes.STRING(255), defaultValue: 'All Branches' })
    }
    if (!offerColumns.max_redemptions_per_customer) {
        await queryInterface.addColumn(offersTable, 'max_redemptions_per_customer', { type: DataTypes.INTEGER, allowNull: true })
    }
    if (!offerColumns.terms_conditions) {
        await queryInterface.addColumn(offersTable, 'terms_conditions', { type: DataTypes.TEXT, allowNull: true })
    }
    if (!offerColumns.total_scans) {
        await queryInterface.addColumn(offersTable, 'total_scans', { type: DataTypes.INTEGER, defaultValue: 0 })
    }
    if (!offerColumns.conversion_rate) {
        await queryInterface.addColumn(offersTable, 'conversion_rate', { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00 })
    }
    if (!offerColumns.loyalty_tiers) {
        await queryInterface.addColumn(offersTable, 'loyalty_tiers', { type: DataTypes.JSON, allowNull: true })
    }

    // --- Recreate Views ---

    // View: active_offers
    await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW active_offers AS
    SELECT o.id,
        o.business_id,
        o.branch_id,
        o.title,
        o.description,
        o.type,
        o.stamps_required,
        o.reward_description,
        o.qr_code_url,
        o.status,
        o.is_time_limited,
        o.start_date,
        o.end_date,
        o.customers,
        o.redeemed,
        o.created_at,
        o.updated_at,
        b.business_name,
        br.name AS branch_name,
        CASE
            WHEN o.is_time_limited = true AND o.end_date < CURRENT_DATE THEN 'expired'::character varying
            WHEN o.is_time_limited = true AND o.start_date > CURRENT_DATE THEN 'scheduled'::character varying
            ELSE o.status
        END AS computed_status
    FROM offers o
    JOIN businesses b ON o.business_id = b.public_id
    LEFT JOIN branches br ON o.branch_id = br.public_id
    WHERE o.status::text <> 'deleted'::text;
  `)

    // View: branch_offer_summary
    await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW branch_offer_summary AS
    SELECT b.public_id AS branch_id,
        b.name AS branch_name,
        o.public_id AS offer_id,
        o.title AS offer_title,
        o.status AS offer_status,
        o.customers AS offer_customers,
        o.redeemed AS offer_redeemed
    FROM branches b
    LEFT JOIN offers o ON b.public_id = o.branch_id
    WHERE b.status::text = 'active'::text;
  `)

    // View: branch_performance
    await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW branch_performance AS
    SELECT b.public_id AS id,
        b.name,
        b.status,
        b.city,
        b.region,
        b.is_main,
        b.customers,
        b.monthly_revenue,
        count(o.public_id) AS total_offers,
        count(CASE WHEN o.status::text = 'active'::text THEN 1 ELSE NULL END) AS active_offers,
        b.created_at
    FROM branches b
    LEFT JOIN offers o ON b.public_id = o.branch_id
    GROUP BY b.public_id, b.name, b.status, b.city, b.region, b.is_main, b.customers, b.monthly_revenue, b.created_at;
  `)
}

export async function down(queryInterface, Sequelize) {
    // Irreversible rename/addition logic without complex rollback
}
