const Order = require("../Model/Order");
const catchAsync = require("../Utill/catchAsync");
const { trackDhlShipment, createDhlShipment } = require("../Utill/createDhlShipment");
const {
  cancelBlueDartPickup,
  trackBlueDartShipment,
  createBlueDartWaybill,
  getBlueDartServicesForPincode,
  getBlueDartTransitTime,
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

const findNestedValueByKeys = (input, candidateKeys = []) => {
  const queue = [input];
  const normalizedKeys = candidateKeys.map((key) => String(key).toLowerCase());

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || typeof current !== "object") {
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      if (normalizedKeys.includes(String(key).toLowerCase()) && value !== undefined && value !== null && `${value}`.trim() !== "") {
        return value;
      }

      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return null;
};

const parseBlueDartDateLiteral = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const normalized = toSafeString(value);
  const match = normalized.match(/\/Date\((\d+)\)\//);

  if (match) {
    const parsed = new Date(Number(match[1]));
    return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString();
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString();
};

const buildTimelineEvent = ({
  timestamp,
  status,
  location = "",
  remarks = "",
  source = "system",
}) => ({
  timestamp: toSafeString(timestamp || new Date().toISOString()),
  status: toSafeString(status),
  location: toSafeString(location),
  remarks: toSafeString(remarks),
  source: toSafeString(source),
});

const mergeTimelineEvents = (events = []) => {
  const unique = new Map();

  for (const event of events) {
    const normalizedEvent = buildTimelineEvent(event || {});
    const key = JSON.stringify(normalizedEvent);
    unique.set(key, normalizedEvent);
  }

  return Array.from(unique.values()).sort((left, right) =>
    toSafeString(right.timestamp).localeCompare(toSafeString(left.timestamp))
  );
};

const extractTransitEstimate = (payload = {}) => {
  const estimatedDelivery = toSafeString(
    findNestedValueByKeys(payload, [
      "ExpectedDateDelivery",
      "expectedDateDelivery",
      "ExpectedDeliveryDate",
      "expectedDeliveryDate",
      "DeliveryDate",
      "deliveryDate",
      "estimatedDate",
      "EstimatedDate",
      "EDD",
      "edd",
      "PDeliveryDate",
      "pDeliveryDate",
    ])
  );
  const expectedPod = toSafeString(
    findNestedValueByKeys(payload, [
      "ExpectedDatePOD",
      "expectedDatePod",
      "PODDate",
      "podDate",
    ])
  );

  return {
    estimatedDelivery: estimatedDelivery || null,
    estimatedDeliveryDate:
      estimatedDelivery || parseBlueDartDateLiteral(expectedPod) || null,
    expectedPod: expectedPod || null,
    expectedPodDate: expectedPod || null,
    deliveryDays: findNestedValueByKeys(payload, [
      "TransitDays",
      "transitDays",
      "NoofDays",
      "noofDays",
      "Days",
      "days",
      "AdditionalDays",
      "additionalDays",
      "GroundAdditionalDays",
      "groundAdditionalDays",
      "ApexAdditionalDays",
      "apexAdditionalDays",
    ]),
    additionalDays:
      Number(
        findNestedValueByKeys(payload, [
          "AdditionalDays",
          "additionalDays",
        ])
      ) || 0,
    apexAdditionalDays:
      Number(
        findNestedValueByKeys(payload, [
          "ApexAdditionalDays",
          "apexAdditionalDays",
        ])
      ) || 0,
    groundAdditionalDays:
      Number(
        findNestedValueByKeys(payload, [
          "GroundAdditionalDays",
          "groundAdditionalDays",
        ])
      ) || 0,
    cutoffTime: findNestedValueByKeys(payload, [
      "PickupCutOffTime",
      "pickupCutOffTime",
      "CutOffTime",
      "cutOffTime",
    ]),
    area: toSafeString(
      findNestedValueByKeys(payload, [
        "Area",
        "area",
      ])
    ),
    originCity: toSafeString(
      findNestedValueByKeys(payload, [
        "CityDesc_Origin",
        "cityDescOrigin",
      ])
    ),
    destinationCity: toSafeString(
      findNestedValueByKeys(payload, [
        "CityDesc_Destination",
        "cityDescDestination",
      ])
    ),
    serviceCenter: toSafeString(
      findNestedValueByKeys(payload, [
        "ServiceCenter",
        "serviceCenter",
      ])
    ),
    isValid: !Boolean(
      findNestedValueByKeys(payload, [
        "IsError",
        "isError",
      ])
    ),
    edlMessage: toSafeString(
      findNestedValueByKeys(payload, [
        "EDLMessage",
        "edlMessage",
      ])
    ),
    isError: Boolean(
      findNestedValueByKeys(payload, [
        "IsError",
        "isError",
      ])
    ),
    message: toSafeString(
      findNestedValueByKeys(payload, [
        "ErrorMessage",
        "errorMessage",
      ])
    ),
    errorMessage: toSafeString(
      findNestedValueByKeys(payload, [
        "ErrorMessage",
        "errorMessage",
      ])
    ),
    raw: payload,
  };
};

const extractServiceability = (payload = {}) => ({
  isServiceable: Boolean(
    findNestedValueByKeys(payload, [
      "IsPincodeServiceable",
      "isPincodeServiceable",
      "serviceable",
      "Serviceable",
      "IsServiceable",
      "isServiceable",
    ])
  ),
  serviceCenter: toSafeString(
    findNestedValueByKeys(payload, [
      "ServiceCenter",
      "serviceCenter",
      "BranchName",
      "branchName",
    ])
  ),
  area: toSafeString(
    findNestedValueByKeys(payload, [
      "Area",
      "area",
      "AreaName",
      "areaName",
      "CityName",
      "cityName",
    ])
  ),
  raw: payload,
});

const buildShipmentManagement = (order = {}) => ({
  canTrack: Boolean(order?.tracking_number),
  canReprintLabel: Boolean(order?.labelData),
  canCancelShipment:
    normalizeCourier(order?.courier_name) === "BLUE_DART" &&
    ["shipment_created", "dispatched", "in_transit"].includes(
      toSafeString(order?.shipping_status)
    ),
  canMarkDispatched: ["shipment_created", "pending", "confirmed"].includes(
    toSafeString(order?.shipping_status)
  ),
  canUpdateDeliveryStatus: Boolean(order?._id),
});

const normalizePickupTimeForTransit = (value) => {
  const normalized = toSafeString(value).replace(/\./g, ":");
  if (/^\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  const compact = normalized.match(/^(\d{2})(\d{2})$/);
  if (compact) {
    return `${compact[1]}:${compact[2]}`;
  }

  return "08:00";
};

const CUTOFF_HOUR = 16;
const CUTOFF_MINUTE = 0;

const resolveTransitPickupDateTime = (baseDateOrOrder, { preferOrderDates = true } = {}) => {
  let baseDate = null;

  if (baseDateOrOrder instanceof Date && !Number.isNaN(baseDateOrOrder.getTime())) {
    baseDate = baseDateOrOrder;
  } else if (typeof baseDateOrOrder === "string") {
    const parsed = new Date(baseDateOrOrder);
    baseDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  } else if (baseDateOrOrder && typeof baseDateOrOrder === "object") {
    const order = baseDateOrOrder;
    if (preferOrderDates) {
      const candidates = [
        order?.shipping_meta?.pickupRegistrationDate,
        order?.labelData?.bookingDate,
        order?.createdAt,
      ];
      for (const candidate of candidates) {
        if (!candidate) continue;
        const parsed = candidate instanceof Date
          ? candidate
          : new Date(candidate);
        if (!Number.isNaN(parsed.getTime())) {
          baseDate = parsed;
          break;
        }
      }
    }
    if (!baseDate) baseDate = new Date();
  } else {
    baseDate = new Date();
  }

  const pickupHour = baseDate.getHours();
  const pickupMinute = baseDate.getMinutes();
  const isAfterCutoff =
    pickupHour > CUTOFF_HOUR ||
    (pickupHour === CUTOFF_HOUR && pickupMinute >= CUTOFF_MINUTE);

  const pickupDateObj = new Date(baseDate);
  if (isAfterCutoff) {
    pickupDateObj.setDate(pickupDateObj.getDate() + 1);
    pickupDateObj.setHours(9, 0, 0, 0);
  }

  const pickupTime = `${String(pickupHour).padStart(2, "0")}:${String(pickupMinute).padStart(2, "0")}`;

  return {
    pickupDate: `/Date(${pickupDateObj.getTime()})/`,
    pickupTime: normalizePickupTimeForTransit(pickupTime),
    isAfterCutoff,
    baseDateIso: baseDate.toISOString(),
    resolvedPickupDateIso: pickupDateObj.toISOString(),
  };
};

const toBlueDartDateLiteralString = (value) => {
  const normalized = toSafeString(value);
  if (/^\/Date\(\d+\)\/$/.test(normalized)) {
    return normalized;
  }

  const parsed = normalized ? new Date(normalized) : new Date();
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return `/Date(${safeDate.getTime()})/`;
};

const resolveBlueDartTransitContext = (order = {}) => {
  const labelData = order?.labelData || {};
  const requestPayload = order?.shipping_meta?.requestPayload || {};
  const requestServices = requestPayload?.Request?.Services || requestPayload?.request?.Services || {};
  const requestShipper = requestPayload?.Request?.Shipper || requestPayload?.request?.Shipper || {};
  const requestConsignee =
    requestPayload?.Request?.Consignee || requestPayload?.request?.Consignee || {};
  const isCod = toSafeString(order?.paymentMethod).toUpperCase() === "COD";

  const fallbackSubProductCode = isCod
    ? process.env.BLUE_DART_COD_SUB_PRODUCT_CODE || "C"
    : process.env.BLUE_DART_SUB_PRODUCT_CODE || "P";

  return {
    fromPincode: toSafeString(
      labelData?.shipFrom?.pincode ||
      requestShipper?.CustomerPincode ||
      requestPayload?.shipFrom?.pincode ||
      process.env.BLUE_DART_SHIPPER_PINCODE
    ),
    toPincode: toSafeString(
      labelData?.shipTo?.pincode ||
      order?.shippingAddress?.pincode ||
      requestConsignee?.ConsigneePincode ||
      requestPayload?.shipTo?.pincode
    ),
    productCode: toSafeString(
      labelData?.carrier?.blueDart?.productCode ||
      requestServices?.ProductCode ||
      process.env.BLUE_DART_PRODUCT_CODE ||
      "A"
    ),
    subProductCode: toSafeString(
      labelData?.carrier?.blueDart?.subProductCode ||
      requestServices?.SubProductCode ||
      fallbackSubProductCode
    ),
    pickupDate: toBlueDartDateLiteralString(
      requestServices?.PickupDate ||
      order?.shipping_meta?.pickupRegistrationDate ||
      labelData?.bookingDate ||
      order?.createdAt
    ),
    pickupTime: normalizePickupTimeForTransit(
      labelData?.carrier?.blueDart?.pickupTime ||
      requestServices?.PickupTime ||
      process.env.BLUE_DART_PICKUP_TIME ||
      "08:00"
    ),
  };
};

const buildPendingTransitTimelineEvents = (order, transitEstimate = null) => {
  if (!transitEstimate || order?.tracking_number) {
    return [];
  }

  return [
    buildTimelineEvent({
      timestamp:
        parseBlueDartDateLiteral(order?.shipping_meta?.pickupRegistrationDate) ||
        toSafeString(order?.createdAt) ||
        new Date().toISOString(),
      status: "Pickup pending",
      location:
        transitEstimate.destinationCity ||
        order?.labelData?.shipTo?.city ||
        order?.shippingAddress?.city ||
        "",
      remarks: transitEstimate.estimatedDelivery
        ? `Tracking is not live yet. Estimated delivery ${transitEstimate.estimatedDelivery}`
        : "Tracking is not live yet. Pickup scan pending.",
      source: "transit_estimate",
    }),
  ];
};

const syncOrderShipmentState = async (order) => {
  const courier = normalizeCourier(order?.courier_name);
  let tracking = null;
  let trackingError = null;

  if (order?.tracking_number) {
    const trackingResult =
      courier === "BLUE_DART"
        ? await trackBlueDartShipment(order.tracking_number)
        : await trackDhlShipment(order.tracking_number);

    if (trackingResult.success) {
      tracking =
        courier === "BLUE_DART"
          ? formatBlueDartTrackingPayload(order.tracking_number, trackingResult.data)
          : formatTrackingPayload(order.tracking_number, trackingResult.data);
    } else {
      trackingError = trackingResult.error;
    }
  }

  let transitEstimate = null;
  let serviceability = null;
  let transitError = null;
  let transitRequestPayload = null;
  let transitResponsePayload = null;
  let trackingPending = false;

  if (courier === "BLUE_DART") {
    const transitContext = resolveBlueDartTransitContext(order);

    if (transitContext.fromPincode && transitContext.toPincode) {
      const transitResult = await getBlueDartTransitTime({
        fromPincode: transitContext.fromPincode,
        toPincode: transitContext.toPincode,
        pickupTime: transitContext.pickupTime,
        pickupDate: transitContext.pickupDate,
        productCode: transitContext.productCode,
        subProductCode: transitContext.subProductCode,
      });

      if (transitResult.success) {
        transitEstimate = extractTransitEstimate(transitResult.data);
        transitRequestPayload = transitResult.requestPayload;
        transitResponsePayload = transitResult.data;
      } else {
        transitError = transitResult.error;
      }

      const serviceabilityResult = await getBlueDartServicesForPincode({
        pinCode: transitContext.toPincode,
      });

      if (serviceabilityResult.success) {
        serviceability = extractServiceability(serviceabilityResult.data);
      }
    }
  }

  trackingPending = Boolean(courier === "BLUE_DART" && !tracking && transitEstimate);

  return {
    tracking,
    trackingError,
    transitEstimate,
    serviceability,
    transitError,
    transitRequestPayload,
    transitResponsePayload,
    trackingPending,
  };
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
  const isCod = toSafeString(order?.paymentMethod).toUpperCase() === "COD";
  const collectableAmount = order?.amount;
  const productCode = order?.shipping_meta?.productCode || order?.labelData?.carrier?.blueDart?.productCode;
  const subProductCode = order?.shipping_meta?.subProductCode || order?.labelData?.carrier?.blueDart?.subProductCode;

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
      isCod,
      collectableAmount,
      productCode,
      subProductCode,
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
  const isCod = toSafeString(order?.paymentMethod).toUpperCase() === "COD";
  const fallbackSubProductCode = isCod
    ? process.env.BLUE_DART_COD_SUB_PRODUCT_CODE || "C"
    : process.env.BLUE_DART_SUB_PRODUCT_CODE || "P";
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
        fallbackSubProductCode
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

const buildShipmentResponseData = ({
  order,
  savedAddress,
  liveTracking = null,
  trackingError = null,
  transitEstimate = null,
  serviceability = null,
  trackingPending = false,
}) => {
  const labelData = getOrderLabelData({ order, savedAddress });
  const resolvedLiveTracking = liveTracking || order?.shipping_meta?.liveTracking || null;
  const resolvedTrackingError = trackingError || order?.shipping_meta?.trackingError || null;
  const resolvedTransitEstimate =
    transitEstimate || order?.shipping_meta?.transitEstimate || null;
  const resolvedServiceability =
    serviceability || order?.shipping_meta?.serviceability || null;
  const resolvedTrackingPending =
    typeof trackingPending === "boolean"
      ? trackingPending
      : Boolean(order?.shipping_meta?.trackingPending);

  return {
    orderId: order._id,
    orderNumber: order.orderId,
    addressId: order.addressId || null,
    address: toSafeString(order.address),
    shippingAddress: resolveOrderShippingAddressSnapshot(order, savedAddress),
    paymentId: order.PaymentId || "",
    shippingStatus: toSafeString(order.shipping_status),
    courierName: toSafeString(order.courier_name),
    trackingNumber: toSafeString(order.tracking_number),
    labelData,
    labelReprint: {
      available: Boolean(labelData),
      labelData,
    },
    liveTracking: resolvedLiveTracking,
    trackingError: resolvedTrackingError,
    trackingPending: Boolean(
      resolvedTrackingPending || (!resolvedLiveTracking && resolvedTransitEstimate)
    ),
    estimatedDelivery:
      resolvedTransitEstimate?.estimatedDelivery ||
      resolvedTransitEstimate?.estimatedDeliveryDate ||
      order?.shipping_meta?.estimatedDelivery ||
      null,
    transitEstimate: resolvedTransitEstimate,
    serviceability: resolvedServiceability,
    shippingMeta: order.shipping_meta || {},
    shippingTimeline: Array.isArray(order.shipping_timeline)
      ? order.shipping_timeline
      : [],
    shipmentManagement: buildShipmentManagement(order),
    shipmentResponse: order.shipping_response || {},
  };
};

const appendOrderTimelineEvents = (order, events = []) => {
  order.shipping_timeline = mergeTimelineEvents([
    ...(Array.isArray(order.shipping_timeline) ? order.shipping_timeline : []),
    ...events,
  ]);
};

const buildTrackingTimelineEvents = (tracking = null, source = "courier") =>
  Array.isArray(tracking?.events)
    ? tracking.events.map((event) =>
      buildTimelineEvent({
        ...event,
        source,
      })
    )
    : [];

const persistShipmentMeta = ({
  order,
  shipment,
  tracking = null,
  trackingError = null,
  transitEstimate = null,
  serviceability = null,
  trackingPending = false,
  transitRequestPayload = null,
  transitResponsePayload = null,
  transitError = null,
  provider = null,
}) => {
  order.shipping_meta = {
    ...(order.shipping_meta || {}),
    ...(provider ? { provider } : {}),
    ...(shipment?.tokenNumber ? { tokenNumber: shipment.tokenNumber } : {}),
    ...(shipment?.pickupRegistrationDate
      ? { pickupRegistrationDate: shipment.pickupRegistrationDate }
      : {}),
    ...(shipment?.requestPayload ? { requestPayload: shipment.requestPayload } : {}),
    ...(tracking ? { liveTracking: tracking } : {}),
    trackingError: trackingError || null,
    ...(transitEstimate
      ? {
        estimatedDelivery:
          transitEstimate.estimatedDelivery || transitEstimate.estimatedDeliveryDate || null,
        transitEstimate,
      }
      : {}),
    ...(serviceability ? { serviceability } : {}),
    ...(transitRequestPayload ? { transitRequestPayload } : {}),
    ...(transitResponsePayload ? { transitResponsePayload } : {}),
    transitError: transitError || null,
    trackingPending: Boolean(trackingPending),
    lastSyncedAt: new Date().toISOString(),
  };
};

const updateOrderShippingStatusFromTracking = (order, tracking = null) => {
  const status = toSafeString(tracking?.status).toLowerCase();

  if (!status) {
    return;
  }

  if (status.includes("delivered")) {
    order.shipping_status = "delivered";
    order.status = "delivered";
    order.delivered_at = order.delivered_at || new Date();
    return;
  }

  if (status.includes("out for delivery")) {
    order.shipping_status = "out_for_delivery";
    order.status = order.status === "delivered" ? "delivered" : "shipped";
    return;
  }

  if (
    status.includes("in transit") ||
    status.includes("manifested") ||
    status.includes("dispatched")
  ) {
    order.shipping_status = "in_transit";
    order.status = order.status === "delivered" ? "delivered" : "shipped";
  }
};

const getPickupCancellationPayload = (order) => ({
  tokenNumber:
    order?.shipping_meta?.tokenNumber ||
    order?.shipping_response?.GenerateWayBillResult?.TokenNumber ||
    null,
  pickupRegistrationDate:
    order?.shipping_meta?.pickupRegistrationDate ||
    order?.shipping_meta?.requestPayload?.Request?.Services?.PickupDate ||
    null,
});

const hydrateOrderShipmentDetails = async (
  order,
  { userId, persist = true, syncCourier = true, applyTrackingStatus = true } = {}
) => {
  const { addressRecord } = await ensureOrderShippingAddress(order, {
    userId,
  });

  ensureOrderShipFrom(order);
  order.labelData = getOrderLabelData({ order, savedAddress: addressRecord });

  let liveTracking = null;
  let trackingError = null;
  let transitEstimate = null;
  let serviceability = null;
  let trackingPending = false;

  if (syncCourier && (order.tracking_number || normalizeCourier(order.courier_name) === "BLUE_DART")) {
    const synced = await syncOrderShipmentState(order);
    liveTracking = synced.tracking;
    trackingError = synced.trackingError;
    transitEstimate = synced.transitEstimate;
    serviceability = synced.serviceability;
    trackingPending = synced.trackingPending;

    persistShipmentMeta({
      order,
      tracking: liveTracking,
      trackingError,
      transitEstimate,
      serviceability,
      trackingPending,
      transitRequestPayload: synced.transitRequestPayload,
      transitResponsePayload: synced.transitResponsePayload,
      transitError: synced.transitError,
      provider: normalizeCourier(order.courier_name),
    });
    appendOrderTimelineEvents(order, buildTrackingTimelineEvents(liveTracking));
    appendOrderTimelineEvents(order, buildPendingTransitTimelineEvents(order, transitEstimate));
    if (applyTrackingStatus) {
      updateOrderShippingStatusFromTracking(order, liveTracking);
    }
  }

  if (persist && typeof order.save === "function") {
    await order.save();
  }

  return {
    addressRecord,
    liveTracking,
    trackingError,
    transitEstimate,
    serviceability,
    trackingPending,
  };
};

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
    appendOrderTimelineEvents(order, [
      buildTimelineEvent({
        status: "Shipment created",
        location: shipFrom.city,
        remarks: `Shipment created with ${created.provider}`,
        source: "system",
      }),
    ]);
  } else {
    order.shipping_status = "shipment_failed";
    order.shipping_response = shipment.error;
    appendOrderTimelineEvents(order, [
      buildTimelineEvent({
        status: "Shipment failed",
        location: shipFrom.city,
        remarks: toSafeString(shipment?.error?.title || shipment?.error?.message || shipment?.error),
        source: "system",
      }),
    ]);
  }

  persistShipmentMeta({
    order,
    shipment,
    provider: created.provider,
  });

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

  const synced = shipment.success
    ? await hydrateOrderShipmentDetails(order, {
      userId: req.user.id,
      persist: false,
    })
    : {
      addressRecord,
      liveTracking: null,
      trackingError: null,
      transitEstimate: null,
      serviceability: null,
      trackingPending: false,
    };

  await order.save();

  return res.status(200).json({
    status: shipment.success,
    message: shipment.success
      ? "Shipment created successfully"
      : "Shipment creation failed",
    data: buildShipmentResponseData({
      order,
      savedAddress: synced.addressRecord || addressRecord,
      liveTracking: synced.liveTracking,
      trackingError: synced.trackingError,
      transitEstimate: synced.transitEstimate,
      serviceability: synced.serviceability,
      trackingPending: synced.trackingPending,
    }),
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

  const synced = await hydrateOrderShipmentDetails(order, {
    userId: req.user.id,
  });

  return res.status(200).json({
    status: true,
    message: "Shipment details fetched successfully",
    data: buildShipmentResponseData({
      order,
      savedAddress: synced.addressRecord,
      liveTracking: synced.liveTracking,
      trackingError: synced.trackingError,
      transitEstimate: synced.transitEstimate,
      serviceability: synced.serviceability,
      trackingPending: synced.trackingPending,
    }),
  });
});

exports.TrackOrderShipment = catchAsync(async (req, res) => {
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

  if (!order.tracking_number && normalizeCourier(order.courier_name) !== "BLUE_DART") {
    return res.status(404).json({
      status: false,
      message: "Shipment has not been created for this order yet",
    });
  }

  const synced = await hydrateOrderShipmentDetails(order, {
    userId: req.user.id,
  });

  return res.status(200).json({
    status: true,
    message: synced.liveTracking
      ? "Order tracking fetched successfully"
      : "Tracking is not live yet, estimated delivery returned",
    data: {
      ...(synced.liveTracking || {}),
      trackingPending: Boolean(synced.trackingPending),
      trackingError: synced.trackingError,
      estimatedDelivery:
        synced.transitEstimate?.estimatedDelivery ||
        synced.transitEstimate?.estimatedDeliveryDate ||
        null,
      transitEstimate: synced.transitEstimate,
      serviceability: synced.serviceability,
      shippingTimeline: order.shipping_timeline || [],
    },
  });
});

exports.RefreshOrderShipment = catchAsync(async (req, res) => {
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

  const synced = await hydrateOrderShipmentDetails(order, {
    userId: req.user.id,
  });

  return res.status(200).json({
    status: true,
    message: "Shipment status refreshed successfully",
    data: buildShipmentResponseData({
      order,
      savedAddress: synced.addressRecord,
      liveTracking: synced.liveTracking,
      trackingError: synced.trackingError,
      transitEstimate: synced.transitEstimate,
      serviceability: synced.serviceability,
      trackingPending: synced.trackingPending,
    }),
  });
});

exports.CancelOrderShipment = catchAsync(async (req, res) => {
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

  if (normalizeCourier(order.courier_name) !== "BLUE_DART") {
    return res.status(400).json({
      status: false,
      message: "Shipment cancellation is only supported for Blue Dart orders",
    });
  }

  const { tokenNumber, pickupRegistrationDate } = getPickupCancellationPayload(order);

  if (!tokenNumber || !pickupRegistrationDate) {
    return res.status(400).json({
      status: false,
      message: "Pickup token or pickup registration date is missing for this order",
    });
  }

  const cancellation = await cancelBlueDartPickup({
    tokenNumber,
    pickupRegistrationDate,
    remarks: req.body?.remarks || null,
  });

  if (!cancellation.success) {
    return res.status(502).json({
      status: false,
      message: "Shipment cancellation failed",
      error: cancellation.error,
    });
  }

  order.shipping_status = "cancelled";
  order.status = "cancelled";
  order.shipping_meta = {
    ...(order.shipping_meta || {}),
    cancellation: {
      requestPayload: cancellation.requestPayload,
      response: cancellation.data,
      cancelledAt: new Date().toISOString(),
    },
  };
  appendOrderTimelineEvents(order, [
    buildTimelineEvent({
      status: "Shipment cancelled",
      remarks: req.body?.remarks || "Pickup cancelled from backend",
      source: "manual",
    }),
  ]);

  const synced = await hydrateOrderShipmentDetails(order, {
    userId: req.user.id,
    persist: false,
    syncCourier: false,
    applyTrackingStatus: false,
  });
  await order.save();

  return res.status(200).json({
    status: true,
    message: "Shipment cancelled successfully",
    data: buildShipmentResponseData({
      order,
      savedAddress: synced.addressRecord,
      liveTracking: synced.liveTracking,
      trackingError: synced.trackingError,
      transitEstimate: synced.transitEstimate,
      serviceability: synced.serviceability,
      trackingPending: synced.trackingPending,
    }),
    cancellation,
  });
});

exports.MarkOrderDispatched = catchAsync(async (req, res) => {
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

  order.status = "shipped";
  order.shipping_status = "dispatched";
  order.dispatched_at = new Date();
  appendOrderTimelineEvents(order, [
    buildTimelineEvent({
      status: "Dispatched",
      location: req.body?.location || order?.labelData?.shipFrom?.city || "",
      remarks: req.body?.remarks || "Order marked as dispatched",
      source: "manual",
    }),
  ]);

  const synced = await hydrateOrderShipmentDetails(order, {
    userId: req.user.id,
    persist: false,
    syncCourier: false,
    applyTrackingStatus: false,
  });
  await order.save();

  return res.status(200).json({
    status: true,
    message: "Order marked as dispatched successfully",
    data: buildShipmentResponseData({
      order,
      savedAddress: synced.addressRecord,
      liveTracking: synced.liveTracking,
      trackingError: synced.trackingError,
      transitEstimate: synced.transitEstimate,
      serviceability: synced.serviceability,
      trackingPending: synced.trackingPending,
    }),
  });
});

exports.UpdateOrderDeliveryStatus = catchAsync(async (req, res) => {
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

  const status = toSafeString(req.body?.status).toLowerCase();

  if (!status) {
    return res.status(400).json({
      status: false,
      message: "status is required",
    });
  }

  if (status === "delivered") {
    order.status = "delivered";
    order.shipping_status = "delivered";
    order.delivered_at = new Date();
  } else if (status === "out_for_delivery") {
    order.status = "shipped";
    order.shipping_status = "out_for_delivery";
  } else if (status === "in_transit") {
    order.status = "shipped";
    order.shipping_status = "in_transit";
  } else if (status === "cancelled") {
    order.status = "cancelled";
    order.shipping_status = "cancelled";
  } else {
    order.shipping_status = status;
  }

  appendOrderTimelineEvents(order, [
    buildTimelineEvent({
      status: status.replace(/_/g, " "),
      location: req.body?.location || "",
      remarks: req.body?.remarks || "Manual delivery status update",
      source: "manual",
      timestamp: req.body?.timestamp || new Date().toISOString(),
    }),
  ]);

  order.shipping_meta = {
    ...(order.shipping_meta || {}),
    manualDeliveryUpdate: {
      status,
      location: toSafeString(req.body?.location),
      remarks: toSafeString(req.body?.remarks),
      estimatedDeliveryDate: toSafeString(req.body?.estimatedDeliveryDate),
      updatedAt: new Date().toISOString(),
    },
  };

  const synced = await hydrateOrderShipmentDetails(order, {
    userId: req.user.id,
    persist: false,
    syncCourier: false,
    applyTrackingStatus: false,
  });
  await order.save();

  return res.status(200).json({
    status: true,
    message: "Delivery status updated successfully",
    data: buildShipmentResponseData({
      order,
      savedAddress: synced.addressRecord,
      liveTracking: synced.liveTracking,
      trackingError: synced.trackingError,
      transitEstimate: synced.transitEstimate,
      serviceability: synced.serviceability,
      trackingPending: synced.trackingPending,
    }),
  });
});

exports.GetOrderTransitTime = catchAsync(async (req, res) => {
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

  const shipperPincode = toSafeString(
    process.env.DHL_SHIPPER_POSTAL_CODE ||
      process.env.BLUE_DART_SHIPPER_PINCODE ||
      process.env.BLUE_DART_SHIPPER_POSTAL_CODE ||
      ""
  );

  const consigneePincode = toSafeString(
    order?.shippingAddress?.pincode ||
      order?.labelData?.shipTo?.pincode ||
      order?.shipping_meta?.requestPayload?.Request?.Consignee?.ConsigneePincode ||
      ""
  );

  if (!shipperPincode || !consigneePincode) {
    return res.status(400).json({
      status: false,
      message: "Pincode information is incomplete",
      meta: {
        shipperPincode: shipperPincode ? "[OK]" : "[MISSING]",
        consigneePincode: consigneePincode ? "[OK]" : "[MISSING]",
      },
    });
  }

  const { pickupDate, pickupTime, isAfterCutoff, baseDateIso, resolvedPickupDateIso } =
    resolveTransitPickupDateTime(order, { preferOrderDates: true });

  const productCode = toSafeString(
    order?.labelData?.carrier?.blueDart?.productCode ||
      order?.shipping_meta?.requestPayload?.Request?.Services?.ProductCode ||
      process.env.BLUE_DART_PRODUCT_CODE ||
      "A"
  );

  const isCod = toSafeString(order?.paymentMethod).toUpperCase() === "COD";
  const subProductCode = toSafeString(
    order?.labelData?.carrier?.blueDart?.subProductCode ||
      order?.shipping_meta?.requestPayload?.Request?.Services?.SubProductCode ||
      (isCod
        ? process.env.BLUE_DART_COD_SUB_PRODUCT_CODE || "C"
        : process.env.BLUE_DART_SUB_PRODUCT_CODE || "P")
  );

  const transitResult = await getBlueDartTransitTime({
    fromPincode: shipperPincode,
    toPincode: consigneePincode,
    pickupTime,
    pickupDate,
    productCode,
    subProductCode,
  });

  if (!transitResult.success) {
    return res.status(502).json({
      status: false,
      message: "Failed to fetch transit time from Blue Dart",
      error: transitResult.error,
      request: {
        fromPincode: shipperPincode,
        toPincode: consigneePincode,
        pPudate: pickupDate,
        pPickupTime: pickupTime,
        isAfterCutoff,
        baseDateIso,
        resolvedPickupDateIso,
        productCode,
        subProductCode,
      },
    });
  }

  const rawResult = transitResult.data?.GetDomesticTransitTimeForPinCodeandProductResult ||
    transitResult.data?.getDomesticTransitTimeForPinCodeandProductResult ||
    transitResult.data || {};

  const expectedDateDelivery = toSafeString(rawResult.ExpectedDateDelivery);
  const expectedDatePOD = toSafeString(rawResult.ExpectedDatePOD);

  return res.status(200).json({
    status: true,
    message: "Transit time fetched successfully",
    data: {
      orderId: order._id,
      orderNumber: order.orderId,
      expectedDateDelivery,
      expectedDatePOD,
      GetDomesticTransitTimeForPinCodeandProductResult: rawResult,
      transitEstimate: extractTransitEstimate(transitResult.data),
    },
    meta: {
      request: {
        fromPincode: shipperPincode,
        toPincode: consigneePincode,
        pPudate: pickupDate,
        pPickupTime: pickupTime,
        productCode,
        subProductCode,
      },
      cutoff: {
        rule: "Orders at or after 16:00 roll to next business day",
        isAfterCutoff,
        baseDateIso,
        resolvedPickupDateIso,
      },
    },
  });
});

exports.GetPincodeTransitTime = catchAsync(async (req, res) => {
  const toPincode = toSafeString(req.query.toPincode || req.query.to || req.body?.toPincode);
  const fromPincode = toSafeString(
    req.query.fromPincode ||
      req.query.from ||
      req.body?.fromPincode ||
      process.env.DHL_SHIPPER_POSTAL_CODE ||
      process.env.BLUE_DART_SHIPPER_PINCODE ||
      process.env.BLUE_DART_SHIPPER_POSTAL_CODE ||
      ""
  );
  const isCod = toSafeString(req.query.isCod || req.body?.isCod).toUpperCase() === "TRUE";
  const productCode = toSafeString(
    req.query.productCode ||
      req.body?.productCode ||
      process.env.BLUE_DART_PRODUCT_CODE ||
      "A"
  );
  const subProductCode = toSafeString(
    req.query.subProductCode ||
      req.body?.subProductCode ||
      (isCod
        ? process.env.BLUE_DART_COD_SUB_PRODUCT_CODE || "C"
        : process.env.BLUE_DART_SUB_PRODUCT_CODE || "P")
  );

  if (!/^\d{4,10}$/.test(toPincode)) {
    return res.status(400).json({
      status: false,
      message: "Valid toPincode is required (4-10 digits)",
    });
  }
  if (!/^\d{4,10}$/.test(fromPincode)) {
    return res.status(400).json({
      status: false,
      message: "Valid fromPincode is required (4-10 digits)",
    });
  }

  const { pickupDate, pickupTime, isAfterCutoff, baseDateIso, resolvedPickupDateIso } =
    resolveTransitPickupDateTime(new Date(), { preferOrderDates: false });

  const transitResult = await getBlueDartTransitTime({
    fromPincode,
    toPincode,
    pickupTime,
    pickupDate,
    productCode,
    subProductCode,
  });

  if (!transitResult.success) {
    return res.status(502).json({
      status: false,
      message: "Failed to fetch transit time from Blue Dart",
      error: transitResult.error,
      request: {
        fromPincode,
        toPincode,
        pPudate: pickupDate,
        pPickupTime: pickupTime,
        isAfterCutoff,
        baseDateIso,
        resolvedPickupDateIso,
        productCode,
        subProductCode,
      },
    });
  }

  const rawResult = transitResult.data?.GetDomesticTransitTimeForPinCodeandProductResult ||
    transitResult.data?.getDomesticTransitTimeForPinCodeandProductResult ||
    transitResult.data || {};

  return res.status(200).json({
    status: true,
    message: "Transit time fetched successfully",
    data: {
      expectedDateDelivery: toSafeString(rawResult.ExpectedDateDelivery),
      expectedDatePOD: toSafeString(rawResult.ExpectedDatePOD),
      GetDomesticTransitTimeForPinCodeandProductResult: rawResult,
      transitEstimate: extractTransitEstimate(transitResult.data),
    },
    meta: {
      request: {
        fromPincode,
        toPincode,
        pPudate: pickupDate,
        pPickupTime: pickupTime,
        productCode,
        subProductCode,
      },
      cutoff: {
        rule: "Requests at or after 16:00 roll to next business day",
        isAfterCutoff,
        baseDateIso,
        resolvedPickupDateIso,
      },
    },
  });
});
