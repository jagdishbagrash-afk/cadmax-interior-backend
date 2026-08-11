const Address = require("../Model/MultipleAddress");
const catchAsync = require("../Utill/catchAsync");
const { successResponse, errorResponse } = require("../Utill/ErrorHandling");
const axios = require("axios");

exports.addAddress = catchAsync(
  async (req, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        return errorResponse(res, "This Address is Not Found", 403);
      }
      const { pincode, city, state, country, street_address, addressType, flatNo } = req.body;

      const record = new Address({ pincode, userId, city, state, country, addressType, street_address, flatNo });
      const result = await record.save();

      return successResponse(res, "Address added successfully", 200, {
        result: result
      });

    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);

exports.getAddresses = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const addresses = await Address.find({
    userId,
    deletedAt: null,
  });

  return successResponse(
    res,
    "Addresses fetched successfully",
    200,
    { addresses }
  );
});

exports.getAddressById = catchAsync(
  async (req, res) => {
    try {

      const address = await Address.findById(req.params.id);

      if (!address) {
        return errorResponse(res, "This Address is Not Found", 403);
      }

      return successResponse(res, "Address Get successfully", 200, {
        address
      });

    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);

    }
  }
);

exports.updateAddress = async (req, res) => {
  try {

    const userId = req.user.id;
    const id = req.params.id;

    const { pincode, city, state, country, street_address, addressType, flatNo } = req.body;


    const address = await Address.findByIdAndUpdate(
      id,
      {
        pincode,
        city,
        state,
        country,
        flatNo,
        street_address,
        addressType,
        userId
      },
      { new: true }
    );

    if (!address) {
      return errorResponse(res, "This Address is Not Found", 403);
    }

    return successResponse(res, "Address Update successfully", 200, {
      address
    });

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {

    const address = await Address.findById(req.params.id);

    if (!address) {
      return errorResponse(res, "This Address is Not Found", 403);
    }

    await Address.updateMany(
      { userId: address.userId },
      { isDefault: false }
    );

    address.isDefault = true;

    await address.save();

    return successResponse(res, "Default Address Update successfully", 200, {
      address
    });

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);

  }
};

exports.DeleteAddress = catchAsync(async (req, res) => {
  try {
    const id = req.params.id;
    const userrecord = await Address.findById(id);
    if (!userrecord) {
      return validationErrorResponse(res, "Address not found", 404);
    }
    if (userrecord.deletedAt) {
      userrecord.deletedAt = null;
      await userrecord.save();
      return successResponse(res, "Address restored successfully", 200);
    }

    userrecord.deletedAt = new Date();
    const record = await userrecord.save();
    return successResponse(res, "Address deleted successfully", 200);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.UserListingAddress = catchAsync(async (req, res) => {

  const userId = req.params.id;

  const addresses = await Address.find({ userId }).populate("userId");

  return successResponse(
    res,
    "Addresses User fetched successfully",
    200,
    addresses
  );

});


exports.reverseGeocode = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        status: false,
        message: "Latitude and Longitude are required",
      });
    }

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          latlng: `${latitude},${longitude}`,
          key: process.env.GOOGLE_MAP_API_KEY,
        },
      }
    );

    if (
      response.data.status !== "OK" ||
      !response.data.results.length
    ) {
      return res.status(404).json({
        status: false,
        message: "Address not found",
      });
    }

    const place = response.data.results[0];

    let street = "";
    let city = "";
    let state = "";
    let country = "";
    let pincode = "";

    place.address_components.forEach((c) => {
      if (c.types.includes("street_number")) street = c.long_name + " " + street;
      if (c.types.includes("route")) street += c.long_name;
      if (c.types.includes("locality")) city = c.long_name;
      if (c.types.includes("administrative_area_level_1")) state = c.long_name;
      if (c.types.includes("country")) country = c.long_name;
      if (c.types.includes("postal_code")) pincode = c.long_name;
    });

    return res.json({
      status: true,
      data: {
        street_address: street || place.formatted_address,
        city,
        state,
        country,
        pincode,
        latitude,
        longitude,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};