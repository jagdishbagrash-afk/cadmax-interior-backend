const express = require('express');

const { ContactPost, ContactGet } = require("../Controller/ContactController");
const router = express.Router();

//contact  List 

router.post("/contact-add", ContactPost);

router.get("/contact-get", ContactGet);

module.exports = router;