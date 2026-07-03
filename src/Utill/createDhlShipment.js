const axios = require("axios");

const DEFAULT_DHL_BASE_URL = "https://express.api.dhl.com/mydhlapi/test";
const DEFAULT_COUNTRY_CODE = "IN";
const DEFAULT_PACKAGE_WEIGHT = 0.5;

const getDhlBaseUrl = () =>
  (process.env.DHL_API_BASE_URL || DEFAULT_DHL_BASE_URL).replace(/\/+$/, "");

const getBasicAuthHeader = () => {
  const { DHL_API_KEY, DHL_API_SECRET } = process.env;

  if (!DHL_API_KEY || !DHL_API_SECRET) {
    throw new Error("DHL API credentials are missing in environment variables");
  }

  return `Basic ${Buffer.from(`${DHL_API_KEY}:${DHL_API_SECRET}`).toString("base64")}`;
};

const getAxiosConfig = () => ({
  headers: {
    Authorization: getBasicAuthHeader(),
    "Content-Type": "application/json",
  },
});

const normalizeCountryCode = (country) => {
  if (!country) {
    return DEFAULT_COUNTRY_CODE;
  }

  const value = String(country).trim().toUpperCase();
  return value.length === 2 ? value : DEFAULT_COUNTRY_CODE;
};

const normalizeAddress = (address) => {
  if (!address) {
    return {
      city: "",
      postalCode: "",
      addressLine1: "",
      countryCode: DEFAULT_COUNTRY_CODE,
    };
  }

  if (typeof address === "string") {
    const parts = address
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const postalCodeMatch = address.match(/\b\d{4,10}\b/);

    return {
      city: parts[parts.length - 2] || parts[1] || "",
      postalCode: postalCodeMatch ? postalCodeMatch[0] : "",
      addressLine1: parts[0] || address.trim(),
      countryCode: DEFAULT_COUNTRY_CODE,
    };
  }

  return {
    city: address.city || address.cityName || "",
    postalCode: address.pincode || address.postalCode || "",
    addressLine1:
      address.street_address ||
      address.address ||
      address.addressLine1 ||
      "",
    countryCode: normalizeCountryCode(address.countryCode || address.country),
  };
};

const getPackageWeight = (products = []) => {
  if (!Array.isArray(products) || products.length === 0) {
    return DEFAULT_PACKAGE_WEIGHT;
  }

  const totalQuantity = products.reduce((sum, item) => {
    const quantity = Number(item?.quantity || 0);
    return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
  }, 0);

  return Math.max(totalQuantity * DEFAULT_PACKAGE_WEIGHT, DEFAULT_PACKAGE_WEIGHT);
};

const buildShipmentPayload = ({
  name,
  mobile,
  address,
  products = [],
  totalAmount,
  orderId,
}) => {
  const normalizedAddress = normalizeAddress(address);

  if (!normalizedAddress.city || !normalizedAddress.postalCode || !normalizedAddress.addressLine1) {
    throw new Error("Receiver address must include city, postal code and street address");
  }

  if (!process.env.DHL_ACCOUNT_NUMBER) {
    throw new Error("DHL_ACCOUNT_NUMBER is missing in environment variables");
  }

  return {
    plannedShippingDateAndTime: new Date().toISOString(),
    pickup: {
      isRequested: false,
    },
    productCode: process.env.DHL_PRODUCT_CODE || "P",
    accounts: [
      {
        typeCode: "shipper",
        number: process.env.DHL_ACCOUNT_NUMBER,
      },
    ],
    customerDetails: {
      shipperDetails: {
        postalAddress: {
          cityName: process.env.DHL_SHIPPER_CITY,
          countryCode: normalizeCountryCode(process.env.DHL_SHIPPER_COUNTRY_CODE),
          postalCode: process.env.DHL_SHIPPER_POSTAL_CODE,
          addressLine1: process.env.DHL_SHIPPER_ADDRESS_LINE1,
        },
        contactInformation: {
          fullName: process.env.DHL_SHIPPER_NAME || "Cadmax",
          phone: process.env.DHL_SHIPPER_PHONE,
          companyName: process.env.DHL_SHIPPER_COMPANY || "Cadmax",
        },
      },
      receiverDetails: {
        postalAddress: {
          cityName: normalizedAddress.city,
          countryCode: normalizedAddress.countryCode,
          postalCode: normalizedAddress.postalCode,
          addressLine1: normalizedAddress.addressLine1,
        },
        contactInformation: {
          fullName: name,
          phone: String(mobile || ""),
        },
      },
    },
    content: {
      packages: [
        {
          weight: getPackageWeight(products),
        },
      ],
      isCustomsDeclarable: false,
      description: `Order ${orderId || ""}`.trim(),
      unitOfMeasurement: "metric",
      declaredValue: Number(totalAmount) || undefined,
      declaredValueCurrency: process.env.DHL_DECLARED_VALUE_CURRENCY || "INR",
    },
    outputImageProperties: {
      printerDPI: 300,
      encodingFormat: "pdf",
      imageOptions: [
        {
          typeCode: "label",
          templateName: "ECOM26_84_A4_001",
        },
      ],
    },
  };
};

const extractError = (error) => error?.response?.data || error.message;

const createDhlShipment = async (shipmentData) => {
  try {
    const payload = buildShipmentPayload(shipmentData);

    const response = await axios.post(
      `${getDhlBaseUrl()}/shipments`,
      payload,
      getAxiosConfig()
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log("DHL CREATE SHIPMENT ERROR", extractError(error));

    return {
      success: false,
      error: extractError(error),
    };
  }
};

const trackDhlShipment = async (trackingNumber) => {
  try {
    const response = await axios.get(
      `${getDhlBaseUrl()}/shipments/${trackingNumber}/tracking`,
      getAxiosConfig()
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log("DHL TRACK SHIPMENT ERROR", extractError(error));

    return {
      success: false,
      error: extractError(error),
    };
  }
};

module.exports = {
  createDhlShipment,
  trackDhlShipment,
  normalizeAddress,
};
