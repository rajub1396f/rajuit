require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcrypt');
const sql = neon(process.env.NEON_DB);

(async () => {
  try {
    const testUser = {
      name: 'Test User',
      email: 'test' + Date.now() + '@example.com',
      password: 'password123',
      phone: '1234567890'
    };
    
    console.log('Testing registration with:', testUser.email);
    
    // Check if email exists
    const existing = await sql`SELECT id FROM users WHERE email = ${testUser.email} LIMIT 1`;
    console.log('Existing user check:', existing.length);
    
    if (existing.length > 0) {
      console.log('Email already exists');
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    console.log('Password hashed successfully');
    
    // Insert user
    console.log('Inserting user...');
    const result = await sql`
      INSERT INTO users (name, email, password, phone)
      VALUES (${testUser.name}, ${testUser.email}, ${hashedPassword}, ${testUser.phone})
      RETURNING id, name, email, phone;
    `;
    
    console.log('✅ User inserted successfully:', result[0]);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
  }
})();
