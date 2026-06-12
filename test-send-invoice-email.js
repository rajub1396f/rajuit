#!/usr/bin/env node

/**
 * Test script for "Send Invoice Email" endpoint
 * Tests the POST /send-invoice-email/:orderId endpoint
 */

const https = require('https');

// Test configuration
const BASE_URL = 'https://rajuit.online';
const ORDER_ID = '38'; // Use a real order ID from your system
const TEST_TOKEN = 'your_jwt_token_here'; // Get this from app localStorage

async function testSendInvoiceEmail() {
  console.log('🧪 Testing /send-invoice-email endpoint...\n');

  if (TEST_TOKEN === 'your_jwt_token_here') {
    console.log('⚠️  Please update TEST_TOKEN with a valid JWT from the app');
    console.log('Steps:');
    console.log('1. Open Flutter app and login');
    console.log('2. Open browser DevTools → Application → localStorage');
    console.log('3. Copy the "token" value');
    console.log('4. Paste it in the TEST_TOKEN variable above\n');
    return;
  }

  try {
    const url = `${BASE_URL}/send-invoice-email/${ORDER_ID}`;

    console.log(`📧 Sending request to: ${url}`);
    console.log(`Order ID: ${ORDER_ID}`);
    console.log(`Token: ${TEST_TOKEN.substring(0, 20)}...`);
    console.log('');

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log(`Status: ${res.statusCode}`);
          console.log(`Headers:`, res.headers);
          console.log(`Response:`, JSON.stringify(JSON.parse(data), null, 2));

          if (res.statusCode === 200) {
            console.log('\n✅ Invoice email sent successfully!');
            console.log('Check the email address associated with the order.');
          } else {
            console.log('\n❌ Failed to send invoice email');
          }

          resolve();
        });
      });

      req.on('error', (error) => {
        console.error('❌ Request error:', error.message);
        reject(error);
      });

      req.end();
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testSendInvoiceEmail().catch(console.error);

console.log('\n📝 Notes:');
console.log('- Make sure the order exists and has a generated invoice PDF');
console.log('- Invoice PDFs are generated in the background after order creation');
console.log('- Wait a few minutes after creating an order before testing email send');
console.log('- Check Brevo dashboard for email delivery status');
