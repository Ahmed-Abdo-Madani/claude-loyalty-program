
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationName = 'migrations/20260119-add-lemonsqueezy-fields.js';
const fullPath = path.join(__dirname, migrationName);
const fileUrl = pathToFileURL(fullPath).href;

console.log('Attemping to import:', fileUrl);

try {
    const migration = await import(fileUrl);
    console.log('Import success!');
    console.log('Exports:', Object.keys(migration));
    if (migration.up) {
        console.log('Running UP...');
        await migration.up();
        console.log('UP success!');
    } else {
        console.error('No up() function found');
    }
} catch (error) {
    console.error('Import or Execution Failed!');
    console.error(error);
}
