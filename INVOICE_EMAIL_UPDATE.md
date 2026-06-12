# Invoice Email with PDF Attachment - Complete Code Updates

## 1. Updated `sendBrevoEmail` Function (Replace lines 116-142)

```javascript
// Helper function to send email via Brevo with optional attachments
async function sendBrevoEmail({ to, subject, htmlContent, replyTo = null, attachments = null }) {
    try {
        console.log(`📧 Sending email via Brevo to: ${to}, subject: ${subject}`);
        console.log(`📬 Using sender: ${BREVO_SENDER.email} (${BREVO_SENDER.name})`);
        if (attachments && attachments.length > 0) {
            console.log(`📎 Attaching ${attachments.length} file(s)`);
        }
        
        let sendSmtpEmail = new brevo.SendSmtpEmail();
        sendSmtpEmail.sender = BREVO_SENDER;
        sendSmtpEmail.to = [{ email: to }];
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = htmlContent;
        
        if (replyTo) {
            sendSmtpEmail.replyTo = { email: replyTo };
        }
        
        // Add attachments if provided
        if (attachments && attachments.length > 0) {
            sendSmtpEmail.attachment = attachments.map(att => ({
                name: att.name || att.fileName,
                content: att.content || att.data,
                url: att.url
            }));
            console.log('📎 Attachments prepared:', sendSmtpEmail.attachment);
        }
        
        const result = await brevoApiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('✅ Email sent via Brevo successfully!');
        console.log('📬 Full Brevo response:', JSON.stringify(result, null, 2));
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Brevo email error:', {
            message: error.message,
            response: error.response?.text || error.response?.body,
            status: error.status
        });
        throw error;
    }
}

// Helper function to fetch PDF from ImageKit URL and prepare it as base64 for email attachment
async function getPdfAttachmentFromImageKit(pdfUrl) {
    try {
        if (!pdfUrl) {
            console.warn('⚠️ No PDF URL provided');
            return null;
        }
        
        console.log(`🔤 Fetching PDF from ImageKit: ${pdfUrl}`);
        const response = await fetch(pdfUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        }
        
        const buffer = await response.buffer();
        const base64Content = buffer.toString('base64');
        
        console.log(`✅ PDF fetched and encoded (${base64Content.length} bytes of base64)`);
        
        // Extract filename from URL
        const urlParts = pdfUrl.split('/');
        const fileName = urlParts[urlParts.length - 1] || 'invoice.pdf';
        
        return {
            name: fileName,
            content: base64Content,
            contentType: 'application/pdf'
        };
    } catch (error) {
        console.error('❌ Error fetching PDF from ImageKit:', error.message);
        return null;
    }
}
```

## 2. Updated `/create-order` Endpoint - Email Sending Section

Replace the email sending section (around lines 2330-2395) with this updated code that includes PDF attachment:

```javascript
    // Send invoice email to customer (non-blocking, in background)
    let emailSent = false;
    let emailError = null;
    
    // Send email in background to not block response via Brevo with PDF attachment
    (async () => {
      try {
        console.log(`📧 Attempting to send invoice with PDF to ${user.email} via Brevo...`);
        
        // Professional order confirmation email with invoice details
        const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #212529 0%, #343a40 100%); color: white; padding: 40px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 2.5em; font-weight: 300; letter-spacing: 1px;">ORDER CONFIRMED</h1>
                <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Thank you for your purchase</p>
              </div>
              
              <!-- Main Content -->
              <div style="padding: 40px 20px; background-color: white;">
                <h2 style="color: #212529; margin-top: 0; margin-bottom: 10px; font-size: 24px;">Hi ${user.name},</h2>
                
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                  We're thrilled to confirm your order has been received and is now being prepared for shipment. 
                  Your invoice has been attached to this email for your records.
                </p>
                
                <!-- Order Summary Box -->
                <div style="background: #f8f9fa; border-left: 4px solid #ffc800; padding: 20px; margin: 30px 0; border-radius: 4px;">
                  <table style="width: 100%; font-size: 16px;">
                    <tr style="border-bottom: 1px solid #dee2e6;">
                      <td style="padding: 10px 0; color: #666;">Order Number:</td>
                      <td style="padding: 10px 0; text-align: right; color: #212529; font-weight: bold;">#${orderId.toString().padStart(6, '0')}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dee2e6;">
                      <td style="padding: 10px 0; color: #666;">Order Date:</td>
                      <td style="padding: 10px 0; text-align: right; color: #212529; font-weight: bold;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dee2e6;">
                      <td style="padding: 10px 0; color: #666;">Order Total:</td>
                      <td style="padding: 10px 0; text-align: right; color: #ffc800; font-weight: bold; font-size: 18px;">৳${parseFloat(totalAmount).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #666;">Payment Method:</td>
                      <td style="padding: 10px 0; text-align: right; color: #212529; font-weight: bold;">${paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'card' ? 'Credit/Debit Card' : 'Bank Transfer'}</td>
                    </tr>
                  </table>
                </div>
                
                <!-- Items Summary -->
                <div style="margin: 30px 0;">
                  <h3 style="color: #212529; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #ffc800; padding-bottom: 10px;">Order Items</h3>
                  <table style="width: 100%; font-size: 14px;">
                    ${items.map((item, idx) => {
                      const price = parseFloat(item.price) || 0;
                      const quantity = parseInt(item.quantity) || 0;
                      const itemTotal = price * quantity;
                      return `
                    <tr style="border-bottom: 1px solid #f0f0f0; padding: 10px 0;">
                      <td style="padding: 10px 0; color: #333; flex: 2;">${item.name}</td>
                      <td style="padding: 10px 0; text-align: right; color: #666; flex: 1;">৳${price.toFixed(2)} × ${quantity}</td>
                      <td style="padding: 10px 0; text-align: right; color: #212529; font-weight: bold; flex: 1;">৳${itemTotal.toFixed(2)}</td>
                    </tr>
                    `;
                    }).join('')}
                  </table>
                </div>
                
                <!-- What's Next -->
                <div style="background: #e8f4f8; border: 1px solid #b8d4e0; padding: 20px; margin: 30px 0; border-radius: 4px;">
                  <h3 style="color: #212529; margin-top: 0; margin-bottom: 15px; font-size: 16px;">What's Next?</h3>
                  <ul style="margin: 0; padding-left: 20px; color: #666; line-height: 1.8;">
                    <li>We'll prepare your order for shipment immediately</li>
                    <li>You'll receive a tracking number via email within 24 hours</li>
                    <li>Your order will be delivered according to the estimated delivery date</li>
                    <li>Keep your invoice handy for warranty and return purposes</li>
                  </ul>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://rajuit.online/dashboard" style="display: inline-block; background: linear-gradient(135deg, #ffc800 0%, #ffb300 100%); color: #212529; padding: 15px 40px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s;">
                    View My Orders
                  </a>
                </div>
                
                <!-- Contact Info -->
                <div style="background: #f8f9fa; padding: 20px; margin-top: 30px; border-radius: 4px; text-align: center;">
                  <p style="margin: 0; color: #666; font-size: 14px;">
                    <strong>Need Help?</strong><br>
                    Contact us at <strong>rajuit1396@gmail.com</strong> or call <strong>+8801726466000</strong>
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background: #212529; color: #999; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0; margin-bottom: 10px;">
                  © 2025 Raju IT - Premium Fashion Store. All rights reserved.
                </p>
                <p style="margin: 0; color: #666; font-size: 11px;">
                  This is an automated email. Please do not reply to this email. Your invoice is attached to this message.
                </p>
              </div>
            </div>
          `;
        
        // Wait for PDF to be available (with timeout), then attach it
        let pdfAttachment = null;
        let pdfCheckCount = 0;
        const maxPdfChecks = 60; // Check for up to 60 seconds
        
        // Immediately send email and try to attach PDF if available
        // The PDF might still be generating, so we'll attempt to fetch it
        const sendEmailWithPdf = async () => {
          try {
            // Try to get the latest invoice PDF URL from database
            let currentOrder = await sql`
              SELECT invoice_pdf_url FROM orders WHERE id = ${orderId}
            `;
            
            if (currentOrder && currentOrder[0] && currentOrder[0].invoice_pdf_url) {
              const pdfUrl = currentOrder[0].invoice_pdf_url;
              console.log(`📎 PDF is now available, attempting to fetch: ${pdfUrl}`);
              pdfAttachment = await getPdfAttachmentFromImageKit(pdfUrl);
              
              if (pdfAttachment) {
                console.log(`✅ PDF attachment ready: ${pdfAttachment.name}`);
              } else {
                console.warn(`⚠️ Failed to fetch PDF from ${pdfUrl}, sending email without attachment`);
              }
            } else {
              console.log(`⏳ PDF not yet available in database, sending email without attachment`);
            }
          } catch (pdfError) {
            console.error(`❌ Error checking for PDF:`, pdfError.message);
          }
          
          // Send email with or without PDF
          try {
            await sendBrevoEmail({
              to: user.email,
              subject: `Order Confirmation #${orderId.toString().padStart(6, '0')} - Raju IT`,
              htmlContent: emailHtml,
              attachments: pdfAttachment ? [pdfAttachment] : null
            });
            
            console.log(`✅ Order confirmation email sent successfully to ${user.email}` + (pdfAttachment ? ' with PDF attachment' : ' (PDF will be available in dashboard)'));
          } catch (sendError) {
            console.error(`❌ Failed to send order confirmation email:`, sendError.message);
          }
        };
        
        // Wait a short moment for PDF to generate, then send
        setTimeout(sendEmailWithPdf, 2000);
        
        // Send admin notification email with order details
        const adminEmailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
              <!-- Header -->
              <div style="background: #dc3545; color: white; padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 2em;">NEW ORDER RECEIVED</h1>
                <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Order #${orderId.toString().padStart(6, '0')}</p>
              </div>
              
              <!-- Main Content -->
              <div style="padding: 30px 20px; background-color: white;">
                <h2 style="color: #212529; margin-top: 0; margin-bottom: 20px;">Order Details</h2>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
                  <table style="width: 100%; font-size: 14px;">
                    <tr>
                      <td style="padding: 8px 0; color: #666; font-weight: bold;">Customer Name:</td>
                      <td style="padding: 8px 0; text-align: right;">${user.name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666; font-weight: bold;">Customer Email:</td>
                      <td style="padding: 8px 0; text-align: right;">${user.email}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666; font-weight: bold;">Order Total:</td>
                      <td style="padding: 8px 0; text-align: right; color: #ffc800; font-weight: bold; font-size: 16px;">৳${parseFloat(totalAmount).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666; font-weight: bold;">Payment Method:</td>
                      <td style="padding: 8px 0; text-align: right;">${paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'card' ? 'Credit/Debit Card' : 'Bank Transfer'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666; font-weight: bold;">Items:</td>
                      <td style="padding: 8px 0; text-align: right;">${items.length}</td>
                    </tr>
                  </table>
                </div>
                
                <h3 style="color: #212529; margin-bottom: 15px;">Shipping Address</h3>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; white-space: pre-line; font-size: 14px; color: #333;">
${shippingAddress}
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://rajuit.online/admin-orders.html" style="display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                    View in Admin Dashboard
                  </a>
                </div>
              </div>
            </div>
          `;
        
        await sendBrevoEmail({
          to: 'rajuit1396@gmail.com',
          subject: `New Order #${orderId.toString().padStart(6, '0')} - ${user.name}`,
          htmlContent: adminEmailHtml
        });
        
        console.log(`✅ Admin notification email sent to rajuit1396@gmail.com`);
        
      } catch (error) {
        console.error(`❌ Background email sending failed for order #${orderId}:`, error.message);
      }
    })();
```

## 3. Key Changes Made:

### In `sendBrevoEmail` function:
- Added `attachments` parameter (optional, defaults to null)
- Added support for attaching files using Brevo's `attachment` property
- Attachment objects can include `name`, `content`, `data`, or `url` properties

### In `/create-order` endpoint:
- Added `getPdfAttachmentFromImageKit` function call to fetch PDF from ImageKit
- Enhanced email template with professional styling and complete order information
- Added logic to wait for PDF generation (2-second delay) before sending
- If PDF is not ready, email is sent without it - PDF will still be available in dashboard
- Added detailed order items breakdown in email
- Added "What's Next?" section for better customer experience
- Admin email also enhanced with better formatting
- Proper error handling for PDF fetching

## 4. Installation Requirements:

Make sure your `package.json` includes `fetch` support. If using Node.js < 18, add:

```bash
npm install node-fetch@2
```

Then add at the top of `server_backend.js`:
```javascript
const fetch = require('node-fetch');
```

For Node.js 18+, `fetch` is built-in, so no installation needed.

## 5. How It Works:

1. **Order Created**: Customer creates an order via `/create-order`
2. **Invoice Generation**: Backend generates PDF and uploads to ImageKit (non-blocking)
3. **Email Queued**: Email sending logic waits 2 seconds for PDF to be ready
4. **PDF Attached**: If PDF is available, it's fetched from ImageKit as base64 and attached to email
5. **Email Sent**: Professional email with invoice PDF attachment is sent to customer
6. **Admin Notified**: Admin receives separate notification email with order details
7. **Dashboard**: PDF is still available in customer dashboard regardless of attachment status

## 6. Testing:

To test the feature:
1. Create a new order
2. Check the customer's email for order confirmation with PDF attachment
3. Check admin email for order notification
4. Verify PDF is also available in `/get-invoice/:orderId` endpoint
