const axios = require("axios");

const DEFAULT_BLUE_DART_BASE_URL =
  "https://apigateway-sandbox.bluedart.com/in/transportation";

let blueDartTokenCache = {
  value: null,
  expiresAt: 0,
  source: null,
};

const buildBlueDartBaseUrl = () =>
  String(process.env.BLUE_DART_API_BASE_URL || DEFAULT_BLUE_DART_BASE_URL).replace(
    /\/+$/,
    ""
  );

const getBlueDartLoginId = () =>
  process.env.BLUE_DART_LOGIN_ID ||
  process.env.BLUE_DART_LOGINID ||
  "";

const getBlueDartLicenceKey = () =>
  process.env.BLUE_DART_LICENCE_KEY ||
  process.env.BLUE_DART_LICENSE_KEY ||
  process.env.BLUE_DART_LICENCEKEY ||
  "";

const getBlueDartShippingLicenceKey = () =>
  process.env.BLUE_DART_SHIPPING_LICENCE_KEY ||
  process.env.BLUE_DART_SHIPPING_LICENSE_KEY ||
  process.env.BLUE_DART_SHIPPING_LICENCEKEY ||
  getBlueDartLicenceKey();

const getBlueDartTrackingLicenceKey = () =>
  process.env.BLUE_DART_TRACKING_LICENCE_KEY ||
  process.env.BLUE_DART_TRACKING_LICENSE_KEY ||
  process.env.BLUE_DART_TRACKING_LICENCEKEY ||
  getBlueDartLicenceKey();

const getBlueDartTrackingApiType = () =>
  process.env.BLUE_DART_TRACKING_API_TYPE ||
  process.env.BLUE_DART_TRANSIT_API_TYPE ||
  "T";

const getBlueDartShippingApiType = () =>
  process.env.BLUE_DART_SHIPPING_API_TYPE ||
  process.env.BLUE_DART_API_TYPE ||
  "S";

const getBlueDartClientId = () => process.env.BLUE_DART_CLIENT_ID || "";

const getBlueDartClientSecret = () => process.env.BLUE_DART_CLIENT_SECRET || "";

const getBlueDartTokenUrl = () => process.env.BLUE_DART_TOKEN_URL || "";

const getBlueDartCustomerCode = () =>
  process.env.BLUE_DART_CUSTOMER_CODE ||
  process.env.BLUE_DART_CUSTOMERCODE ||
  "";

const maskValue = (key, value) => {
  const normalizedKey = String(key || "").toLowerCase();
  if (
    normalizedKey.includes("jwt") ||
    normalizedKey.includes("token") ||
    normalizedKey.includes("secret") ||
    normalizedKey.includes("licencekey") ||
    normalizedKey.includes("licensekey") ||
    normalizedKey === "authorization"
  ) {
    return value ? "[MASKED]" : value;
  }

  return value;
};

const maskObject = (input) => {
  if (Array.isArray(input)) {
    return input.map(maskObject);
  }

  if (!input || typeof input !== "object") {
    return input;
  }

  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value && typeof value === "object") {
      acc[key] = maskObject(value);
      return acc;
    }

    acc[key] = maskValue(key, value);
    return acc;
  }, {});
};

const decodeJwtExpiry = (token) => {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      return 0;
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    );
    return Number(payload?.exp || 0) * 1000;
  } catch (error) {
    return 0;
  }
};

const getBlueDartStaticJwtToken = () => {
  const token = process.env.BLUE_DART_JWT_TOKEN;
  if (!token) {
    throw new Error("BLUE_DART_JWT_TOKEN is missing in environment variables");
  }
  return token;
};

const hasDynamicBlueDartTokenConfig = () =>
  Boolean(getBlueDartClientId() && getBlueDartClientSecret() && getBlueDartTokenUrl());

const readBlueDartTokenResponse = (payload = {}) =>
  payload?.access_token ||
  payload?.token ||
  payload?.jwtToken ||
  payload?.JWTToken ||
  payload?.id_token ||
  payload?.data?.access_token ||
  payload?.data?.token ||
  payload?.data?.jwtToken ||
  null;

const readBlueDartTokenExpiry = (payload = {}, fallbackToken = "") => {
  const expiresInSeconds =
    Number(
      payload?.expires_in ||
        payload?.expiresIn ||
        payload?.data?.expires_in ||
        payload?.data?.expiresIn ||
        0
    ) || 0;

  if (expiresInSeconds > 0) {
    return Date.now() + Math.max(expiresInSeconds - 60, 30) * 1000;
  }

  const decoded = decodeJwtExpiry(fallbackToken);
  if (decoded > Date.now()) {
    return decoded - 60 * 1000;
  }

  return Date.now() + 55 * 60 * 1000;
};

const fetchBlueDartJwtToken = async ({ forceRefresh = false } = {}) => {
  if (
    !forceRefresh &&
    blueDartTokenCache.value &&
    blueDartTokenCache.expiresAt > Date.now() + 5 * 1000
  ) {
    return blueDartTokenCache.value;
  }

  if (!hasDynamicBlueDartTokenConfig()) {
    const staticToken = getBlueDartStaticJwtToken();
    blueDartTokenCache = {
      value: staticToken,
      expiresAt: readBlueDartTokenExpiry({}, staticToken),
      source: "env",
    };
    return staticToken;
  }

  console.log(
    "[BLUE_DART TOKEN] Refresh attempt",
    JSON.stringify(
      maskObject({
        tokenUrl: getBlueDartTokenUrl(),
        clientId: getBlueDartClientId(),
        forceRefresh,
      })
    )
  );

  const tokenPayload = new URLSearchParams({
    grant_type: process.env.BLUE_DART_TOKEN_GRANT_TYPE || "client_credentials",
    client_id: getBlueDartClientId(),
    client_secret: getBlueDartClientSecret(),
  });

  if (process.env.BLUE_DART_TOKEN_SCOPE) {
    tokenPayload.append("scope", process.env.BLUE_DART_TOKEN_SCOPE);
  }

  if (process.env.BLUE_DART_TOKEN_AUDIENCE) {
    tokenPayload.append("audience", process.env.BLUE_DART_TOKEN_AUDIENCE);
  }

  try {
    const response = await axios.post(getBlueDartTokenUrl(), tokenPayload.toString(), {
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
    });

    const token = readBlueDartTokenResponse(response.data);
    if (!token) {
      throw new Error("Blue Dart token response does not contain an access token");
    }

    blueDartTokenCache = {
      value: token,
      expiresAt: readBlueDartTokenExpiry(response.data, token),
      source: "oauth",
    };

    return token;
  } catch (error) {
    console.log(
      "[BLUE_DART TOKEN] Refresh failed",
      JSON.stringify(maskObject(error?.response?.data || { message: error.message }))
    );

    if (!forceRefresh && process.env.BLUE_DART_JWT_TOKEN) {
      const staticToken = getBlueDartStaticJwtToken();
      blueDartTokenCache = {
        value: staticToken,
        expiresAt: readBlueDartTokenExpiry({}, staticToken),
        source: "env-fallback",
      };
      return staticToken;
    }

    throw error;
  }
};

const getBlueDartHeaders = async () => ({
  accept: "application/json",
  JWTToken: await fetchBlueDartJwtToken(),
  "content-type": "application/json",
});

const buildBlueDartProfile = ({
  apiType = getBlueDartShippingApiType(),
  licenceKey = getBlueDartShippingLicenceKey(),
  loginId = getBlueDartLoginId(),
} = {}) => ({
  LoginID: loginId,
  LicenceKey: licenceKey,
  Api_type: apiType,
});

const logBlueDartApiHit = ({ action, method, url, payload, params }) => {
  console.log(
    `[BLUE_DART API] ${action}`,
    JSON.stringify(
      maskObject({
        method,
        url,
        ...(payload ? { payload } : {}),
        ...(params ? { params } : {}),
      }),
      null,
      2
    )
  );
};

const extractError = (error) => maskObject(error?.response?.data || error.message);

const requestBlueDart = async ({
  method = "GET",
  path,
  payload,
  params,
  action,
  retryOn401 = true,
} = {}) => {
  const url = path.startsWith("http") ? path : `${buildBlueDartBaseUrl()}${path}`;

  logBlueDartApiHit({
    action,
    method,
    url,
    payload,
    params,
  });

  try {
    const response = await axios({
      method,
      url,
      data: payload,
      params,
      headers: await getBlueDartHeaders(),
    });

    console.log(
      `[BLUE_DART API] ${action} response`,
      JSON.stringify(maskObject(response.data), null, 2)
    );

    return response.data;
  } catch (error) {
    console.log(
      `[BLUE_DART API] ${action} error`,
      JSON.stringify(maskObject(error?.response?.data || { message: error.message }), null, 2)
    );

    if (error?.response?.status === 401 && retryOn401) {
      await fetchBlueDartJwtToken({ forceRefresh: true });
      return requestBlueDart({
        method,
        path,
        payload,
        params,
        action: `${action} retry`,
        retryOn401: false,
      });
    }

    throw error;
  }
};

const postBlueDartJson = async ({ path, payload, action }) => {
  return requestBlueDart({
    method: "POST",
    path,
    payload,
    action,
  });
};

const toSafeString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

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

const normalizeBlueDartDateLiteral = (value) => {
  if (!value) {
    return toBlueDartDateLiteral(new Date());
  }

  const normalized = String(value).trim();
  if (/^\/Date\(\d+\)\/$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return toBlueDartDateLiteral(parsed);
  }

  return toBlueDartDateLiteral(new Date());
};

const normalizeBlueDartPickupTime = (value) => {
  const normalized = String(value || process.env.BLUE_DART_PICKUP_TIME || "08:00")
    .trim()
    .replace(/\./g, ":");

  const fourDigitMatch = normalized.match(/^(\d{2})(\d{2})$/);
  if (fourDigitMatch) {
    return `${fourDigitMatch[1]}:${fourDigitMatch[2]}`;
  }

  const hhmmMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    return `${hhmmMatch[1].padStart(2, "0")}:${hhmmMatch[2]}`;
  }

  return "08:00";
};

const normalizeBlueDartWaybillPickupTime = (value) => {
  const hhmm = normalizeBlueDartPickupTime(value);
  return hhmm.replace(":", "");
};

const buildFullAddress = ({
  addressLine1 = "",
  addressLine2 = "",
  addressLine3 = "",
  city = "",
  state = "",
  pincode = "",
  country = "",
}) =>
  [addressLine1, addressLine2, addressLine3, city, state, pincode, country]
    .map(toSafeString)
    .filter(Boolean)
    .join(", ");

const resolveBlueDartShipFrom = (shipFrom = {}) => {
  const addressLine1 = toSafeString(
    shipFrom?.addressLine1 ||
      shipFrom?.CustomerAddress1 ||
      process.env.BLUE_DART_SHIPPER_ADDRESS1 ||
      process.env.DHL_SHIPPER_ADDRESS_LINE1
  );
  const addressLine2 = toSafeString(
    shipFrom?.addressLine2 ||
      shipFrom?.CustomerAddress2 ||
      process.env.BLUE_DART_SHIPPER_ADDRESS2 ||
      process.env.DHL_SHIPPER_ADDRESS_LINE2
  );
  const addressLine3 = toSafeString(
    shipFrom?.addressLine3 ||
      shipFrom?.CustomerAddress3 ||
      process.env.BLUE_DART_SHIPPER_ADDRESS3
  );
  const city = toSafeString(
    shipFrom?.city ||
      shipFrom?.City ||
      process.env.BLUE_DART_SHIPPER_CITY ||
      process.env.DHL_SHIPPER_CITY
  );
  const state = toSafeString(
    shipFrom?.state || shipFrom?.State || process.env.BLUE_DART_SHIPPER_STATE || process.env.DHL_SHIPPER_STATE
  );
  const pincode = toSafeString(
    shipFrom?.pincode ||
      shipFrom?.CustomerPincode ||
      process.env.BLUE_DART_SHIPPER_PINCODE ||
      process.env.DHL_SHIPPER_POSTAL_CODE
  );
  const country = toSafeString(
    shipFrom?.country ||
      shipFrom?.Country ||
      process.env.BLUE_DART_SHIPPER_COUNTRY ||
      process.env.DHL_SHIPPER_COUNTRY ||
      "India"
  );
  const name = toSafeString(
    shipFrom?.name ||
      shipFrom?.CustomerName ||
      process.env.BLUE_DART_SHIPPER_NAME ||
      process.env.DHL_SHIPPER_NAME ||
      "Cadmax"
  );
  const mobile = toSafeString(
    shipFrom?.mobile ||
      shipFrom?.phone ||
      shipFrom?.CustomerMobile ||
      process.env.BLUE_DART_SHIPPER_MOBILE ||
      process.env.DHL_SHIPPER_PHONE
  );
  const telephone = toSafeString(
    shipFrom?.telephone ||
      shipFrom?.CustomerTelephone ||
      process.env.BLUE_DART_SHIPPER_TELEPHONE ||
      process.env.BLUE_DART_SHIPPER_PHONE ||
      process.env.DHL_SHIPPER_PHONE
  );
  const email = toSafeString(
    shipFrom?.email || shipFrom?.CustomerEmailID || process.env.BLUE_DART_SHIPPER_EMAIL
  );
  const gstNumber = toSafeString(
    shipFrom?.gstNumber ||
      shipFrom?.CustomerGSTNumber ||
      process.env.BLUE_DART_SHIPPER_GST
  );
  const sender = toSafeString(
    shipFrom?.sender || shipFrom?.Sender || process.env.BLUE_DART_SENDER
  );
  const vendorCode = toSafeString(
    shipFrom?.vendorCode || shipFrom?.VendorCode || process.env.BLUE_DART_VENDOR_CODE
  );
  const customerCode = toSafeString(
    shipFrom?.customerCode || shipFrom?.CustomerCode || getBlueDartCustomerCode()
  );
  const originArea = toSafeString(
    shipFrom?.originArea || shipFrom?.OriginArea || process.env.BLUE_DART_ORIGIN_AREA
  );

  return {
    name,
    mobile,
    phone: mobile,
    telephone,
    email,
    gstNumber,
    addressLine1,
    addressLine2,
    addressLine3,
    city,
    state,
    pincode,
    country,
    fullAddress:
      toSafeString(shipFrom?.fullAddress) ||
      buildFullAddress({
        addressLine1,
        addressLine2,
        addressLine3,
        city,
        state,
        pincode,
        country,
      }),
    sender,
    vendorCode,
    customerCode,
    originArea,
  };
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
  shipFrom,
  products,
  declaredValue,
  isCod,
  collectableAmount,
  productCode,
  subProductCode,
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

  const resolvedShipFrom = resolveBlueDartShipFrom(shipFrom);
  const resolvedProductCode = String(
    productCode || process.env.BLUE_DART_PRODUCT_CODE || "A"
  );
  const resolvedSubProductCode = String(
    subProductCode ||
      (isCod
        ? process.env.BLUE_DART_COD_SUB_PRODUCT_CODE || "C"
        : process.env.BLUE_DART_SUB_PRODUCT_CODE || "P")
  );

  const payload = {
    Request: {
      Consignee: {
        AvailableDays: "",
        AvailableTiming: "",
        ConsigneeAddress1: consigneeAddress1,
        ConsigneeAddress2: receiverAddress?.addressLine2 || "",
        ConsigneeAddress3: receiverAddress?.addressLine3 || "",
        ConsigneeAddressType: "R",
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
        ReturnAddress1: resolvedShipFrom.addressLine1,
        ReturnAddress2: resolvedShipFrom.addressLine2,
        ReturnAddress3: resolvedShipFrom.addressLine3,
        ReturnContact: resolvedShipFrom.name,
        ReturnEmailID: resolvedShipFrom.email,
        ReturnLatitude: "",
        ReturnLongitude: "",
        ReturnMaskedContactNumber: "",
        ReturnMobile: resolvedShipFrom.mobile,
        ReturnPincode: resolvedShipFrom.pincode,
        ReturnTelephone: resolvedShipFrom.telephone,
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
        PickupTime: normalizeBlueDartWaybillPickupTime(process.env.BLUE_DART_PICKUP_TIME),
        PickupType: "",
        PieceCount: String(pieceCount),
        PreferredPickupTimeSlot: "",
        ProductCode: resolvedProductCode,
        ProductFeature: "",
        ProductType: coerceNumber(process.env.BLUE_DART_PRODUCT_TYPE) ?? 1,
        RegisterPickup:
          String(process.env.BLUE_DART_REGISTER_PICKUP || "true").toLowerCase() ===
          "true",
        SpecialInstruction: "",
        SubProductCode: resolvedSubProductCode,
        TotalCashPaytoCustomer: 0,
        itemdtl: itemDetails,
        noOfDCGiven: 0,
        ECCN: "",
      },
      Shipper: {
        CustomerAddress1: resolvedShipFrom.addressLine1,
        CustomerAddress2: resolvedShipFrom.addressLine2,
        CustomerAddress3: resolvedShipFrom.addressLine3,
        CustomerAddressinfo: "",
        CustomerCode: resolvedShipFrom.customerCode,
        CustomerEmailID: resolvedShipFrom.email,
        CustomerGSTNumber: resolvedShipFrom.gstNumber,
        CustomerLatitude: "",
        CustomerLongitude: "",
        CustomerMaskedContactNumber: "",
        CustomerMobile: resolvedShipFrom.mobile,
        CustomerName: resolvedShipFrom.name,
        CustomerPincode: resolvedShipFrom.pincode,
        CustomerTelephone: resolvedShipFrom.telephone,
        IsToPayCustomer: false,
        OriginArea: resolvedShipFrom.originArea,
        Sender: resolvedShipFrom.sender,
        VendorCode: resolvedShipFrom.vendorCode,
      },
    },
    Profile: {
      Api_type: getBlueDartShippingApiType(),
      LicenceKey: getBlueDartShippingLicenceKey(),
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

const extractPickupRegistrationDate = (payload) =>
  payload?.Request?.Services?.PickupDate ||
  payload?.request?.Services?.PickupDate ||
  payload?.PickupRegistrationDate ||
  payload?.pickupRegistrationDate ||
  null;

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
  shipFrom,
  products,
  declaredValue,
  isCod = false,
  collectableAmount,
  productCode,
  subProductCode,
  overrides,
}) => {
  try {
    const payload = buildGenerateWaybillPayload({
      orderId,
      name,
      mobile,
      receiverAddress,
      shipFrom,
      products,
      declaredValue,
      isCod,
      collectableAmount,
      productCode,
      subProductCode,
      overrides,
    });

    const response = await requestBlueDart({
      method: "POST",
      path: "/waybill/v1/GenerateWayBill",
      payload,
      action: "Generate waybill request",
    });

    return {
      success: true,
      data: response,
      requestPayload: payload,
      awbNumber: extractAwbNumber(response),
      pickupRegistrationDate: extractPickupRegistrationDate(payload),
      ...extractBlueDartStatus(response),
    };
  } catch (error) {
    console.log("BLUE_DART GENERATE WAYBILL ERROR", extractError(error));

    return {
      success: false,
      requestPayload: null,
      pickupRegistrationDate: null,
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
      lickey: getBlueDartTrackingLicenceKey(),
      scan: options.scan ?? process.env.BLUE_DART_TRACK_SCAN ?? "1",
      action: options.action ?? process.env.BLUE_DART_TRACK_ACTION ?? "custawbquery",
      verno: options.verno ?? process.env.BLUE_DART_TRACK_VERNO ?? "1",
      format: options.format ?? process.env.BLUE_DART_TRACK_FORMAT ?? "json",
      handler: options.handler ?? process.env.BLUE_DART_TRACK_HANDLER ?? "tnt",
      tnt: options.tnt ?? process.env.BLUE_DART_TRACK_TNT ?? "",
      awb: options.awb ?? "",
    };
    const response = await requestBlueDart({
      method: "GET",
      path: "/tracking/v1/shipment",
      params,
      action: "Track shipment request",
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.log("BLUE_DART TRACK SHIPMENT ERROR", extractError(error));

    return {
      success: false,
      error: extractError(error),
    };
  }
};

const cancelBlueDartPickup = async ({
  tokenNumber,
  pickupRegistrationDate,
  remarks = null,
  loginId,
  licenceKey,
} = {}) => {
  try {
    if (!tokenNumber || !pickupRegistrationDate) {
      throw new Error("tokenNumber and pickupRegistrationDate are required");
    }

    const payload = {
      request: {
        PickupRegistrationDate: pickupRegistrationDate,
        Remarks: remarks,
        TokenNumber: Number(tokenNumber),
      },
      profile: buildBlueDartProfile({
        apiType: getBlueDartShippingApiType(),
        licenceKey: licenceKey || getBlueDartShippingLicenceKey(),
        loginId: loginId || getBlueDartLoginId(),
      }),
    };

    const data = await postBlueDartJson({
      path: "/cancel-pickup/v1/CancelPickup",
      payload,
      action: "Cancel pickup request",
    });

    return {
      success: true,
      data,
      requestPayload: payload,
    };
  } catch (error) {
    console.log("BLUE_DART CANCEL PICKUP ERROR", extractError(error));

    return {
      success: false,
      error: extractError(error),
    };
  }
};

const getBlueDartTransitTime = async ({
  fromPincode,
  toPincode,
  pickupTime,
  pickupDate,
  productCode,
  subProductCode,
  isCod,
  apiType,
  licenceKey,
  loginId,
} = {}) => {
  try {
    if (!fromPincode || !toPincode) {
      throw new Error("fromPincode and toPincode are required");
    }

    const resolvedSubProductCode = String(
      subProductCode ||
        (isCod
          ? process.env.BLUE_DART_COD_SUB_PRODUCT_CODE || "C"
          : process.env.BLUE_DART_SUB_PRODUCT_CODE || "P")
    );

    const payload = {
      pPinCodeFrom: String(fromPincode),
      pPinCodeTo: String(toPincode),
      pProductCode: String(productCode || process.env.BLUE_DART_PRODUCT_CODE || "A"),
      pSubProductCode: resolvedSubProductCode,
      pPudate: normalizeBlueDartDateLiteral(pickupDate),
      pPickupTime: normalizeBlueDartPickupTime(pickupTime),
      profile: buildBlueDartProfile({
        apiType: apiType || getBlueDartShippingApiType(),
        licenceKey: licenceKey || getBlueDartShippingLicenceKey(),
        loginId: loginId || getBlueDartLoginId(),
      }),
    };

    const data = await postBlueDartJson({
      path: "/transit/v1/GetDomesticTransitTimeForPinCodeandProduct",
      payload,
      action: "Transit time request",
    });

    return {
      success: true,
      data,
      requestPayload: payload,
      normalizedRequestPayload: maskObject(payload),
    };
  } catch (error) {
    console.log("BLUE_DART TRANSIT TIME ERROR", extractError(error));

    return {
      success: false,
      error: extractError(error),
    };
  }
};

const getBlueDartServicesForPincode = async ({
  pinCode,
  apiType,
  licenceKey,
  loginId,
} = {}) => {
  try {
    if (!pinCode) {
      throw new Error("pinCode is required");
    }

    const payload = {
      pinCode: String(pinCode),
      profile: buildBlueDartProfile({
        apiType: apiType || getBlueDartTrackingApiType(),
        licenceKey: licenceKey || getBlueDartTrackingLicenceKey(),
        loginId: loginId || getBlueDartLoginId(),
      }),
    };

    const data = await postBlueDartJson({
      path: "/finder/v1/GetServicesforPincode",
      payload,
      action: "Serviceability request",
    });

    return {
      success: true,
      data,
      requestPayload: payload,
      normalizedRequestPayload: maskObject(payload),
    };
  } catch (error) {
    console.log("BLUE_DART SERVICEABILITY ERROR", extractError(error));

    return {
      success: false,
      error: extractError(error),
    };
  }
};

module.exports = {
  cancelBlueDartPickup,
  createBlueDartWaybill,
  extractAwbNumber,
  extractPickupRegistrationDate,
  getBlueDartServicesForPincode,
  getBlueDartTransitTime,
  resolveBlueDartShipFrom,
  trackBlueDartShipment,
};
