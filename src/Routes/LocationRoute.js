// Routes/locationRoute.js

const express = require("express");
const router = express.Router();

const {
  getStates,
  getCitiesByState,
} = require("../Controller/locationController");

router.get("/states", getStates);

router.get("/cities/:state", getCitiesByState);

module.exports = router;