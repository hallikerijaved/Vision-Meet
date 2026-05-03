const nodemailer = require('nodemailer');
const https = require('https');

/**
 * Sends an email using Brevo HTTP API (Best for Render free tier)
 */
const sendBrevoEmail = (email, subject, html) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      sender: { email: process.env.GMAIL_USER || 'no-reply@gdplatform.com', name: 'GD Platform' },
      to: [{ email: email }],
      subject: subject,
      htmlContent: html
    });

    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Email sent via Brevo API');
          resolve(data);
        } else {
          console.error(`Brevo API error: ${res.statusCode} ${data}`);
          reject(new Error(`Brevo API error: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
};

/**
 * Sends an email using Nodemailer and Gmail (Fails on Render free tier due to port 465 block, works locally)
 */
const sendGmailEmail = async (email, subject, html, text) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  await transporter.verify();
  const mailOptions = {
    from: `"GD Platform" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: subject,
    text: text,
    html: html
  };

  await transporter.sendMail(mailOptions);
  console.log('✅ Email sent via Nodemailer (Gmail)');
  return true;
};

/**
 * Universal email sender that automatically chooses the right method
 */
const sendEmail = async (email, subject, html, text) => {
  // On Render free tier, SMTP ports are blocked — try Brevo first, then Gmail
  // If both fail, the caller handles the fallback

  // 1. Try Brevo API if key is present (Bypasses Render SMTP block)
  if (process.env.BREVO_API_KEY) {
    try {
      console.log('Attempting to send email via Brevo HTTP API...');
      await sendBrevoEmail(email, subject, html);
      return true;
    } catch (error) {
      console.error('Brevo API failed, falling back to next method...', error.message);
    }
  }

  // 2. Fallback to Gmail SMTP
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      console.log('Attempting to send email via Gmail SMTP...');
      await sendGmailEmail(email, subject, html, text);
      return true;
    } catch (error) {
      console.error('Gmail SMTP failed:', error.message);
      throw new Error('All email delivery methods failed');
    }
  }

  throw new Error('No email configuration found. Please add BREVO_API_KEY or GMAIL_APP_PASSWORD to .env');
};

module.exports = {
  sendEmail
};
