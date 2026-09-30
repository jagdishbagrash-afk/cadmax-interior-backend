const assert = require("node:assert/strict");
const {
  formatOrderDetailsForWeb,
  formatOrderDetailsForApp,
} = require("../src/Utill/orderDetailsFormatter");

const order = {
  orderId: "ORD-TEST",
  status: "confirmed",
  shipping_status: "pending",
  createdAt: "2026-09-28T10:00:00.000Z",
  product: [],
  amount: 0,
};

const pickedUp = { liveTracking: { status: "Shipment Picked Up" } };
const webPickedUp = formatOrderDetailsForWeb(order, pickedUp);
const appPickedUp = formatOrderDetailsForApp(order, pickedUp);

assert.equal(webPickedUp.stepperTimeline[2].completed, true);
assert.equal(webPickedUp.stepperTimeline[3].completed, false);
assert.equal(appPickedUp.data.timeline[2].isCompleted, true);
assert.equal(appPickedUp.data.timeline[3].isCompleted, false);

const pickedUpWithScan = {
  liveTracking: {
    status: "SHIPMENT PICKED UP",
    events: [
      {
        status: "SHIPMENT PICKED UP",
        timestamp: "2026-09-30T15:23:00",
      },
    ],
  },
};
const webScanTimeline = formatOrderDetailsForWeb(order, pickedUpWithScan).stepperTimeline;
const appScanTimeline = formatOrderDetailsForApp(order, pickedUpWithScan).data.timeline;

assert.equal(webScanTimeline[2].timestamp, "30 Sep, 3:23 PM");
assert.equal(appScanTimeline[2].timestamp, "30 Sep, 3:23 PM");

const outForDelivery = { liveTracking: { status: "Out for Delivery" } };
assert.equal(formatOrderDetailsForWeb(order, outForDelivery).stepperTimeline[3].completed, true);
assert.equal(formatOrderDetailsForApp(order, outForDelivery).data.timeline[3].isCompleted, true);

console.log("orderDetailsFormatter tracking status checks passed");