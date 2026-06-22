const axios = require("axios");

const DEFAULT_BLUE_DART_BASE_URL =
  "https://apigateway-sandbox.bluedart.com/in/transportation";

const buildBlueDartBaseUrl = () =>
  String(process.env.BLUE_DART_API_BASE_URL || DEFAULT_BLUE_DART_BASE_URL).replace(
    /\/+$/,
    ""
  );

const getBlueDartJwtToken = () => {
  const token = process.env.BLUE_DART_JWT_TOKEN;
  if (!token) {
    throw new Error("BLUE_DART_JWT_TOKEN is missing in environment variables");
  }
  return token;
};

const getBlueDartHeaders = () => ({
  JWTToken: getBlueDartJwtToken(),
  "content-type": "application/json",
});

const extractError = (error) => error?.response?.data || error.message;

const coerceNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toBlueDartDateLiteral = (date) => {
  const timestamp = date instanceof Date ? date.getTime() : Date.now();
  return `/Date(${timestamp})/`;
};

const getTotalPieces = (products = []) => {
  if (!Array.isArray(products) || products.length === 0) {
    return 1;
  }

  const count = products.reduce((sum, item) => {
    const quantity = coerceNumber(item?.quantity);
    return sum + (quantity && quantity > 0 ? quantity : 0);
  }, 0);

  return count > 0 ? count : 1;
};

const getApproxWeightKg = (products = []) => {
  const pieceCount = getTotalPieces(products);
  const perPieceKg =
    coerceNumber(process.env.BLUE_DART_DEFAULT_PIECE_WEIGHT_KG) ?? 0.5;
  const total = pieceCount * perPieceKg;
  return Math.max(total, perPieceKg);
};

const buildGenerateWaybillPayload = ({
  orderId,
  name,
  mobile,
  receiverAddress,
  products,
  declaredValue,
  isCod,
  collectableAmount,
  overrides = {},
}) => {
  const consigneePincode =
    receiverAddress?.pincode ||
    receiverAddress?.postalCode ||
    receiverAddress?.zip ||
    "";

  const consigneeAddress1 =
    receiverAddress?.street_address ||
    receiverAddress?.address ||
    receiverAddress?.addressLine1 ||
    "";

  if (!consigneePincode || !consigneeAddress1) {
    throw new Error("Receiver address must include pincode and address line 1");
  }

  const shipperAddress1 =
    process.env.BLUE_DART_SHIPPER_ADDRESS1 || process.env.DHL_SHIPPER_ADDRESS_LINE1 || "";
  const shipperPincode =
    process.env.BLUE_DART_SHIPPER_PINCODE || process.env.DHL_SHIPPER_POSTAL_CODE || "";

  const payload = {
    Request: {
      Consignee: {
        ConsigneeAddress1: consigneeAddress1,
        ConsigneeAddress2: receiverAddress?.addressLine2 || "",
        ConsigneeAddress3: receiverAddress?.addressLine3 || "",
        ConsigneeAddressType: receiverAddress?.addressType || "R",
        ConsigneeAttention: "",
        ConsigneeEmailID: "",
        ConsigneeGSTNumber: "",
        ConsigneeLatitude: "",
        ConsigneeLongitude: "",
        ConsigneeMaskedContactNumber: "",
        ConsigneeMobile: String(mobile || ""),
        ConsigneeName: String(name || ""),
        ConsigneePincode: String(consigneePincode),
        ConsigneeTelephone: "",
      },
      Returnadds: {
        ManifestNumber: "",
        ReturnAddress1:
          process.env.BLUE_DART_RETURN_ADDRESS1 || shipperAddress1 || "",
        ReturnAddress2: process.env.BLUE_DART_RETURN_ADDRESS2 || "",
        ReturnAddress3: process.env.BLUE_DART_RETURN_ADDRESS3 || "",
        ReturnContact:
          process.env.BLUE_DART_RETURN_CONTACT ||
          process.env.DHL_SHIPPER_NAME ||
          "Cadmax",
        ReturnEmailID: process.env.BLUE_DART_RETURN_EMAIL || "",
        ReturnLatitude: "",
        ReturnLongitude: "",
        ReturnMaskedContactNumber: "",
        ReturnMobile:
          process.env.BLUE_DART_RETURN_MOBILE ||
          process.env.DHL_SHIPPER_PHONE ||
          "",
        ReturnPincode: process.env.BLUE_DART_RETURN_PINCODE || shipperPincode || "",
        ReturnTelephone: "",
      },
      Services: {
        AWBNo: "",
        ActualWeight: String(getApproxWeightKg(products).toFixed(2)),
        Commodity: {},
        CreditReferenceNo: String(orderId || ""),
        Dimensions: [],
        ECCN: "",
        PDFOutputNotRequired: true,
        PackType: process.env.BLUE_DART_PACK_TYPE || "L",
        PickupDate: toBlueDartDateLiteral(new Date()),
        PickupTime: process.env.BLUE_DART_PICKUP_TIME || "1600",
        PieceCount: String(getTotalPieces(products)),
        ProductCode: process.env.BLUE_DART_PRODUCT_CODE || "A",
        ProductType: coerceNumber(process.env.BLUE_DART_PRODUCT_TYPE) ?? 1,
        RegisterPickup:
          String(process.env.BLUE_DART_REGISTER_PICKUP || "false").toLowerCase() ===
          "true",
        SpecialInstruction: "",
        SubProductCode:
          process.env.BLUE_DART_SUB_PRODUCT_CODE || (isCod ? "C" : "P"),
        OTPBasedDelivery: coerceNumber(process.env.BLUE_DART_OTP_BASED_DELIVERY) ?? 0,
        OTPCode: "",
        itemdtl: [],
        noOfDCGiven: 0,
        DeclaredValue: coerceNumber(declaredValue) ?? 0,
        CollectableAmount:
          coerceNumber(collectableAmount) ?? (isCod ? coerceNumber(declaredValue) ?? 0 : 0),
      },
      Shipper: {
        CustomerAddress1: shipperAddress1,
        CustomerAddress2: process.env.BLUE_DART_SHIPPER_ADDRESS2 || "",
        CustomerAddress3: process.env.BLUE_DART_SHIPPER_ADDRESS3 || "",
        CustomerCode: process.env.BLUE_DART_CUSTOMER_CODE || "",
        CustomerEmailID: process.env.BLUE_DART_SHIPPER_EMAIL || "",
        CustomerGSTNumber: process.env.BLUE_DART_SHIPPER_GST || "",
        CustomerLatitude: "",
        CustomerLongitude: "",
        CustomerMaskedContactNumber: "",
        CustomerMobile:
          process.env.BLUE_DART_SHIPPER_MOBILE || process.env.DHL_SHIPPER_PHONE || "",
        CustomerName:
          process.env.BLUE_DART_SHIPPER_NAME || process.env.DHL_SHIPPER_NAME || "Cadmax",
        CustomerPincode: shipperPincode,
        CustomerTelephone: process.env.BLUE_DART_SHIPPER_PHONE || "",
        IsToPayCustomer: false,
        OriginArea: process.env.BLUE_DART_ORIGIN_AREA || "",
        Sender: process.env.BLUE_DART_SENDER || "",
        VendorCode: process.env.BLUE_DART_VENDOR_CODE || "",
      },
    },
    Profile: {
      Api_type: process.env.BLUE_DART_API_TYPE || "S",
      LicenceKey: process.env.BLUE_DART_LICENCE_KEY || "",
      LoginID: process.env.BLUE_DART_LOGIN_ID || "",
    },
  };

  return deepMerge(payload, overrides);
};

const deepMerge = (target, source) => {
  if (!source || typeof source !== "object") {
    return target;
  }

  const output = Array.isArray(target) ? [...target] : { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      output[key] = value.slice();
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      output[key] = deepMerge(output[key] && typeof output[key] === "object" ? output[key] : {}, value);
      continue;
    }

    output[key] = value;
  }

  return output;
};

const findFirstValue = (value, candidates) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  for (const key of candidates) {
    const found = value?.[key];
    if (found !== undefined && found !== null && String(found).trim() !== "") {
      return found;
    }
  }

  return null;
};

const extractAwbNumber = (payload) => {
  const direct = findFirstValue(payload, [
    "AWBNo",
    "awb",
    "awbNo",
    "awb_number",
    "waybill",
    "waybillNumber",
    "AwbNumber",
  ]);
  if (direct) {
    return String(direct);
  }

  const nestedCandidates = [
    payload?.GenerateWayBillResult,
    payload?.data,
    payload?.response,
    payload?.Result,
  ];

  for (const candidate of nestedCandidates) {
    const nested = findFirstValue(candidate, [
      "AWBNo",
      "awb",
      "awbNo",
      "awb_number",
      "waybill",
      "waybillNumber",
      "AwbNumber",
    ]);
    if (nested) {
      return String(nested);
    }
  }

  return null;
};

const validateBlueDartCredentials = () => {
  const required = ["BLUE_DART_LOGIN_ID", "BLUE_DART_LICENCE_KEY", "BLUE_DART_CUSTOMER_CODE"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing Blue Dart env vars: ${missing.join(", ")}`);
  }
};

const createBlueDartWaybill = async ({
  orderId,
  name,
  mobile,
  receiverAddress,
  products,
  declaredValue,
  isCod = false,
  collectableAmount,
  overrides,
}) => {
  try {
    validateBlueDartCredentials();

    const payload = buildGenerateWaybillPayload({
      orderId,
      name,
      mobile,
      receiverAddress,
      products,
      declaredValue,
      isCod,
      collectableAmount,
      overrides,
    });

    const response = await axios.post(
      `${buildBlueDartBaseUrl()}/waybill/v1/GenerateWayBill`,
      payload,
      { headers: getBlueDartHeaders() }
    );

    return {
      success: true,
      data: response.data,
      awbNumber: extractAwbNumber(response.data),
    };
  } catch (error) {
    return {
      success: false,
      error: extractError(error),
    };
  }
};

const trackBlueDartShipment = async (trackingNumber, options = {}) => {
  try {
    validateBlueDartCredentials();

    if (!trackingNumber) {
      throw new Error("trackingNumber is required");
    }

    const params = {
      numbers: trackingNumber,
      loginid: process.env.BLUE_DART_LOGIN_ID,
      lickey: process.env.BLUE_DART_LICENCE_KEY,
      scan: options.scan ?? process.env.BLUE_DART_TRACK_SCAN ?? "1",
      action: options.action ?? process.env.BLUE_DART_TRACK_ACTION ?? "custawbquery",
      verno: options.verno ?? process.env.BLUE_DART_TRACK_VERNO ?? "1",
      format: options.format ?? process.env.BLUE_DART_TRACK_FORMAT ?? "json",
      handler: options.handler ?? process.env.BLUE_DART_TRACK_HANDLER ?? "tnt",
      tnt: options.tnt ?? process.env.BLUE_DART_TRACK_TNT ?? "",
      awb: options.awb ?? "",
    };

    const response = await axios.get(
      `${buildBlueDartBaseUrl()}/tracking/v1/shipment`,
      {
        headers: { JWTToken: getBlueDartJwtToken() },
        params,
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: extractError(error),
    };
  }
};

module.exports = {
  createBlueDartWaybill,
  trackBlueDartShipment,
  extractAwbNumber,
};

