import fs from 'fs';

let sql = fs.readFileSync('backend/migrations/00000000-initial-schema.sql', 'utf8');

const regex = /ALTER TABLE ONLY public\.([a-z_]+)\r?\n\s+ADD CONSTRAINT \w+ FOREIGN KEY \(([a-z_]+)\) REFERENCES public\.([a-z_]+)\(([a-z_]+)\).*/g;

let count = 0;
sql = sql.replace(regex, (match, childTable, childCol, parentTable, parentCol) => {
    const cleanupStmt = `DELETE FROM public.${childTable} WHERE ${childCol} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.${parentTable} WHERE public.${parentTable}.${parentCol} = public.${childTable}.${childCol});`;

    if (sql.includes(cleanupStmt)) {
        return match;
    }

    count++;
    return cleanupStmt + '\n\n' + match;
});

fs.writeFileSync('backend/migrations/00000000-initial-schema.sql', sql);
console.log(`✅ Added ${count} DELETE statements for orphaned foreign key records.`);
