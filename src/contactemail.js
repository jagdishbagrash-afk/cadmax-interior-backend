module.exports = ({ name, email, phone_number, services, message, isUser = false }) => {
    return `
  <table align="center" style="max-width:600px;font-family:Arial,Helvetica,sans-serif;text-align:left;" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#000">
    <tr bgcolor="#141414">
      <td style="padding:20px 2px 0 2px;text-align:center;">
        <p style="margin:1px;">
          <img style="max-width:150px;" src="/logo.png" alt="cadmaxpro.com Logo">
        </p>
      </td>
    </tr>

    <tr bgcolor="#141414">
      <td style="padding:40px 2px 10px 2px;text-align:center;">
        <p style="margin:1px;">
          <img src="https://f003.backblazeb2.com/file/Event-management/emailbanner.png" alt="Email Banner">
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:40px 0 30px 10px;">
        <p style="margin:1px;font-size:14px;font-weight:normal;color:#CCCCCC;">
          Hi ${name},
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 10px 30px 10px;">
        <p style="margin:1px;font-size:14px;font-weight:normal;color:#CCCCCC;line-height:19px;">
          ${isUser
            ? `Thank you for reaching out to <b>cadmaxpro.com</b>. Below are the details you submitted:`
            : `A new contact request has been received from <b>${name}</b>. Please review the details below:`
        }
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 0 25px 10px;">
        <p style="margin:1px;font-size:14px;font-weight:normal;color:#CCCCCC;">📞 <b>Phone Number:</b> ${phone_number}</p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 0 25px 10px;">
        <p style="margin:1px;font-size:14px;font-weight:normal;color:#CCCCCC;">📧 <b>Email:</b> ${email}</p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 0 25px 10px;">
        <p style="margin:1px;font-size:14px;font-weight:normal;color:#CCCCCC;">🛠️ <b>Services:</b> ${services}</p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 0 45px 10px;">
        <p style="margin:1px;font-size:14px;font-weight:normal;color:#CCCCCC;">💬 <b>Message:</b> ${message}</p>
      </td>
    </tr>

    ${isUser
            ? `
    <tr>
      <td style="padding:0 0 45px 10px;">
        <p style="margin:1px;font-size:14px;font-weight:normal;color:#CCCCCC;">
          We appreciate you taking the time to contact us. Our team will review your request and get back to you as soon as possible.
        </p>
        <p style="margin:15px 1px 1px 1px;font-size:14px;font-weight:normal;color:#CCCCCC;">
          Warm regards,<br>
          The <b>cadmaxpro.com</b> Team 🌟
        </p>
      </td>
    </tr>`
            : `
    <tr>
      <td style="padding:0 0 45px 10px;">
        <p style="margin:1px;font-size:14px;font-weight:normal;color:#CCCCCC;">
          Please follow up with this contact request at your earliest convenience.
        </p>
      </td>
    </tr>`
        }

    <tr bgcolor="#141414">
      <td style="padding:15px 0 5px 0;border-top:1px solid #444444;">
        <p style="margin:1px;font-size:14px;font-weight:normal;color:#CCCCCC;text-align:center;">
          © 2024 <b>cadmaxpro.com</b>. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
  `;
};
