const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

/**
 * Format currency with Indian Rupee formatting
 */
const formatINR = (amount) => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format Date cleanly
 */
const formatDate = (dateInput) => {
  if (!dateInput) return new Date().toLocaleDateString("en-IN");
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = d.getDate();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Generate PDF Invoice Document and pipe into express response or stream
 */
function generateOrderInvoicePdf(order, res) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  // Set response headers if express res object
  const filename = `Invoice-${order.orderId || "Order"}.pdf`;
  if (typeof res.setHeader === "function") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  }

  doc.pipe(res);

  const primaryColor = "#0f172a";   // Dark slate blue
  const accentColor = "#0284c7";    // Ocean blue accent
  const lightBg = "#f8fafc";        // Slate light background
  const tableHeaderBg = "#1e293b";  // Dark header background
  const borderColor = "#cbd5e1";    // Slate border

  // ==========================================
  // HEADER SECTION (LOGO & COMPANY DETAILS)
  // ==========================================
  const logoPath = path.join(__dirname, "../logo.png");
  let headerLeftX = 40;
  
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 40, 35, { width: 120 });
      headerLeftX = 170;
    } catch (e) {
      console.warn("Could not load logo image for PDF:", e.message);
    }
  }

  // Company Name & Info on Right
  doc
    .fillColor(primaryColor)
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("CADMAX INTERIOR", 320, 35, { align: "right" });

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#475569")
    .text("Cadmax Interior Design & Furnishings Pvt. Ltd.", 320, 58, { align: "right" })
    .text("Email: support@cadmaxinterior.com", 320, 71, { align: "right" })
    .text("Phone: +91 98765 43210 | Web: www.cadmax.com", 320, 84, { align: "right" });

  // Horizontal Divider Line
  doc
    .moveTo(40, 108)
    .lineTo(555, 108)
    .strokeColor(borderColor)
    .lineWidth(1)
    .stroke();

  // ==========================================
  // INVOICE TITLE & SUMMARY BANNER
  // ==========================================
  doc.rect(40, 118, 515, 32).fill(lightBg);

  doc
    .fillColor(primaryColor)
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("TAX INVOICE", 52, 126);

  doc
    .fillColor(accentColor)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(`NO: ${order.orderId || "N/A"}`, 400, 127, { align: "right" });

  // ==========================================
  // TWO COLUMN DETAILS: INVOICE INFO & BILLED TO
  // ==========================================
  const startY = 162;

  // Left Column: Invoice & Order Metadata
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text("INVOICE DETAILS", 40, startY);

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#475569")
    .text(`Invoice Date: `, 40, startY + 16, { continued: true })
    .font("Helvetica-Bold").fillColor(primaryColor).text(formatDate(order.createdAt))
    
    .font("Helvetica").fillColor("#475569")
    .text(`Order Status: `, 40, startY + 30, { continued: true })
    .font("Helvetica-Bold").fillColor(primaryColor).text((order.status || "Pending").toUpperCase())
    
    .font("Helvetica").fillColor("#475569")
    .text(`Payment Method: `, 40, startY + 44, { continued: true })
    .font("Helvetica-Bold").fillColor(primaryColor).text((order.paymentMethod || "ONLINE").toUpperCase())
    
    .font("Helvetica").fillColor("#475569")
    .text(`Transaction ID: `, 40, startY + 58, { continued: true })
    .font("Helvetica-Bold").fillColor(primaryColor).text(order.PaymentId || "N/A");

  if (order.tracking_number) {
    doc
      .font("Helvetica").fillColor("#475569")
      .text(`Courier & Tracking: `, 40, startY + 72, { continued: true })
      .font("Helvetica-Bold").fillColor(accentColor).text(`${order.courier_name || "Courier"} (${order.tracking_number})`);
  }

  // Right Column: Customer & Shipping Details
  const rightX = 310;
  const shipAddr = order.shippingAddress || {};
  const customerName = shipAddr.name || order.name || "Valued Customer";
  const customerPhone = shipAddr.mobile || order.mobile ? `+91 ${shipAddr.mobile || order.mobile}` : "N/A";
  
  const addressLines = [];
  if (shipAddr.street_address) addressLines.push(shipAddr.street_address);
  if (shipAddr.city || shipAddr.state || shipAddr.pincode) {
    addressLines.push([shipAddr.city, shipAddr.state, shipAddr.pincode].filter(Boolean).join(", "));
  }
  if (!addressLines.length && order.address) {
    addressLines.push(order.address);
  }

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text("BILLED / SHIPPED TO", rightX, startY);

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text(customerName, rightX, startY + 16);

  doc
    .font("Helvetica")
    .fillColor("#475569")
    .text(`Phone: ${customerPhone}`, rightX, startY + 30);

  let addrY = startY + 44;
  addressLines.forEach((line) => {
    doc.text(line, rightX, addrY, { width: 240 });
    addrY += 13;
  });

  // ==========================================
  // PRODUCTS TABLE
  // ==========================================
  let tableTop = Math.max(startY + 95, addrY + 15);

  // Table Header Box
  doc.rect(40, tableTop, 515, 24).fill(tableHeaderBg);

  doc
    .fillColor("#ffffff")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("#", 48, tableTop + 7)
    .text("PRODUCT / ITEM DESCRIPTION", 75, tableTop + 7)
    .text("QTY", 330, tableTop + 7, { width: 40, align: "center" })
    .text("PRICE", 385, tableTop + 7, { width: 75, align: "right" })
    .text("TOTAL", 470, tableTop + 7, { width: 75, align: "right" });

  let rowY = tableTop + 24;
  const products = order.product || [];

  products.forEach((item, index) => {
    const itemTotal = item.total || (item.price * item.quantity);
    const prodRef = item.id && typeof item.id === "object" ? item.id : null;
    const title = item.title || prodRef?.title || "Item";
    const variantStr = item.variant || item.variantTitle ? `Variant: ${item.variant || item.variantTitle}` : null;

    // Alternate background shading
    if (index % 2 === 1) {
      doc.rect(40, rowY, 515, variantStr ? 32 : 24).fill("#f1f5f9");
    }

    doc
      .fillColor(primaryColor)
      .fontSize(9)
      .font("Helvetica")
      .text(`${index + 1}`, 48, rowY + 7)
      .font("Helvetica-Bold")
      .text(title, 75, rowY + 7, { width: 240, height: 14, ellipsis: true })
      .font("Helvetica")
      .text(`${item.quantity}`, 330, rowY + 7, { width: 40, align: "center" })
      .text(formatINR(item.price), 385, rowY + 7, { width: 75, align: "right" })
      .font("Helvetica-Bold")
      .text(formatINR(itemTotal), 470, rowY + 7, { width: 75, align: "right" });

    if (variantStr) {
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#64748b")
        .text(variantStr, 75, rowY + 19);
      rowY += 32;
    } else {
      rowY += 24;
    }

    // Border line beneath row
    doc
      .moveTo(40, rowY)
      .lineTo(555, rowY)
      .strokeColor("#e2e8f0")
      .lineWidth(0.5)
      .stroke();
  });

  // ==========================================
  // FINANCIAL BREAKDOWN & SUMMARY BOX
  // ==========================================
  const summaryTop = rowY + 15;
  const totalAmount = Number(order.amount) || 0;
  const subtotal = Math.round(totalAmount * 0.898);
  const gstTax = Math.round(subtotal * 0.0734);
  const shippingFee = Math.max(0, totalAmount - (subtotal + gstTax));

  // Left Note Box
  doc.rect(40, summaryTop, 260, 85).fill(lightBg);
  doc
    .fillColor(primaryColor)
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("TERMS & CONDITIONS", 50, summaryTop + 10)
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#475569")
    .text("1. All sales are subject to Cadmax Interior standard policies.", 50, summaryTop + 25)
    .text("2. This is a computer-generated tax invoice and requires no physical signature.", 50, summaryTop + 37, { width: 240 })
    .text("3. For warranty or returns, contact support@cadmaxinterior.com.", 50, summaryTop + 59, { width: 240 });

  // Right Summary Table
  const sumRightX = 320;
  let sumY = summaryTop;

  const drawSummaryRow = (label, val, isBold = false) => {
    doc
      .fontSize(9)
      .font(isBold ? "Helvetica-Bold" : "Helvetica")
      .fillColor(isBold ? primaryColor : "#475569")
      .text(label, sumRightX, sumY, { width: 130 })
      .text(val, sumRightX + 130, sumY, { width: 105, align: "right" });
    sumY += 18;
  };

  drawSummaryRow("Subtotal (Excl. Tax):", formatINR(subtotal));
  drawSummaryRow("Estimated GST (18%):", formatINR(gstTax));
  drawSummaryRow("Shipping & Handling:", shippingFee > 0 ? formatINR(shippingFee) : "FREE");

  // Horizontal divider before total
  doc
    .moveTo(sumRightX, sumY - 4)
    .lineTo(555, sumY - 4)
    .strokeColor(primaryColor)
    .lineWidth(1)
    .stroke();

  // Grand Total Row Highlight
  doc.rect(sumRightX - 5, sumY - 2, 240, 24).fill(accentColor);
  doc
    .fillColor("#ffffff")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("GRAND TOTAL:", sumRightX + 5, sumY + 4)
    .text(formatINR(totalAmount), sumRightX + 110, sumY + 4, { width: 120, align: "right" });

  // ==========================================
  // FOOTER SECTION
  // ==========================================
  const pageHeight = doc.page.height;
  doc
    .moveTo(40, pageHeight - 50)
    .lineTo(555, pageHeight - 50)
    .strokeColor(borderColor)
    .lineWidth(0.5)
    .stroke();

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#94a3b8")
    .text("Thank you for choosing Cadmax Interior!", 40, pageHeight - 40, { align: "center" })
    .text("Cadmax Interior Design & Furnishings | www.cadmax.com", 40, pageHeight - 28, { align: "center" });

  doc.end();
}

module.exports = {
  generateOrderInvoicePdf,
};
