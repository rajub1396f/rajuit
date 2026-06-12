require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing email configuration...\n');
console.log('Gmail User:', process.env.GMAIL_USER);
console.log('Gmail Password:', process.env.GMAIL_APP_PASSWORD ? '***' + process.env.GMAIL_APP_PASSWORD.slice(-4) : 'NOT SET');

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER || "rajuit1396@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD || "txcbwzsekhdciba"
    },
    tls: {
        rejectUnauthorized: false
    }
});

console.log('\n📤 Testing email connection...');

transporter.verify((error, success) => {
    if (error) {
        console.error('\n❌ Email connection failed:');
        console.error('Error:', error.message);
        console.error('\nPossible issues:');
        console.error('1. App password is incorrect');
        console.error('2. 2-Step Verification is not enabled on Gmail');
        console.error('3. Need to generate a new App Password');
        console.error('\nTo fix:');
        console.error('- Go to: https://myaccount.google.com/apppasswords');
        console.error('- Create new App Password');
        console.error('- Update .env file with new password (no spaces)');
    } else {
        console.log('\n✅ Email connection successful!');
        console.log('\nNow testing actual email send...\n');
        
        const mailOptions = {
            from: process.env.GMAIL_USER || "rajuit1396@gmail.com",
            to: process.env.GMAIL_USER || "rajuit1396@gmail.com",
            subject: "Test Email from Raju IT",
            html: `
                <h2>Test Email</h2>
                <p>This is a test email from your contact form.</p>
                <p>If you received this, your email configuration is working correctly!</p>
            `
        };
        
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('❌ Failed to send test email:', err.message);
            } else {
                console.log('✅ Test email sent successfully!');
                console.log('Check your inbox:', process.env.GMAIL_USER);
            }
        });
    }
});
