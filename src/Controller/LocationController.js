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

    const stateData = await State.findOne(
      { state },
      { cities: 1, state: 1, country: 1, _id: 0 }
    ).lean();

    if (!stateData) {
      return res.status(404).json({
        success: false,
        message: "State not found",
      });
    }

    // Remove duplicates & sort cities
    const uniqueCities = [...new Set(stateData.cities)]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    return res.status(200).json({
      success: true,
      message: "Cities fetched successfully",
      data: {
        country: stateData.country,
        state: stateData.state,
        totalCities: uniqueCities.length,
        cities: uniqueCities,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};