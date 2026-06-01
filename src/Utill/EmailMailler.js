const nodemailer = require("nodemailer");
const logger = require("./Logger");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async ({ email, subject, emailHtml }) => {
  try {
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"Cadmax Interior" <${process.env.EMAIL}>`,
      to: email,
      subject,
      html: emailHtml,
    });

    logger.info(`Email sent successfully: ${info.messageId}`);

    return info;
  } catch (error) {
    logger.error(`Email sending failed: ${error.message}`);
    throw error;
  }
};

module.exports = sendEmail;