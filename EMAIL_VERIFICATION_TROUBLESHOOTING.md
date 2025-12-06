# Email Verification Troubleshooting Guide

## ✅ What Has Been Updated

1. **Enhanced Error Logging** - Registration now logs detailed email sending errors
2. **Email Status Response** - Registration response includes `emailSent` flag
3. **Resend Verification Endpoint** - New `/resend-verification` endpoint added
4. **Updated verify-email-info.html** - Now functional with resend capability

## 🔍 Troubleshooting Steps

### Step 1: Verify Brevo API Key

Check your `.env` file has:
```
BREVO_API_KEY=xkeysib-your-key-here
BREVO_SENDER_EMAIL=rajuit1396@gmail.com
BREVO_SENDER_NAME=Raju IT
```

### Step 2: Verify Sender Email in Brevo

1. Login to https://app.brevo.com
2. Go to **Senders & IP** → **Senders**
3. Verify `rajuit1396@gmail.com` is listed and verified
4. If not verified, add it and verify through email

### Step 3: Check Brevo API Limits

Free plan: 300 emails/day
- Check your usage at https://app.brevo.com
- If limit reached, wait 24 hours or upgrade

### Step 4: Test Email Sending

**Method 1: Browser Test**
```
http://localhost:5500/test-email
```
Should return: "Test email sent"

**Method 2: Terminal Test**
```powershell
Invoke-RestMethod -Uri "http://localhost:5500/test-email"
```

### Step 5: Check Server Logs

When registering a user, look for these logs:
```
✅ User registered successfully
📧 Sending email via Brevo to: user@example.com
🔑 Using sender: rajuit1396@gmail.com (Raju IT)
✅ Email sent via Brevo successfully!
```

If you see:
```
❌ Error sending verification email
```
Check the detailed error message that follows.

## 🔧 Common Issues & Solutions

### Issue 1: "BREVO_API_KEY not configured"
**Solution:** Add your Brevo API key to `.env` file and restart server

### Issue 2: "Sender email not verified"
**Solution:** 
1. Go to Brevo dashboard
2. Senders & IP → Add Sender
3. Verify email through link sent to rajuit1396@gmail.com

### Issue 3: "Daily limit exceeded"
**Solution:** 
- Wait 24 hours for limit reset
- Or upgrade Brevo plan at https://app.brevo.com

### Issue 4: Email goes to spam
**Solution:**
1. Check spam/junk folder
2. In Brevo, set up SPF/DKIM records (Settings → Senders & IP)
3. Add your domain verification

### Issue 5: "Invalid API key"
**Solution:**
1. Generate new API key in Brevo
2. Copy entire key (starts with `xkeysib-`)
3. Update `.env` file
4. Restart server

## 📧 Testing Registration Flow

### Test with a Real Email:

1. **Register New User:**
```javascript
// On http://localhost:5500/index.html
Click "Create Account"
Fill: name, email, password, phone
Submit
```

2. **Check Server Console:**
```
📝 Registration request received
🔍 Checking if email exists
🔐 Hashing password
💾 Inserting user into database
✅ User registered successfully
📧 Sending email via Brevo
✅ Verification email sent to: user@example.com
```

3. **Check Email Inbox:**
- Subject: "Verify Your Email - Raju IT"
- From: Raju IT <rajuit1396@gmail.com>
- Contains: Yellow "Verify Email Address" button

4. **Click Verification Link:**
- Should see success page
- Auto-redirect to dashboard in 3 seconds

5. **Try to Login (Before Verification):**
```
Should see: "Please verify your email address before logging in"
```

6. **Try to Login (After Verification):**
```
Should redirect to dashboard successfully
```

## 🔄 Resend Verification Email

If user didn't receive email:

1. Go to: `http://localhost:5500/verify-email-info.html`
2. Enter email address
3. Click "Resend Verification Email"
4. Check email inbox again

## 📊 Check Database

Verify columns exist:
```sql
SELECT id, email, is_verified, verification_token 
FROM users 
WHERE email = 'test@example.com';
```

Expected:
- `is_verified`: false (before verification)
- `verification_token`: JWT token string
- After verification: `is_verified`: true, `verification_token`: null

## 🚨 If Emails Still Not Sending

### Check Brevo Dashboard:
1. Go to https://app.brevo.com
2. Click "Statistics" → "Email"
3. See if emails are being sent
4. Check bounce/spam rates

### Check Brevo Logs:
1. Transactional → Logs
2. See real-time email sending status
3. Check for errors/bounces

### Alternative: Use Brevo SMTP
If API not working, switch to SMTP in server.js:
```javascript
// Add nodemailer SMTP config
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: 'your-brevo-smtp-login',
    pass: 'your-brevo-smtp-key'
  }
});
```

## ✅ Success Indicators

You'll know it's working when you see:

1. **Server Console:**
   - ✅ Brevo email service initialized
   - ✅ Email sent via Brevo successfully!

2. **Registration Response:**
   ```json
   {
     "message": "Registration successful! Please check your email...",
     "emailSent": true,
     "requiresVerification": true
   }
   ```

3. **Email Received:**
   - Professional HTML email with branding
   - Working verification button
   - 24-hour expiration notice

4. **Verification Works:**
   - Clicking link shows success page
   - User can now login
   - Database updated: `is_verified = true`

## 📝 Manual Testing Checklist

- [ ] Server starts without errors
- [ ] Database columns added (is_verified, verification_token)
- [ ] Brevo API key is valid
- [ ] Sender email is verified in Brevo
- [ ] Test email endpoint works
- [ ] Registration creates user with is_verified=false
- [ ] Verification email is sent
- [ ] Email contains clickable verification link
- [ ] Verification link updates database
- [ ] Login blocked before verification
- [ ] Login works after verification
- [ ] Resend verification endpoint works

## 🆘 Still Need Help?

Check these files for implementation:
- `server.js` lines 206-335: Registration with email
- `server.js` lines 364-589: Email verification endpoint
- `server.js` lines 591-705: Resend verification endpoint
- `index.html` lines 991-1083: Frontend handlers

Contact support with:
1. Server console logs
2. Registration response JSON
3. Brevo dashboard screenshots
4. Any error messages

---

**Last Updated:** December 7, 2025
**Status:** Email verification fully implemented with resend capability
