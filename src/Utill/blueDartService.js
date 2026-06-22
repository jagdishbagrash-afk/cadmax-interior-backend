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

const getBlueDartLoginId = () =>
  process.env.BLUE_DART_LOGIN_ID ||
  process.env.BLUE_DART_LOGINID ||
  "";

const getBlueDartLicenceKey = () =>
  process.env.BLUE_DART_LICENCE_KEY ||
  process.env.BLUE_DART_LICENSE_KEY ||
  process.env.BLUE_DART_LICENCEKEY ||
  "";

const getBlueDartCustomerCode = () =>
  process.env.BLUE_DART_CUSTOMER_CODE ||
  process.env.BLUE_DART_CUSTOMERCODE ||
  "";

const getBlueDartHeaders = () => ({
  JWTToken: getBlueDartJwtToken(),
  "content-type": "application/json",
});

const extractError = (error) => error?.response?.data || error.message;

const coerceNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toLimitedString = (value, maxLength, fallback = "") => {
  const normalized = String(value ?? fallback)
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, maxLength);
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

const buildDefaultDimensions = (pieceCount) => {
  const length = coerceNumber(process.env.BLUE_DART_DIMENSION_LENGTH) ?? 10;
  const breadth = coerceNumber(process.env.BLUE_DART_DIMENSION_BREADTH) ?? 10;
  const height = coerceNumber(process.env.BLUE_DART_DIMENSION_HEIGHT) ?? 10;

  return [
    {
      Length: length,
      Breadth: breadth,
      Height: height,
      Count: pieceCount,
    },
  ];
};

const buildCommodity = () => ({
  CommodityDetail1: process.env.BLUE_DART_COMMODITY_DETAIL_1 || "",
  CommodityDetail2: process.env.BLUE_DART_COMMODITY_DETAIL_2 || "",
  CommodityDetail3: process.env.BLUE_DART_COMMODITY_DETAIL_3 || "",
});

const toBlueDartItemDetails = (products = []) =>
  (Array.isArray(products) ? products : [])
    .map((item, index) => {
      const quantity = coerceNumber(item?.quantity) ?? 1;
      const itemValue =
        coerceNumber(item?.total) ??
        (coerceNumber(item?.price) ?? 0) * quantity;
      const itemLabel = toLimitedString(
        item?.title || item?.name || `Item ${index + 1}`,
        50,
        `Item ${index + 1}`
      );

      return {
        CGSTAmount: 0,
        HSCode: "",
        IGSTAmount: 0,
        IGSTRate: 0,
        Instruction: "",
        InvoiceDate: toBlueDartDateLiteral(new Date()),
        InvoiceNumber: "",
        ItemID: toLimitedString(
          item?.sku || item?.id || item?._id || `ITEM-${index + 1}`,
          15,
          `ITEM-${index + 1}`
        ),
        ItemName: itemLabel,
        ItemValue: itemValue,
        Itemquantity: quantity,
        PlaceofSupply: process.env.BLUE_DART_PLACE_OF_SUPPLY || "",
        ProductDesc1: itemLabel,
        ProductDesc2: toLimitedString(item?.variant || item?.name || "", 50, ""),
        ReturnReason: "",
        SGSTAmount: 0,
        SKUNumber: toLimitedString(item?.sku || "", 50, ""),
        SellerGSTNNumber: process.env.BLUE_DART_SELLER_GSTN || "",
        SellerName: process.env.BLUE_DART_SELLER_NAME || "",
        TaxableAmount: 0,
        TotalValue: itemValue,
        cessAmount: "0.0",
        countryOfOrigin: process.env.BLUE_DART_COUNTRY_OF_ORIGIN || "IN",
        docType: process.env.BLUE_DART_DOC_TYPE || "INV",
        subSupplyType: coerceNumber(process.env.BLUE_DART_SUB_SUPPLY_TYPE) ?? 1,
        supplyType: process.env.BLUE_DART_SUPPLY_TYPE || "0",
      };
    })
    .slice(0, 50);

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
  const pieceCount = getTotalPieces(products);
  const itemDetails = toBlueDartItemDetails(products);
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
  const shipperMobile =
    process.env.BLUE_DART_SHIPPER_MOBILE || process.env.DHL_SHIPPER_PHONE || "";
  const shipperName =
    process.env.BLUE_DART_SHIPPER_NAME || process.env.DHL_SHIPPER_NAME || "Cadmax";

  const payload = {
    Request: {
      Consignee: {
        AvailableDays: "",
        AvailableTiming: "",
        ConsigneeAddress1: consigneeAddress1,
        ConsigneeAddress2: receiverAddress?.addressLine2 || "",
        ConsigneeAddress3: receiverAddress?.addressLine3 || "",
        ConsigneeAddressType: receiverAddress?.addressType || "R",
        ConsigneeAddressinfo: "",
        ConsigneeAttention: "",
        ConsigneeEmailID: "",
        ConsigneeFullAddress: "",
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
        CollectableAmount:
          coerceNumber(collectableAmount) ?? (isCod ? coerceNumber(declaredValue) ?? 0 : 0),
        Commodity: buildCommodity(),
        CreditReferenceNo: toLimitedString(orderId || "", 20, ""),
        CreditReferenceNo2: "",
        CreditReferenceNo3: "",
        CurrencyCode: "",
        DeclaredValue: coerceNumber(declaredValue) ?? 0,
        DeliveryTimeSlot: "",
        Dimensions: buildDefaultDimensions(pieceCount),
        FavouringName: "",
        ForwardAWBNo: "",
        ForwardLogisticCompName: "",
        InsurancePaidBy: "",
        InvoiceNo: "",
        IsChequeDD: "",
        IsDedicatedDeliveryNetwork: false,
        IsForcePickup: false,
        IsPartialPickup: false,
        IsReversePickup: false,
        ItemCount: itemDetails.length || pieceCount,
        OTPBasedDelivery: String(coerceNumber(process.env.BLUE_DART_OTP_BASED_DELIVERY) ?? 0),
        OTPCode: "",
        Officecutofftime: "",
        PDFOutputNotRequired: true,
        PackType: process.env.BLUE_DART_PACK_TYPE || "L",
        ParcelShopCode: "",
        PayableAt: "",
        PickupDate: toBlueDartDateLiteral(new Date()),
        PickupMode: "",
        PickupTime: process.env.BLUE_DART_PICKUP_TIME || "0800",
        PickupType: "",
        PieceCount: String(pieceCount),
        PreferredPickupTimeSlot: "",
        ProductCode: process.env.BLUE_DART_PRODUCT_CODE || "A",
        ProductFeature: "",
        ProductType: coerceNumber(process.env.BLUE_DART_PRODUCT_TYPE) ?? 1,
        RegisterPickup:
          String(process.env.BLUE_DART_REGISTER_PICKUP || "true").toLowerCase() ===
          "true",
        SpecialInstruction: "",
        SubProductCode:
          process.env.BLUE_DART_SUB_PRODUCT_CODE || (isCod ? "C" : "P"),
        TotalCashPaytoCustomer: 0,
        itemdtl: itemDetails,
        noOfDCGiven: 0,
        ECCN: "",
      },
      Shipper: {
        CustomerAddress1: shipperAddress1,
        CustomerAddress2: process.env.BLUE_DART_SHIPPER_ADDRESS2 || "",
        CustomerAddress3: process.env.BLUE_DART_SHIPPER_ADDRESS3 || "",
        CustomerAddressinfo: "",
        CustomerCode: getBlueDartCustomerCode(),
        CustomerEmailID: process.env.BLUE_DART_SHIPPER_EMAIL || "",
        CustomerGSTNumber: process.env.BLUE_DART_SHIPPER_GST || "",
        CustomerLatitude: "",
        CustomerLongitude: "",
        CustomerMaskedContactNumber: "",
        CustomerMobile: shipperMobile,
        CustomerName: shipperName,
        CustomerPincode: shipperPincode,
        CustomerTelephone:
          process.env.BLUE_DART_SHIPPER_TELEPHONE || process.env.BLUE_DART_SHIPPER_PHONE || "",
        IsToPayCustomer: false,
        OriginArea: process.env.BLUE_DART_ORIGIN_AREA || "",
        Sender: process.env.BLUE_DART_SENDER || "",
        VendorCode: process.env.BLUE_DART_VENDOR_CODE || "",
      },
    },
    Profile: {
      Api_type: process.env.BLUE_DART_API_TYPE || "S",
      LicenceKey: getBlueDartLicenceKey(),
      LoginID: getBlueDartLoginId(),
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

const extractGenerateWayBillResult = (payload) =>
  payload?.GenerateWayBillResult || payload?.generateWayBillResult || null;

const extractBlueDartStatus = (payload) => {
  const result = extractGenerateWayBillResult(payload);
  const statusList = Array.isArray(result?.Status) ? result.Status : [];
  const validStatus =
    statusList.find((item) => item?.StatusCode === "Valid") || statusList[0] || null;

  return {
    statusCode: validStatus?.StatusCode || null,
    statusInformation: validStatus?.StatusInformation || null,
    tokenNumber: result?.TokenNumber || null,
    creditReference: result?.CCRCRDREF || null,
  };
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
      ...extractBlueDartStatus(response.data),
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
    if (!trackingNumber) {
      throw new Error("trackingNumber is required");
    }

    const params = {
      numbers: trackingNumber,
      loginid: getBlueDartLoginId(),
      lickey: getBlueDartLicenceKey(),
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
