const dhlApi = require("../Utill/dhl");

exports.TrackShipment = async (req, res) => {
  try {

    const { trackingNumber } = req.params;

    const response = await dhlApi.get(
      `/shipments/${trackingNumber}/tracking`
    );

    res.status(200).json({
      success: true,
      data: response.data,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message:
        error?.response?.data || "Tracking Failed",
    });
  }
};