const dotenv = require("dotenv");
dotenv.config();

require("./dbconfigration");
const express = require("express");
const app = express();
const cors = require("cors");
const corsOptions = {
  origin: "*", // Allowed origins
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: '*', // Allow all headers
  credentials: true,
  optionsSuccessStatus: 200, // for legacy browsers
}

app.use(cors(corsOptions));
app.use(express.json({ limit: '10000mb' }));
app.use(express.urlencoded({ extended: true, limit: "10000mb" }));
app.get("/", (req, res) => {
  res.json({ message: "Server is running fine 🚀" });
});

const PORT = process.env.REACT_APP_SERVER_DOMAIN || 5000;
app.use("/api", require("./Routes/AuthRoute"));
app.use("/api", require("./Routes/ContactRoute"));
app.use("/api", require("./Routes/ServicesRoute"));
app.use("/api", require("./Routes/AppRoute"));
app.use("/api", require("./Routes/CategoryRoute"));
app.use("/api", require("./Routes/ProductRoute"));
app.use("/api", require("./Routes/ProjectRoute"));
app.use("/api", require("./Routes/BookingRoute"));
app.use("/api", require("./Routes/OrderRoute"));
app.use("/api", require("./Routes/VendorRoute"));
app.use("/api", require("./Routes/BannerRoute"));
app.use("/api", require("./Routes/CommonRoute"));
app.use("/api", require("./Routes/Paymentroute"));
app.use("/api", require("./Routes/MutipleAddressRoute"));


const Product = require("./Model/Product");

/* ==============================
   TEST ROUTE
============================== */

const DHL_CLIENT_ID = process.env.DHL_CLIENT_ID;
const DHL_CLIENT_SECRET = process.env.DHL_CLIENT_SECRET;
const DHL_API_BASE = "https://express.api.dhl.com/mydhlapi";

// 1. Token लेने का function
async function getDHLToken() {
  const res = await fetch(`${DHL_API_BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${DHL_CLIENT_ID}&client_secret=${DHL_CLIENT_SECRET}`,
  });
  const data = await res.json();
  return data.access_token;
}

// 2. Tracking API (सबसे ज़रूरी)
app.get("/api/dhl/track/:trackingNumber", async (req, res) => {
  try {
    const token = await getDHLToken();
    const trackingNumber = req.params.trackingNumber;

    const response = await fetch(
      `${DHL_API_BASE}/shipments/${trackingNumber}/tracking`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const trackingData = await response.json();
    
    // Simple format में बदलें
    const events = trackingData.shipments[0]?.events.map(event => ({
      status: event.description,
      location: `${event.serviceArea?.city}, ${event.serviceArea?.countryCode}`,
      timestamp: event.timestamp,
    })) || [];

    res.json({ 
      trackingNumber, 
      status: trackingData.shipments[0]?.status,
      events 
    });
  } catch (error) {
    res.status(500).json({ error: "Tracking failed" });
  }
});





const server = app.listen(PORT, () => console.log("Server is running at port : " + PORT));
server.timeout = 360000;

// pm2 start npm --name "Real_state_backend" -- run dev