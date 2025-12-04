const Product = require("../Model/Product");
const CatchAsync = require("../Utill/catchAsync");
const { successResponse, errorResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const { deleteFile } = require("../Utill/S3");

exports.addProduct = CatchAsync(async (req, res) => {
  try {
    // 1️⃣ Parse variants
    let variants = [];
    if (req.body.variants) {
      variants = JSON.parse(req.body.variants);
    }

    if (!variants.length) {
      return validationErrorResponse(res, "At least one variant is required", 400);
    }

    // 2️⃣ Group images by color
    const variantImageMap = {};
    req.files.forEach(file => {
      // fieldname = variantImages_red
      const color = file.fieldname.replace("variantImages_", "");

      if (!variantImageMap[color]) {
        variantImageMap[color] = [];
      }

      variantImageMap[color].push(file.location);
    });

    // 3️⃣ Attach images to variants
    const finalVariants = variants.map(v => {
      const colorKey = v.color.toLowerCase();

      return {
        color: colorKey,
        stock: Number(v.stock) || 0,
        images: variantImageMap[colorKey] || []
      };
    });

    // 4️⃣ Validate each variant has images
    for (const v of finalVariants) {
      if (!v.images.length) {
        return validationErrorResponse(
          res,
          `Images required for color: ${v.color}`,
          400
        );
      }
    }

    const newProduct = new Product({
      title: req.body.title?.[0] || "",
      description: req.body.description?.[0] || "",
      amount: Number(req.body.amount?.[0]) || "",
      category: req.body.category?.[0] || "",
      subcategory: req.body.subcategory?.[0] || "",
      dimensions: req.body.dimensions?.[0] || "",
      material: req.body.material?.[0] || "",
      type: req.body.type?.[0] || "",
      terms: req.body.terms?.[0] || "",
      variants: finalVariants
    });

    await newProduct.save();

    return successResponse(
      res,
      "Product added successfully",
      201,
      newProduct
    );

  } catch (error) {
    console.error(error);
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
  const productId = req.params.id;

  const product = await Product.findById(productId);
  if (!product) {
    return validationErrorResponse(res, "Product not found", 404);
  }

  const value = v => Array.isArray(v) ? v[0] : v;

  /* ------------------ 1️⃣ Basic fields ------------------ */

  const fields = [
    "title",
    "description",
    "amount",
    "subcategory",
    "category",
    "dimensions",
    "material",
    "type",
    "terms"
  ];

  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      product[f] = value(req.body[f]);
    }
  });

  /* ------------------ 2️⃣ Main image ------------------ */

  const mainImageFile = req.files?.find(f => f.fieldname === "image");
  if (mainImageFile) {
    if (product.image) {
      await deleteFile(product.image);
    }
    product.image = mainImageFile.location;
  }

  /* ------------------ 3️⃣ Parse variants ------------------ */

  let incomingVariants = [];
  if (req.body.variants) {
    try {
      incomingVariants = JSON.parse(req.body.variants).map(v => ({
        ...v,
        color: v.color.toLowerCase()
      }));
    } catch {
      return validationErrorResponse(res, "Invalid variants data", 400);
    }
  }

  /* ------------------ 4️⃣ Map uploaded images ------------------ */

  const uploadedImagesByColor = {};

  req.files?.forEach(file => {
    if (!file.fieldname.startsWith("variantImages_")) return;

    const color = file.fieldname.replace("variantImages_", "").toLowerCase();

    if (!uploadedImagesByColor[color]) {
      uploadedImagesByColor[color] = [];
    }

    uploadedImagesByColor[color].push(file.location);
  });

  /* ------------------ 5️⃣ Delete removed colors ------------------ */

  const incomingColors = incomingVariants.map(v => v.color);

  const removedVariants = product.variants.filter(
    v => !incomingColors.includes(v.color)
  );

  for (const v of removedVariants) {
    await Promise.all(
      (v.images || []).map(img => deleteFile(img))
    );
  }

  /* ------------------ 6️⃣ Build final variants ------------------ */

  const finalVariants = [];

  for (const incoming of incomingVariants) {
    const existing = product.variants.find(
      v => v.color === incoming.color
    );

    const existingImages = existing?.images || [];
    const keptImages = incoming.images || [];
    const newImages = uploadedImagesByColor[incoming.color] || [];

    // delete removed images
    await Promise.all(
      existingImages
        .filter(img => !keptImages.includes(img))
        .map(img => deleteFile(img))
    );

    finalVariants.push({
      color: incoming.color,
      stock: Number(incoming.stock) || 0,
      images: [...keptImages, ...newImages]
    });
  }

  product.variants = finalVariants;

  /* ------------------ 7️⃣ Save ------------------ */

  const updatedProduct = await product.save();

  return successResponse(
    res,
    "Product updated successfully",
    200,
    updatedProduct
  );
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

exports.getProductByCategory = CatchAsync(async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return validationErrorResponse(res, "Id is required", 400);
    }

    const products = await Product.find({
      category: id,
      deletedAt: null
    })
      .populate("subcategory")
      .populate("category")
      .sort({ createdAt: -1 });

    const subCategoryMap = new Map();
    products.forEach(product => {
      if (product.subcategory?._id) {
        subCategoryMap.set(
          product.subcategory._id.toString(),
          {
            _id: product.subcategory._id,
            name: product.subcategory.name
          }
        );
      }
    });

    const uniqueSubcategories = Array.from(subCategoryMap.values());

    return successResponse(res, "Products and subcategories fetched", 200, {
        products,
        subcategories: uniqueSubcategories
      });
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getProductBySubCategory = CatchAsync(async (req, res) => {
  try {
    const { id } = req.params; 
    const products = await Product.find({
      subcategory: id,
      deletedAt: null
    })
      .populate("subcategory")
      .populate("category")
      .sort({ createdAt: -1 });
    return successResponse(res, "Products fetched by category", 200, products);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});