const Product = require("../Model/Product");
const CatchAsync = require("../Utill/catchAsync");
const { successResponse, errorResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const deleteUploadedFiles = require("../Utill/fileDeleter");

exports.addProduct = CatchAsync(async (req, res) => {
  try {
    const {
      title,
      description,
      stock,
      amount,
      subcategory,
      category,
      dimensions,
      material,
      product,
      terms
    } = req.body;

    // Validation
    if (!title || !description || !stock || !amount || !subcategory || !category || !dimensions || !material || !product || !terms) {
      return validationErrorResponse(res, "All fields are required", 400);
    }

    // Image Handling
    let image = null;
    if (req.file && req.file.filename) {
      image = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    } else {
      return validationErrorResponse(res, "Product image is required", 400);
    }

    const newProduct = new Product({
      title,
      description,
      stock,
      amount,
      subcategory,
      category,
      dimensions,
      material,
      product,
      terms,
      image,
    });

    await newProduct.save();

    return successResponse(res, "Product added successfully", 201, newProduct);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getAllProducts = CatchAsync(async (req, res) => {
  try {
    const products = await Product.find()
      .populate("subcategory")
      .populate("category")
      .sort({ createdAt: -1 });

    return successResponse(res, "All products fetched", 200, products);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getProductById = CatchAsync(async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
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

exports.updateProduct = CatchAsync(async (req, res) => {
  try {
    const id = req.params.id;

    const productData = await Product.findById(id);
    if (!productData || productData.deletedAt) {
      return validationErrorResponse(res, "Product not found", 404);
    }

    const {
      title,
      description,
      stock,
      amount,
      subcategory,
      category,
      dimensions,
      material,
      product,
      terms
    } = req.body;

    if (title) productData.title = title;
    if (description) productData.description = description;
    if (stock) productData.stock = stock;
    if (amount) productData.amount = amount;
    if (subcategory) productData.subcategory = subcategory;
    if (category) productData.category = category;
    if (dimensions) productData.dimensions = dimensions;
    if (material) productData.material = material;
    if (product) productData.product = product;
    if (terms) productData.terms = terms;

    // Image Handling
    if (req.file && req.file.filename) {
      try {
        if (productData.image) {
          await deleteUploadedFiles([productData.image]);
        }
      } catch (err) {
        console.log("Error deleting old product image:", err.message);
      }

      const newImageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      productData.image = newImageUrl;
    }

    const updatedProduct = await productData.save();

    return successResponse(res, "Product updated successfully", 200, updatedProduct);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.deleteProduct = CatchAsync(async (req, res) => {
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