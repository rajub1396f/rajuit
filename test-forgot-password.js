// Test forgot password email functionality
const http = require('http');

async function testForgotPassword() {
    try {
        console.log('🧪 Testing forgot password email...\n');
        
        const testData = {
            email: 'rajuit1396@gmail.com' // Change to your test email
        };
        
        console.log('📧 Requesting password reset for:', testData.email);
        
        const postData = JSON.stringify(testData);
        
        const options = {
            hostname: 'localhost',
            port: 5500,
            path: '/forgot-password',
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
                    
                    if (jsonData.success && jsonData.emailSent) {
                        console.log('\n✅ SUCCESS! Password reset email was sent.');
                        console.log('📧 Check your email inbox for the reset link.');
                    } else if (jsonData.success) {
                        console.log('\n⚠️ Request completed but email might not have been sent.');
                        console.log('Check the server logs for more details.');
                    } else {
                        console.log('\n❌ FAILED! Password reset email was not sent.');
                        console.log('Error:', jsonData.message);
                    }
                } catch (e) {
                    console.log('📊 Response Data:', data);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('\n❌ REQUEST ERROR:', error.message);
            console.log('\n💡 Make sure the server is running on port 5500');
        });
        
        req.write(postData);
        req.end();
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    }
}

// Wait for server to be ready
console.log('⏳ Waiting for server to be ready...\n');
setTimeout(testForgotPassword, 2000);
