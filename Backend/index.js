import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';
import axios from 'axios';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Twilio setup
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Utility: Verify email using MailboxLayer API
const isEmailValid = async (email) => {
  try {
    const url = `http://apilayer.net/api/check?access_key=${process.env.MAILBOXLAYER_API_KEY}&email=${email}&smtp=1&format=1`;
    const response = await axios.get(url);
    return response.data.smtp_check === true && response.data.format_valid === true;
  } catch (error) {
    console.error('📧 Email validation failed:', error.message);
    return false;
  }
};

// POST /submit-contact
app.post('/submit-contact', async (req, res) => {
  try {
    const { name, email, service, message } = req.body;

    if (!name || !email || !service || !message) {
      return res.status(400).json({ success: false, error: 'Missing fields' });
    }

    // Verify email validity
    const emailValid = await isEmailValid(email);
    if (!emailValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or unverifiable email address',
      });
    }

    const whatsappMessage = `🔔 New Contact Form Submission

👤 Name: ${name}
📧 Email: ${email}
🛠️ Service: ${service}
💬 Message: ${message}
🕒 Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

    const whatsappResponse = await twilioClient.messages.create({
      body: whatsappMessage,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: process.env.TO_WHATSAPP_NUMBER,
    });

    console.log('📤 WhatsApp message sent. SID:', whatsappResponse.sid);

    res.json({
      success: true,
      message: 'Valid email. WhatsApp message sent!',
      sid: whatsappResponse.sid,
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Something went wrong',
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
