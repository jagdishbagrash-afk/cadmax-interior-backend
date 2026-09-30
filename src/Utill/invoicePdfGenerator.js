const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const hasCloudStorageConfig = () =>
  Boolean(
    (process.env.S3_BUCKET_NAME && process.env.S3_BUCKET_NAME !== "your_s3_bucket_name") ||
    process.env.AWS_REGION ||
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_SECRET_ACCESS_KEY
  );

function ensureLocalInvoiceDir() {
  const localInvoiceDir = path.join(process.cwd(), "uploads", "invoices");
  fs.mkdirSync(localInvoiceDir, { recursive: true });
  return localInvoiceDir;
}

const toCloudflareInvoiceUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;

  const cfDomain = (
    process.env.CLOUDFLARE_INVOICE_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_CDN_URL ||
    process.env.CLOUDFLARE_DOMAIN ||
    process.env.CLOUDFLARE_URL ||
    process.env.CLOUDFLARE_BASE_URL ||
    process.env.CDN_URL ||
    ""
  ).trim().replace(/\/+$/, "");

  if (!cfDomain) return rawUrl;

  if (rawUrl.startsWith(cfDomain)) return rawUrl;

  const s3Match = rawUrl.match(/https?:\/\/[^\/]+\.s3[^\/]*\/(.+)$/);
  if (s3Match && s3Match[1]) {
    return `${cfDomain}/${s3Match[1]}`;
  }

  if (rawUrl.startsWith("/")) {
    return `${cfDomain}${rawUrl}`;
  }

  return rawUrl;
};

async function uploadInvoicePdfToCloud(filePath, fileName = path.basename(filePath)) {
  if (!hasCloudStorageConfig()) {
    return null;
  }

  try {
    const pdfBuffer = fs.readFileSync(filePath);
    const safeFileName = String(fileName).replace(/\s+/g, "-");
    const key = `cadmax-interior-invoices/${Date.now()}-${safeFileName}`;

    const bucket = (process.env.S3_BUCKET_NAME && process.env.S3_BUCKET_NAME !== "your_s3_bucket_name")
      ? process.env.S3_BUCKET_NAME
      : "cadmaxpro-buket";
    const region = process.env.AWS_REGION || "ap-south-1";

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: pdfBuffer,
        ContentType: "application/pdf",
        ContentDisposition: "inline",
        ACL: "public-read",
      })
    );

    const rawCloudUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    return toCloudflareInvoiceUrl(rawCloudUrl);
  } catch (error) {
    console.error("Cloud invoice upload failed:", error);
    return null;
  }
}

/**
 * Format currency safely for PDF (using Rs. instead of ₹ to prevent font encoding errors)
 */
const formatINR = (amount) => {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Clean & sanitize text strings for PDFKit standard fonts
 */
const cleanText = (str) => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/₹/g, "Rs. ")
    .replace(/[^\x00-\x7F]/g, "")
    .trim();
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
  return new Promise((resolve, reject) => {
    try {
      const orderIdentifier = order.orderId || order._id || "Order";
      const cleanId = String(orderIdentifier).replace(/^#/, "").replace(/[^\w-]/g, "");
      const filename = `Invoice-${cleanId}.pdf`;
      const localInvoiceDir = ensureLocalInvoiceDir();
      const pdfPath = path.join(localInvoiceDir, `${Date.now()}-${filename}`);

      if (res && typeof res.setHeader === "function") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
      }

      const doc = new PDFDocument({ margin: 25, size: "A4" });
      const writeStream = fs.createWriteStream(pdfPath);

      if (res && typeof doc.pipe === "function") {
        doc.pipe(res);
      }

      doc.pipe(writeStream);
      writeStream.on("finish", () => resolve(pdfPath));
      writeStream.on("error", reject);
      doc.on("error", reject);

      const primaryColor = "#0f172a";
      const accentColor = "#0284c7";
      const lightBg = "#f8fafc";
      const tableHeaderBg = "#1e293b";
      const borderColor = "#cbd5e1";

      const shipAddr = order.shippingAddress || {};
      const customerName = cleanText(shipAddr.name || order.name || order.userId?.name || "Valued Customer");
      const rawMobile = shipAddr.mobile || order.mobile || order.userId?.mobile;
      const customerPhone = rawMobile ? `+91 ${cleanText(rawMobile)}` : "N/A";
      const addressLines = [];

      if (shipAddr.street_address) addressLines.push(cleanText(shipAddr.street_address));
      if (shipAddr.city || shipAddr.state || shipAddr.pincode) {
        addressLines.push([shipAddr.city, shipAddr.state, shipAddr.pincode].filter(Boolean).map(cleanText).join(", "));
      }
      if (!addressLines.length && order.address) {
        addressLines.push(cleanText(order.address));
      }

      const products = Array.isArray(order.product || order.products || order.items)
        ? (order.product || order.products || order.items)
        : [];

      doc.fillColor(primaryColor).fontSize(18).font("Helvetica-Bold").text("CADMAX INTERIOR", { align: "right" });
      doc.fillColor("#475569").fontSize(9).font("Helvetica").text("Cadmax Interior Design & Furnishings Pvt. Ltd.", { align: "right" });
      doc.text("Email: support@cadmaxinterior.com", { align: "right" });
      doc.text("Phone: +91 98765 43210 | Web: www.cadmax.com", { align: "right" });
      doc.moveTo(40, 95).lineTo(555, 95).strokeColor(borderColor).lineWidth(1).stroke();

      doc.rect(40, 105, 515, 26).fill(lightBg);
      doc.fillColor(primaryColor).fontSize(14).font("Helvetica-Bold").text("TAX INVOICE", 52, 111);
      doc.fillColor(accentColor).fontSize(11).font("Helvetica-Bold").text(`NO: ${cleanText(order.orderId || order._id || "N/A")}`, 400, 112, { align: "right" });

      let y = 145;
      doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor).text("ORDER & PAYMENT DETAILS", 40, y);
      doc.fontSize(9).font("Helvetica").fillColor("#475569").text(`Invoice Date: ${formatDate(order.createdAt)}`, 40, y + 16);
      doc.text(`Order Status: ${cleanText((order.status || "Pending").toUpperCase())}`, 40, y + 28);
      doc.text(`Payment Method: ${cleanText((order.paymentMethod || "ONLINE").toUpperCase())}`, 40, y + 40);
      doc.text(`Transaction ID: ${cleanText(order.PaymentId || "N/A")}`, 40, y + 52);

      doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor).text("SHIPMENT & TRACKING", 310, y);
      doc.fontSize(9).font("Helvetica").fillColor("#475569").text(`Courier: ${cleanText(order.courier_name || "BLUE_DART")}`, 310, y + 16);
      doc.text(`Tracking No: ${cleanText(order.tracking_number || "N/A")}`, 310, y + 28);
      doc.text(`Shipping Mode: ${cleanText(order.shippingMode || "Express Shipping")}`, 310, y + 40);
      doc.text(`Shipment Status: ${cleanText(order.shipmentStatus || "N/A")}`, 310, y + 52);

      y = 230;
      doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor).text("BILLING ADDRESS", 40, y);
      doc.fontSize(9).font("Helvetica").fillColor("#475569").text(customerName, 40, y + 16);
      doc.text(addressLines[0] || "N/A", 40, y + 28, { width: 220 });
      if (addressLines[1]) { doc.text(addressLines[1], 40, y + 40, { width: 220 }); }
      doc.text(`Phone: ${customerPhone}`, 40, y + 52);

      doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor).text("SHIPPING ADDRESS", 310, y);
      doc.fontSize(9).font("Helvetica").fillColor("#475569").text(customerName, 310, y + 16);
      doc.text(addressLines[0] || "N/A", 310, y + 28, { width: 220 });
      if (addressLines[1]) { doc.text(addressLines[1], 310, y + 40, { width: 220 }); }
      doc.text(`Phone: ${customerPhone}`, 310, y + 52);

      const tableY = 320;
      doc.rect(40, tableY, 515, 20).fill(tableHeaderBg);
      doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold")
        .text("#", 48, tableY + 6)
        .text("ITEM", 75, tableY + 6)
        .text("QTY", 332, tableY + 6, { width: 30, align: "center" })
        .text("PRICE", 385, tableY + 6, { width: 70, align: "right" })
        .text("TOTAL", 470, tableY + 6, { width: 75, align: "right" });

      let itemY = tableY + 20;
      products.forEach((item, index) => {
        const title = cleanText(item.title || item.name || "Item");
        const qty = Number(item.quantity || item.qty || 1);
        const price = Number(item.price || item.originalPrice || 0);
        const total = Number(item.total || price * qty || 0);

        if (index % 2 === 1) {
          doc.rect(40, itemY, 515, 18).fill("#f1f5f9");
        }

        doc.fillColor(primaryColor).fontSize(8).font("Helvetica")
          .text(String(index + 1), 48, itemY + 5)
          .font("Helvetica-Bold")
          .text(title, 75, itemY + 5, { width: 240, ellipsis: true })
          .font("Helvetica")
          .text(String(qty), 332, itemY + 5, { width: 30, align: "center" })
          .text(formatINR(price), 385, itemY + 5, { width: 70, align: "right" })
          .font("Helvetica-Bold")
          .text(formatINR(total), 470, itemY + 5, { width: 75, align: "right" });

        itemY += 18;
      });

      const totalAmount = Number(order.amount || order.totalAmount || order.grandTotal) || 0;
      const subtotal = Math.round(totalAmount * 0.8475);
      const gstTax = Math.round(totalAmount * 0.1525);
      const shippingFee = Math.max(0, totalAmount - (subtotal + gstTax));
      const summaryY = itemY + 18;

      doc.rect(40, summaryY, 260, 70).fill(lightBg);
      doc.fillColor(primaryColor).fontSize(9).font("Helvetica-Bold").text("TERMS & CONDITIONS", 50, summaryY + 8)
        .font("Helvetica").fontSize(8).fillColor("#475569").text("1. All sales are subject to Cadmax Interior standard policies.", 50, summaryY + 20)
        .text("2. This is a computer-generated invoice.", 50, summaryY + 30)
        .text("3. For support, contact support@cadmaxinterior.com.", 50, summaryY + 40);

      doc.fillColor(primaryColor).fontSize(9).font("Helvetica").text("Subtotal", 330, summaryY + 10).text(formatINR(subtotal), 475, summaryY + 10, { width: 70, align: "right" });
      doc.text("Tax/GST", 330, summaryY + 24).text(formatINR(gstTax), 475, summaryY + 24, { width: 70, align: "right" });
      doc.text("Shipping", 330, summaryY + 38).text(shippingFee > 0 ? formatINR(shippingFee) : "FREE", 475, summaryY + 38, { width: 70, align: "right" });
      doc.moveTo(330, summaryY + 52).lineTo(555, summaryY + 52).strokeColor(primaryColor).lineWidth(1).stroke();
      doc.rect(330, summaryY + 54, 220, 20).fill(accentColor);
      doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text("GRAND TOTAL", 340, summaryY + 58).text(formatINR(totalAmount), 475, summaryY + 58, { width: 70, align: "right" });

      doc.moveTo(40, 760).lineTo(555, 760).strokeColor(borderColor).lineWidth(0.5).stroke();
      doc.fontSize(8).font("Helvetica").fillColor("#94a3b8").text("Thank you for choosing Cadmax Interior!", 40, 768, { align: "center" });
      doc.text("Cadmax Interior Design & Furnishings | www.cadmax.com", 40, 776, { align: "center" });

      doc.end();
    } catch (err) {
      console.error("generateOrderInvoicePdf Exception:", err);
      if (res && typeof res.status === "function" && !res.headersSent) {
        res.status(500).json({ status: false, message: "Error generating invoice PDF: " + err.message });
      }
      reject(err);
    }
  });
}

module.exports = {
  generateOrderInvoicePdf,
  uploadInvoicePdfToCloud,
  toCloudflareInvoiceUrl,
};

