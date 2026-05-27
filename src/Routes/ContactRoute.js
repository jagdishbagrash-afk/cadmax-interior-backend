const express = require('express');

const { ContactPost, ContactGet, createLead ,LeadGet, ContactAddPost, ContactRecordGet, LeadStatusUpdate, LeadDelete } = require("../Controller/ContactController");
const { verifyToken } = require('../Utill/tokenVerify');
const router = express.Router();

//contact  List 

router.post("/contact-add", ContactPost);

router.get("/contact-get", ContactGet);

router.post("/lead-add", verifyToken,  createLead);


router.post("/contact-post-add", ContactAddPost);




router.get("/lead-get", LeadGet);

router.delete("/lead/delete/:id", LeadDelete
);

router.post("/lead-status-update/:id", LeadStatusUpdate);


module.exports = router;