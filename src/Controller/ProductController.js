const Product = require("../Model/Product");
const CatchAsync = require("../Utill/catchAsync");
const { successResponse, errorResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const { deleteFile } = require("../Utill/S3");
const User = require("../Model/User");
const sendNotification = require("./sendNotification");
const { sendPushNotification } = require("../Utill/notificationService");
const makeSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\_]+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

const generateUniqueSlug = async (Model, title) => {
  let baseSlug = makeSlug(title);
  let slug = baseSlug;
  let counter = 1;

  while (await Model.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};



exports.addProduct = CatchAsync(async (req, res) => {
  try {
    let variants = [];
    if (req.body.variants) {
      variants = JSON.parse(req.body.variants);
    }

    if (!variants.length) {
      return validationErrorResponse(res, "At least one variant is required", 400);
    }

    let productPriceSection = [];
    if (req.body.product_price_section) {
      productPriceSection = JSON.parse(req.body.product_price_section);
    }

    const variantImageMap = {};

    req.files.forEach((file) => {
      const parts = file.fieldname.split("_");
      const color = parts[1];
      const index = Number(parts[2]);

      if (!variantImageMap[color]) {
        variantImageMap[color] = [];
      }

      variantImageMap[color].push({
        index,
        url: file.location,
      });
    });

    Object.keys(variantImageMap).forEach((color) => {
      variantImageMap[color] = variantImageMap[color]
        .sort((a, b) => a.index - b.index)
        .map((img) => img.url);
    });

    const finalVariants = variants.map(v => {
      const colorKey = v.color.toLowerCase();
      return {
        title: v.title || `${v.color} Variant`,
        color: colorKey,
        stock: Number(v.stock) || 0,
        images: variantImageMap[colorKey] || []
      };
    });

    for (const v of finalVariants) {
      if (!v.images.length) {
        return validationErrorResponse(
          res,
          `Images required for color: ${v.color}`,
          400
        );
      }
    }

    console.log("productPriceSection", productPriceSection);

    // Updated validation: allow amount = 0, reject only negative
    if (productPriceSection.length > 0) {
      for (const section of productPriceSection) {
        if (!section.title) {
          return validationErrorResponse(
            res,
            "Each price section must have a title",
            400
          );
        }
        // Reject only if amount is undefined, null, or negative
        if (section.amount === undefined || section.amount === null || section.amount < 0) {
          return validationErrorResponse(
            res,
            `Valid amount required for section: ${section.title} (must be >= 0)`,
            400
          );
        }
        
        // Validate sizes if they exist
        if (section.sizes && section.sizes.length > 0) {
          for (const size of section.sizes) {
            if (!size.title) {
              return validationErrorResponse(
                res,
                `Each size in section "${section.title}" must have a title`,
                400
              );
            }
            if (size.amount === undefined || size.amount === null || size.amount < 0) {
              return validationErrorResponse(
                res,
                `Valid amount required for size "${size.title}" in section "${section.title}" (must be >= 0)`,
                400
              );
            }
          }
        }
      }
    }

    console.log("req.body", req.body);

    const slug = await generateUniqueSlug(Product, req.body.title?.[0]);

    const newProduct = new Product({
      title: req.body.title?.[0] || "",
      slug: slug,
      description: req.body.description?.[0] || "",
      amount: Number(req.body.amount?.[0]) || 0,
      discount_amount: Number(req.body.discount_amount?.[0]) || 10,
      category: req.body.category?.[0] || "",
      subcategory: req.body.subcategory?.[0] || "",
      subsubcategory: req.body.subsubcategory?.[0] || "",
      dimensions: req.body.dimensions?.[0] || "",
      material: req.body.material?.[0] || "",
      type: req.body.type?.[0] || "",
      terms: req.body.terms?.[0] || "",
      variants: finalVariants,
      product_price_section: productPriceSection.length > 0 ? productPriceSection : []
    });

    const record = await newProduct.save();

    // Send notifications to customers
    const users = await User.find({
      role: "customer",
      status: "active",
      deleted_at: null,
      fcmToken: { $ne: null }
    }).select("fcmToken");

    const admindata = await User.find({
      role: "admin",
      status: "active",
      deleted_at: null,
    });

    const tokens = users.map(u => u.fcmToken).filter(Boolean);

    if (tokens.length > 0) {
      await sendPushNotification({
        tokens,
        title: "New Product Added 🛍️",
        body: `${record.title} is now available. Check it out!`,
        data: {
          type: "NEW_PRODUCT",
          productId: record._id.toString(),
        },
      });
    }

    return successResponse(
      res,
      "Product added successfully",
      201,
      record
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
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return validationErrorResponse(res, "Product not found", 404);
    }

    let variants = [];
    if (req.body.variants) {
      variants = JSON.parse(req.body.variants);
    }

    let productPriceSection = [];
    if (req.body.product_price_section) {
      productPriceSection = JSON.parse(req.body.product_price_section);
    }

    // Update basic fields
    if (req.body.title) product.title = req.body.title;
    if (req.body.description) product.description = req.body.description;
    if (req.body.amount) product.amount = Number(req.body.amount);
    if (req.body.discount_amount) product.discount_amount = Number(req.body.discount_amount);
    if (req.body.category) product.category = req.body.category;
    if (req.body.subcategory) product.subcategory = req.body.subcategory;
    if (req.body.subsubcategory) product.subsubcategory = req.body.subsubcategory;
    if (req.body.dimensions) product.dimensions = req.body.dimensions;
    if (req.body.material) product.material = req.body.material;
    if (req.body.type) product.type = req.body.type;
    if (req.body.terms) product.terms = req.body.terms;

    // Handle variant images
    const variantImageMap = {};
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const parts = file.fieldname.split("_");
        const color = parts[1];
        const index = Number(parts[2]);

        if (!variantImageMap[color]) {
          variantImageMap[color] = [];
        }

        variantImageMap[color].push({
          index,
          url: file.location,
        });
      });

      Object.keys(variantImageMap).forEach((color) => {
        variantImageMap[color] = variantImageMap[color]
          .sort((a, b) => a.index - b.index)
          .map((img) => img.url);
      });
    }

    // Update variants
    if (variants.length > 0) {
      const updatedVariants = variants.map(v => {
        const colorKey = v.color.toLowerCase();
        const existingVariant = product.variants.find(
          pv => pv.color.toLowerCase() === colorKey
        );

        let images = v.images || [];
        if (variantImageMap[colorKey]) {
          images = [...images, ...variantImageMap[colorKey]];
        }

        return {
          title: v.title || `${v.color} Variant`,
          color: colorKey,
          stock: Number(v.stock) || (existingVariant ? existingVariant.stock : 0),
          images: images
        };
      });

      product.variants = updatedVariants;
    }

    // Update price sections with sizes
    if (productPriceSection.length > 0) {
      for (const section of productPriceSection) {
        if (!section.title) {
          return validationErrorResponse(
            res,
            "Each price section must have a title",
            400
          );
        }
        // Allow amount = 0, reject only negative numbers
        if (section.amount === undefined || section.amount === null || section.amount < 0) {
          return validationErrorResponse(
            res,
            `Valid amount required for section: ${section.title} (must be >= 0)`,
            400
          );
        }
        
        // Validate sizes if they exist
        if (section.sizes && section.sizes.length > 0) {
          for (const size of section.sizes) {
            if (!size.title) {
              return validationErrorResponse(
                res,
                `Each size in section "${section.title}" must have a title`,
                400
              );
            }
            // Allow size amount = 0, reject only negative
            if (size.amount === undefined || size.amount === null || size.amount < 0) {
              return validationErrorResponse(
                res,
                `Valid amount required for size "${size.title}" in section "${section.title}" (must be >= 0)`,
                400
              );
            }
          }
        }
      }
      
      product.product_price_section = productPriceSection;
    }

    const record = await product.save();

    return successResponse(
      res,
      "Product updated successfully",
      200,
      record
    );

  } catch (error) {
    console.error(error);
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
    /* -------------------- PAGINATION -------------------- */
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { color, lowPrice, highPrice } = req.query;




    /* -------------------- BASE FILTER -------------------- */
    const filter = {
      subcategory: id,
      deletedAt: null,
    };

    /* ==================== COLOR FILTER ==================== */
    // variants example:
    // variants: [{ color: "Black" }, { color: "Red" }]

    if (color && color !== "") {
      const colorsArray = color
        .split(",")
        .map((c) => new RegExp(`^${c.trim()}$`, "i")); // case insensitive

      filter.variants = {
        $elemMatch: {
          color: { $in: colorsArray },
        },
      };
    }

    /* ==================== PRICE FILTER ==================== */
    if (lowPrice || highPrice) {
      filter.final_amount = {};

      if (lowPrice) {
        filter.final_amount.$gte = Number(lowPrice);
      }

      if (highPrice) {
        filter.final_amount.$lte = Number(highPrice);
      }
    }

    /* -------------------- DEBUG (OPTIONAL) -------------------- */
    // console.log("Applied Filter:", filter);

    /* ==================== QUERY ==================== */
    const products = await Product.find(filter)
      .populate("subcategory")
      .populate("category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    /* -------------------- COUNT -------------------- */
    const totalRecords = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    /* -------------------- RESPONSE -------------------- */
    return successResponse(res, "Products fetched successfully", 200, {
      data: products || [],
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });

  } catch (error) {
    console.error(error);
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});


exports.getProductByName = CatchAsync(async (req, res) => {
  try {
    const {
      subcategory,
      subsubcategory,
      type,
    } = req.query;

    const slug = req.params.id;
    let product = []

    if (type === "subsubcategory" &&
      subcategory &&
      subsubcategory) {
      product = await Product.findOne({
        subcategory,
        subsubcategory,
        deletedAt: null
      })
        .populate("category")
        .populate("subcategory");
    } else {
      product = await Product.findOne({ slug })
        .populate("category")
        .populate("subcategory");
    }



    if (!product) {
      return errorResponse(
        res,
        `Product not found with filter: ${JSON.stringify(product)}`,
        404
      );
    }

    return successResponse(
      res,
      "Product fetched successfully",
      200,
      product
    );
  } catch (error) {
    console.log(error);

    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});





exports.productcolor = CatchAsync(async (req, res) => {
  try {

    const products = await Product.find().select(
      "variants amount discount_amount final_amount"
    );

    if (!products || products.length === 0) {
      return errorResponse(res, "Product not found", 404);
    }

    const uniqueColors = new Set();
    const prices = [];

    products.forEach((product) => {

      // final price collect
      if (product.final_amount || product.final_amount === 0) {
        prices.push(product.final_amount);
      }

      // color collect
      product.variants.forEach((variant) => {
        if (variant.stock > 1 && variant.color) {
          uniqueColors.add(variant.color);
        }
      });

    });

    const colors = [...uniqueColors];

    const highestPrice = prices.length
      ? Math.max(...prices)
      : 0;

    const lowestPrice = prices.length
      ? Math.min(...prices)
      : 0;

    return successResponse(res, "Data fetched successfully", 200, {
      colors,
      highestPrice,
      lowestPrice,
    });

  } catch (error) {
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
}); 
