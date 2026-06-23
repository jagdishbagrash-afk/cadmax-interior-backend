const axios = require("axios");

const createDhlShipment = async ({
  name,
  mobile,
  address,
}) => {
  try {

    const auth = Buffer.from(
      `${process.env.DHL_API_KEY}:${process.env.DHL_API_SECRET}`
    ).toString("base64");

    const response = await axios.post(
      "https://express.api.dhl.com/mydhlapi/shipments",

      {
        plannedShippingDateAndTime:
          new Date().toISOString(),

        pickup: {
          isRequested: false,
        },

        productCode: "P",

        accounts: [
          {
            typeCode: "shipper",
            number:
              process.env.DHL_ACCOUNT_NUMBER,
          },
        ],

        customerDetails: {

          shipperDetails: {
            postalAddress: {
              cityName: "Jaipur",
              countryCode: "IN",
              postalCode: "302001",
              addressLine1:
                "Jaipur Rajasthan India",
            },

            contactInformation: {
              fullName: "Cadmax",
              phone: "9999999999",
            },
          },

          receiverDetails: {
            postalAddress: {
              cityName:
                address?.city || "Delhi",

              countryCode: "IN",

              postalCode:
                address?.pincode || "110001",

              addressLine1:
                address?.address ||
                "Customer Address",
            },

            contactInformation: {
              fullName: name,
              phone: mobile,
            },
          },
        },

        content: {
          packages: [
            {
              weight: 1,
            },
          ],

          isCustomsDeclarable: false,

          description:
            "Ecommerce Products",
        },
      },

      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type":
            "application/json",
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };

  } catch (error) {

 

    return {
      success: false,
      error:
        error?.response?.data ||
        error.message,
    };
  }
};

module.exports = createDhlShipment;