const router = require("express").Router();
const {
  CancelOrderShipment,
  TrackShipment,
  CreateOrderShipment,
  GetOrderShipment,
  MarkOrderDispatched,
  RefreshOrderShipment,
  TrackOrderShipment,
  UpdateOrderDeliveryStatus,
} = require("../Controller/shipmentController");
const { verifyToken } = require("../Utill/tokenVerify");

router.get("/shipment/track/:trackingNumber", TrackShipment);
router.post("/order/:id/shipment/create", verifyToken, CreateOrderShipment);
router.get("/order/:id/shipment", verifyToken, GetOrderShipment);
router.post("/order/:id/shipment/refresh", verifyToken, RefreshOrderShipment);
router.get("/order/:id/tracking", verifyToken, TrackOrderShipment);
router.post("/order/:id/shipment/cancel", verifyToken, CancelOrderShipment);
router.post("/order/:id/shipment/dispatch", verifyToken, MarkOrderDispatched);
router.post("/order/:id/shipment/delivery-status", verifyToken, UpdateOrderDeliveryStatus);

module.exports = router;
