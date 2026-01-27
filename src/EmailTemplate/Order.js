module.exports = (userName, booking) => {
  const productsHtml = booking.product
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 0;border-bottom: 1px solid #e5e5e5;">
            <p style="margin: 0;font-size: 14px;font-weight: bold;color: #000;">
              Product ID: ${item.id}
            </p>
            <p style="margin: 4px 0 0;font-size: 13px;color: #333;">
              Variant: ${item.variant}
            </p>
            <p style="margin: 4px 0 0;font-size: 13px;color: #333;">
              Price: ₹${item.price} × ${item.quantity}
            </p>
            <p style="margin: 6px 0 0;font-size: 13px;font-weight: bold;color: #000;">
              Item Total: ₹${item.total}
            </p>
          </td>
        </tr>
      `
    )
    .join("");

  return `
  <div style="background:#f5f5f5;padding:20px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"
      style="max-width:500px;margin:auto;background:#ffffff;font-family:arial;">
      
      <!-- Logo -->
      <tr>
        <td style="padding:16px;text-align:center;">
          <a href="https://www.cadmax.com/">
            <img src="https://student-teacher-platform.sgp1.digitaloceanspaces.com/logo.png"
              alt="Cadmax">
          </a>
        </td>
      </tr>

      <!-- Heading -->
      <tr>
        <td style="padding:10px 16px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:bold;color:#000;">
            Order Placed Successfully
          </p>
          <p style="margin:8px 0 0;font-size:14px;color:#333;">
            Hi ${userName}, thank you for shopping with Cadmax!
          </p>
        </td>
      </tr>

      <!-- Order Info -->
      <tr>
        <td style="padding:16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#333;">
                <strong>Order ID:</strong> ${booking.orderId}
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#333;padding-top:4px;">
                <strong>Order Status:</strong> ${booking.status}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Products -->
      <tr>
        <td style="padding:0 16px;">
          <p style="margin:0 0 8px;font-size:16px;font-weight:bold;color:#000;">
            Order Summary
          </p>

          <table width="100%" cellpadding="0" cellspacing="0">
            ${productsHtml}
          </table>
        </td>
      </tr>

      <!-- Total -->
      <tr>
        <td style="padding:16px;border-top:1px solid #e5e5e5;">
          <table width="100%">
            <tr>
              <td style="font-size:14px;color:#000;font-weight:bold;">
                Order Total
              </td>
              <td style="font-size:14px;color:#000;font-weight:bold;text-align:right;">
                ₹${booking.amount}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:16px;text-align:center;background:#eeeeee;">
          <p style="margin:0;font-size:12px;color:#666;">
            © 2026 Cadmax. All Rights Reserved.
          </p>
        </td>
      </tr>

    </table>
  </div>
  `;
};
