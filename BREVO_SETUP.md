# Brevo Email Integration Setup Guide

## ✅ What's Been Done

1. **Installed Brevo SDK** - @getbrevo/brevo package installed
2. **Updated Email System** - All emails now use Brevo API instead of Gmail SMTP:
   - Order confirmation emails
   - Contact form emails
   - Password reset emails
3. **Created Password Reset Pages**:
   - `forgot-password.html` - Request password reset
   - `reset-password.html` - Set new password
4. **Added API Endpoints**:
   - `POST /forgot-password` - Send reset link
   - `POST /reset-password` - Reset password with token

## 🔑 How to Get Your Brevo API Key

### Step 1: Create Brevo Account
1. Go to https://www.brevo.com/
2. Click "Sign Up Free"
3. Create account (free plan includes 300 emails/day)

### Step 2: Get API Key
1. Login to Brevo dashboard
2. Click your name (top right) → "SMTP & API"
3. Click "API Keys" tab
4. Click "Generate a new API key"
5. Give it a name (e.g., "Raju IT Production")
6. Copy the API key (starts with "xkeysib-...")

### Step 3: Verify Sender Email
1. In Brevo dashboard, go to "Senders & IP"
2. Click "Add a sender"
3. Enter: rajuit1396@gmail.com
4. Check your Gmail for verification email
5. Click verification link

## 🚀 Deploy to Render

### Step 1: Update Environment Variables on Render
1. Go to https://dashboard.render.com
2. Select your "raju-agency" service
3. Go to "Environment" tab
4. Add these variables:

```
BREVO_API_KEY = xkeysib-your-actual-api-key-here
BREVO_SENDER_EMAIL = rajuit1396@gmail.com
BREVO_SENDER_NAME = Raju IT
```

### Step 2: Deploy
Run these commands in your terminal:

```bash
cd "c:\Users\raju\Desktop\New folder (2)\raju-agency"
git add .
git commit -m "Add Brevo email integration with password reset functionality"
git push
```

Render will automatically deploy (takes ~2 minutes).

## 📧 Email Features Now Available

### 1. Order Confirmation Emails
- Sent automatically when order is placed
- Includes order number and total amount
- Link to view order in dashboard

### 2. Contact Form Emails
- Sent when users submit contact form
- Delivered to: rajuit1396@gmail.com
- Includes customer details and message

### 3. Password Reset
- Users can reset password from login page
- Click "Forgot password?" → Enter email
- Receive reset link valid for 1 hour
- Set new password securely

## 🔧 Testing

### Test Password Reset:
1. Go to https://rajuit.online/forgot-password.html
2. Enter a registered email
3. Check email for reset link
4. Click link or paste in browser
5. Enter new password

### Test Order Email:
1. Place a test order
2. Check email for confirmation
3. Should arrive within seconds

### Test Contact Form:
1. Go to contact page
2. Submit a message
3. Check rajuit1396@gmail.com for email

## 🎯 Benefits of Brevo vs Gmail SMTP

✅ **More Reliable** - No timeout issues on Render
✅ **Higher Limits** - 300 emails/day (free plan)
✅ **Better Delivery** - Professional email infrastructure
✅ **Email Tracking** - See open rates, clicks in dashboard
✅ **No Authentication Issues** - API key instead of app password

## 🆘 Troubleshooting

**Email not received?**
- Check Brevo dashboard for delivery status
- Verify sender email is verified
- Check spam folder
- Ensure API key is correct

**"Invalid API key" error?**
- Verify BREVO_API_KEY in Render environment
- Ensure no extra spaces in API key
- Generate new key if needed

**Password reset link expired?**
- Links valid for 1 hour only
- Request new reset link

## 📊 Brevo Dashboard
- View sent emails: https://app.brevo.com/statistics/emails
- Check API usage: https://app.brevo.com/settings/keys/api
- Email templates: https://app.brevo.com/camp/template/listing

---

**Your Brevo integration is ready!** Just add your API key to Render and deploy. 🚀
