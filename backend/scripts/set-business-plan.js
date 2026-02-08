import sequelize from '../config/database.js'

async function setPlan() {
    const email = 'saiko@madna.me'
    const plan = 'loyalty_professional'

    try {
        console.log(`🔍 Finding business with email: ${email}`)

        // Update the business record directly using SQL to avoid model-related JSX import issues
        const [results] = await sequelize.query(
            'UPDATE businesses SET current_plan = :plan, subscription_status = :status WHERE email = :email RETURNING public_id, business_name',
            {
                replacements: { email, plan, status: 'active' }
            }
        )

        if (results.length > 0) {
            console.log(`✅ Success! Business "${results[0].business_name}" (${results[0].public_id}) updated to ${plan} plan.`)
        } else {
            console.log(`❌ Business with email ${email} not found.`)
        }

        process.exit(0)
    } catch (error) {
        console.error('❌ Error updating business plan:', error)
        process.exit(1)
    }
}

setPlan()
