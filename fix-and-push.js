const fs = require('fs');
const { execSync } = require('child_process');
const https = require('https');

console.log('🔧 Password Reset Fix Script');
console.log('=' .repeat(50));

// Step 1: Download clean server.js from GitHub
console.log('\n📥 Downloading clean server.js from GitHub...');

const options = {
  hostname: 'raw.githubusercontent.com',
  path: '/rajub1396f/rajuit/f6832b3/server.js',
  method: 'GET'
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (data && data.length > 10000) {
      // Write the clean file
      fs.writeFileSync('D:\\raju-agency\\server.js', data, 'utf8');
      console.log('✅ Clean server.js downloaded and saved');
      console.log(`   File size: ${(data.length / 1024).toFixed(2)} KB`);
      
      // Step 2: Commit and push
      try {
        console.log('\n📤 Committing changes to git...');
        execSync('cd D:\\raju-agency && git add server.js', { stdio: 'inherit' });
        execSync('cd D:\\raju-agency && git commit -m "Fix: Restore password reset endpoint to working state"', { stdio: 'inherit' });
        
        console.log('\n🚀 Pushing to GitHub...');
        execSync('cd D:\\raju-agency && git push origin main', { stdio: 'inherit' });
        
        console.log('\n✅ SUCCESS! Code pushed to GitHub');
        console.log('💾 Render will auto-deploy within 2-3 minutes');
        console.log('\n⏳ Next steps:');
        console.log('   1. Wait 2-3 minutes for Render deployment');
        console.log('   2. Test password reset in your app');
        process.exit(0);
      } catch (err) {
        console.error('❌ Git operation failed:', err.message);
        console.log('\nTroubleshooting:');
        console.log('   1. Open Git Bash directly');
        console.log('   2. Run: cd D:/raju-agency');
        console.log('   3. Run: git log --oneline -3');
        process.exit(1);
      }
    } else {
      console.error('❌ Failed to download from GitHub - response too small');
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('❌ Network error:', err.message);
  process.exit(1);
});
