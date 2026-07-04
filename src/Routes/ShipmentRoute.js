const router = require("express").Router();
const {
  TrackShipment,
  GetOrderShipment,
  TrackOrderShipment,
} = require("../Controller/shipmentController");
const { verifyToken } = require("../Utill/tokenVerify");

router.get("/shipment/track/:trackingNumber", TrackShipment);
router.get("/order/:id/shipment", verifyToken, GetOrderShipment);
router.get("/order/:id/tracking", verifyToken, TrackOrderShipment);

module.exports = router;
