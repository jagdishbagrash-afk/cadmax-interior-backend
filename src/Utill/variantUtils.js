/**
 * Backend Variant Utility
 * 
 * Handles variant combination validation and stock management
 * for the backend controllers.
 */

/**
 * Validate stock for a variant combination
 * 
 * @param {Object} product - Full product document from MongoDB
 * @param {Object} options - Selection options
 * @param {string} options.color - Selected color variant
 * @param {string} [options.sectionTitle] - Selected price section title
 * @param {string} [options.sizeTitle] - Selected size title
 * @param {number} [options.quantity=1] - Requested quantity
 * @returns {Object} { valid: boolean, message: string }
 */
function validateStock(product, options = {}) {
  const {
    color,
    sectionTitle,
    sizeTitle,
    quantity = 1,
  } = options;

  if (!product) {
    return { valid: false, message: "Product not found" };
  }

  const qty = Number(quantity) || 1;

  // Find the color variant
  const normalizedColor = (color || "").toLowerCase().trim();
  const variant = product.variants.find(
    (v) => v.color.toLowerCase().trim() === normalizedColor
  );

  if (!variant) {
    return { valid: false, message: `Variant '${color}' not found` };
  }

  const availableStock = Number(variant.stock) || 0;

  if (availableStock <= 0) {
    return { valid: false, message: `This combination is out of stock` };
  }

  if (qty > availableStock) {
    return {
      valid: false,
      message: `Only ${availableStock} items available in stock`,
    };
  }

  return { valid: true, message: "Stock available" };
}

/**
 * Resolve variant combination details from product
 * 
 * @param {Object} product - Full product document
 * @param {Object} options - Selection options
 * @param {string} options.color - Selected color
 * @param {string} [options.sectionTitle] - Selected section title
 * @param {string} [options.sizeTitle] - Selected size title
 * @returns {Object} Resolved combination info
 */
function resolveVariantCombination(product, options = {}) {
  const { color, sectionTitle, sizeTitle } = options;

  const normalizedColor = (color || "").toLowerCase().trim();
  const variant = product.variants.find(
    (v) => v.color.toLowerCase().trim() === normalizedColor
  );

  let selectedSection = null;
  let selectedSize = null;

  if (sectionTitle && product.product_price_section?.length) {
    const normalizedSection = sectionTitle.toLowerCase().trim();
    selectedSection = product.product_price_section.find(
      (s) => s.title.toLowerCase().trim() === normalizedSection
    );

    if (selectedSection?.sizes?.length && sizeTitle) {
      const normalizedSize = sizeTitle.toLowerCase().trim();
      selectedSize = selectedSection.sizes.find(
        (s) => s.title.toLowerCase().trim() === normalizedSize
      );
    }
  }

  return {
    variant,
    selectedSection,
    selectedSize,
  };
}

module.exports = {
  validateStock,
  resolveVariantCombination,
};