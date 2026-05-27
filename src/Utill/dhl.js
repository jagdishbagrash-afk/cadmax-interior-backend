const dhlApi = require("../utils/dhl");

exports.CreateShipment = async (req, res) => {
  try {

    const response = await dhlApi.post("/shipments", {
      plannedShippingDateAndTime:
        "2026-05-27T12:00:00GMT+00:00",

      pickup: {
        isRequested: false,
      },

      productCode: "P",

      accounts: [
        {
          typeCode: "shipper",
          number: process.env.DHL_ACCOUNT_NUMBER,
        },
      ],

      customerDetails: {

        shipperDetails: {
          postalAddress: {
            cityName: "Jaipur",
            countryCode: "IN",
            postalCode: "302001",
            addressLine1: "Jaipur Rajasthan",
          },

          contactInformation: {
            fullName: "Ankit Jain",
            phone: "9999999999",
          },
        },

        receiverDetails: {
          postalAddress: {
            cityName: "Delhi",
            countryCode: "IN",
            postalCode: "110001",
            addressLine1: "Delhi India",
          },

          contactInformation: {
            fullName: "Customer",
            phone: "8888888888",
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
        description: "Ecommerce Products",
      },
    });

    res.status(200).json({
      success: true,
      data: response.data,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message:
        error?.response?.data || "Shipment Failed",
    });
  }
};