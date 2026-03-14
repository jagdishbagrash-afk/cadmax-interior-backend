const Address = require("../models/addressModel");
const catchAsync = require("../Utill/catchAsync");

exports.addAddress = catchAsync(
  async (req, res) => {
    try {

      const { pincode, userId, city, state, country, addressLine1, addressLine2 ,addressType } = req.body;

      const record = new Address({ pincode, userId, city, state, country,addressType , addressLine1, addressLine2 });
      const result = await record.save();

      return successResponse(res, "Address added successfully", 200, {
        result: result
      });

    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);

exports.getAddresses = catchAsync(
  async (req, res) => {
    try {
      const userId = req.params.userId;
      const addresses = await Address.find({ userId });
      return successResponse(res, "Address Get By User successfully", 200, {
        addresses
      });
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);

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
    const { pincode, userId, city, state, country, addressLine1, addressLine2 ,addressType } = req.body;
    const address = await Address.findByIdAndUpdate(
      req.params.id,
      pincode, userId, city, state, country, addressLine1, addressLine2,addressType,
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

exports.deleteAddress = async (req, res) => {
  try {

    const address = await Address.findByIdAndDelete(req.params.id);

    if (!address) {
      return errorResponse(res, "This Address is Not Found", 403);
    }


    return successResponse(res, " Address Deleted successfully", 200, {
      address
    });

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);

  }
};