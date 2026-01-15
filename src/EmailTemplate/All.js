import React from "react";
const BookingConfirmationEmail = ({
  user = {},
  property = {},
  booking = {},
  adminUser = {},
}) => {
  const checkIn = booking.check_in
    ? new Date(booking.check_in).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  const checkOut = booking.check_out
    ? new Date(booking.check_out).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  let address = "N/A";
  try {
    if (typeof property.location === "string") {
      const decoded = JSON.parse(property.location);
      address = decoded?.[0]?.location || "N/A";
    }
  } catch (e) {}

  return (
    <div style={{ width: "500px", margin: "auto", backgroundColor: "#fff9f3" }}>
      <table width="100%" cellSpacing="0" style={{ fontFamily: "Helvetica, Arial" }}>
        {/* HERO */}
        <tr>
          <td
            style={{
              backgroundImage:
                "url(https://quaintstays.laraveldevelopmentcompany.com/public/img/hero-1.jpg)",
              backgroundSize: "100% 100%",
              textAlign: "center",
            }}
          >
            <img
              src="https://quaintstays.laraveldevelopmentcompany.com/public/img/QsJaipur-logo.png"
              alt="logo"
              style={{ marginTop: "30px", marginBottom: "40px" }}
            />
            <h1
              style={{
                fontSize: "24px",
                color: "#fff",
                textTransform: "uppercase",
                maxWidth: "360px",
                margin: "0 auto 40px",
              }}
            >
              Your Booking Confirmation for {property.name || "N/A"}
            </h1>
          </td>
        </tr>

        {/* CONTENT */}
        <tr>
          <td style={{ padding: "20px", backgroundColor: "#fff" }}>
            <p>Dear {user.name || "User"},</p>

            <p>
              We're excited to confirm your booking at{" "}
              <strong>{property.name || "N/A"}</strong> from{" "}
              <strong>{checkIn}</strong> to <strong>{checkOut}</strong>.
            </p>

            <div style={{ backgroundColor: "#fff5ec", padding: "20px" }}>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li>
                  <strong>Booking ID:</strong>{" "}
                  {booking.booking_number || "N/A"}
                </li>
                <li>
                  <strong>Property Name:</strong> {property.name || "N/A"}
                </li>
                <li>
                  <strong>Check-in:</strong> {checkIn}
                </li>
                <li>
                  <strong>Check-out:</strong> {checkOut}
                </li>
                <li>
                  <strong>Guests:</strong>{" "}
                  {(booking.adults || 0) + (booking.children || 0)}
                </li>
                <li>
                  <strong>Pets:</strong> {booking.no_of_pet || 0}
                </li>
                <li>
                  <strong>Total Cost:</strong> ₹{booking.price || 0}
                </li>
              </ul>
            </div>

            <p>
              For any queries, contact us at{" "}
              <strong>{adminUser.phone_no || "N/A"}</strong>
            </p>

            <p>Best regards,</p>
            <p>Quaintstays</p>
          </td>
        </tr>

        {/* FOOTER */}
        <tr>
          <td style={{ textAlign: "center", padding: "20px" }}>
            <img
              src="https://quaintstays.laraveldevelopmentcompany.com/public/img/QsJaipur-logo.png"
              alt="logo"
            />
            <p>{address}</p>

            <div>
              <a href="#">
                <img src="https://quaintstays.laraveldevelopmentcompany.com/public/img/gg_facebook.png" />
              </a>
              <a href="#">
                <img src="https://quaintstays.laraveldevelopmentcompany.com/public/img/ri_instagram-fill.png" />
              </a>
              <a href="#">
                <img src="https://quaintstays.laraveldevelopmentcompany.com/public/img/ri_linkedin-fill.png" />
              </a>
            </div>

            <p style={{ fontSize: "12px", color: "#a99b8f" }}>
              © quaintspacesjaipur {new Date().getFullYear()}
            </p>
          </td>
        </tr>
      </table>
    </div>
  );
};

export default BookingConfirmationEmail;
