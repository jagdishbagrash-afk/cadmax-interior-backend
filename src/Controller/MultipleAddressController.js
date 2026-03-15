const Address = require("../Model/MultipleAddress");
const catchAsync = require("../Utill/catchAsync");
const { successResponse, errorResponse } = require("../Utill/ErrorHandling");

exports.addAddress = catchAsync(
  async (req, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        return errorResponse(res, "This Address is Not Found", 403);
      }
      const { pincode, city, state, country, street_address, addressType } = req.body;

      const record = new Address({ pincode, userId, city, state, country, addressType, street_address });
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

  const addresses = await Address.find({ userId });

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

    const { pincode, city, state, country, street_address, addressType } = req.body;

    console.log("req.body", req.body);

    const address = await Address.findByIdAndUpdate(
      id,
      {
        pincode,
        city,
        state,
        country,
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
