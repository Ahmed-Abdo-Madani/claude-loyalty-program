
import { DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {


    const tables = ['offers', 'branches']

    // 1. Drop dependent view
    await queryInterface.sequelize.query(`DROP VIEW IF EXISTS active_offers CASCADE;`)

    for (const table of tables) {
        // 2. Drop existing constraint
        try {
            await queryInterface.sequelize.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_business_id_fkey;`)
        } catch (e) {
            console.warn(`Constraint for ${table} might not exist or name differs:`, e.message)
        }

        // 3. Change column type
        // explicitly cast to varchar
        await queryInterface.sequelize.query(`ALTER TABLE ${table} ALTER COLUMN business_id TYPE VARCHAR(50);`)

        // 4. Add new constraint
        await queryInterface.addConstraint(table, {
            fields: ['business_id'],
            type: 'foreign key',
            name: `${table}_business_id_public_fk`,
            references: {
                table: 'businesses',
                field: 'public_id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        })
    }

    // 5. Recreate view with updated JOIN condition (linking to public_id instead of id)
    await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW active_offers AS
    SELECT o.id,
        o.business_id,
        o.branch_id,
        o.title,
        o.description,
        o.offer_type,
        o.stamps_required,
        o.reward_description,
        o.qr_code_url,
        o.status,
        o.is_time_limited,
        o.start_date,
        o.end_date,
        o.total_customers,
        o.total_redeemed,
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
    LEFT JOIN branches br ON o.branch_id = br.id
    WHERE o.status::text <> 'deleted'::text;
  `)
}

export async function down(queryInterface, Sequelize) {
    // Irreversible without data loss if we had data, but for rescue it's fine.
    // Reverting would mean going back to integer pointing to id.
}
