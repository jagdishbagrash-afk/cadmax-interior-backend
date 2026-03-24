const contactmodal = require("../Model/Contact");
const Lead = require("../Model/Lead");
const catchAsync = require('../Utill/catchAsync');
// const logger = require("../Utill/Logger");

exports.ContactPost = catchAsync(async (req, res) => {
    try {
        const { email, name, message, services, phone_number, timeline, area, payment } = req.body;

        if (!email || !name || !message || !services || !phone_number) {
            return res.status(400).json({
                status: false,
                message: "All fields (email, name, message, services, phone_number) are required.",
            });
        }
        // Save to DB
        const record = new contactmodal({ email, name, message, services, phone_number, timeline, area, payment });
        const result = await record.save();

        if (!result) {
            return res.status(500).json({
                status: false,
                message: "Failed to save contact details.",
            });
        }

        res.json({
            status: true,
            message: " Request submitted & emails sent successfully.",
        });

    } catch (error) {
        // logger.error(error);
        res.status(500).json({
            status: false,
            message: "❌ Failed to send contact request.",
            error: error.message,
        });
    }
});

exports.ContactGet = catchAsync(async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 50, 1);
        const skip = (page - 1) * limit;
        let query = {};
        const totalcontactmodal = await contactmodal.countDocuments(query);
        const contactget = await contactmodal.find(query).sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);
        const totalPages = Math.ceil(totalcontactmodal / limit);

        res.status(200).json({
            data: {
                contactget: contactget,
                totalcontactmodal: totalcontactmodal,
                totalPages: totalPages,
                currentPage: page,
                perPage: limit,
                nextPage: page < totalPages ? page + 1 : null,
                previousPage: page > 1 ? page - 1 : null,
            },
            msg: "Contact Get",
        });
    } catch (error) {
        // logger.error(error);
        res.status(500).json({
            msg: "Failed to fetch Contact get",
            error: error.message,
        });
    }
});


exports.createLead = catchAsync(async (req, res) => {
  try {
    const  assignedTo = req.user.id
      const { title ,  message, services , pageurl   , name , email , phone} = req.body;
const record   =  Lead.create({
assignedTo, title ,  message, services , pageurl  , name , email , phone
})

    res.json({
            status: true,
            message: " Request submitted & emails sent successfully.",
            record : record
        });
  
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});


exports.LeadGet = catchAsync(async (req, res, next) => {
    try {
        const leadget = await Lead.find({});
        res.status(200).json({
            data: leadget,
            msg: "Contact Get",
        });
    } catch (error) {
        // logger.error(error);
        res.status(500).json({
            msg: "Failed to fetch Contact get",
            error: error.message,
        });
    }
});