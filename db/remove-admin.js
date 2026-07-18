const db = require('./database.js');

const email = 'arohiexample@gmail.com';

const result = db.prepare('UPDATE users SET role = ? WHERE email = ?').run('customer', email);

if (result.changes === 0) {
  console.log('Koi user nahi mila is email se. Email check karo.');
} else {
  console.log(`${email} ab wapas customer ban gaya hai.`);
}