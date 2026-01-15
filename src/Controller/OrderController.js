const Order = require("../Model/Order");
const catchAsync = require("../Utill/catchAsync");
const {successResponse, errorResponse, validationErrorResponse} = require("../Utill/ErrorHandling");

exports.addOrder = catchAsync(async (req, res) => {
  try {
    const { name, mobile, address, product, amount } = req.body;
    const userId = req.user?.id || "692dcfbd4816433146e11abd";
    if (!name || !mobile || !address || !product || !amount) {
      return validationErrorResponse(
        res,
        "All fields (name, mobile, address, product, amount) are required"
      );
    }

    const newOrder = await Order({
      name,
      mobile,
      address,
      product,
      amount,
      userId,
    });

 const record =    await newOrder.save();
cosole.log("record" ,record)
    return successResponse(res, "Order added successfully", 201, newOrder);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getAllOrders = catchAsync(async (req, res) => {
  try {
    const orders = await Order.find().populate({
        path: "product.id",
        model: "Product",
      })
      .sort({ createdAt: -1 });
    return successResponse(res, "Orders fetched successfully", 200, orders);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.updateStatus = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return validationErrorResponse(res, "Order ID is required");
    }

    if (!status) {
      return validationErrorResponse(res, "Status is required");
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    return successResponse(
      res,
      "Order status updated successfully",
      200,
      order
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getOrdersByUser = catchAsync(async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, "Please provide userId", 401);
    }
    const orders = await Order.find({ userId }).populate({
        path: "product.id",
        model: "Product",
      })
      .sort({ createdAt: -1 });
    return successResponse(res, "User orders fetched successfully", 200, orders);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});