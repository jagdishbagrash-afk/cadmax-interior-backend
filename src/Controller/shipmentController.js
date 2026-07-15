const Order = require("../Model/Order");
const catchAsync = require("../Utill/catchAsync");
const { trackDhlShipment, createDhlShipment } = require("../Utill/createDhlShipment");
const {
  trackBlueDartShipment,
  createBlueDartWaybill,
  resolveBlueDartShipFrom,
} = require("../Utill/blueDartService");
const {
  ensureOrderShippingAddress,
  resolveOrderShippingAddressSnapshot,
  toCourierAddress,
} = require("../Utill/orderAddress");

const formatTrackingPayload = (trackingNumber, data) => {
  const shipment = data?.shipments?.[0] || data;

  const events = Array.isArray(shipment?.events)
    ? shipment.events.map((event) => ({
        timestamp: event.timestamp,
        status: event.description || event.status,
        location:
          event?.serviceArea &&
          [event.serviceArea.city, event.serviceArea.countryCode]
            .filter(Boolean)
            .join(", "),
        remarks: event.remarks || null,
      }))
    : [];

  return {
    trackingNumber,
    status: shipment?.status || shipment?.statusCode || "unknown",
    raw: data,
    events,
  };
};

const formatBlueDartTrackingPayload = (trackingNumber, data) => {
  const candidates = [
    data?.Scans,
    data?.scans,
    data?.Shipment?.Scans,
    data?.Shipment?.scans,
    data?.Shipment?.ScanDetails,
    data?.ScanDetails,
    data?.tracking?.Scans,
    data?.tracking?.scans,
  ];

  const scans = candidates.find(Array.isArray) || [];

  const events = scans.map((scan) => ({
    timestamp:
      scan?.ScanDateTime ||
      scan?.scanDateTime ||
      scan?.Timestamp ||
      scan?.timestamp ||
      null,
    status: scan?.Status || scan?.status || scan?.ScanType || scan?.scanType || "unknown",
    location: scan?.Location || scan?.location || scan?.ScanLocation || scan?.scanLocation || null,
    remarks: scan?.Remarks || scan?.remarks || null,
  }));

  const status =
    data?.CurrentStatus ||
    data?.currentStatus ||
    data?.Shipment?.CurrentStatus ||
    data?.Shipment?.currentStatus ||
    (events[0]?.status || "unknown");

  return {
    trackingNumber,
    status,
    raw: data,
    events,
  };
};

const normalizeCourier = (value) => {
  if (!value) {
    return "DHL";
  }

  const normalized = String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "BLUEDART" || normalized === "BLUE_DART") {
    return "BLUE_DART";
  }
  if (normalized === "DHL") {
    return "DHL";
  }
  return "DHL";
};

const getShipmentTrackingNumber = (shipmentResponse = {}) =>
  shipmentResponse?.shipmentTrackingNumber ||
  shipmentResponse?.trackingNumber ||
  shipmentResponse?.awbNumber ||
  shipmentResponse?.AWBNo ||
  shipmentResponse?.awbNo ||
  shipmentResponse?.packages?.[0]?.trackingNumber ||
  shipmentResponse?.pieces?.[0]?.trackingNumber ||
  null;

const resolveDefaultShippingProvider = (value) =>
  normalizeCourier(value) ||
  normalizeCourier(process.env.DEFAULT_SHIPPING_PROVIDER) ||
  "DHL";

const createShipmentForOrder = async ({ order, receiverAddress, shippingProvider }) => {
  const provider = resolveDefaultShippingProvider(shippingProvider);
  const receiverName = receiverAddress?.name || order?.shippingAddress?.name || order?.name;
  const receiverMobile = receiverAddress?.mobile || order?.shippingAddress?.mobile || order?.mobile;

  if (provider === "BLUE_DART") {
    const shipFrom = resolveBlueDartShipFrom(order?.labelData?.shipFrom);

    const shipment = await createBlueDartWaybill({
      orderId: order.orderId,
      name: receiverName,
      mobile: receiverMobile,
      receiverAddress,
      shipFrom,
      products: order.product,
      declaredValue: order.amount,
      isCod: false,
    });

    return {
      provider,
      shipment,
      trackingNumber: shipment.success
        ? shipment.awbNumber || getShipmentTrackingNumber(shipment.data)
        : null,
    };
  }

  const shipment = await createDhlShipment({
    name: receiverName,
    mobile: receiverMobile,
    address: receiverAddress,
    products: order.product,
    totalAmount: order.amount,
    orderId: order.orderId,
  });

  return {
    provider: "DHL",
    shipment,
    trackingNumber: shipment.success ? getShipmentTrackingNumber(shipment.data) : null,
  };
};

const toSafeString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const toSafeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const pickFirstValue = (...values) => {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (value && toSafeString(value) !== "") {
      return value;
    }
  }

  return "";
};

const splitAddressSegments = (value) =>
  toSafeString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const getOrderAddressFallback = (order = {}) => {
  const parts = splitAddressSegments(order.address);
  const pincodeMatch = toSafeString(order.address).match(/\b\d{4,10}\b/);

  return {
    addressLine1: parts[0] || "",
    addressLine2: parts.slice(1, Math.max(parts.length - 3, 1)).join(", "),
    city: parts.length >= 3 ? parts[parts.length - 3] : "",
    state: parts.length >= 2 ? parts[parts.length - 2] : "",
    country: parts.length >= 1 ? parts[parts.length - 1].replace(/-\s*\d{4,10}.*$/, "").trim() : "",
    pincode: pincodeMatch ? pincodeMatch[0] : "",
  };
};

const buildFullAddress = ({
  addressLine1 = "",
  addressLine2 = "",
  city = "",
  state = "",
  pincode = "",
  country = "",
}) =>
  [addressLine1, addressLine2, city, state, pincode, country]
    .map(toSafeString)
    .filter(Boolean)
    .join(", ");

const getEnvShipperAddress = () => {
  return resolveBlueDartShipFrom();
};

const mergeLabelData = (computedLabelData = {}, savedLabelData = {}) => ({
  ...computedLabelData,
  ...savedLabelData,
  carrier: {
    ...(computedLabelData.carrier || {}),
    ...(savedLabelData?.carrier || {}),
    blueDart: {
      ...(computedLabelData?.carrier?.blueDart || {}),
      ...(savedLabelData?.carrier?.blueDart || {}),
    },
  },
  shipTo: {
    ...(computedLabelData.shipTo || {}),
    ...(savedLabelData?.shipTo || {}),
  },
  shipFrom: {
    ...(computedLabelData.shipFrom || {}),
    ...(savedLabelData?.shipFrom || {}),
  },
  payment: {
    ...(computedLabelData.payment || {}),
    ...(savedLabelData?.payment || {}),
  },
  package: {
    ...(computedLabelData.package || {}),
    ...(savedLabelData?.package || {}),
    dimensionsCm: {
      ...(computedLabelData?.package?.dimensionsCm || {}),
      ...(savedLabelData?.package?.dimensionsCm || {}),
    },
  },
});

const ensureOrderShipFrom = (order) => {
  const shouldReuseSavedShipFrom =
    order?.shipping_status === "shipment_created" && toSafeString(order?.tracking_number) !== "";
  const shipFrom = resolveBlueDartShipFrom(
    shouldReuseSavedShipFrom ? order?.labelData?.shipFrom : null
  );
  order.labelData = {
    ...(order.labelData || {}),
    shipFrom,
  };

  return shipFrom;
};

const getSavedAddressDetails = (savedAddress = {}) => ({
  addressLine1: toSafeString(savedAddress.street_address || savedAddress.addressLine1),
  addressLine2: toSafeString(savedAddress.addressLine2),
  city: toSafeString(savedAddress.city),
  state: toSafeString(savedAddress.state),
  pincode: toSafeString(savedAddress.pincode || savedAddress.postalCode),
  country: toSafeString(savedAddress.country || "India"),
});

const getShipmentReceiverDetails = (shipmentResponse = {}) => {
  const receiver =
    shipmentResponse?.customerDetails?.receiverDetails ||
    shipmentResponse?.Request?.Consignee ||
    shipmentResponse?.Consignee ||
    shipmentResponse?.receiver ||
    {};

  const postalAddress = receiver?.postalAddress || {};

  return {
    name: toSafeString(
      receiver?.contactInformation?.fullName ||
        receiver?.ConsigneeName ||
        receiver?.name
    ),
    phone: toSafeString(
      receiver?.contactInformation?.phone ||
        receiver?.ConsigneeMobile ||
        receiver?.phone
    ),
    addressLine1: toSafeString(
      postalAddress?.addressLine1 ||
        receiver?.ConsigneeAddress1 ||
        receiver?.addressLine1
    ),
    addressLine2: toSafeString(
      postalAddress?.addressLine2 ||
        receiver?.ConsigneeAddress2 ||
        receiver?.addressLine2
    ),
    city: toSafeString(postalAddress?.cityName || receiver?.city),
    state: toSafeString(postalAddress?.provinceName || receiver?.state),
    pincode: toSafeString(postalAddress?.postalCode || receiver?.ConsigneePincode || receiver?.pincode),
    country: toSafeString(postalAddress?.countryName || receiver?.country || "India"),
  };
};

const getShipmentPackageDetails = (shipmentResponse = {}, order = {}) => {
  const serviceDetails = shipmentResponse?.Request?.Services || shipmentResponse?.Services || {};
  const pkg =
    shipmentResponse?.content?.packages?.[0] ||
    shipmentResponse?.packages?.[0] ||
    shipmentResponse?.pieces?.[0] ||
    {};

  const pieceCountFromOrder = Array.isArray(order.product)
    ? order.product.reduce((sum, item) => sum + Math.max(toSafeNumber(item.quantity), 0), 0)
    : 0;

  return {
    weightKg: toSafeNumber(
      pickFirstValue(
        serviceDetails?.ActualWeight,
        pkg?.weight,
        process.env.BLUE_DART_DEFAULT_PIECE_WEIGHT_KG
      )
    ),
    pieceCount: toSafeNumber(
      pickFirstValue(serviceDetails?.PieceCount, serviceDetails?.ItemCount, pieceCountFromOrder, 0)
    ),
    dimensionsCm: {
      length: toSafeNumber(
        pickFirstValue(serviceDetails?.Dimensions?.[0]?.Length, pkg?.dimensions?.length, process.env.BLUE_DART_DIMENSION_LENGTH)
      ),
      breadth: toSafeNumber(
        pickFirstValue(serviceDetails?.Dimensions?.[0]?.Breadth, pkg?.dimensions?.width, process.env.BLUE_DART_DIMENSION_BREADTH)
      ),
      height: toSafeNumber(
        pickFirstValue(serviceDetails?.Dimensions?.[0]?.Height, pkg?.dimensions?.height, process.env.BLUE_DART_DIMENSION_HEIGHT)
      ),
    },
  };
};

const getShipmentItemDetails = (shipmentResponse = {}, order = {}) => {
  const shipmentItems =
    shipmentResponse?.Request?.Services?.itemdtl ||
    shipmentResponse?.itemdtl ||
    shipmentResponse?.items;

  if (Array.isArray(shipmentItems) && shipmentItems.length > 0) {
    return shipmentItems.map((item, index) => ({
      sku: toSafeString(item?.SKUNumber || item?.ItemID || item?.sku || `ITEM-${index + 1}`),
      description: toSafeString(item?.ItemName || item?.ProductDesc1 || item?.description),
      quantity: toSafeNumber(item?.Itemquantity || item?.quantity),
      price: toSafeNumber(item?.ItemValue || item?.price),
      total: toSafeNumber(item?.TotalValue || item?.total || item?.ItemValue),
    }));
  }

  return (Array.isArray(order.product) ? order.product : []).map((item, index) => ({
    sku: toSafeString(item?.sku || item?.id || `ITEM-${index + 1}`),
    description: toSafeString(item?.title || item?.variantTitle || item?.variant || ""),
    quantity: toSafeNumber(item?.quantity),
    price: toSafeNumber(item?.price),
    total: toSafeNumber(item?.total),
  }));
};

const buildLabelData = ({ order, savedAddress, shipmentResponse }) => {
  const fallbackAddress = getOrderAddressFallback(order);
  const savedAddressDetails = getSavedAddressDetails(savedAddress);
  const shippingAddress = resolveOrderShippingAddressSnapshot(order, savedAddress);
  const shipmentReceiver = getShipmentReceiverDetails(shipmentResponse);
  const shipFrom = resolveBlueDartShipFrom(order?.labelData?.shipFrom || getEnvShipperAddress());
  const packageDetails = getShipmentPackageDetails(shipmentResponse, order);
  const items = getShipmentItemDetails(shipmentResponse, order);
  const serviceDetails = shipmentResponse?.Request?.Services || shipmentResponse?.Services || {};
  const shipperDetails = shipmentResponse?.Request?.Shipper || shipmentResponse?.Shipper || {};
  const bookingDate = toSafeString(
    pickFirstValue(
      shipmentResponse?.bookingDate,
      shipmentResponse?.BkgDate,
      shipmentResponse?.BKGDate,
      order?.createdAt
    )
  );

  const shipTo = {
    name: toSafeString(
      pickFirstValue(shipmentReceiver.name, shippingAddress?.name, order?.name)
    ),
    phone: toSafeString(
      pickFirstValue(shipmentReceiver.phone, shippingAddress?.mobile, order?.mobile)
    ),
    addressLine1: toSafeString(
      pickFirstValue(
        shipmentReceiver.addressLine1,
        shippingAddress?.street_address,
        savedAddressDetails.addressLine1,
        fallbackAddress.addressLine1
      )
    ),
    addressLine2: toSafeString(
      pickFirstValue(shipmentReceiver.addressLine2, savedAddressDetails.addressLine2, fallbackAddress.addressLine2)
    ),
    city: toSafeString(
      pickFirstValue(shipmentReceiver.city, shippingAddress?.city, savedAddressDetails.city, fallbackAddress.city)
    ),
    state: toSafeString(
      pickFirstValue(
        shipmentReceiver.state,
        shippingAddress?.state,
        savedAddressDetails.state,
        fallbackAddress.state
      )
    ),
    pincode: toSafeString(
      pickFirstValue(
        shipmentReceiver.pincode,
        shippingAddress?.pincode,
        savedAddressDetails.pincode,
        fallbackAddress.pincode
      )
    ),
    country: toSafeString(
      pickFirstValue(
        shipmentReceiver.country,
        shippingAddress?.country,
        savedAddressDetails.country,
        fallbackAddress.country,
        "India"
      )
    ),
  };

  shipTo.fullAddress = buildFullAddress(shipTo);

  const blueDartMeta = {
    originArea: toSafeString(
      pickFirstValue(
        shipFrom.originArea,
        shipperDetails?.OriginArea,
        shipmentResponse?.originArea,
        process.env.BLUE_DART_ORIGIN_AREA
      )
    ),
    destinationArea: toSafeString(
      pickFirstValue(
        shipmentResponse?.destinationArea,
        process.env.BLUE_DART_DESTINATION_AREA
      )
    ),
    clusterCode: toSafeString(
      pickFirstValue(
        shipmentResponse?.clusterCode,
        shipperDetails?.OriginArea,
        process.env.BLUE_DART_CLUSTER_CODE
      )
    ),
    productCode: toSafeString(
      pickFirstValue(
        serviceDetails?.ProductCode,
        shipmentResponse?.productCode,
        process.env.BLUE_DART_PRODUCT_CODE
      )
    ),
    subProductCode: toSafeString(
      pickFirstValue(
        serviceDetails?.SubProductCode,
        shipmentResponse?.subProductCode,
        process.env.BLUE_DART_SUB_PRODUCT_CODE
      )
    ),
    productType: toSafeNumber(
      pickFirstValue(
        serviceDetails?.ProductType,
        shipmentResponse?.productType,
        process.env.BLUE_DART_PRODUCT_TYPE,
        0
      )
    ),
    packType: toSafeString(
      pickFirstValue(
        serviceDetails?.PackType,
        shipmentResponse?.packType,
        process.env.BLUE_DART_PACK_TYPE
      )
    ),
    pickupTime: toSafeString(
      pickFirstValue(
        serviceDetails?.PickupTime,
        shipmentResponse?.pickupTime,
        process.env.BLUE_DART_PICKUP_TIME
      )
    ),
    apiType: toSafeString(
      pickFirstValue(
        shipmentResponse?.Profile?.Api_type,
        shipmentResponse?.apiType,
        process.env.BLUE_DART_API_TYPE
      )
    ),
    sender: toSafeString(
      pickFirstValue(
        shipFrom.sender,
        shipperDetails?.Sender,
        shipmentResponse?.sender,
        process.env.BLUE_DART_SENDER
      )
    ),
    vendorCode: toSafeString(
      pickFirstValue(
        shipFrom.vendorCode,
        shipperDetails?.VendorCode,
        shipmentResponse?.vendorCode,
        process.env.BLUE_DART_VENDOR_CODE
      )
    ),
    customerCode: toSafeString(
      pickFirstValue(
        shipFrom.customerCode,
        shipperDetails?.CustomerCode,
        shipmentResponse?.customerCode,
        process.env.BLUE_DART_CUSTOMER_CODE
      )
    ),
    registerPickup: String(
      pickFirstValue(
        serviceDetails?.RegisterPickup,
        shipmentResponse?.registerPickup,
        process.env.BLUE_DART_REGISTER_PICKUP,
        "true"
      )
    ).toLowerCase() === "true",
    areaLocation: toSafeString(
      pickFirstValue(
        shipmentResponse?.areaLocation,
        shipTo.city && shipTo.state ? `${shipTo.city}, ${shipTo.state}` : shipTo.city
      )
    ),
  };

  return {
    bookingDate,
    origin: toSafeString(
      pickFirstValue(
        shipmentResponse?.origin,
        shipmentResponse?.Origin,
        shipperDetails?.OriginArea,
        shipFrom.city
      )
    ),
    destination: toSafeString(
      pickFirstValue(
        shipmentResponse?.destination,
        shipmentResponse?.Destination,
        shipmentResponse?.destinationArea,
        shipTo.city
      )
    ),
    serviceType: toSafeString(
      pickFirstValue(
        shipmentResponse?.serviceType,
        shipmentResponse?.productName,
        normalizeCourier(order?.courier_name) === "BLUE_DART" ? "Standard Shipping" : "Express Shipping"
      )
    ),
    carrier: {
      provider: normalizeCourier(order?.courier_name),
      blueDart: normalizeCourier(order?.courier_name) === "BLUE_DART" ? blueDartMeta : {},
    },
    shipTo,
    shipFrom,
    payment: {
      currency: toSafeString(pickFirstValue(order?.currency, shipmentResponse?.currency, "INR")),
      orderValue: toSafeNumber(pickFirstValue(order?.amount, serviceDetails?.DeclaredValue, 0)),
      codAmount: toSafeNumber(
        pickFirstValue(serviceDetails?.CollectableAmount, shipmentResponse?.codAmount, 0)
      ),
    },
    package: packageDetails,
    items,
  };
};

const getOrderLabelData = ({ order, savedAddress }) =>
  mergeLabelData(
    buildLabelData({
      order,
      savedAddress,
      shipmentResponse: order.shipping_response || {},
    }),
    order.labelData || {}
  );

const buildShipmentResponseData = ({ order, savedAddress }) => ({
  orderId: order._id,
  orderNumber: order.orderId,
  addressId: order.addressId || null,
  address: toSafeString(order.address),
  shippingAddress: resolveOrderShippingAddressSnapshot(order, savedAddress),
  paymentId: order.PaymentId || "",
  shippingStatus: toSafeString(order.shipping_status),
  courierName: toSafeString(order.courier_name),
  trackingNumber: toSafeString(order.tracking_number),
  labelData: getOrderLabelData({ order, savedAddress }),
  shipmentResponse: order.shipping_response || {},
});

exports.TrackShipment = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const courier = normalizeCourier(req.query.courier || req.query.provider);

    if (!trackingNumber) {
      return res.status(400).json({
        status: false,
        message: "Tracking number is required",
      });
    }

    const response =
      courier === "BLUE_DART"
        ? await trackBlueDartShipment(trackingNumber)
        : await trackDhlShipment(trackingNumber);

    if (!response.success) {
      return res.status(502).json({
        status: false,
        message: "Tracking failed",
        error: response.error,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Tracking fetched successfully",
      data:
        courier === "BLUE_DART"
          ? formatBlueDartTrackingPayload(trackingNumber, response.data)
          : formatTrackingPayload(trackingNumber, response.data),
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error?.response?.data || error.message || "Tracking failed",
    });
  }
};

exports.CreateOrderShipment = catchAsync(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!order) {
    return res.status(404).json({
      status: false,
      message: "Order not found",
    });
  }

  const { shippingAddress, hydrated, addressRecord } = await ensureOrderShippingAddress(order, {
    userId: req.user.id,
  });
  const shipFrom = ensureOrderShipFrom(order);

  if (hydrated) {
    await order.save();
  }

  if (order.shipping_status === "shipment_created" && order.tracking_number) {
    order.labelData = getOrderLabelData({ order, savedAddress: addressRecord });
    await order.save();

    return res.status(200).json({
      status: true,
      message: "Shipment already exists for this order",
      data: buildShipmentResponseData({ order, savedAddress: addressRecord }),
    });
  }

  if (!order.PaymentId) {
    return res.status(400).json({
      status: false,
      message: "Order payment is not verified yet",
    });
  }

  if (!shippingAddress) {
    return res.status(400).json({
      status: false,
      message: "Order shipping address is missing",
    });
  }

  const desiredProvider = req.body?.shipping_provider || req.body?.shippingProvider;

  const created = await createShipmentForOrder({
    order,
    receiverAddress: toCourierAddress(shippingAddress),
    shippingProvider: desiredProvider,
  });

  const shipment = created.shipment;
  order.courier_name = created.provider;

  if (shipment.success) {
    order.tracking_number = created.trackingNumber;
    order.shipping_status = "shipment_created";
    order.shipping_response = shipment.data;
  } else {
    order.shipping_status = "shipment_failed";
    order.shipping_response = shipment.error;
  }

  order.labelData = mergeLabelData(
    buildLabelData({
      order: {
        ...order.toObject(),
        labelData: {
          ...(order.labelData || {}),
          shipFrom,
        },
        shipping_response: order.shipping_response || {},
      },
      savedAddress: addressRecord,
      shipmentResponse: order.shipping_response || {},
    }),
    order.labelData || {}
  );

  await order.save();

  return res.status(200).json({
    status: shipment.success,
    message: shipment.success
      ? "Shipment created successfully"
      : "Shipment creation failed",
    data: buildShipmentResponseData({ order, savedAddress: addressRecord }),
    shipment,
  });
});

exports.GetOrderShipment = catchAsync(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!order) {
    return res.status(404).json({
      status: false,
      message: "Order not found",
    });
  }

  ensureOrderShipFrom(order);
  order.labelData = getOrderLabelData({ order });
  await order.save();

  return res.status(200).json({
    status: true,
    message: "Shipment details fetched successfully",
    data: buildShipmentResponseData({ order }),
  });
});

exports.TrackOrderShipment = catchAsync(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user.id,
  }).lean();

  if (!order) {
    return res.status(404).json({
      status: false,
      message: "Order not found",
    });
  }

  if (!order.tracking_number) {
    return res.status(404).json({
      status: false,
      message: "Shipment has not been created for this order yet",
    });
  }

  const courier = normalizeCourier(order.courier_name);
  const tracking =
    courier === "BLUE_DART"
      ? await trackBlueDartShipment(order.tracking_number)
      : await trackDhlShipment(order.tracking_number);

  if (!tracking.success) {
    return res.status(502).json({
      status: false,
      message: "Tracking failed",
      error: tracking.error,
    });
  }

  return res.status(200).json({
    status: true,
    message: "Order tracking fetched successfully",
    data:
      courier === "BLUE_DART"
        ? formatBlueDartTrackingPayload(order.tracking_number, tracking.data)
        : formatTrackingPayload(order.tracking_number, tracking.data),
  });
});
