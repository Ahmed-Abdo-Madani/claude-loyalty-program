import dotenv from 'dotenv';
dotenv.config();

import { Business, Branch, Offer, sequelize } from './models/index.js';

async function checkDb() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established.');

        const businesses = await Business.findAll();
        console.log('\n--- Businesses ---');
        businesses.forEach(b => {
            console.log(`ID: ${b.public_id}, Name: ${b.business_name}, Plan: ${b.current_plan}, Verified: ${b.is_verified}, Completion: ${b.profile_completion}`);
        });

        const branches = await Branch.findAll();
        console.log('\n--- Branches ---');
        branches.forEach(br => {
            console.log(`ID: ${br.public_id}, Name: ${br.name}, Business: ${br.business_id}`);
        });

        const offers = await Offer.findAll();
        console.log('\n--- Offers ---');
        offers.forEach(o => {
            console.log(`ID: ${o.public_id}, Title: ${o.title}, Business: ${o.business_id}, Reward: ${o.reward_description}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('❌ Database check failed:', err);
        process.exit(1);
    }
}

checkDb();
