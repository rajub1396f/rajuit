// Simple test to verify registration and email sending
const https = require('https');
const http = require('http');

async function testRegistration() {
    try {
        console.log('🧪 Testing registration with email verification...\n');
        
        const testUser = {
            name: 'Test User',
            email: 'rajuit1396@gmail.com', // Change to your test email
            password: 'Test123!',
            confirmpassword: 'Test123!',
            phone: '1234567890'
        };
        
        console.log('📝 Registering user:', testUser.email);
        
        const postData = JSON.stringify(testUser);
        
        const options = {
            hostname: 'localhost',
            port: 5500,
            path: '/register',
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
                    
                    if (res.statusCode === 201 || res.statusCode === 200) {
                        console.log('\n✅ SUCCESS! Registration completed.');
                        console.log('📧 Check your email for verification link.');
                    } else {
                        console.log('\n❌ FAILED! Registration did not complete.');
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

// Wait a moment for server to be ready
setTimeout(testRegistration, 2000);
