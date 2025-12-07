const BookingModel = require("../Model/Booking");
const catchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse } = require("../Utill/ErrorHandling");

exports.BookingAdd = catchAsync(async (req, res) => {
    try {
        const {
            project_type, servcies_model, area, budget_range, finish_level,
            name, email, phone_number, city, phone_mode, timeLine,
            rate, subtotal, taxes, total_amount ,scope
        } = req.body;

        const booking = await BookingModel.create({
            project_type,
            servcies_model,
            area,
            budget_range,
            finish_level,
            name,
            email,
            phone_number,
            city,
            phone_mode,
            timeLine,
            rate,
            subtotal,
            taxes,
            total_amount ,
            scope
        });

        return successResponse(res, "Booking Success", 201, booking)

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);


    }
})



exports.GetAllBookings = catchAsync(async (req, res) => {
    try {
        const bookings = await BookingModel.find();

        return res.status(200).json({
            status: "success",
            results: bookings.length,
            data: bookings
        });

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});