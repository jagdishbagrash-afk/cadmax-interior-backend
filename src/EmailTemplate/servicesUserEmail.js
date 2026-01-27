module.exports = ({ userName, userEmail, serviceType, serviceName, concept }) => {
  return `
  <div style="background:#f5f5f5;padding:20px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"
      style="max-width:520px;margin:auto;background:#ffffff;font-family:Arial;">

      <tr>
        <td style="padding:18px;text-align:center;">
          <img src="https://student-teacher-platform.sgp1.digitaloceanspaces.com/logo.png"
            alt="Cadmax" style="max-width:150px;">
        </td>
      </tr>

      <tr>
        <td style="padding:10px 20px;text-align:center;">
          <h2 style="margin:0;color:#000;">Request Received ✅</h2>
          <p style="margin-top:8px;font-size:14px;color:#444;">
            Hi <strong>${userName}</strong>,  
            thank you for contacting Cadmax. We’ve received your service request.
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding:20px;">
          <h3 style="margin-bottom:10px;">Your Request Details</h3>

          <table width="100%" style="font-size:14px;color:#333;">
            <tr>
              <td><strong>Service Type:</strong></td>
              <td>${serviceType}</td>
            </tr>
            <tr>
              <td><strong>Service:</strong></td>
              <td>${serviceName}</td>
            </tr>
            <tr>
              <td><strong>Concept:</strong></td>
              <td>${concept || "—"}</td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:16px;text-align:center;background:#eeeeee;">
          <p style="margin:0;font-size:12px;color:#666;">
            Our team will get in touch with you shortly.
          </p>
          <p style="margin-top:6px;font-size:12px;color:#666;">
            © 2026 Cadmax. All Rights Reserved.
          </p>
        </td>
      </tr>
    </table>
  </div>
  `;
};
