
import fs from 'fs';
import path from 'path';

const filePath = path.join('routes', 'business.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');


lines.forEach((line, index) => {
    const lower = line.toLowerCase();
    if (lower.includes('router.post') && (lower.includes('branch') || lower.includes('/my/'))) {
        console.log(`POST Route Line ${index + 1}: ${line.trim()}`);
    }
    if (lower.includes('/my/branches')) {
        console.log(`Path Match Line ${index + 1}: ${line.trim()}`);
    }
});

