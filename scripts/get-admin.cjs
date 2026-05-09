'use strict';
const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');
const admins = db.prepare("SELECT email, name FROM User WHERE role = 'ADMIN'").all();
console.log(JSON.stringify(admins));
db.close();
