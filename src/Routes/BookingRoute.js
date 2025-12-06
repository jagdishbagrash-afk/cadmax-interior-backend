const express = require("express");
const router = express.Router();
const BookingController = require("../Controller/BookingController");

router.post("/add-booking", BookingController.BookingAdd);
router.get("/get-bookings", BookingController.GetAllBookings);

module.exports = router;
