const express = require("express");
const router = express.Router();
const { verifyToken } = require("../Utill/tokenVerify");

const MultipleAddressController = require("../Controller/MultipleAddressController");

router.post("/address/add", verifyToken , MultipleAddressController.addAddress);

router.get("/address/list", verifyToken, MultipleAddressController.getAddresses);

router.get("/address/:id", MultipleAddressController.getAddressById);

router.post("/address/update/:id",verifyToken, MultipleAddressController.updateAddress);

router.get("/address/default/:id",  verifyToken, MultipleAddressController.setDefaultAddress);

router.get("/address/delete/:id", MultipleAddressController.DeleteAddress);


router.get("/address/user-list/:id",  MultipleAddressController.UserListingAddress);






module.exports = router;