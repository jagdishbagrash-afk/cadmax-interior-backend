const { createBlueDartWaybill, trackBlueDartShipment } = require("./blueDartService");

const calculateTotalAmount = (products) => {
  if (!Array.isArray(products)) {
    return 0;
  }
  return products.reduce((sum, p) => sum + (Number(p?.price) || 0), 0);
};

async function createBlueDartShipment({ name, mobile, address, products = [] }) {
  const declaredValue = calculateTotalAmount(products);

  const result = await createBlueDartWaybill({
    orderId: "",
    name,
    mobile,
    receiverAddress: address,
    products,
    declaredValue,
    isCod: false,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    data: result.data,
    trackingNumber: result.awbNumber,
  };
}

module.exports = { createBlueDartShipment, trackBlueDartShipment };
