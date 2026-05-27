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
  res.json({
    msg: 'Hello World',
    status: 200,
  });
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

app.get("/test", async (req, res) => {
  try {
    const products = await Product.find();

    for (const product of products) {
      const amount = Number(product.amount || 0);

      // default 10%
      const discount = Number(product.discount_amount || 10);

      // final amount
      const finalAmount =
        amount - (amount * discount) / 100;

      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            discount_amount: discount,
            final_amount: finalAmount,
          },
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "All products updated successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
});
const server = app.listen(PORT, () => console.log("Server is running at port : " + PORT));
server.timeout = 360000;

// pm2 start npm --name "Real_state_backend" -- run dev