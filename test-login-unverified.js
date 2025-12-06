// Test login with unverified account
const http = require('http');

async function testLoginWithUnverified() {
    try {
        console.log('🧪 Testing login with unverified account...\n');
        
        const loginData = {
            email: 'rajuit1396@gmail.com', // Use an unverified email
            password: 'Test123!'
        };
        
        console.log('🔐 Attempting login with:', loginData.email);
        
        const postData = JSON.stringify(loginData);
        
        const options = {
            hostname: 'localhost',
            port: 5500,
            path: '/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('\n📊 Response Status:', res.statusCode);
                try {
                    const jsonData = JSON.parse(data);
                    console.log('📊 Response Data:', JSON.stringify(jsonData, null, 2));
                    
                    if (jsonData.requiresVerification && jsonData.emailSent) {
                        console.log('\n✅ SUCCESS! Verification email was sent during login attempt.');
                        console.log('📧 Check your email for the verification link.');
                    } else if (jsonData.requiresVerification) {
                        console.log('\n⚠️ Login blocked but email not sent.');
                    } else if (res.statusCode === 200) {
                        console.log('\n✅ Login successful! User is already verified.');
                    }
                } catch (e) {
                    console.log('📊 Response Data:', data);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('\n❌ REQUEST ERROR:', error.message);
        });
        
        req.write(postData);
        req.end();
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    }
}

// Wait for server to be ready
setTimeout(testLoginWithUnverified, 2000);
