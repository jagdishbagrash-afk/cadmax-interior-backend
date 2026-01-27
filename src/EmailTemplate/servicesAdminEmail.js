module.exports = ({ userName, userEmail, serviceType, serviceName, concept }) => {
  return `
  <div style="background:#f5f5f5;padding:20px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"
      style="max-width:600px;margin:auto;background:#ffffff;font-family:Arial;">

      <tr>
        <td style="padding:16px;text-align:center;background:#000;color:#fff;">
          <h2 style="margin:0;">🚨 New Service Request</h2>
        </td>
      </tr>

      <tr>
        <td style="padding:20px;">
          <h3>User Information</h3>
          <table width="100%" style="font-size:14px;">
            <tr>
              <td><strong>Name:</strong></td>
              <td>${userName}</td>
            </tr>
            <tr>
              <td><strong>Email:</strong></td>
              <td>${userEmail}</td>
            </tr>
          </table>

          <h3 style="margin-top:20px;">Service Details</h3>
          <table width="100%" style="font-size:14px;">
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
        <td style="padding:14px;text-align:center;background:#eee;font-size:12px;">
          Cadmax Admin Panel
        </td>
      </tr>
    </table>
  </div>
  `;
};
