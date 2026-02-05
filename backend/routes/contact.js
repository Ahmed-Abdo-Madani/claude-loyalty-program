import express from 'express'
import logger from '../config/logger.js'
import EmailService from '../services/EmailService.js'
import TemplateRenderer from '../utils/emailTemplateRenderer.js'

const router = express.Router()

/**
 * Escapes HTML characters to prevent XSS
 * @param {string} unsafe - The string to escape
 * @returns {string} The escaped string
 */
function escapeHtml(unsafe) {
  if (!unsafe || typeof unsafe !== 'string') return ''
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Builds the admin notification email HTML
 * @deprecated Use TemplateRenderer with ContactFormNotificationEmail instead
 */
function buildContactFormNotificationHTML({ firstName, lastName, email, company, subject, message, timestamp }) {
  const safeFirstName = escapeHtml(firstName)
  const safeLastName = escapeHtml(lastName)
  const safeEmail = escapeHtml(email)
  const safeCompany = escapeHtml(company || '-')
  const safeSubject = escapeHtml(subject)
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; max-width: 600px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #333333; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
              <p style="color: #cccccc; margin: 5px 0 0; font-size: 14px;">${timestamp}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #333333; margin-top: 0; padding-bottom: 10px; border-bottom: 1px solid #eeeeee;">Contact Information</h2>
              
              <table border="0" cellpadding="5" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td width="30%" style="color: #666666; font-weight: bold;">Name:</td>
                  <td style="color: #333333;">${safeFirstName} ${safeLastName}</td>
                </tr>
                <tr>
                  <td style="color: #666666; font-weight: bold;">Email:</td>
                  <td style="color: #333333;"><a href="mailto:${safeEmail}" style="color: #0066cc; text-decoration: none;">${safeEmail}</a></td>
                </tr>
                <tr>
                  <td style="color: #666666; font-weight: bold;">Company:</td>
                  <td style="color: #333333;">${safeCompany}</td>
                </tr>
              </table>

              <h2 style="color: #333333; padding-bottom: 10px; border-bottom: 1px solid #eeeeee;">Subject</h2>
              <div style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; margin-bottom: 20px; color: #333333; font-weight: bold;">
                ${safeSubject}
              </div>

              <h2 style="color: #333333; padding-bottom: 10px; border-bottom: 1px solid #eeeeee;">Message</h2>
              <div style="padding: 15px; border: 1px solid #eeeeee; border-radius: 4px; background-color: #fcfcfc; color: #333333; line-height: 1.6;">
                ${safeMessage}
              </div>

              <!-- Action Button -->
              <div style="margin-top: 30px; text-align: center;">
                <a href="mailto:${safeEmail}?subject=Re: ${safeSubject}" style="background-color: #0066cc; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reply to Customer</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                This is an automated notification from your website's contact form.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
}

/**
 * Builds the customer confirmation email HTML
 * @deprecated Use TemplateRenderer with ContactFormConfirmationEmail instead
 */
function buildContactFormConfirmationHTML({ firstName, subject, submissionData }) {
  const safeFirstName = escapeHtml(firstName)
  const safeSubject = escapeHtml(subject)

  // Create a summary of what they sent
  const summaryHtml = Object.entries(submissionData)
    .filter(([_, value]) => value) // only include fields with values
    .map(([key, value]) => `
            <tr>
                <td style="padding: 5px 0; color: #666666; width: 30%; text-transform: capitalize;">${key}:</td>
                <td style="padding: 5px 0; color: #333333;">${escapeHtml(value)}</td>
            </tr>
        `).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Message Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; max-width: 600px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Thank You for Contacting Us</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333333; font-size: 16px; margin-top: 0;">Hi ${safeFirstName},</p>
              
              <p style="color: #333333; line-height: 1.6;">
                  We've received your message regarding <strong>"${safeSubject}"</strong> and will get back to you as soon as possible.
              </p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333333; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Your Submission Details</h3>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      ${summaryHtml}
                  </table>
              </div>

              <p style="color: #333333; line-height: 1.6;">
                  Our typical response time is within 24 hours. If your matter is urgent, please call us directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #333333; font-weight: bold; margin: 0 0 5px;">Madn</p>
              <p style="color: #666666; font-size: 14px; margin: 0;">Riyadh, Saudi Arabia</p>
              <p style="color: #999999; font-size: 12px; margin: 20px 0 0;">
                &copy; ${new Date().getFullYear()} Madn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
}

// POST /api/contact
router.post('/', async (req, res) => {
  try {
    // 0. Configuration check
    if (!process.env.CONTACT_FORM_RECIPIENT_EMAIL) {
      logger.error('CONTACT_FORM_RECIPIENT_EMAIL is not configured');
      return res.status(500).json({
        success: false,
        message: 'Email delivery is not configured'
      });
    }

    const { firstName, lastName, email, company, subject, message } = req.body

    // 1. Validation
    if (!firstName || !lastName || !email || !subject || !message) {
      logger.warn('Contact form validation failed: missing required fields', { body: req.body })
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      logger.warn('Contact form validation failed: invalid email', { email })
      return res.status(400).json({
        success: false,
        message: 'Invalid email address'
      })
    }

    // Length validation
    if (firstName.length > 100 || lastName.length > 100) {
      return res.status(400).json({ success: false, message: 'Name is too long (max 100 chars)' })
    }
    if (subject.length > 200) {
      return res.status(400).json({ success: false, message: 'Subject is too long (max 200 chars)' })
    }
    if (message.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message is too long (max 2000 chars)' })
    }

    logger.info('📩 Contact form submission received', {
      firstName,
      lastName,
      email,
      subject,
      messageLength: message.length
    })

    // 2. Prepare Emails
    const timestamp = new Date().toISOString()

    // const adminHtml = buildContactFormNotificationHTML({
    //   firstName, lastName, email, company, subject, message, timestamp
    // })
    const adminHtml = await TemplateRenderer.renderTemplate(
      'contact/ContactFormNotificationEmail',
      { firstName, lastName, email, company, subject, message, timestamp },
      'en'
    );

    const customerSubmissionData = {
      'Name': `${firstName} ${lastName}`,
      'Email': email,
      'Subject': subject,
      'Company': company,
      'Message': message
    }

    // Detect language or default to en
    const language = req.locale || 'en';

    // const customerHtml = buildContactFormConfirmationHTML({
    //   firstName, subject, submissionData: customerSubmissionData
    // })
    const customerHtml = await TemplateRenderer.renderTemplate(
      'contact/ContactFormConfirmationEmail',
      { firstName, subject, submissionData: customerSubmissionData },
      language
    );

    // 3. Send Emails
    let adminEmailSent = false
    let customerEmailSent = false

    // Admin Notification
    try {
      const adminRecipients = (process.env.CONTACT_FORM_RECIPIENT_EMAIL || '').split(',').map(e => e.trim()).filter(e => e)

      if (adminRecipients.length === 0) {
        logger.warn('CONTACT_FORM_RECIPIENT_EMAIL not configured, skipping admin notification')
      } else {
        const sendPromises = adminRecipients.map(recipient =>
          EmailService.sendTransactional({
            to: recipient,
            subject: `New Contact Form Submission: ${subject}`,
            html: adminHtml,
            text: `New Contact from ${firstName} ${lastName} (${email})\nSubject: ${subject}\n\n${message}`,
            priority: 'high',
            replyTo: email
          })
        )

        await Promise.all(sendPromises)
        adminEmailSent = true
        logger.info(`Admin notification sent to ${adminRecipients.length} recipients`)
      }
    } catch (err) {
      logger.error('Failed to send admin contact notification', err)
    }

    // Customer Confirmation
    try {
      await EmailService.sendTransactional({
        to: email,
        subject: `We received your message - ${subject}`,
        html: customerHtml,
        text: `Hi ${firstName},\n\nWe received your message regarding "${subject}". We will respond within 24 hours.\n\nThank you,\nMadn Team`
      })
      customerEmailSent = true
      logger.info('Customer confirmation email sent', { to: email })
    } catch (err) {
      logger.error('Failed to send customer confirmation email', err)
    }

    // 4. Response
    res.status(200).json({
      success: true,
      message: 'Message received successfully',
      emailSent: {
        adminNotification: adminEmailSent,
        customerConfirmation: customerEmailSent
      }
    })

  } catch (error) {
    logger.error('Error handling contact form submission:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
