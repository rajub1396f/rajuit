// Test script to verify email verification functionality
const fetch = require('node-fetch');

async function testEmailVerification() {
    console.log('🧪 Testing Email Verification System\n');
    
    // Test 1: Check if server is running
    console.log('1️⃣ Testing server connection...');
    try {
        const response = await fetch('http://localhost:5500/test-email');
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Server is running and Brevo is configured');
            console.log('   Config:', data.config);
        } else {
            console.log('❌ Server error:', data.error);
            return;
        }
    } catch (error) {
        console.log('❌ Cannot connect to server:', error.message);
        return;
    }
    
    console.log('\n2️⃣ To test registration with email verification:');
    console.log('   1. Go to http://localhost:5500/index.html');
    console.log('   2. Click "Create Account"');
    console.log('   3. Fill in the registration form');
    console.log('   4. Submit and check console logs on server');
    console.log('   5. Check your email inbox for verification link');
    
    console.log('\n3️⃣ To test resend verification:');
    console.log('   1. Go to http://localhost:5500/verify-email-info.html');
    console.log('   2. Enter your email address');
    console.log('   3. Click "Resend Verification Email"');
    console.log('   4. Check your email inbox');
    
    console.log('\n✅ Test setup complete!');
    console.log('📧 Verification emails will be sent to the registered email address');
}

testEmailVerification().catch(console.error);
