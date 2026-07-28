const Order = require("../Model/Order");
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
} = require("../Utill/orderAddress");
const { createDhlShipment } = require("../Utill/createDhlShipment");
const { createBlueDartWaybill } = require("../Utill/blueDartService");
const { default: mongoose } = require("mongoose");

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
  // Create Order
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
    PaymentId,
    paymentMethod: paymentMethod || "ONLINE",
    orderId,
    status: "pending",
    shipping_status: "pending",
    courier_name: "DHL",
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
  // Reduce Stock
  // ==========================
  for (const item of product) {
    // Find the product first to get variant info
    const productData = await Product.findById(item.id);
    
    if (!productData) {
      continue;
    }

    // Find the specific variant by color (item.variant contains the color)
    const variantColor = item.variant?.toLowerCase();
    const variantIndex = productData.variants.findIndex(
      v => v.color.toLowerCase() === variantColor
    );

    if (variantIndex === -1) {
      // Fallback to first variant if color not found
      continue;
    }

    // Update the specific variant's stock
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: item.id,
        [`variants.${variantIndex}.stock`]: {
          $gte: item.quantity,
        },
      },
      {
        $inc: {
          [`variants.${variantIndex}.stock`]: -item.quantity,
        },
      },
      {
        new: true,
        runValidators: false,
      }
    );

    if (!updatedProduct) {
      continue;
    }

    // Check if any variant still has stock
    const anyVariantInStock = updatedProduct.variants.some(
      v => v.stock > 0
    );

    // Update stock_status based on whether any variant is in stock
    if (!anyVariantInStock) {
      await Product.updateOne(
        { _id: item.id },
        {
          $set: {
            stock_status: "out_of_stock",
          },
        }
      );
    } else {
      // Ensure product is marked as in_stock if at least one variant has stock
      await Product.updateOne(
        { _id: item.id },
        {
          $set: {
            stock_status: "in_stock",
          },
        }
      );
    }
  }

  // ==========================
  // Create Shipment
  // ==========================
  let shipmentData = null;
  let shipmentError = null;

  try {
    // Build shipment payload
    const shipmentPayload = {
      name: shippingAddress.name,
      mobile: shippingAddress.mobile,
      address: legacyAddress,
      products: orderProducts,
      totalAmount: numericAmount,
      orderId: savedOrder.orderId,
    };

    const resolvedIsCod = (savedOrder.paymentMethod || paymentMethod || "ONLINE").toUpperCase() === "COD";

    // Create shipment based on courier preference
    const courierName = process.env.DEFAULT_COURIER || "DHL";
    let shipmentResponse = null;

    if (courierName === "BLUE_DART" || courierName === "BlueDart") {
      // Use Blue Dart - map to correct param names for createBlueDartWaybill
      shipmentResponse = await createBlueDartWaybill({
        orderId: savedOrder.orderId,
        name: shippingAddress.name,
        mobile: shippingAddress.mobile,
        receiverAddress: {
          ...shippingAddress,
          street_address: shippingAddress.street_address || legacyAddress,
          address: shippingAddress.address || legacyAddress,
          addressLine1: shippingAddress.addressLine1 || legacyAddress,
          pincode: shippingAddress.pincode,
        },
        products: orderProducts,
        declaredValue: numericAmount,
        isCod: resolvedIsCod,
        collectableAmount: resolvedIsCod ? numericAmount : 0,
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
      // Use DHL (default)
      shipmentResponse = await createDhlShipment(shipmentPayload);

      if (shipmentResponse?.success && shipmentResponse?.data) {
        const shipmentId = shipmentResponse.data?.shipmentTrackingNumber;
        shipmentData = {
          courierName: "DHL",
          trackingNumber: shipmentId,
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

    // Update order with shipment information
    if (shipmentData) {
      savedOrder.tracking_number = shipmentData.trackingNumber;
      savedOrder.shipping_status = "shipment_created";
      savedOrder.courier_name = shipmentData.courierName;
      savedOrder.shipping_response = shipmentData.shipmentDetails;
      savedOrder.labelData = shipmentData.labelData;
    } else {
      savedOrder.shipping_status = "shipment_creation_failed";
      savedOrder.shipping_response = {
        status: "failed",
        error: shipmentError,
        timestamp: new Date().toISOString(),
      };
    }

    await savedOrder.save();
  } catch (shipmentException) {
    console.error("Shipment creation exception:", shipmentException);
    
    savedOrder.shipping_status = "shipment_creation_failed";
    savedOrder.shipping_response = {
      status: "failed",
      error: shipmentException.message,
      timestamp: new Date().toISOString(),
    };

    await savedOrder.save();
  }

  // ==========================
  // Build Response
  // ==========================
  const responseData = {
    order: savedOrder,
    paymentMethod: newOrder.paymentMethod,
    shipment: shipmentData || {
      status: "failed",
      error: shipmentError,
      trackingNumber: null,
    },
  };

  // Add COD specific details if payment method is COD
  if (newOrder.paymentMethod === "COD") {
    responseData.paymentDetails = {
      paymentMethod: "COD",
      amount: numericAmount,
      status: "pending",
      message: "Payment will be collected at delivery",
      instructions: {
        vendor: "Please collect ₹" + numericAmount + " from customer on delivery",
        customer: "You will pay ₹" + numericAmount + " when the product is delivered",
      },
    };
  } else {
    // ONLINE payment details
    responseData.paymentDetails = {
      paymentMethod: "ONLINE",
      amount: numericAmount,
      transactionId: PaymentId || null,
      status: "completed",
    };
  }

  return successResponse(
    res,
    `Order added successfully. Shipment ${shipmentData ? 'created with tracking ID: ' + shipmentData.trackingNumber : 'creation pending'}. Payment method: ${newOrder.paymentMethod}`,
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

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: order,
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

