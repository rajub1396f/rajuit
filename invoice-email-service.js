// Invoice Email Service - Handles sending professional invoices via email
const brevo = require("@getbrevo/brevo");

const brevoApiInstance = new brevo.TransactionalEmailsApi();
brevoApiInstance.setApiKey(brevo.ApiKeyAuth, process.env.BREVO_API_KEY || "xkeysib-your-key");

const BREVO_SENDER = {
    email: process.env.BREVO_SENDER_EMAIL || "rajuit1396@gmail.com",
    name: process.env.BREVO_SENDER_NAME || "Raju IT"
};

/**
 * Send professional invoice via email with PDF attachment
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.customerName - Customer name
 * @param {string} params.orderId - Order ID
 * @param {string} params.totalAmount - Total order amount
 * @param {string} params.invoicePdfUrl - URL of invoice PDF on ImageKit
 * @param {Array} params.items - Order items for summary
 */
async function sendInvoiceEmail({ to, customerName, orderId, totalAmount, invoicePdfUrl, items = [] }) {
    try {
        console.log(`ðŸ"§ Preparing professional invoice email for: ${to}, Order: #${orderId}`);

        // Create professional invoice email HTML
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 0; }
        .header { background: linear-gradient(135deg, #212529 0%, #343a40 100%); color: white; padding: 40px; text-align: center; }
        .header h1 { margin: 0; font-size: 2em; }
        .header p { margin: 5px 0; font-size: 0.9em; opacity: 0.9; }
        .content { padding: 40px; background: white; }
        .greeting { font-size: 1.1em; margin-bottom: 20px; }
        .order-summary { background: #f8f9fa; padding: 20px; border-left: 4px solid #ffc800; margin: 20px 0; border-radius: 5px; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .summary-row strong { color: #212529; }
        .items-list { margin: 20px 0; }
        .item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e0e0e0; }
        .item-name { flex: 1; }
        .item-price { text-align: right; color: #666; }
        .action-button { 
            display: inline-block; 
            background: #ffc800; 
            color: #212529; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold; 
            margin: 20px 0;
            text-align: center;
        }
        .action-button:hover { background: #ffb700; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 0.9em; border-top: 1px solid #e0e0e0; }
        .divider { height: 1px; background: #e0e0e0; margin: 20px 0; }
        .thank-you { font-size: 1.2em; color: #28a745; font-weight: bold; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Invoice Confirmation</h1>
            <p>Order #${orderId.toString().padStart(6, '0')}</p>
        </div>

        <div class="content">
            <div class="greeting">
                Dear <strong>${customerName}</strong>,
            </div>

            <p>Thank you for your order at <strong>Raju IT - Premium Fashion Store</strong>! We're thrilled to serve you.</p>

            <div class="order-summary">
                <div class="summary-row">
                    <span><strong>Order Number:</strong></span>
                    <span>#${orderId.toString().padStart(6, '0')}</span>
                </div>
                <div class="summary-row">
                    <span><strong>Order Date:</strong></span>
                    <span>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="summary-row">
                    <span><strong>Total Amount:</strong></span>
                    <span style="font-size: 1.1em; color: #212529;">à§³${totalAmount}</span>
                </div>
            </div>

            <h3 style="color: #212529; margin: 25px 0 15px 0;">Order Items</h3>
            <div class="items-list">
                ${items.map(item => `
                <div class="item">
                    <span class="item-name">${item.name} (x${item.quantity})</span>
                    <span class="item-price">à§³${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                </div>
                `).join('')}
            </div>

            <div class="divider"></div>

            <div class="thank-you">
                ðŸ™Œ Your invoice is attached to this email!
            </div>

            <p>Your professional invoice PDF has been attached to this email. You can:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Download and save your invoice</li>
                <li>Print it for your records</li>
                <li>Share it with your accounting department</li>
            </ul>

            <p style="text-align: center; margin-top: 30px;">
                <a href="https://rajuit.online/dashboard" class="action-button">View Your Orders</a>
            </p>

            <div class="divider"></div>

            <h3 style="color: #212529;">What's Next?</h3>
            <ul style="margin: 10px 0; padding-left: 20px; line-height: 2;">
                <li>âœ… Order received and confirmed</li>
                <li>ðŸ"¦ Your items are being prepared for shipping</li>
                <li>ðŸ'¬ You'll receive shipping updates via email</li>
                <li>ðŸšš Track your package in real-time</li>
            </ul>

            <p style="margin-top: 30px;">
                If you have any questions about your order, please don't hesitate to contact us at 
                <strong>rajuit1396@gmail.com</strong> or call <strong>+8801726466000</strong>
            </p>

            <p style="color: #999; font-size: 0.9em; margin-top: 20px;">
                We appreciate your business and look forward to serving you again!
            </p>
        </div>

        <div class="footer">
            <p><strong>Raju IT - Premium Fashion Store</strong></p>
            <p>ðŸ"§ rajuit1396@gmail.com | ðŸ"± +8801726466000</p>
            <p style="margin-top: 15px; color: #999;">Â© 2025 Raju IT. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;

        // Send email with attachment
        await sendBrevoEmailWithAttachment({
            to,
            subject: `Invoice #${orderId.toString().padStart(6, '0')} - Order Confirmation from Raju IT`,
            htmlContent: emailHtml,
            attachmentUrl: invoicePdfUrl,
            attachmentName: `Invoice_${orderId}.pdf`
        });

        console.log(`âœ… Invoice email sent successfully to ${to}`);
        return { success: true, email: to };

    } catch (error) {
        console.error(`âŒ Error sending invoice email:`, error.message);
        throw error;
    }
}

/**
 * Send email with attachment from URL
 * @param {Object} params - Email parameters
 */
async function sendBrevoEmailWithAttachment({ to, subject, htmlContent, attachmentUrl, attachmentName }) {
    try {
        console.log(`ðŸ"§ Sending email via Brevo to: ${to}`);
        
        let sendSmtpEmail = new brevo.SendSmtpEmail();
        sendSmtpEmail.sender = BREVO_SENDER;
        sendSmtpEmail.to = [{ email: to }];
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = htmlContent;

        // Add attachment if URL provided
        if (attachmentUrl && attachmentName) {
            try {
                console.log(`ðŸ"Ž Fetching attachment from ImageKit: ${attachmentUrl}`);
                const response = await fetch(attachmentUrl);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch attachment: ${response.statusText}`);
                }

                const buffer = await response.buffer();
                const base64 = buffer.toString('base64');
                
                sendSmtpEmail.attachment = [
                    {
                        name: attachmentName,
                        content: base64
                    }
                ];
                console.log(`âœ… Attachment prepared: ${attachmentName} (${buffer.length} bytes)`);

            } catch (attachError) {
                console.warn(`âš ï¸ Warning: Could not attach PDF:`, attachError.message);
                console.warn(`âš ï¸ Email will be sent without attachment`);
                // Continue without attachment - don't fail the entire email
            }
        }

        const result = await brevoApiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`âœ… Email sent successfully! Message ID: ${result.messageId}`);
        return { success: true, messageId: result.messageId };

    } catch (error) {
        console.error(`âŒ Brevo email error:`, {
            message: error.message,
            status: error.status
        });
        throw error;
    }
}

module.exports = {
    sendInvoiceEmail,
    sendBrevoEmailWithAttachment
};
