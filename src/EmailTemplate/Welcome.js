module.exports = (userName) => {
    // Welcome, Product email, Craft email, booking
  return `
    <div id="email" style="background: #f5f5f5;padding: 20px 0;">
  <table role="presentation" border="0" cellspacing="0" width="100%"
    style="font-family: arial;max-width:500px; margin: auto;background-color: #ffffff;">
    
    <tr>
      <td style="padding: .5rem 1rem;text-align: center;">
        <a href="https://www.cadmax.com/" style="text-decoration: none;">
          <img src="https://student-teacher-platform.sgp1.digitaloceanspaces.com/logo.png"
               alt="Cadmax">
        </a>
      </td>
    </tr>

    <tr>
      <td style="padding: 2.5rem 1rem 2rem;text-align: center;">
        <img src="https://student-teacher-platform.sgp1.digitaloceanspaces.com/welcome-img.png"
             alt="banner"
             style="max-width:100%;margin: auto;display: block;" />
      </td>
    </tr>

    <tr>
      <td style="padding: .1rem 1rem 1rem;border-bottom: 1px solid rgba(0,0,0,.1);text-align: center;">
        <p style="font-size: 1.5rem;font-weight: bold;line-height: 1.6rem;
                  color: #000000;margin: 0 0 .6rem;">
          Welcome to Cadmax
        </p>

        <p style="font-size: 1.1rem;font-weight: bold;line-height: 1.6rem;
                  color: #333333;margin: 0 0 .7rem;">
          Hi ${userName},
        </p>

        <p style="font-size: 1rem;font-weight: 400;line-height: 1.5rem;
                  color: #333333;margin: 0 0 1rem;">
          Welcome to <strong>Cadmax</strong> — your one-stop destination for premium furniture and modern home essentials.
        </p>

        <p style="font-size: 1rem;font-weight: 400;line-height: 1.5rem;
                  color: #333333;margin: 0 0 1rem;">
          Discover a wide range of thoughtfully designed furniture, from elegant living room pieces to functional bedroom and office solutions — all crafted to elevate your space.
        </p>

        <p style="font-size: 1rem;font-weight: 400;line-height: 1.5rem;
                  color: #333333;margin: 0 0 1.3rem;">
          Shop with confidence, enjoy seamless ordering, and bring comfort and style into your home with Cadmax.
        </p>

        <p style="font-size: 1rem;font-weight: 400;line-height: 22px;
                  color: #333333;margin: 0 0 1.5rem;">
          Happy Shopping,<br>
          <strong>Cadmax Team</strong>
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding: .1rem 0 1rem;text-align: center;">
        <div style="padding: 1.3rem 1rem;background: #eeeeee;">
          <p style="font-size: 12px;font-weight: 400;line-height: 18px;
                    color: #666666;margin: 0 auto;max-width: 260px;">
            © 2026 Cadmax. All Rights Reserved.
          </p>
        </div>
      </td>
    </tr>
  </table>
</div>
      `;
};
