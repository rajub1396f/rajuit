// Test Brevo email configuration
require("dotenv").config();
const brevo = require('@getbrevo/brevo');

console.log("🧪 Testing Brevo Email Configuration...\n");

// Check environment variables
console.log("1️⃣ Checking Environment Variables:");
console.log(`   BREVO_API_KEY: ${process.env.BREVO_API_KEY ? '✅ Set (starting with: ' + process.env.BREVO_API_KEY.substring(0, 15) + '...)' : '❌ NOT SET'}`);
console.log(`   BREVO_SENDER_EMAIL: ${process.env.BREVO_SENDER_EMAIL || '❌ NOT SET'}`);
console.log(`   BREVO_SENDER_NAME: ${process.env.BREVO_SENDER_NAME || '❌ NOT SET'}\n`);

if (!process.env.BREVO_API_KEY) {
    console.error("❌ BREVO_API_KEY is not set! Please add it to your .env file or environment variables.");
    console.log("\nTo fix this:");
    console.log("1. Get your API key from: https://app.brevo.com/settings/keys/api");
    console.log("2. Add to .env file: BREVO_API_KEY=xkeysib-your-api-key-here");
    console.log("3. Or set environment variable on Render.com");
    process.exit(1);
}

// Initialize Brevo
console.log("2️⃣ Initializing Brevo API Client...");
let apiInstance = new brevo.TransactionalEmailsApi();
let apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const SENDER = {
    email: process.env.BREVO_SENDER_EMAIL || "rajuit1396@gmail.com",
    name: process.env.BREVO_SENDER_NAME || "Raju IT"
};

console.log(`✅ Brevo client initialized\n`);

// Test sending email
async function testEmail() {
    console.log("3️⃣ Sending Test Email...");
    
    const testRecipient = process.env.BREVO_SENDER_EMAIL || "rajuit1396@gmail.com";
    
    console.log(`   From: ${SENDER.email} (${SENDER.name})`);
    console.log(`   To: ${testRecipient}`);
    console.log(`   Subject: Test Email from Raju IT\n`);
    
    try {
        let sendSmtpEmail = new brevo.SendSmtpEmail();
        sendSmtpEmail.sender = SENDER;
        sendSmtpEmail.to = [{ email: testRecipient }];
        sendSmtpEmail.subject = "Test Email from Raju IT - Password Reset Feature";
        sendSmtpEmail.htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #ffc800;">✅ Brevo Email Test Successful!</h2>
                <p>This is a test email to verify your Brevo email configuration is working correctly.</p>
                <p><strong>If you received this email, your password reset feature should work!</strong></p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    Sent from: Raju IT Email System<br>
                    Time: ${new Date().toLocaleString()}
                </p>
            </div>
        `;
        
        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        
        console.log("✅ Email sent successfully!");
        console.log(`   Message ID: ${result.messageId}`);
        console.log(`\n🎉 SUCCESS! Check your inbox at ${testRecipient}`);
        console.log("   (Don't forget to check spam/junk folder)\n");
        
    } catch (error) {
        console.error("\n❌ FAILED to send email!");
        console.error("   Error:", error.message);
        
        if (error.response) {
            console.error("   Response:", error.response.text || error.response.body);
        }
        
        console.log("\n🔧 Troubleshooting Tips:");
        console.log("1. Verify API key is correct: https://app.brevo.com/settings/keys/api");
        console.log("2. Verify sender email is validated in Brevo");
        console.log("3. Check Brevo account status and limits");
        console.log("4. Make sure API key has 'Send emails' permission\n");
        
        process.exit(1);
    }
}

// Run test
testEmail().catch(err => {
    console.error("Unexpected error:", err);
    process.exit(1);
});
