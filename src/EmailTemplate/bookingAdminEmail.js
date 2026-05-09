module.exports = (booking) => {
  return `
  <div style="background:#f5f5f5;padding:20px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"
      style="max-width:600px;margin:auto;background:#ffffff;font-family:Arial;">

      <tr>
        <td style="padding:16px;text-align:center;background:#000;color:#fff;">
          <h2 style="margin:0;">🚨 New Booking Received</h2>
        </td>
      </tr>

      <tr>
        <td style="padding:20px;">
          <h3>Customer Information</h3>
          <table width="100%" style="font-size:14px;">
            <tr><td><strong>Name:</strong></td><td>${booking.name}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${booking.email}</td></tr>
            <tr><td><strong>Phone:</strong></td><td>${booking.phone_number}</td></tr>
            <tr><td><strong>City:</strong></td><td>${booking.city}</td></tr>
          </table>

          <h3 style="margin-top:20px;">Project Details</h3>
          <table width="100%" style="font-size:14px;">
            <tr><td>Project Type</td><td>${booking.project_type}</td></tr>
            <tr><td>Service Model</td><td>${booking.servcies_model}</td></tr>
            <tr><td>Area</td><td>${booking.area}</td></tr>
            <tr><td>Budget Range</td><td>${booking.budget_range}</td></tr>
            <tr><td>Finish Level</td><td>${booking.finish_level}</td></tr>
            <tr><td>Scope</td><td>${booking.scope}</td></tr>
            <tr><td>Timeline</td><td>${booking.timeLine}</td></tr>
          </table>

          <h3 style="margin-top:20px;">Payment Details</h3>
          <table width="100%" style="font-size:14px;">
            <tr><td>Rate</td><td>₹${booking.rate}</td></tr>
            <tr><td>Subtotal</td><td>₹${booking.subtotal}</td></tr>
            <tr><td>Taxes</td><td>₹${booking.taxes}</td></tr>
            <tr>
              <td><strong>Total</strong></td>
              <td><strong>₹${booking.total_amount}</strong></td>
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
