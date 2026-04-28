const express = require('express');

const { ContactPost, ContactGet, createLead ,LeadGet } = require("../Controller/ContactController");
const { verifyToken } = require('../Utill/tokenVerify');
const router = express.Router();

//contact  List 

router.post("/contact-add", ContactPost);

router.get("/contact-get", ContactGet);

router.post("/lead-add", verifyToken,  createLead);




router.get("/lead-get", LeadGet);


module.exports = router;