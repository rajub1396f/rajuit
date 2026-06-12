const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function fixUsersTableSchema() {
  try {
    const sql = neon(process.env.POSTGRES_URL || process.env.NEON_DB);

    console.log('🔧 Fixing users table schema...');

    // Add created_at column
    console.log('Adding created_at column...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`;

    // Update existing rows
    console.log('Updating existing rows with created_at timestamp...');
    await sql`UPDATE users SET created_at = NOW() WHERE created_at IS NULL`;

    // Add updated_at column
    console.log('Adding updated_at column...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;

    // Create function for auto-updating updated_at
    console.log('Creating update function...');
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;

    // Drop existing trigger if exists
    console.log('Setting up trigger...');
    await sql`DROP TRIGGER IF EXISTS update_users_updated_at ON users`;

    // Create trigger
    await sql`
      CREATE TRIGGER update_users_updated_at 
          BEFORE UPDATE ON users 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `;

    // Verify columns exist
    console.log('Verifying table schema...');
    const columns = await sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('created_at', 'updated_at', 'google_id', 'profile_picture')
      ORDER BY column_name
    `;

    console.log('✅ Schema update completed successfully!');
    console.log('📋 Current users table columns:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'})`);
    });

    console.log('\n🚀 Google authentication should now work properly!');
    console.log('   Please restart your Flutter app and try Google sign-in again.');

  } catch (error) {
    console.error('❌ Error fixing users table schema:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixUsersTableSchema();
}

module.exports = fixUsersTableSchema;