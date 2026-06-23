const axios = require("axios");
const mongoose = require("mongoose");
const State = require("./Model/State");
require("dotenv").config();

const seedIndiaStates = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);


    // Purana India data delete
    await State.deleteMany({ country: "India" });

    const statesResponse = await axios.post(
      "https://countriesnow.space/api/v0.1/countries/states",
      {
        country: "India",
      }
    );

    const states = statesResponse?.data?.data?.states || [];

    for (const state of states) {

      const citiesResponse = await axios.post(
        "https://countriesnow.space/api/v0.1/countries/state/cities",
        {
          country: "India",
          state: state.name,
        }
      );

      await State.create({
        country: "India",
        countryCode: "IN",
        state: state.name,
        stateCode: state.state_code,
        cities: citiesResponse?.data?.data || [],
      });

    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedIndiaStates();