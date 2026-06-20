// Controller/locationController.js

const State = require("../Model/State");

// Get All States
exports.getStates = async (req, res) => {
  try {
    const states = await State.find(
      { country: "India" },
      {
        state: 1,
        stateCode: 1,
        _id: 0,
      }
    ).sort({ state: 1 });

   

    res.status(200).json({
      success: true,
    message: "States fetched successfully",

      data: states,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Cities By State
exports.getCitiesByState = async (req, res) => {
  try {
    const { state } = req.params;

    const stateData = await State.findOne({
      state,
    });

    res.status(200).json({
      success: true,
    message: "city fetched successfully",
      data: stateData || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};