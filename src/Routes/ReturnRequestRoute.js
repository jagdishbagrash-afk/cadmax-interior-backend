const router = require("express").Router();
const { upload } = require("../Utill/S3");
const { verifyToken } = require("../Utill/tokenVerify");
const {
  createReturnRequest,
  getReturnRequestsByOrder,
  getReturnRequestById,
  cancelReturnRequest,
  getAllAdminReturns,
  getAdminReturnById,
  updateAdminReturnStatus,
  approveReturnRequest,
  rejectReturnRequest,
  createReverseShipment,
  initiateRefund,
  createReplacementOrder,
} = require("../Controller/ReturnRequestController");

router.post(
  "/returns",
  verifyToken,
  upload.fields([{ name: "supportingImages", maxCount: 5 }]),
  createReturnRequest
);

router.get("/returns/order/:orderId", verifyToken, getReturnRequestsByOrder);
router.get("/returns/:returnId", verifyToken, getReturnRequestById);
router.patch("/returns/:returnId/cancel", verifyToken, cancelReturnRequest);

router.get("/admin/returns", verifyToken, getAllAdminReturns);
router.get("/admin/returns/:id", verifyToken, getAdminReturnById);
router.patch("/admin/returns/:id/status", verifyToken, updateAdminReturnStatus);
router.patch("/admin/returns/:id/approve", verifyToken, approveReturnRequest);
router.patch("/admin/returns/:id/reject", verifyToken, rejectReturnRequest);
router.post("/admin/returns/:id/create-reverse-shipment", verifyToken, createReverseShipment);
router.post("/admin/returns/:id/refund", verifyToken, initiateRefund);
router.post("/admin/returns/:id/create-replacement", verifyToken, createReplacementOrder);

module.exports = router;
