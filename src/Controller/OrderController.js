const Order = require("../Model/Order");
const Payment = require("../Model/Payment");
const catchAsync = require("../Utill/catchAsync");
const { v4: uuidv4 } = require("uuid");
const { successResponse, errorResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const sendEmail = require("../Utill/EmailMailler");
const OrderEmail = require("../EmailTemplate/Order");
const { sendPushNotification } = require("../Utill/notificationService");
const User = require("../Model/User");
const Cart = require("../Model/Cart");
const Product = require("../Model/Product");
const {
  buildLegacyAddressString,
  buildShippingAddressSnapshot,
  resolveOwnedAddress,
  ensureOrderShippingAddress,
  toCourierAddress,
} = require("../Utill/orderAddress");
const { createDhlShipment } = require("../Utill/createDhlShipment");
const { createBlueDartWaybill, resolveBlueDartShipFrom } = require("../Utill/blueDartService");
const mongoose = require("mongoose");
const { hydrateOrderShipmentDetails, processOrderShipmentCreation } = require("./shipmentController");
const { formatOrderDetailsForWeb, formatOrderDetailsForApp } = require("../Utill/orderDetailsFormatter");



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



exports.addOrder = catchAsync(async (req, res) => {
  const {
    name,
    mobile,
    address,
    product,
    amount,
    addressId,
    PaymentId,
    paymentMethod,
  } = req.body;

  const userId = req.user?.id;

  if (!userId) {
    return errorResponse(res, "Unauthorized", 401);
  }

  if (!name || !mobile || !product?.length || !amount || !addressId) {
    return validationErrorResponse(
      res,
      "Name, mobile, addressId, product and amount are required"
    );
  }

  const addressResult = await resolveOwnedAddress({ addressId, userId });

  if (!addressResult.ok) {
    if (addressResult.reason === "invalid" || addressResult.reason === "not_found") {
      return validationErrorResponse(res, "Invalid addressId");
    }

    if (addressResult.reason === "unauthorized") {
      return errorResponse(res, "Selected address does not belong to this user", 403);
    }
  }

  const shippingAddress = buildShippingAddressSnapshot({
    name,
    mobile,
    addressRecord: addressResult.address,
  });
  const legacyAddress = buildLegacyAddressString(shippingAddress) || address;

  const numericAmount = Number(
    typeof amount === "string"
      ? amount.replace(/,/g, "")
      : amount
  );

  const orderId = `ORD-${uuidv4()
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase()}`;

  // ==========================
  // Verify Products & Stock
  // ==========================
  const orderProducts = [];

  for (const item of product) {
    const productData = await Product.findById(item.id);

    if (!productData) {
      return validationErrorResponse(
        res,
        `Product not found (${item.id})`
      );
    }

    // Find the specific variant by color
    const variantColor = item.variant?.toLowerCase();
    const variantIndex = productData.variants.findIndex(
      v => v.color.toLowerCase() === variantColor
    );

    // If variant not found, check first variant as fallback
    const currentStock = variantIndex !== -1
      ? productData.variants[variantIndex].stock || 0
      : productData?.variants?.[0]?.stock || 0;

    if (currentStock < item.quantity) {
      return validationErrorResponse(
        res,
        `${productData.title} (${item.variant || 'Default'}) is out of stock. Available: ${currentStock}`
      );
    }

    orderProducts.push({
      id: productData._id,
      title: productData.title,
      price: item.price,
      originalPrice: item.originalPrice || item.price,
      discount: item.discount || 0,
      quantity: item.quantity,
      total: item.total,
      variant: item.variant || null,
      variantTitle: item.variantTitle || null,
      priceSectionTitle:
        item.priceSectionTitle || null,
    });
  }

  // ==========================
  // Create Order — NO shipment yet; awaiting admin approval
  // ==========================
  const newOrder = new Order({
    name,
    mobile,
    address: legacyAddress,
    addressId,
    shippingAddress,
    product: orderProducts,
    amount: numericAmount,
    userId,
    PaymentId: PaymentId || null,
    paymentMethod: paymentMethod || "ONLINE",
    orderId,
    status: "pending",
    admin_approval_status: "pending_approval",
    shipping_status: "pending",
    courier_name: process.env.DEFAULT_COURIER || "DHL",
  });

  const savedOrder = await newOrder.save();

  // ==========================
  // Complete Cart
  // ==========================
  const productIds = product.map((p) => p.id);

  await Cart.updateMany(
    {
      user: userId,
      status: { $ne: "completed" },
      "product.productId": { $in: productIds },
    },
    {
      $set: {
        status: "completed",
      },
    }
  );

  // ==========================
  // Reduce Stock (hold stock on order placement; restored if rejected)
  // ==========================
  for (const item of product) {
    const productData = await Product.findById(item.id);
    if (!productData) continue;

    const variantColor = item.variant?.toLowerCase();
    const variantIndex = productData.variants.findIndex(
      v => v.color.toLowerCase() === variantColor
    );
    if (variantIndex === -1) continue;

    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: item.id,
        [`variants.${variantIndex}.stock`]: { $gte: item.quantity },
      },
      {
        $inc: { [`variants.${variantIndex}.stock`]: -item.quantity },
      },
      { new: true, runValidators: false }
    );

    if (!updatedProduct) continue;

    const anyVariantInStock = updatedProduct.variants.some(v => v.stock > 0);
    await Product.updateOne(
      { _id: item.id },
      {
        $set: {
          stock_status: anyVariantInStock ? "in_stock" : "out_of_stock",
        },
      }
    );
  }

  // ==========================
  // Build Response
  // ==========================
  const responseData = {
    order: savedOrder,
    paymentMethod: newOrder.paymentMethod,
    adminApproval: {
      status: "pending_approval",
      message: "Order placed successfully. Awaiting admin approval.",
      nextStep: "Admin will review and approve/reject this order. Shipment & tracking ID will be generated after approval.",
    },
  };

  if (newOrder.paymentMethod === "COD") {
    responseData.paymentDetails = {
      paymentMethod: "COD",
      amount: numericAmount,
      status: "pending",
      message: "Payment will be collected at delivery (after admin approval)",
      instructions: {
        vendor: "Please collect ₹" + numericAmount + " from customer on delivery",
        customer: "You will pay ₹" + numericAmount + " when the product is delivered",
      },
    };
  } else {
    responseData.paymentDetails = {
      paymentMethod: "ONLINE",
      amount: numericAmount,
      transactionId: PaymentId || null,
      status: PaymentId ? "completed" : "pending_payment",
    };
  }

  return successResponse(
    res,
    `Order placed successfully. Awaiting admin approval. Payment method: ${newOrder.paymentMethod}`,
    201,
    responseData
  );
});

exports.getAllOrders = catchAsync(async (req, res) => {
  try {
    const orders = await Order.find()  .populate({
        path: "product.id",
        model: "Product",
      })
      .populate({
        path: "addressId",
        model: "Address", // apne Address model ka naam yahan likhein
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



// exports.updateStatus = catchAsync(async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status ,note} = req.body;

//     if (!id) {
//       return validationErrorResponse(res, "Order ID is required");
//     }

//     if (!status) {
//       return validationErrorResponse(res, "Status is required");
//     }

//     // ✅ Update order
//     const order = await Order.findByIdAndUpdate(
//       id,
//       { status },
//       { new: true }
//     );

//     if (!order) {
//       return errorResponse(res, "Order not found", 404);
//     }

//     // 🔥 User ka FCM token lao
//     const user = await User.findById(order.userId).select("fcmToken name");

//     if (user?.fcmToken) {

//       // 🎯 Status-wise message
//       let title = "Order Update 📦";
//       let body = "";

//       switch (status) {
//         case "pending":
//           body = `Hi ${user.name}, your order is pending.`;
//           break;

//         case "confirmed":
//           body = `Hi ${user.name}, your order has been confirmed ✅`;
//           break;

//         case "shipped":
//           body = `Hi ${user.name}, your order has been shipped 🚚`;
//           break;

//         case "delivered":
//           body = `Hi ${user.name}, your order has been delivered 🎉`;
//           break;

//         case "cancelled":
//           body = `Hi ${user.name}, your order has been cancelled ❌`;
//           break;

//         default:
//           body = `Hi ${user.name}, your order status is updated to ${status}`;
//       }

//       // 🚀 Send Notification
//       await sendPushNotification({
//         tokens: [user.fcmToken], // single user
//         title,
//         body,
//         data: {
//           type: "ORDER_STATUS",
//           orderId: order._id.toString(),
//           status: status,
//         },
//       });
//     }

//     return successResponse(
//       res,
//       "Order status updated successfully & notification sent 🚀",
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
    const { status, note } = req.body;

    console.log("==================================================");
    console.log(`[ORDER STATUS UPDATE API HIT]`);
    console.log(`Order ID: ${id}`);
    console.log(`Target Status: ${status}`);
    console.log(`Note: ${note || "None"}`);
    console.log("==================================================");

    if (!id) {
      return validationErrorResponse(res, "Order ID is required");
    }

    if (!status) {
      return validationErrorResponse(res, "Status is required");
    }

    // Update Order
    const order = await Order.findByIdAndUpdate(
      id,
      {
        status,
        ...(note && { note }),
      },
      { new: true }
    );

    if (!order) {
      console.log(`[ORDER UPDATE FAILED] Order not found for ID: ${id}`);
      return errorResponse(res, "Order not found", 404);
    }

    console.log(`[ORDER UPDATED] Order ${order._id} status updated to "${order.status}"`);

    // ======================================================
    // Auto Create Shipment & Sync Tracking After Order Confirmation
    // ======================================================
    if (status && status.toLowerCase() === "confirmed") {
      console.log("--------------------------------------------------");
      console.log(`[TRIGGERING AUTO SHIPMENT CREATION] Order ID: ${order._id}`);
      console.log("--------------------------------------------------");

      try {
        const shippingProvider = req.body?.shipping_provider || req.body?.shippingProvider;
        const shipmentResult = await processOrderShipmentCreation(order, {
          shippingProvider,
          userId: order.userId,
        });

        console.log("--------------------------------------------------");
        console.log(`[AUTO SHIPMENT RESULT] Order ID: ${order._id}`);
        console.log(`Status: ${shipmentResult?.success ? "SUCCESS ✅" : "FAILED ❌"}`);
        console.log(`Message: ${shipmentResult?.message || "No message"}`);
        if (shipmentResult?.order?.tracking_number) {
          console.log(`Tracking Number: ${shipmentResult.order.tracking_number}`);
          console.log(`Courier Provider: ${shipmentResult.order.courier_name}`);
        }
        console.log("--------------------------------------------------");
      } catch (err) {
        console.error("[AUTO SHIPMENT ERROR]", err.message, err.stack);
      }
    }

    // Get User
    const user = await User.findById(order.userId).select(
      "fcmToken name"
    );

    if (user?.fcmToken) {
      let title = "Order Update 📦";
      let body = "";

      switch (status.toLowerCase()) {
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

      try {
        await sendPushNotification({
          tokens: [user.fcmToken],
          title,
          body,
          data: {
            type: "ORDER_STATUS",
            orderId: order._id.toString(),
            status,
          },
        });
        console.log(`[PUSH NOTIFICATION SENT] To User: ${user.name}`);
      } catch (pushErr) {
        console.error("[PUSH NOTIFICATION WARNING (SKIPPED)]", pushErr.message);
      }
    }

    return successResponse(
      res,
      "Order status updated successfully",
      200,
      order
    );
  } catch (error) {
    console.error("[ORDER STATUS UPDATE EXCEPTION]", error);
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

  exports.getOrdersByUser = catchAsync(async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return errorResponse(res, "Please provide userId", 401);
    }

    const orders = await Order.find({ userId })
      .populate({
        path: "product.id",
        model: "Product",
      })
      .populate({
        path: "addressId",
        model: "Address", // apne Address model ka naam yahan likhein
      })
      .sort({ createdAt: -1 });

    return successResponse(
      res,
      "User orders fetched successfully",
      200,
      orders
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

/**
 * WEB Order Details API
 * Fetches complete order details matching the design screenshot
 * and hits inner side transit API for live tracking updates.
 */
exports.getOrderDetailsWeb = catchAsync(async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return validationErrorResponse(res, "orderId parameter is required");
    }

    const cleanOrderId = String(orderId).trim().replace(/^#/, "");

    const queryConditions = [
      { orderId: cleanOrderId },
      { orderId: `ORD-${cleanOrderId}` },
      { tracking_number: cleanOrderId },
    ];

    if (mongoose.Types.ObjectId.isValid(cleanOrderId)) {
      queryConditions.push({ _id: cleanOrderId });
    }

    const order = await Order.findOne({ $or: queryConditions }).populate({
      path: "product.id",
      model: "Product",
    });

    if (!order) {
      return errorResponse(res, `Order not found with ID: ${orderId}`, 404);
    }

    // Hit inner side transit API to update real-time transit tracking data
    let syncedTransit = {};
    try {
      if (typeof hydrateOrderShipmentDetails === "function") {
        syncedTransit = await hydrateOrderShipmentDetails(order, {
          userId: req.user?.id || order.userId,
          syncCourier: true,
          persist: true,
        });
      }
    } catch (transitErr) {
      console.warn("Inner side transit API sync notice:", transitErr.message);
    }

    const formattedWebData = formatOrderDetailsForWeb(order, syncedTransit);

    return res.status(200).json({
      status: true,
      message: "Web order details fetched successfully with inner transit API tracking",
      data: formattedWebData,
    });
  } catch (error) {
    console.error("getOrderDetailsWeb Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

/**
 * MOBILE APP Order Details API
 * Fetches complete order details matching the design screenshot formatted for Mobile App
 * and hits inner side transit API for live tracking updates.
 */
exports.getOrderDetailsApp = catchAsync(async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return validationErrorResponse(res, "orderId parameter is required");
    }

    const cleanOrderId = String(orderId).trim().replace(/^#/, "");

    const queryConditions = [
      { orderId: cleanOrderId },
      { orderId: `ORD-${cleanOrderId}` },
      { tracking_number: cleanOrderId },
    ];

    if (mongoose.Types.ObjectId.isValid(cleanOrderId)) {
      queryConditions.push({ _id: cleanOrderId });
    }

    const order = await Order.findOne({ $or: queryConditions }).populate({
      path: "product.id",
      model: "Product",
    });

    if (!order) {
      return errorResponse(res, `Order not found with ID: ${orderId}`, 404);
    }

    // Hit inner side transit API to update real-time transit tracking data
    let syncedTransit = {};
    try {
      if (typeof hydrateOrderShipmentDetails === "function") {
        syncedTransit = await hydrateOrderShipmentDetails(order, {
          userId: req.user?.id || order.userId,
          syncCourier: true,
          persist: true,
        });
      }
    } catch (transitErr) {
      console.warn("Inner side transit API sync notice:", transitErr.message);
    }

    const formattedAppData = formatOrderDetailsForApp(order, syncedTransit);

    return res.status(200).json(formattedAppData);
  } catch (error) {
    console.error("getOrderDetailsApp Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getOrderById = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Order ID",
      });
    }

    const order = await Order.findById(id)
      .populate("userId", "name email mobile")
      .populate("addressId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const resolvedTrackingNumber =
      order.tracking_number ||
      order.labelData?.trackingNumber ||
      order.labelData?.awbNumber ||
      order.labelData?.awbNo ||
      order.labelData?.awb ||
      order.shipping_response?.AWBNo ||
      order.shipping_response?.awbNumber ||
      order.shipping_response?.GenerateWayBillResult?.AWBNo ||
      order.shipping_response?.data?.AWBNo ||
      order.shipping_meta?.trackingNumber ||
      order.shipping_meta?.awbNumber ||
      null;

    if (!order.tracking_number && resolvedTrackingNumber) {
      order.tracking_number = resolvedTrackingNumber;
      await order.save();
    }

    const orderObj = order.toObject();
    orderObj.tracking_number = resolvedTrackingNumber || orderObj.tracking_number || null;
    orderObj.trackingNumber = resolvedTrackingNumber || orderObj.tracking_number || null;
    orderObj.awbNumber = resolvedTrackingNumber || orderObj.tracking_number || null;
    orderObj.trackingId = resolvedTrackingNumber || orderObj.tracking_number || null;
    orderObj.courier_name = orderObj.courier_name || "BLUE_DART";
    orderObj.courierPartner = orderObj.courier_name || "BLUE_DART";

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: orderObj,
    });
  } catch (error) {
    console.error("Get Order Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

// ==============================================================
// ADMIN ORDER MANAGEMENT ENDPOINTS
// ==============================================================

const ensureAdmin = async (userId) => {
  if (!userId) return false;
  const user = await User.findById(userId).select("role").lean();
  return user && user.role === "admin";
};

/**
 * ADMIN: Get all orders with filters, search, pagination
 * Query params:
 *   admin_approval_status: pending_approval | approved | rejected | all
 *   status: pending | confirmed | shipped | delivered | cancelled | all
 *   paymentMethod: ONLINE | COD | all
 *   search: orderId / name / mobile
 *   fromDate, toDate: ISO date strings
 *   page, limit: pagination
 */
exports.getAllOrdersAdmin = catchAsync(async (req, res) => {
  const isAdmin = await ensureAdmin(req.user?.id);
  if (!isAdmin) {
    return errorResponse(res, "Forbidden: admin access required", 403);
  }

  try {
    const {
      admin_approval_status = "all",
      status = "all",
      paymentMethod = "all",
      search = "",
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = req.query;

    const match = {};

    if (admin_approval_status && admin_approval_status !== "all") {
      match.admin_approval_status = admin_approval_status;
    }
    if (status && status !== "all") {
      match.status = status;
    }
    if (paymentMethod && paymentMethod !== "all") {
      match.paymentMethod = paymentMethod;
    }
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }
    if (search) {
      const s = String(search).trim();
      match.$or = [
        { orderId: { $regex: s, $options: "i" } },
        { name: { $regex: s, $options: "i" } },
        { mobile: { $regex: s, $options: "i" } },
        { tracking_number: { $regex: s, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total, counts] = await Promise.all([
      Order.find(match)
        .populate({ path: "userId", model: "User", select: "name email phone role" })
        .populate({ path: "product.id", model: "Product" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(match),
      Order.aggregate([
        {
          $facet: {
            byApproval: [
              { $group: { _id: "$admin_approval_status", count: { $sum: 1 } } },
            ],
            byStatus: [
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ],
            byPayment: [
              { $group: { _id: "$paymentMethod", count: { $sum: 1 } } },
            ],
          },
        },
      ]).then((r) => r[0] || { byApproval: [], byStatus: [], byPayment: [] }),
    ]);

    const toMap = (arr) =>
      arr.reduce((acc, { _id, count }) => {
        if (_id) acc[_id] = count;
        return acc;
      }, {});

    const resolvedOrders = orders.map((ord) => {
      const trackingNumber =
        ord.tracking_number ||
        ord.labelData?.trackingNumber ||
        ord.labelData?.awbNumber ||
        ord.labelData?.awbNo ||
        ord.labelData?.awb ||
        ord.shipping_response?.AWBNo ||
        ord.shipping_response?.awbNumber ||
        ord.shipping_response?.GenerateWayBillResult?.AWBNo ||
        ord.shipping_response?.data?.AWBNo ||
        ord.shipping_meta?.trackingNumber ||
        ord.shipping_meta?.awbNumber ||
        null;

      return {
        ...ord,
        tracking_number: trackingNumber,
        trackingNumber: trackingNumber,
        awbNumber: trackingNumber,
        trackingId: trackingNumber,
        courier_name: ord.courier_name || "BLUE_DART",
        courierPartner: ord.courier_name || "BLUE_DART",
      };
    });

    return successResponse(res, "Admin orders fetched successfully", 200, {
      orders: resolvedOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      summary: {
        byApprovalStatus: toMap(counts.byApproval || []),
        byOrderStatus: toMap(counts.byStatus || []),
        byPaymentMethod: toMap(counts.byPayment || []),
      },
      appliedFilters: {
        admin_approval_status,
        status,
        paymentMethod,
        search,
        fromDate: fromDate || null,
        toDate: toDate || null,
      },
    });
  } catch (error) {
    console.error("getAllOrdersAdmin Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

/**
 * ADMIN: Approve an order and create shipment + tracking ID
 */
exports.approveOrder = catchAsync(async (req, res) => {
  const isAdmin = await ensureAdmin(req.user?.id);
  if (!isAdmin) {
    return errorResponse(res, "Forbidden: admin access required", 403);
  }

  const { id } = req.params;
  const { courier_override } = req.body || {};

  if (!id) {
    return validationErrorResponse(res, "Order ID is required");
  }

  const order = await Order.findById(id);
  if (!order) {
    return errorResponse(res, "Order not found", 404);
  }

  if (order.admin_approval_status === "approved") {
    return successResponse(res, "Order is already approved", 200, {
      order,
      alreadyApproved: true,
    });
  }

  if (order.admin_approval_status === "rejected") {
    return errorResponse(res, "Cannot approve a rejected order", 400);
  }

  const { shippingAddress } = await ensureOrderShippingAddress(order, {
    userId: order.userId,
  });
  if (!shippingAddress) {
    return errorResponse(res, "Order shipping address is missing", 400);
  }

  if (!order.labelData) order.labelData = {};
  order.labelData.shipFrom = resolveBlueDartShipFrom(order.labelData.shipFrom);

  let shipmentData = null;
  let shipmentError = null;
  const isCod = (order.paymentMethod || "ONLINE").toUpperCase() === "COD";
  const courierName = courier_override || process.env.DEFAULT_COURIER || "DHL";
  const legacyAddress = buildLegacyAddressString(shippingAddress);

  try {
    if (courierName === "BLUE_DART" || courierName === "BlueDart") {
      const shipmentResponse = await createBlueDartWaybill({
        orderId: order.orderId,
        name: shippingAddress.name,
        mobile: shippingAddress.mobile,
        receiverAddress: {
          ...shippingAddress,
          street_address: shippingAddress.street_address || legacyAddress,
          address: legacyAddress,
          addressLine1: shippingAddress.street_address || legacyAddress,
          pincode: shippingAddress.pincode,
        },
        shipFrom: order.labelData.shipFrom,
        products: order.product,
        declaredValue: order.amount,
        isCod,
        collectableAmount: isCod ? order.amount : 0,
      });

      if (shipmentResponse?.success || shipmentResponse?.awbNumber) {
        shipmentData = {
          courierName: "BLUE_DART",
          trackingNumber: shipmentResponse.awbNumber,
          waybillNumber: shipmentResponse.awbNumber,
          labelData: shipmentResponse.labelData || null,
          shipmentDetails: {
            status: "created",
            timestamp: new Date().toISOString(),
            ...shipmentResponse,
          },
        };
      } else {
        shipmentError = shipmentResponse?.error || "Blue Dart shipment creation failed";
      }
    } else {
      const shipmentResponse = await createDhlShipment({
        name: shippingAddress.name,
        mobile: shippingAddress.mobile,
        address: legacyAddress,
        products: order.product,
        totalAmount: order.amount,
        orderId: order.orderId,
      });

      if (shipmentResponse?.success && shipmentResponse?.data) {
        shipmentData = {
          courierName: "DHL",
          trackingNumber: shipmentResponse.data.shipmentTrackingNumber,
          labelData: shipmentResponse.data?.labelData || null,
          shipmentDetails: {
            status: "created",
            timestamp: new Date().toISOString(),
            estimatedDeliveryDate: shipmentResponse.data?.estimatedDeliveryDate,
            warnings: shipmentResponse.data?.warnings || [],
          },
          rawResponse: shipmentResponse.data,
        };
      } else {
        shipmentError = shipmentResponse?.error || "DHL shipment creation failed";
      }
    }
  } catch (err) {
    console.error("Admin approve shipment error:", err);
    shipmentError = err.message || "Shipment creation exception";
  }

  order.admin_approval_status = "approved";
  order.status = "confirmed";
  order.approved_by = req.user.id;
  order.approved_at = new Date();

  if (shipmentData) {
    order.tracking_number = shipmentData.trackingNumber;
    order.shipping_status = "shipment_created";
    order.courier_name = shipmentData.courierName;
    order.shipping_response = shipmentData.shipmentDetails;
    order.labelData = {
      ...(order.labelData || {}),
      ...(shipmentData.labelData || {}),
    };
  } else {
    order.shipping_status = "shipment_creation_failed";
    order.shipping_response = {
      status: "failed",
      error: shipmentError,
      timestamp: new Date().toISOString(),
    };
  }

  await order.save();

  let syncedTransit = {};
  try {
    syncedTransit = await hydrateOrderShipmentDetails(order, {
      userId: order.userId,
      syncCourier: !!shipmentData,
      persist: true,
    });
  } catch (tErr) {
    console.warn("Post-approval transit sync notice:", tErr.message);
  }

  try {
    const user = await User.findById(order.userId).select("fcmToken name");
    if (user?.fcmToken) {
      await sendPushNotification({
        tokens: [user.fcmToken],
        title: "Order Approved ✅",
        body: shipmentData
          ? `Hi ${user.name}, your order ${order.orderId} is approved & shipped! Track: ${shipmentData.trackingNumber}`
          : `Hi ${user.name}, your order ${order.orderId} is approved.`,
        data: {
          type: "ORDER_APPROVED",
          orderId: order._id.toString(),
          orderNo: order.orderId,
          trackingNumber: order.tracking_number || "",
        },
      });
    }
  } catch (nErr) {
    console.warn("Approval notification failed:", nErr.message);
  }

  return successResponse(
    res,
    shipmentData
      ? `Order approved. Shipment created with tracking: ${shipmentData.trackingNumber}`
      : `Order approved but shipment creation failed: ${shipmentError}`,
    200,
    {
      order,
      shipment: shipmentData || { status: "failed", error: shipmentError, trackingNumber: null },
      syncedTransit,
    }
  );
});

/**
 * ADMIN: Reject an order, restore stock, set status cancelled
 */
exports.rejectOrder = catchAsync(async (req, res) => {
  const isAdmin = await ensureAdmin(req.user?.id);
  if (!isAdmin) {
    return errorResponse(res, "Forbidden: admin access required", 403);
  }

  const { id } = req.params;
  const { reason } = req.body || {};

  if (!id) {
    return validationErrorResponse(res, "Order ID is required");
  }
  if (!reason || String(reason).trim().length < 3) {
    return validationErrorResponse(res, "Rejection reason is required (min 3 chars)");
  }

  const order = await Order.findById(id);
  if (!order) {
    return errorResponse(res, "Order not found", 404);
  }

  if (order.admin_approval_status === "rejected") {
    return successResponse(res, "Order is already rejected", 200, {
      order,
      alreadyRejected: true,
    });
  }

  if (
    order.admin_approval_status === "approved" &&
    order.shipping_status === "shipment_created"
  ) {
    return errorResponse(
      res,
      "Cannot reject: shipment already created. Cancel shipment first.",
      400
    );
  }

  for (const item of order.product || []) {
    try {
      const productData = await Product.findById(item.id);
      if (!productData) continue;

      const variantColor = item.variant?.toLowerCase();
      const variantIndex = productData.variants.findIndex(
        (v) => v.color.toLowerCase() === variantColor
      );
      if (variantIndex === -1) continue;

      await Product.updateOne(
        { _id: item.id },
        { $inc: { [`variants.${variantIndex}.stock`]: item.quantity } }
      );

      const refreshed = await Product.findById(item.id);
      const anyInStock = (refreshed?.variants || []).some((v) => v.stock > 0);
      await Product.updateOne(
        { _id: item.id },
        { $set: { stock_status: anyInStock ? "in_stock" : "out_of_stock" } }
      );
    } catch (stockErr) {
      console.warn("Stock restore failed for product", item.id, stockErr.message);
    }
  }

  order.admin_approval_status = "rejected";
  order.status = "cancelled";
  order.rejection_reason = String(reason).trim();
  order.rejected_by = req.user.id;
  order.rejected_at = new Date();

  await order.save();

  try {
    const user = await User.findById(order.userId).select("fcmToken name");
    if (user?.fcmToken) {
      await sendPushNotification({
        tokens: [user.fcmToken],
        title: "Order Rejected ❌",
        body: `Hi ${user.name}, your order ${order.orderId} was rejected. Reason: ${reason}`,
        data: {
          type: "ORDER_REJECTED",
          orderId: order._id.toString(),
          orderNo: order.orderId,
          reason: String(reason).trim(),
        },
      });
    }
  } catch (nErr) {
    console.warn("Rejection notification failed:", nErr.message);
  }

  return successResponse(res, "Order rejected successfully. Stock restored.", 200, {
    order,
    rejection: {
      reason: order.rejection_reason,
      rejected_by: order.rejected_by,
      rejected_at: order.rejected_at,
    },
  });
});

/**
 * ADMIN: Get full order details (with Payment, Shipment, Tracking)
 */
exports.getOrderDetailsAdmin = catchAsync(async (req, res) => {
  const isAdmin = await ensureAdmin(req.user?.id);
  if (!isAdmin) {
    return errorResponse(res, "Forbidden: admin access required", 403);
  }

  const { orderId } = req.params;
  if (!orderId) {
    return validationErrorResponse(res, "orderId parameter is required");
  }

  const cleanOrderId = String(orderId).trim().replace(/^#/, "");
  const queryConditions = [
    { orderId: cleanOrderId },
    { orderId: `ORD-${cleanOrderId}` },
    { tracking_number: cleanOrderId },
  ];
  if (mongoose.Types.ObjectId.isValid(cleanOrderId)) {
    queryConditions.push({ _id: cleanOrderId });
  }

  const order = await Order.findOne({ $or: queryConditions })
    .populate({ path: "product.id", model: "Product" })
    .populate({ path: "userId", model: "User", select: "name email phone role profileImage" })
    .populate({ path: "approved_by", model: "User", select: "name email" })
    .populate({ path: "rejected_by", model: "User", select: "name email" });

  if (!order) {
    return errorResponse(res, `Order not found with ID: ${orderId}`, 404);
  }

  const payment = await Payment.findOne({ OrderID: order._id })
    .sort({ createdAt: -1 })
    .lean();

  let syncedTransit = {};
  try {
    syncedTransit = await hydrateOrderShipmentDetails(order, {
      userId: order.userId,
      syncCourier: true,
      persist: true,
    });
  } catch (transitErr) {
    console.warn("Admin order details transit sync notice:", transitErr.message);
  }

  const resolvedTrackingNumber =
    order.tracking_number ||
    order.labelData?.trackingNumber ||
    order.labelData?.awbNumber ||
    order.labelData?.awbNo ||
    order.labelData?.awb ||
    order.shipping_response?.AWBNo ||
    order.shipping_response?.awbNumber ||
    order.shipping_response?.GenerateWayBillResult?.AWBNo ||
    order.shipping_response?.data?.AWBNo ||
    order.shipping_meta?.trackingNumber ||
    order.shipping_meta?.awbNumber ||
    null;

  if (!order.tracking_number && resolvedTrackingNumber) {
    order.tracking_number = resolvedTrackingNumber;
    await order.save();
  }

  const orderObj = order.toObject();
  orderObj.tracking_number = resolvedTrackingNumber || orderObj.tracking_number || null;
  orderObj.trackingNumber = resolvedTrackingNumber || orderObj.tracking_number || null;
  orderObj.awbNumber = resolvedTrackingNumber || orderObj.tracking_number || null;
  orderObj.trackingId = resolvedTrackingNumber || orderObj.tracking_number || null;
  orderObj.courier_name = orderObj.courier_name || "BLUE_DART";
  orderObj.courierPartner = orderObj.courier_name || "BLUE_DART";

  const formattedWeb = formatOrderDetailsForWeb(order, syncedTransit);

  return successResponse(res, "Admin order details fetched successfully", 200, {
    order: orderObj,
    payment: payment || null,
    user: order.userId || null,
    approvedBy: order.approved_by || null,
    rejectedBy: order.rejected_by || null,
    shipment: {
      trackingNumber: resolvedTrackingNumber || null,
      tracking_number: resolvedTrackingNumber || null,
      awbNumber: resolvedTrackingNumber || null,
      trackingId: resolvedTrackingNumber || null,
      shippingStatus: order.shipping_status || "shipment_created",
      courierName: order.courier_name || "BLUE_DART",
      courierPartner: order.courier_name || "BLUE_DART",
      labelData: order.labelData || null,
      shippingTimeline: order.shipping_timeline || [],
      shippingMeta: order.shipping_meta || null,
      syncedTransit,
    },
    formattedForWeb: formattedWeb,
    approval: {
      admin_approval_status: order.admin_approval_status,
      approved_by: order.approved_by || null,
      approved_at: order.approved_at || null,
      rejected_by: order.rejected_by || null,
      rejected_at: order.rejected_at || null,
      rejection_reason: order.rejection_reason || null,
    },
  });
});
