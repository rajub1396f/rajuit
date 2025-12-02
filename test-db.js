require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.NEON_DB);

(async () => {
  try {
    console.log('Testing database connection...');
    
    // Check if users table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `;
    
    console.log('Users table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      // Get table structure
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `;
      
      console.log('\nTable structure:');
      columns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Try to get count of users
      const count = await sql`SELECT COUNT(*) as count FROM users`;
      console.log(`\nTotal users: ${count[0].count}`);
    } else {
      console.log('\n❌ Users table does not exist! Creating it...');
      
      await sql`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          address TEXT,
          last_profile_edit TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      console.log('✅ Users table created successfully!');
    }
    
    // Check if address column exists, if not add it
    try {
      const addressCheck = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'address'
      `;
      
      if (addressCheck.length === 0) {
        console.log('Adding address column...');
        await sql`ALTER TABLE users ADD COLUMN address TEXT`;
        console.log('✅ Address column added successfully!');
      }
    } catch (err) {
      console.log('Note: Could not check/add address column:', err.message);
    }
    
    // Check if last_profile_edit column exists, if not add it
    try {
      const columnCheck = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_profile_edit'
      `;
      
      if (columnCheck.length === 0) {
        console.log('Adding last_profile_edit column...');
        await sql`ALTER TABLE users ADD COLUMN last_profile_edit TIMESTAMP`;
        console.log('✅ Last_profile_edit column added successfully!');
      }
    } catch (err) {
      console.log('Note: Could not check/add last_profile_edit column:', err.message);
    }
    
    // Check and add shipping address columns
    const shippingColumns = [
      'shipping_name',
      'shipping_phone', 
      'shipping_address1',
      'shipping_address2',
      'shipping_city',
      'shipping_state',
      'shipping_postal',
      'shipping_country'
    ];
    
    for (const columnName of shippingColumns) {
      try {
        const check = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = ${columnName}
        `;
        
        if (check.length === 0) {
          console.log(`Adding ${columnName} column...`);
          // Use raw SQL for ALTER TABLE
          await sql.query(`ALTER TABLE users ADD COLUMN ${columnName} TEXT`);
          console.log(`✅ ${columnName} column added successfully!`);
        }
      } catch (err) {
        console.log(`Note: Could not check/add ${columnName} column:`, err.message);
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
  }
})();
