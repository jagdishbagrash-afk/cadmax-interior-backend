const mongoose = require("mongoose");
const Order = require("../Model/Order");
const User = require("../Model/User");
const Product = require("../Model/Product");
const ReturnRequest = require("../Model/ReturnRequest");
const { successResponse, errorResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const catchAsync = require("../Utill/catchAsync");

const VALID_REQUEST_TYPES = ["return", "replacement"];
const CANCEL_ALLOWED_STATUSES = ["requested", "under_review", "approved", "pickup_scheduled"];

const ensureAdmin = async (userId) => {
  if (!userId) return false;
  const user = await User.findById(userId).select("role").lean();
  return Boolean(user && user.role === "admin");
};

const parsePickupAddress = (value) => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }
  return typeof value === "object" ? value : {};
};

const buildReturnEligibility = (order) => {
  if (!order) {
    return {
      eligible: false,
      deliveredAt: null,
      eligibleUntil: null,
      daysRemaining: 0,
      message: "Order was not found.",
    };
  }

  const orderStatus = String(order.status || "").toLowerCase();
  const deliveredAt = order.delivered_at || order.deliveredAt || null;

  if (orderStatus !== "delivered" || !deliveredAt) {
    return {
      eligible: false,
      deliveredAt: deliveredAt ? new Date(deliveredAt).toISOString() : null,
      eligibleUntil: null,
      daysRemaining: 0,
      message: "Return or replacement is available only after delivery.",
    };
  }

  const deliveredDate = new Date(deliveredAt);
  const eligibleUntil = new Date(deliveredDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const eligible = now <= eligibleUntil;
  const msRemaining = Math.max(0, eligibleUntil.getTime() - now.getTime());
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

  return {
    eligible,
    deliveredAt: deliveredDate.toISOString(),
    eligibleUntil: eligibleUntil.toISOString(),
    daysRemaining,
    message: eligible
      ? "Return or replacement request is still within the valid window."
      : "Return or replacement period has expired.",
  };
};

const getExistingReturnRequestForProduct = async ({ orderId, productId, excludeStatuses = [] }) => {
  const query = {
    orderId,
    productId,
  };

  if (excludeStatuses.length) {
    query.status = { $nin: excludeStatuses };
  }

  return ReturnRequest.findOne(query).sort({ createdAt: -1 });
};

const generateReturnId = async () => {
  const prefix = "RET-";
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    const randomDigit = Math.floor(Math.random() * 36);
    code += randomDigit.toString(36).toUpperCase();
  }

  const existing = await ReturnRequest.findOne({ returnId: `${prefix}${code}` });
  if (existing) {
    return generateReturnId();
  }

  return `${prefix}${code}`;
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const getAllowedStatusTransitions = () => ({
  requested: ["under_review", "approved", "rejected", "cancelled"],
  under_review: ["approved", "rejected", "pickup_scheduled", "cancelled"],
  approved: ["pickup_scheduled", "rejected", "cancelled"],
  rejected: [],
  pickup_scheduled: ["picked_up", "cancelled"],
  picked_up: ["in_transit"],
  in_transit: ["received"],
  received: ["quality_check"],
  quality_check: ["refund_initiated", "replacement_created"],
  refund_initiated: ["refund_completed"],
  refund_completed: [],
  replacement_created: ["replacement_shipped"],
  replacement_shipped: ["replacement_delivered"],
  replacement_delivered: ["completed"],
  cancelled: [],
  completed: [],
});

exports.createReturnRequest = catchAsync(async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, "Unauthorized access", 401);
    }

    const orderId = req.body.orderId;
    const productId = req.body.productId;
    const quantity = Number(req.body.quantity);
    const requestType = String(req.body.requestType || "").trim().toLowerCase();
    const reason = String(req.body.reason || "").trim();
    const comments = String(req.body.comments || "").trim();
    const pickupAddress = parsePickupAddress(req.body.pickupAddress);
    const pickupConfirmed = req.body.pickupAddressConfirmed === true || req.body.confirmPickupAddress === true || req.body.isPickupAddressConfirmed === true;

    if (!orderId || !isValidObjectId(orderId)) {
      return validationErrorResponse(res, "Valid orderId is required");
    }

    if (!productId || !isValidObjectId(productId)) {
      return validationErrorResponse(res, "Valid productId is required");
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      return validationErrorResponse(res, "Valid quantity is required");
    }

    if (!VALID_REQUEST_TYPES.includes(requestType)) {
      return validationErrorResponse(res, "requestType must be 'return' or 'replacement'");
    }

    if (!reason) {
      return validationErrorResponse(res, "Reason is required");
    }

    if (!pickupConfirmed) {
      return validationErrorResponse(res, "Please confirm the pickup address before submitting the request");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    if (String(order.userId) !== String(userId)) {
      return errorResponse(res, "This order does not belong to the logged-in user", 403);
    }

    if (String(order.status).toLowerCase() !== "delivered") {
      return validationErrorResponse(res, "Return or replacement is allowed only for delivered orders");
    }

    if (!order.delivered_at) {
      return validationErrorResponse(res, "Order delivery date is missing");
    }

    const item = order.product?.find((product) => String(product.id) === String(productId));
    if (!item) {
      return validationErrorResponse(res, "Selected product does not belong to the order");
    }

    if (Number(quantity) > Number(item.quantity || 0)) {
      return validationErrorResponse(res, "Requested quantity cannot exceed ordered quantity");
    }

    const eligibility = buildReturnEligibility(order);
    if (!eligibility.eligible) {
      return validationErrorResponse(res, eligibility.message || "Return window expired", 400);
    }

    const duplicateRequest = await getExistingReturnRequestForProduct({
      orderId: order._id,
      productId: item.id,
      excludeStatuses: ["cancelled", "rejected", "completed"],
    });

    if (duplicateRequest) {
      return errorResponse(res, "An active return or replacement request already exists for this product", 409);
    }

    const supportingFiles = Array.isArray(req.files?.supportingImages) ? req.files.supportingImages : [];
    if (supportingFiles.length > 5) {
      return validationErrorResponse(res, "Maximum 5 supporting images are allowed");
    }

    supportingFiles.forEach((file) => {
      if (file.size && file.size > 5 * 1024 * 1024) {
        throw new Error("Each supporting image must be 5MB or smaller");
      }
    });

    const returnId = await generateReturnId();
    const returnRequest = new ReturnRequest({
      returnId,
      orderId: order._id,
      orderNumber: order.orderId,
      userId,
      productId: item.id,
      productTitle: item.title || "",
      productImage: item.image || "",
      quantity,
      requestType,
      reason,
      comments,
      supportingImages: supportingFiles.map((file) => ({
        url: file.location,
        key: file.key,
      })),
      pickupAddress: {
        name: pickupAddress.name || "",
        phone: pickupAddress.phone || "",
        fullAddress: pickupAddress.fullAddress || pickupAddress.address || "",
        city: pickupAddress.city || "",
        state: pickupAddress.state || "",
        pincode: pickupAddress.pincode || "",
      },
      deliveredAt: order.delivered_at,
      eligibleUntil: eligibility.eligibleUntil ? new Date(eligibility.eligibleUntil) : null,
      status: "requested",
      requestedAt: new Date(),
    });

    const savedReturnRequest = await returnRequest.save();

    return successResponse(res, "Return request submitted successfully", 201, {
      returnId: savedReturnRequest.returnId,
      status: savedReturnRequest.status,
      eligibleUntil: savedReturnRequest.eligibleUntil,
    });
  } catch (error) {
    console.error("Create Return Request Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getReturnRequestsByOrder = catchAsync(async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return errorResponse(res, "Unauthorized access", 401);
    }

    if (!orderId || !isValidObjectId(orderId)) {
      return validationErrorResponse(res, "Valid orderId is required");
    }

    const order = await Order.findById(orderId).lean();
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    if (String(order.userId) !== String(userId)) {
      const isAdminUser = await ensureAdmin(userId);
      if (!isAdminUser) {
        return errorResponse(res, "Forbidden: not your order", 403);
      }
    }

    const returnRequests = await ReturnRequest.find({ orderId: order._id })
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, "Return requests fetched successfully", 200, returnRequests);
  } catch (error) {
    console.error("Get Return Requests By Order Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getReturnRequestById = catchAsync(async (req, res) => {
  try {
    const { returnId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return errorResponse(res, "Unauthorized access", 401);
    }

    const request = await ReturnRequest.findOne({ returnId }).populate("userId", "name email phone").populate("orderId");
    if (!request) {
      return errorResponse(res, "Return request not found", 404);
    }

    const isAdminUser = await ensureAdmin(userId);
    if (!isAdminUser && String(request.userId?._id || request.userId) !== String(userId)) {
      return errorResponse(res, "Forbidden: access denied", 403);
    }

    return successResponse(res, "Return request details fetched successfully", 200, request);
  } catch (error) {
    console.error("Get Return Request Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.cancelReturnRequest = catchAsync(async (req, res) => {
  try {
    const { returnId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return errorResponse(res, "Unauthorized access", 401);
    }

    const request = await ReturnRequest.findOne({ returnId });
    if (!request) {
      return errorResponse(res, "Return request not found", 404);
    }

    if (String(request.userId) !== String(userId)) {
      return errorResponse(res, "Forbidden: you cannot cancel this request", 403);
    }

    if (!CANCEL_ALLOWED_STATUSES.includes(request.status)) {
      return validationErrorResponse(res, "This request cannot be cancelled in its current status");
    }

    request.status = "cancelled";
    request.cancelledAt = new Date();
    await request.save();

    return successResponse(res, "Return request cancelled successfully", 200, request);
  } catch (error) {
    console.error("Cancel Return Request Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getAllAdminReturns = catchAsync(async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdminUser = await ensureAdmin(userId);

    if (!isAdminUser) {
      return errorResponse(res, "Forbidden: admin access required", 403);
    }

    const {
      page = 1,
      limit = 20,
      status,
      type,
      search = "",
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.requestType = type;

    if (search) {
      const searchTerm = String(search).trim();
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { phone: { $regex: searchTerm, $options: "i" } },
        ],
      }).distinct("_id");

      query.$or = [
        { returnId: { $regex: searchTerm, $options: "i" } },
        { orderNumber: { $regex: searchTerm, $options: "i" } },
        { productTitle: { $regex: searchTerm, $options: "i" } },
        { userId: { $in: matchingUsers } },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      ReturnRequest.find(query)
        .populate("userId", "name email phone")
        .populate("orderId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ReturnRequest.countDocuments(query),
    ]);

    return successResponse(res, "Return requests fetched successfully", 200, {
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Admin Get All Returns Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getAdminReturnById = catchAsync(async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdminUser = await ensureAdmin(userId);

    if (!isAdminUser) {
      return errorResponse(res, "Forbidden: admin access required", 403);
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return validationErrorResponse(res, "Valid return request ID is required");
    }

    const request = await ReturnRequest.findById(id)
      .populate("userId", "name email phone")
      .populate("orderId")
      .populate("productId", "title image variants")
      .lean();

    if (!request) {
      return errorResponse(res, "Return request not found", 404);
    }

    return successResponse(res, "Return request details fetched successfully", 200, request);
  } catch (error) {
    console.error("Admin Get Return By Id Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.updateAdminReturnStatus = catchAsync(async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdminUser = await ensureAdmin(userId);

    if (!isAdminUser) {
      return errorResponse(res, "Forbidden: admin access required", 403);
    }

    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!id || !isValidObjectId(id)) {
      return validationErrorResponse(res, "Valid return request ID is required");
    }

    if (!status) {
      return validationErrorResponse(res, "Status is required");
    }

    const request = await ReturnRequest.findById(id);
    if (!request) {
      return errorResponse(res, "Return request not found", 404);
    }

    const transitionMap = getAllowedStatusTransitions();
    const currentStatus = request.status;
    const allowedStatuses = transitionMap[currentStatus] || [];

    if (currentStatus && !allowedStatuses.includes(status)) {
      return validationErrorResponse(res, `Invalid status transition from ${currentStatus} to ${status}`);
    }

    if (status === "approved") {
      request.approvedAt = new Date();
    }
    if (status === "rejected") {
      request.rejectedAt = new Date();
    }

    request.status = status;
    if (typeof adminNote === "string") {
      request.adminNote = adminNote.trim();
    }

    await request.save();

    return successResponse(res, "Return request status updated successfully", 200, request);
  } catch (error) {
    console.error("Admin Update Return Status Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.approveReturnRequest = catchAsync(async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdminUser = await ensureAdmin(userId);

    if (!isAdminUser) {
      return errorResponse(res, "Forbidden: admin access required", 403);
    }

    const { id } = req.params;
    const request = await ReturnRequest.findById(id);
    if (!request) {
      return errorResponse(res, "Return request not found", 404);
    }

    const transitionMap = getAllowedStatusTransitions();
    const allowedStatuses = transitionMap[request.status] || [];
    if (!allowedStatuses.includes("approved")) {
      return validationErrorResponse(res, `Status ${request.status} cannot be approved`);
    }

    request.status = "approved";
    request.approvedAt = new Date();
    await request.save();

    return successResponse(res, "Return request approved successfully", 200, request);
  } catch (error) {
    console.error("Approve Return Request Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.rejectReturnRequest = catchAsync(async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdminUser = await ensureAdmin(userId);

    if (!isAdminUser) {
      return errorResponse(res, "Forbidden: admin access required", 403);
    }

    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !String(rejectionReason).trim()) {
      return validationErrorResponse(res, "Rejection reason is required");
    }

    const request = await ReturnRequest.findById(id);
    if (!request) {
      return errorResponse(res, "Return request not found", 404);
    }

    const transitionMap = getAllowedStatusTransitions();
    const allowedStatuses = transitionMap[request.status] || [];
    if (!allowedStatuses.includes("rejected")) {
      return validationErrorResponse(res, `Status ${request.status} cannot be rejected`);
    }

    request.status = "rejected";
    request.rejectionReason = String(rejectionReason).trim();
    request.rejectedAt = new Date();
    await request.save();

    return successResponse(res, "Return request rejected successfully", 200, request);
  } catch (error) {
    console.error("Reject Return Request Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.createReverseShipment = catchAsync(async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdminUser = await ensureAdmin(userId);

    if (!isAdminUser) {
      return errorResponse(res, "Forbidden: admin access required", 403);
    }

    const { id } = req.params;
    const { provider, awbNumber, pickupRequestId, trackingStatus } = req.body;

    const request = await ReturnRequest.findById(id);
    if (!request) {
      return errorResponse(res, "Return request not found", 404);
    }

    request.reverseShipment = {
      provider: provider || "Blue Dart",
      awbNumber: awbNumber || "",
      pickupRequestId: pickupRequestId || "",
      trackingStatus: trackingStatus || "scheduled",
    };
    request.status = "pickup_scheduled";
    await request.save();

    return successResponse(res, "Reverse pickup request created successfully", 200, request.reverseShipment);
  } catch (error) {
    console.error("Create Reverse Shipment Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.initiateRefund = catchAsync(async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdminUser = await ensureAdmin(userId);

    if (!isAdminUser) {
      return errorResponse(res, "Forbidden: admin access required", 403);
    }

    const { id } = req.params;
    const { amount, paymentId, refundId } = req.body;

    const request = await ReturnRequest.findById(id);
    if (!request) {
      return errorResponse(res, "Return request not found", 404);
    }

    if (request.requestType !== "return") {
      return validationErrorResponse(res, "Refund can only be initiated for return requests");
    }

    if (!["received", "quality_check"].includes(request.status)) {
      return validationErrorResponse(res, `Refund can only be initiated after the request is received and quality check is passed.`);
    }

    const refundAmount = Number(amount ?? request.quantity ?? 0);
    const order = await Order.findById(request.orderId).lean();
    const paymentReference = paymentId || order?.PaymentId || "";

    request.refund = {
      amount: refundAmount,
      paymentId: paymentReference,
      refundId: refundId || `RF-${Date.now()}`,
      status: "refund_initiated",
    };
    request.status = "refund_initiated";
    await request.save();

    return successResponse(res, "Refund initiated successfully", 200, request.refund);
  } catch (error) {
    console.error("Initiate Refund Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.createReplacementOrder = catchAsync(async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdminUser = await ensureAdmin(userId);

    if (!isAdminUser) {
      return errorResponse(res, "Forbidden: admin access required", 403);
    }

    const { id } = req.params;
    const request = await ReturnRequest.findById(id);
    if (!request) {
      return errorResponse(res, "Return request not found", 404);
    }

    if (request.requestType !== "replacement") {
      return validationErrorResponse(res, "Replacement order can only be created for replacement requests");
    }

    const originalOrder = await Order.findById(request.orderId);
    if (!originalOrder) {
      return errorResponse(res, "Original order not found", 404);
    }

    const replacementOrderId = `ORD-${Date.now().toString().slice(-8).toUpperCase()}-RPL`;
    const replacementOrder = new Order({
      name: originalOrder.name,
      mobile: originalOrder.mobile,
      address: originalOrder.address,
      product: originalOrder.product,
      status: "pending",
      note: `Replacement order created from return request ${request.returnId}`,
      userId: originalOrder.userId,
      addressId: originalOrder.addressId,
      shippingAddress: originalOrder.shippingAddress,
      PaymentId: null,
      paymentMethod: "replacement",
      amount: 0,
      orderId: replacementOrderId,
      orderType: "replacement",
      parentOrderId: originalOrder._id,
      returnRequestId: request._id,
      paymentStatus: "not_required",
      shipping_status: "pending",
      courier_name: process.env.DEFAULT_COURIER || "DHL",
    });

    const savedReplacementOrder = await replacementOrder.save();
    request.replacementOrderId = savedReplacementOrder._id;
    request.status = "replacement_created";
    await request.save();

    return successResponse(res, "Replacement order created successfully", 201, {
      replacementOrderId: savedReplacementOrder._id,
      orderId: savedReplacementOrder.orderId,
      status: request.status,
    });
  } catch (error) {
    console.error("Create Replacement Order Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.attachReturnEligibilityToOrder = async (order) => {
  if (!order) return { returnEligibility: buildReturnEligibility(null) };

  const returnEligibility = buildReturnEligibility(order);
  const request = await ReturnRequest.findOne({
    orderId: order._id,
    status: { $nin: ["cancelled", "rejected", "completed"] },
  }).sort({ createdAt: -1 }).lean();

  return {
    returnEligibility,
    returnRequest: request
      ? {
          returnId: request.returnId,
          status: request.status,
          requestType: request.requestType,
        }
      : null,
  };
};
