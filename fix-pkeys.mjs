import fs from 'fs';

let sql = fs.readFileSync('backend/migrations/00000000-initial-schema.sql', 'utf8');

const regex = /ALTER TABLE ONLY public\.([a-z_]+)\r?\n\s+ADD CONSTRAINT \1_pkey PRIMARY KEY \(id\);/g;

sql = sql.replace(regex, (match, table) => {
    if (sql.includes(`DROP CONSTRAINT IF EXISTS ${table}_pkey;`)) {
        return match;
    }

    return `ALTER TABLE ONLY public.${table}\n    DROP CONSTRAINT IF EXISTS ${table}_pkey;\n\n` + match;
});

fs.writeFileSync('backend/migrations/00000000-initial-schema.sql', sql);
console.log('✅ Added missing DROP CONSTRAINT IF EXISTS for primary keys.');
