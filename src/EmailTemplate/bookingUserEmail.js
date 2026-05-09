module.exports = (booking) => {
  return `
  <div style="background:#f5f5f5;padding:20px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"
      style="max-width:520px;margin:auto;background:#ffffff;font-family:Arial;">

      <!-- Logo -->
      <tr>
        <td style="padding:18px;text-align:center;">
          <img src="https://student-teacher-platform.sgp1.digitaloceanspaces.com/logo.png"
            alt="Cadmax" style="max-width:160px;">
        </td>
      </tr>

      <!-- Heading -->
      <tr>
        <td style="padding:10px 20px;text-align:center;">
          <h2 style="margin:0;">Booking Confirmed 🎉</h2>
          <p style="margin:6px 0 0;font-size:14px;">
            Hi <strong>${booking.name}</strong>, thank you for choosing Cadmax.
          </p>
        </td>
      </tr>

      <!-- Booking Info -->
      <tr>
        <td style="padding:20px;">
          <h3 style="margin-bottom:10px;">Booking Details</h3>
          <table width="100%" style="font-size:14px;">
            <tr><td>Project Type</td><td>${booking.project_type}</td></tr>
            <tr><td>Service Model</td><td>${booking.servcies_model}</td></tr>
            <tr><td>Area</td><td>${booking.area}</td></tr>
            <tr><td>Budget</td><td>${booking.budget_range}</td></tr>
            <tr><td>Finish Level</td><td>${booking.finish_level}</td></tr>
            <tr><td>City</td><td>${booking.city}</td></tr>
            <tr><td>Timeline</td><td>${booking.timeLine}</td></tr>
          </table>
        </td>
      </tr>

      <!-- Cost -->
      <tr>
        <td style="padding:20px;border-top:1px solid #e5e5e5;">
          <h3>Cost Summary</h3>
          <table width="100%" style="font-size:14px;">
            <tr><td>Subtotal</td><td align="right">₹${booking.subtotal}</td></tr>
            <tr><td>Taxes</td><td align="right">₹${booking.taxes}</td></tr>
            <tr>
              <td><strong>Total</strong></td>
              <td align="right"><strong>₹${booking.total_amount}</strong></td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:16px;text-align:center;background:#eee;font-size:12px;">
          Our team will contact you shortly.
        </td>
      </tr>
    </table>
  </div>
  `;
};
