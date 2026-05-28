// services/blueDartService.js
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");

const BLUE_DART_LOGIN_ID = process.env.BLUE_DART_LOGIN_ID;
const BLUE_DART_LICENCE_KEY = process.env.BLUE_DART_LICENCE_KEY;
const BLUE_DART_API_BASE = "https://apigateway.bluedart.com/in/transportation";

async function getBlueDartToken() {
  try {
    const payload = {
      LoginID: BLUE_DART_LOGIN_ID,
      LicenceKey: BLUE_DART_LICENCE_KEY,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
    };
    
    const token = jwt.sign(payload, BLUE_DART_LICENCE_KEY);
    return token;
  } catch (error) {
    console.error("Blue Dart Token Error:", error);
    throw new Error("Unable to authenticate with Blue Dart");
  }
}

// 2. Create Shipment (Waybill Generation)
async function createBlueDartShipment({ name, mobile, address, products = [] }) {
  try {
    const token = await getBlueDartToken();
    
    // Parse address
    let addressObj = parseAddress(address);
    
    const shipmentPayload = {
      ConsignmentDetails: {
        PickupDate: new Date().toISOString().split('T')[0],
        ProductCode: "EXP", // Express shipment
        DeclaredValue: calculateTotalAmount(products),
        ActualWeight: calculateTotalWeight(products)
      },
      ConsigneeDetails: {
        ConsigneeName: name,
        AddressLine1: addressObj.street,
        City: addressObj.city,
        State: addressObj.state,
        Pincode: addressObj.pincode,
        MobileNo: mobile
      }
    };
    
    const response = await fetch(`${BLUE_DART_API_BASE}/waybill/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(shipmentPayload)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.ErrorMessage || "Shipment creation failed" };
    }
    
    return {
      success: true,
      data: {
        trackingNumber: data.AwbNumber,
        waybillNumber: data.AwbNumber,
        labelUrl: data.LabelURL,
        status: "Created"
      }
    };
    
  } catch (error) {
    console.error("Create Blue Dart Shipment Error:", error);
    return { success: false, error: error.message };
  }
}

// 3. Track Shipment
async function trackBlueDartShipment(trackingNumber) {
  try {
    const token = await getBlueDartToken();
    
    const response = await fetch(
      `${BLUE_DART_API_BASE}/tracking/v1?awb=${trackingNumber}&scan=1`,
      {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: "Tracking failed" };
    }
    
    // Format tracking events
    const events = (data.Scans || []).map(scan => ({
      status: scan.Status,
      location: scan.Location,
      timestamp: scan.ScanDateTime,
      remarks: scan.Remarks
    }));
    
    return {
      success: true,
      trackingNumber,
      status: data.CurrentStatus,
      events: events
    };
    
  } catch (error) {
    console.error("Blue Dart Tracking Error:", error);
    return { success: false, error: error.message };
  }
}

// Helper functions
function parseAddress(address) {
  if (typeof address === "string") {
    const parts = address.split(",").map(p => p.trim());
    return {
      street: parts[0] || "",
      city: parts[1] || parts[2] || "",
      state: parts[2] || "",
      pincode: parts[3] || parts[4] || "",
      country: "IN"
    };
  }
  return address;
}

function calculateTotalWeight(products) {
  return products.reduce((sum, p) => sum + (p.weight || 0.5), 1.0);
}

function calculateTotalAmount(products) {
  return products.reduce((sum, p) => sum + (p.price || 0), 0);
}

module.exports = { createBlueDartShipment, trackBlueDartShipment };