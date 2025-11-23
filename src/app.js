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
app.use(express.json({ limit: '3000mb' }));
app.use(express.urlencoded({ extended: true, limit: "3000mb" }));


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

app.use("/api", require("./Routes/CategoryRoute"));




const server = app.listen(PORT, () => console.log("Server is running at port : " + PORT));
server.timeout = 360000;

// pm2 start npm --name "Real_state_backend" -- run dev