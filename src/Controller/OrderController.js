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
    return successResponse(res, "Order added successfully", 201, newOrder);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getAllOrders = catchAsync(async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: "product.id",
        model: "Product"
      })
      .sort({ createdAt: -1 });

    const formattedOrders = orders.map(order => {
      const formattedProducts = order.product.map(p => {
        const product = p.id;

        if (!product) return null;

        return {
          _id: product._id,
          title: product.title,
          description: product.description,
          slug: product.slug,
          amount: product.amount,
          variants: product.variants,
          category: product.category,
          subcategory: product.subcategory,
          dimensions: product.dimensions,
          material: product.material,
          type: product.type,
          terms: product.terms,
          deletedAt: product.deletedAt,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          __v: product.__v,

          // Order specific fields
          price: p.price,
          quantity: p.quantity,
          total: p.total,
          variant: p.variant
        };
      }).filter(Boolean);

      return {
        _id: order._id,
        name: order.name,
        mobile: order.mobile,
        address: order.address,
        status: order.status,
        userId: order.userId,
        amount: order.amount,
        product: formattedProducts,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        __v: order.__v
      };
    });

    return successResponse(
      res,
      "Orders fetched successfully",
      200,
      formattedOrders
    );
  } catch (error) {
    console.error(error);
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
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
    const userId = req.user?.id || "692dcfbd4816433146e11abd";
    if (!userId) {
      return errorResponse(res, "Please provide userId", 401);
    }
    const orders = await Order.find({ userId }).populate({
        path: "product.id",
        model: "Product",
      }).sort({ createdAt: -1 });
    return successResponse(res, "User orders fetched successfully", 200, orders);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});