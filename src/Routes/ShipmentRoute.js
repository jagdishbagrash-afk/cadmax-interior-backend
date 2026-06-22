const router = require("express").Router();
const {
  TrackShipment,
  CreateOrderShipment,
  GetOrderShipment,
  TrackOrderShipment,
} = require("../Controller/shipmentController");
const { verifyToken } = require("../Utill/tokenVerify");

router.get("/shipment/track/:trackingNumber", TrackShipment);
router.post("/order/:id/shipment/create", verifyToken, CreateOrderShipment);
router.get("/order/:id/shipment", verifyToken, GetOrderShipment);
router.get("/order/:id/tracking", verifyToken, TrackOrderShipment);

module.exports = router;
