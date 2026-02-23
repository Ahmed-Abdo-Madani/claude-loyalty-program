import fs from 'fs';

let sql = fs.readFileSync('backend/migrations/00000000-initial-schema.sql', 'utf8');

const regex = /DROP CONSTRAINT IF EXISTS ([a-z_]+_pkey);/g;

sql = sql.replace(regex, (match, constraint) => {
    return `DROP CONSTRAINT IF EXISTS ${constraint} CASCADE;`;
});

fs.writeFileSync('backend/migrations/00000000-initial-schema.sql', sql);
console.log('✅ Added CASCADE to DROP CONSTRAINT IF EXISTS for primary keys.');
