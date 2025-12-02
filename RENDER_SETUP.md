# Render Deployment Setup

## Environment Variables Required on Render

To ensure all features work correctly on Render, you need to set these environment variables in your Render dashboard:

### Go to: Dashboard → Your Web Service → Environment → Environment Variables

Add the following variables:

```
JWT_SECRET=SuperSecretKey123!@#
SESSION_SECRET=SessionSecretKey456$%^
NEON_DB=postgresql://neondb_owner:npg_b2oIpFrXSU8E@ep-wispy-rain-a4aek6x4-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
GMAIL_USER=rajuit1396@gmail.com
GMAIL_APP_PASSWORD=otldvhcmpxmlqgyn
NODE_ENV=production
```

## Email Configuration for Render

### Important Notes:

1. **Gmail SMTP Settings:**
   - Host: smtp.gmail.com
   - Port: 587
   - Secure: false (use STARTTLS)
   - The app password is already configured

2. **If emails are not sending on Render:**
   
   **Option A: Check Render Logs**
   ```
   - Go to Render Dashboard → Your Service → Logs
   - Look for email-related errors
   - Common issues: "SMTP timeout", "Connection refused", "Authentication failed"
   ```

   **Option B: Verify Gmail Settings**
   - Ensure 2-Step Verification is enabled on Gmail account
   - Ensure App Password is still valid (doesn't expire)
   - Try regenerating App Password if needed
   
   **Option C: Alternative Email Service (if Gmail is blocked)**
   If Render blocks Gmail SMTP, consider using:
   - **SendGrid** (has free tier)
   - **Mailgun** (has free tier)
   - **AWS SES** (very reliable)
   
   To switch to SendGrid:
   ```javascript
   // Install: npm install @sendgrid/mail
   const sgMail = require('@sendgrid/mail');
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
   ```

3. **Current Behavior:**
   - Order will complete successfully even if email fails
   - User can always download invoice from confirmation page
   - Invoice is stored in session storage
   - User receives notification if email wasn't sent

## Testing Email on Render

After deployment, test by:
1. Placing a test order
2. Check Render logs for email success/failure messages
3. Check if invoice arrives in email
4. Verify you can download invoice from invoice page

## Troubleshooting

### Email not received but order completed?
- Check spam/junk folder
- Verify email logs in Render dashboard
- Ensure GMAIL_USER and GMAIL_APP_PASSWORD are correctly set
- Try downloading invoice directly from the order confirmation

### Common Render Issues:
- **Port 587 blocked?** Try port 465 with secure: true
- **Timeout errors?** Increase timeout in nodemailer config
- **Auth errors?** Regenerate Gmail App Password

## Contact Information
- Email: rajuit1396@gmail.com
- WhatsApp: +966539082027
