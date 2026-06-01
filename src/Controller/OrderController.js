const Order = require("../Model/Order");
const catchAsync = require("../Utill/catchAsync");
const { v4: uuidv4 } = require("uuid");
const { successResponse, errorResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const sendEmail = require("../Utill/EmailMailler");
const OrderEmail = require("../EmailTemplate/Order");
const { sendPushNotification } = require("../Utill/notificationService");
const User = require("../Model/User");
const Cart = require("../Model/Cart");
const { default: axios } = require("axios");

// exports.addOrder = catchAsync(async (req, res) => {
//   try {

//     const {
//       name,
//       mobile,
//       address,
//       product,
//       amount,
//       addressId,
//       PaymentId,
//     } = req.body;

//     const userId =
//       req.user?.id ||
//       "692dcfbd4816433146e11abd";

//     const orderId = `ORD-${uuidv4()
//       .slice(0, 8)
//       .toUpperCase()}`;

//     /* VALIDATION */

//     if (
//       !name ||
//       !mobile ||
//       !product ||
//       !amount
//     ) {
//       return validationErrorResponse(
//         res,
//         "All fields (name, mobile, address, product, amount) are required"
//       );
//     }

//     /* CREATE ORDER */

//     const newOrder = new Order({
//       name,
//       mobile,
//       address,
//       product,
//       addressId,
//       amount,
//       userId,
//       orderId,
//       PaymentId,
//       shipping_status: "pending",
//       courier_name: "DHL",
//     });

//     const record = await newOrder.save();

//     /* -----------------------------
//        CREATE DHL SHIPMENT
//     ----------------------------- */

//     const shipment =
//       await createDhlShipment({
//         name,
//         mobile,
//         address,
//       });

//       console.log(shipment)

//     /* SUCCESS */

//     if (shipment.success) {

//       record.tracking_number =
//         shipment?.data
//           ?.shipmentTrackingNumber;

//       record.shipping_status =
//         "shipment_created";

//       record.shipping_response =
//         shipment?.data;

//     } else {

//       /* FAILED */

//       record.shipping_status =
//         "shipment_failed";

//       record.shipping_response =
//         shipment?.error;
//     }

//     await record.save();

//     /* -----------------------------
//        UPDATE CART
//     ----------------------------- */

//     const productIds = product.map(
//       (p) => p.id
//     );

//     const cart = await Cart.findOne({
//       user: userId,
//       status: { $ne: "done" },
//       "product.productId": {
//         $in: productIds,
//       },
//     });

//     if (
//       cart &&
//       cart.status !== "done"
//     ) {
//       cart.status = "done";

//       await cart.save();
//     }

//     /* -----------------------------
//        EMAIL
//     ----------------------------- */

//     // const subject = `Welcome to Cadmax!🎉`;

//     // const emailHtml = OrderEmail(
//     //   record?.name,
//     //   record
//     // );

//     // await sendEmail({
//     //   email: req?.user?.email,
//     //   subject: subject,
//     //   emailHtml: emailHtml,
//     // });

//     /* RESPONSE */

//     return successResponse(
//       res,
//       "Order added successfully",
//       201,
//       record
//     );

//   } catch (error) {

//     console.error(error);

//     return errorResponse(
//       res,
//       error.message ||
//         "Internal Server Error",
//       500
//     );
//   }
// });


// orderController.js के top पर जोड़ें
exports.addOrder = catchAsync(async (req, res) => {
  const {
    name,
    mobile,
    address,
    product,
    amount,
    addressId,
    PaymentId,
  } = req.body;

  const userId = req.user?.id || "692dcfbd4816433146e11abd";
  const orderId = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;

  // Validation
  if (!name || !mobile || !product || !amount) {
    return validationErrorResponse(
      res,
      "All fields (name, mobile, address, product, amount) are required"
    );
  }

  // CREATE ORDER
  const newOrder = new Order({
    name,
    mobile,
    address,
    product,
    addressId,
    amount,
    userId,
    orderId,
    PaymentId,
    shipping_status: "pending",
    courier_name: "DHL",
  });

  const record = await newOrder.save();


  await record.save();

  // UPDATE CART
  const productIds = product.map((p) => p.id);
  const cart = await Cart.findOne({
    user: userId,
    status: { $ne: "done" },
    "product.productId": { $in: productIds },
  });

  if (cart && cart.status !== "done") {
    cart.status = "done";
    await cart.save();
  }

  // RESPONSE
  return successResponse(
    res,
    "Order added successfully",
    201,
    record
  );
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
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});



// exports.updateStatus = catchAsync(async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;

//     if (!id) {
//       return validationErrorResponse(res, "Order ID is required");
//     }

//     if (!status) {
//       return validationErrorResponse(res, "Status is required");
//     }

//     const order = await Order.findByIdAndUpdate(
//       id,
//       { status },
//       { new: true }
//     );

//     if (!order) {
//       return errorResponse(res, "Order not found", 404);
//     }

//     return successResponse(
//       res,
//       "Order status updated successfully",
//       200,
//       order
//     );
//   } catch (error) {
//     console.error(error);
//     return errorResponse(res, error.message || "Internal Server Error", 500);
//   }
// });



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

    // ✅ Update order
    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    // 🔥 User ka FCM token lao
    const user = await User.findById(order.userId).select("fcmToken name");

    if (user?.fcmToken) {

      // 🎯 Status-wise message
      let title = "Order Update 📦";
      let body = "";

      switch (status) {
        case "pending":
          body = `Hi ${user.name}, your order is pending.`;
          break;

        case "confirmed":
          body = `Hi ${user.name}, your order has been confirmed ✅`;
          break;

        case "shipped":
          body = `Hi ${user.name}, your order has been shipped 🚚`;
          break;

        case "delivered":
          body = `Hi ${user.name}, your order has been delivered 🎉`;
          break;

        case "cancelled":
          body = `Hi ${user.name}, your order has been cancelled ❌`;
          break;

        default:
          body = `Hi ${user.name}, your order status is updated to ${status}`;
      }

      // 🚀 Send Notification
      await sendPushNotification({
        tokens: [user.fcmToken], // single user
        title,
        body,
        data: {
          type: "ORDER_STATUS",
          orderId: order._id.toString(),
          status: status,
        },
      });
    }

    return successResponse(
      res,
      "Order status updated successfully & notification sent 🚀",
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


