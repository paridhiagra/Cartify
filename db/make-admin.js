const db = require('./database.js');

const email = 'agrawalparidhi60@gmail.com'; // apna wahi email daalo jisse login karti ho

const result = db.prepare('UPDATE users SET role = ? WHERE email = ?').run('admin', email);

if (result.changes === 0) {
  console.log('Koi user nahi mila is email se. Email check karo.');
} else {
  console.log(`${email} ab admin ban gaya hai!`);
}