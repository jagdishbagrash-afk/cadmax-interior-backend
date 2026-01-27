const BookingModel = require("../Model/Booking");
const catchAsync = require("../Utill/catchAsync");
const sendEmail = require("../Utill/EmailMailler");
const { errorResponse, successResponse } = require("../Utill/ErrorHandling");
const userEmailTemplate = require("../EmailTemplate/bookingUserEmail");
const adminEmailTemplate = require("../EmailTemplate/bookingAdminEmail");
exports.BookingAdd = catchAsync(async (req, res) => {
    try {
        const {
            project_type, servcies_model, area, budget_range, finish_level,
            name, email, phone_number, city, phone_mode, timeLine,
            rate, subtotal, taxes, total_amount, scope
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
            total_amount,
            scope
        });

        const emailData = {
            name: booking.name,
            email: booking.email,
            project_type: booking.project_type,
            servcies_model: booking.servcies_model,
            area: booking.area,
            budget_range: booking.budget_range,
            finish_level: booking.finish_level,
            city: booking.city,
            timeLine: booking.timeLine,
            subtotal: booking.subtotal,
            taxes: booking.taxes,
            total_amount: booking.total_amount,
        };

        // User Email
        await sendEmail({
            email: booking.email, // ✅ REAL EMAIL
            subject: "Booking Confirmed - Cadmax",
            emailHtml: userEmailTemplate(emailData),
        });


        // Admin Email
        await sendEmail({
            email: "ankitkumarjain0748@gmail.com",
            subject: "New Booking Received - Cadmax",
            emailHtml: adminEmailTemplate(emailData),
        });
        console.log("BOOKING EMAIL =>", booking.email);

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