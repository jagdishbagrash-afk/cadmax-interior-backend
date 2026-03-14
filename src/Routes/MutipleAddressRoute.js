const express = require("express");
const router = express.Router();

const MultipleAddressController = require("../Controller/MultipleMultipleAddressController");

router.post("/address/add", MultipleAddressController.addAddress);

router.get("/address/user/:userId", MultipleAddressController.getAddresses);

router.get("/address/:id", MultipleAddressController.getAddressById);

router.put("/address/update/:id", MultipleAddressController.updateAddress);

router.put("/address/default/:id", MultipleAddressController.setDefaultAddress);

router.delete("/address/delete/:id", MultipleAddressController.deleteAddress);

module.exports = router;