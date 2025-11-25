const Product = require("../Model/Product");
const catchAsync = require("../Utils/catchAsync");
const { successResponse, errorResponse, validationErrorResponse } = require("../Utils/response");
const deleteUploadedFiles = require("../Utils/deleteUploadedFiles");

exports.addProduct = catchAsync(async (req, res) => {
  try {
    const {
      title,
      description,
      stock,
      amount,
      superCategory,
      subcategory,
      category,
    } = req.body;

    // Validation
    if (!title || !description || !stock || !amount || !superCategory || !subcategory || !category) {
      return validationErrorResponse(res, "All fields are required", 400);
    }

    // Image Handling
    let image = null;
    if (req.file && req.file.filename) {
      image = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    } else {
      return validationErrorResponse(res, "Product image is required", 400);
    }

    const product = new Product({
      title,
      description,
      stock,
      amount,
      superCategory,
      subcategory,
      category,
      image,
    });

    await product.save();

    return successResponse(res, "Product added successfully", 201, product);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getAllProducts = catchAsync(async (req, res) => {
  try {
    const products = await Product.find()
      .populate("superCategory")
      .populate("subcategory")
      .populate("category")
      .sort({ createdAt: -1 });

    return successResponse(res, "All products fetched", 200, products);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getProductById = catchAsync(async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("superCategory")
      .populate("subcategory")
      .populate("category");

    if (!product) {
      return errorResponse(res, "Product not found", 404);
    }

    return successResponse(res, "Product fetched successfully", 200, product);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.updateProduct = catchAsync(async (req, res) => {
  try {
    const id = req.params.id;

    const product = await Product.findById(id);
    if (!product || product.deletedAt) {
      return validationErrorResponse(res, "Product not found", 404);
    }

    const {
      title,
      description,
      stock,
      amount,
      superCategory,
      subcategory,
      category
    } = req.body;

    if (title) product.title = title;
    if (description) product.description = description;
    if (stock) product.stock = stock;
    if (amount) product.amount = amount;
    if (superCategory) product.superCategory = superCategory;
    if (subcategory) product.subcategory = subcategory;
    if (category) product.category = category;

    // Image handling
    if (req.file && req.file.filename) {
      if (product.image) {
        try {
          await deleteUploadedFiles([product.image]);
        } catch (err) {
          console.log("Error deleting old product image:", err.message);
        }
      }

      const newImageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      product.image = newImageUrl;
    }

    const updatedProduct = await product.save();

    return successResponse(res, "Product updated successfully", 200, updatedProduct);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.deleteProduct = catchAsync(async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findById(id);

    if (!product) {
      return validationErrorResponse(res, "Product not found", 404);
    }

    if (product.deletedAt) {
      product.deletedAt = null;
      await product.save();
      return successResponse(res, "Product restored successfully", 200);
    }

    product.deletedAt = new Date();
    await product.save();

    return successResponse(res, "Product deleted successfully", 200);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});