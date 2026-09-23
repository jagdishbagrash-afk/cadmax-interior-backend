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


function generateOrderInvoicePdf(order) {
  return new Promise((resolve, reject) => {
    try {

      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        bufferPages: true,
      });

      // Safe filename
      const safeOrderId = String(
        order.orderId || "Order"
      ).replace(/[^a-zA-Z0-9-_]/g, "");

      const filename =
        `Invoice-${safeOrderId}.pdf`;

      // IMPORTANT:
      // Always save from project root
      const invoiceDir = path.join(
        process.cwd(),
        "uploads",
        "invoices"
      );

      if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, {
          recursive: true,
        });
      }

      const filePath = path.join(
        invoiceDir,
        filename
      );

      console.log(
        "Invoice saving at:",
        filePath
      );

      const writeStream =
        fs.createWriteStream(filePath);

      writeStream.on(
        "finish",
        () => {
          console.log(
            "Invoice generated:",
            filePath
          );

          resolve(filePath);
        }
      );

      writeStream.on(
        "error",
        (error) => {
          console.error(
            "Invoice write error:",
            error
          );

          reject(error);
        }
      );

      doc.pipe(writeStream);


      // ============================================================
      // ALL YOUR EXISTING INVOICE CODE
      // ============================================================

      // ============================================================
      // COLORS
      // ============================================================

      const primaryColor = "#17263C";
      const accentColor = "#148CCB";
      const orangeColor = "#F08A24";

      const lightBg = "#F5F8FB";
      const tableHeaderBg = "#17263C";

      const borderColor = "#DCE5EC";
      const textColor = "#1D2733";
      const mutedColor = "#627181";

      const redColor = "#C53C3C";
      const greenColor = "#198754";

      const pageWidth = doc.page.width;

      const leftMargin = 40;
      const rightMargin = 40;

      const contentWidth =
        pageWidth - leftMargin - rightMargin;

      // ============================================================
      // HELPERS
      // ============================================================

      const safe = (value, fallback = "-") => {
        if (
          value === undefined ||
          value === null ||
          value === ""
        ) {
          return fallback;
        }

        return String(value);
      };

      const normalizeNumber = (value) => {
        const number = Number(value);

        return Number.isFinite(number)
          ? number
          : 0;
      };

      const drawBox = ({
        x,
        y,
        width,
        height,
        fill = "#FFFFFF",
        stroke = borderColor,
        radius = 4,
      }) => {
        doc
          .roundedRect(
            x,
            y,
            width,
            height,
            radius
          )
          .fillAndStroke(
            fill,
            stroke
          );
      };

      const drawLabelValue = ({
        label,
        value,
        x,
        y,
        labelWidth = 90,
        valueColor = textColor,
        size = 8,
      }) => {
        doc
          .font("Helvetica")
          .fontSize(size)
          .fillColor(mutedColor)
          .text(
            label,
            x,
            y,
            {
              width: labelWidth,
            }
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(size)
          .fillColor(valueColor)
          .text(
            safe(value),
            x + labelWidth,
            y,
            {
              width:
                195 - labelWidth,
            }
          );
      };

      const getAddressText = (
        addressObject,
        fallbackAddress
      ) => {
        if (!addressObject) {
          return fallbackAddress || "-";
        }

        const addressParts = [
          addressObject.street_address,
          addressObject.city,
          addressObject.state,
          addressObject.pincode,
          addressObject.country,
        ].filter(Boolean);

        if (addressParts.length) {
          return addressParts.join(", ");
        }

        return fallbackAddress || "-";
      };

      // ============================================================
      // ORDER DATA
      // ============================================================

      const products =
        Array.isArray(order.product)
          ? order.product
          : [];

      const shippingAddress =
        order.shippingAddress || {};

      /*
       * If you later add billingAddress in MongoDB,
       * it will automatically be used here.
       *
       * Otherwise shipping address is used as fallback.
       */
      const billingAddress =
        order.billingAddress ||
        order.shippingAddress ||
        {};

      const customerName =
        shippingAddress.name ||
        order.name ||
        "Valued Customer";

      const customerPhone =
        shippingAddress.mobile ||
        order.mobile ||
        "";

      const billingName =
        billingAddress.name ||
        order.name ||
        customerName;

      const billingPhone =
        billingAddress.mobile ||
        order.mobile ||
        customerPhone;

      const billingAddressText =
        getAddressText(
          billingAddress,
          order.address
        );

      const shippingAddressText =
        getAddressText(
          shippingAddress,
          order.address
        );

      // ============================================================
      // PRICE CALCULATIONS
      // ============================================================

      const calculatedSubtotal =
        products.reduce(
          (total, item) => {
            const price =
              normalizeNumber(
                item.originalPrice ||
                item.price
              );

            const quantity =
              normalizeNumber(
                item.quantity || 1
              );

            return (
              total +
              price * quantity
            );
          },
          0
        );

      const calculatedDiscount =
        products.reduce(
          (total, item) => {
            return (
              total +
              normalizeNumber(
                item.discount
              ) *
              normalizeNumber(
                item.quantity || 1
              )
            );
          },
          0
        );

      const subtotal =
        normalizeNumber(
          order.subtotal
        ) ||
        calculatedSubtotal;

      const discountAmount =
        normalizeNumber(
          order.discountAmount
        ) ||
        calculatedDiscount;

      const taxAmount =
        normalizeNumber(
          order.taxAmount ||
          order.gstAmount ||
          order.summary?.taxAmount
        );

      const shippingFee =
        normalizeNumber(
          order.shippingFee ||
          order.shipping_charge ||
          order.shippingCost ||
          order.shipping_meta
            ?.shipping_charge
        );

      const totalAmount =
        normalizeNumber(
          order.amount
        );

      const taxRate =
        order.taxRate ||
        order.gstRate ||
        order.summary?.taxRate ||
        "";

      // ============================================================
      // HEADER
      // ============================================================

      const logoPath =
        path.join(
          __dirname,
          "../logo.png"
        );

      drawBox({
        x: 40,
        y: 32,
        width: 515,
        height: 88,
      });

      if (
        fs.existsSync(logoPath)
      ) {
        try {
          doc.image(
            logoPath,
            52,
            52,
            {
              width: 110,
              height: 45,
              fit: [110, 45],
            }
          );
        } catch (error) {
          console.warn(
            "Invoice logo error:",
            error.message
          );
        }
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor(primaryColor)
        .text(
          "CADMAX INTERIOR",
          300,
          48,
          {
            width: 235,
            align: "right",
          }
        );

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(mutedColor)
        .text(
          "Cadmax Interior Design & Furnishings Pvt. Ltd.",
          300,
          69,
          {
            width: 235,
            align: "right",
          }
        )
        .text(
          "Email: support@cadmaxinterior.com",
          300,
          82,
          {
            width: 235,
            align: "right",
          }
        )
        .text(
          "Phone: +91 98765 43210 | Web: www.cadmax.com",
          300,
          95,
          {
            width: 235,
            align: "right",
          }
        );

      // ============================================================
      // TAX INVOICE BAR
      // ============================================================

      doc
        .roundedRect(
          40,
          130,
          515,
          30,
          3
        )
        .fill(primaryColor);

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#FFFFFF")
        .text(
          "TAX INVOICE",
          52,
          139
        );

      doc
        .fontSize(9)
        .text(
          `INVOICE NO: ${order.orderId || "N/A"
          }`,
          325,
          140,
          {
            width: 215,
            align: "right",
          }
        );

      // ============================================================
      // ORDER DETAILS + SHIPMENT DETAILS
      // ============================================================

      const detailsTop = 172;

      const columnGap = 12;

      const columnWidth =
        (contentWidth - columnGap) / 2;

      drawBox({
        x: 40,
        y: detailsTop,
        width: columnWidth,
        height: 104,
        fill: lightBg,
      });

      drawBox({
        x:
          40 +
          columnWidth +
          columnGap,
        y: detailsTop,
        width: columnWidth,
        height: 104,
        fill: lightBg,
      });

      // LEFT
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(primaryColor)
        .text(
          "ORDER & PAYMENT DETAILS",
          52,
          detailsTop + 12
        );

      const detailStartY =
        detailsTop + 31;

      drawLabelValue({
        label: "Invoice Date",
        value: formatDate(
          order.createdAt
        ),
        x: 52,
        y: detailStartY,
        labelWidth: 78,
      });

      drawLabelValue({
        label: "Order Status",
        value: (
          order.status ||
          "pending"
        ).toUpperCase(),
        x: 52,
        y:
          detailStartY + 15,
        labelWidth: 78,
        valueColor:
          order.status ===
            "cancelled"
            ? redColor
            : textColor,
      });

      drawLabelValue({
        label: "Payment",
        value:
          order.paymentMethod ===
            "COD"
            ? "Cash on Delivery"
            : order.paymentMethod ||
            "ONLINE",
        x: 52,
        y:
          detailStartY + 30,
        labelWidth: 78,
      });

      drawLabelValue({
        label: "Payment Status",
        value:
          order.paymentStatus ||
          (order.paymentMethod ===
            "COD"
            ? "Pending"
            : "Paid"),
        x: 52,
        y:
          detailStartY + 45,
        labelWidth: 78,
      });

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(mutedColor)
        .text(
          "Transaction ID",
          52,
          detailStartY + 60
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(textColor)
        .text(
          safe(
            order.PaymentId,
            "N/A"
          ),
          130,
          detailStartY + 60,
          {
            width: 155,
            height: 27,
            ellipsis: true,
          }
        );

      // RIGHT SHIPMENT
      const shipmentX =
        40 +
        columnWidth +
        columnGap;

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(primaryColor)
        .text(
          "SHIPMENT & TRACKING",
          shipmentX + 12,
          detailsTop + 12
        );

      drawLabelValue({
        label: "Courier",
        value:
          order.courier_name ||
          order.shipping_meta
            ?.courier_name ||
          "-",
        x:
          shipmentX + 12,
        y: detailStartY,
        labelWidth: 72,
        valueColor:
          accentColor,
      });

      drawLabelValue({
        label: "Tracking No.",
        value:
          order.tracking_number ||
          "-",
        x:
          shipmentX + 12,
        y:
          detailStartY + 15,
        labelWidth: 72,
        valueColor:
          accentColor,
      });

      drawLabelValue({
        label: "Shipping Mode",
        value:
          order.shipping_meta
            ?.shipping_mode ||
          order.shipping_meta
            ?.service_type ||
          "Express Shipping",
        x:
          shipmentX + 12,
        y:
          detailStartY + 30,
        labelWidth: 72,
      });

      drawLabelValue({
        label: "Shipment Status",
        value:
          order.shipping_status ||
          "pending",
        x:
          shipmentX + 12,
        y:
          detailStartY + 45,
        labelWidth: 72,
      });

      drawLabelValue({
        label: "Dispatched",
        value:
          order.dispatched_at
            ? formatDate(
              order.dispatched_at
            )
            : "-",
        x:
          shipmentX + 12,
        y:
          detailStartY + 60,
        labelWidth: 72,
      });

      // ============================================================
      // BILLING + SHIPPING ADDRESS
      // ============================================================

      const addressTop = 288;

      drawBox({
        x: 40,
        y: addressTop,
        width: columnWidth,
        height: 90,
      });

      drawBox({
        x:
          shipmentX,
        y: addressTop,
        width: columnWidth,
        height: 90,
      });

      // BILLING
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(primaryColor)
        .text(
          "BILLING ADDRESS",
          52,
          addressTop + 12
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(textColor)
        .text(
          billingName,
          52,
          addressTop + 31
        );

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(mutedColor)
        .text(
          billingAddressText,
          52,
          addressTop + 46,
          {
            width:
              columnWidth - 24,
            height: 28,
            ellipsis: true,
          }
        );

      doc.text(
        `Phone: ${billingPhone
          ? `+91 ${billingPhone}`
          : "-"
        }`,
        52,
        addressTop + 75
      );

      // SHIPPING
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(primaryColor)
        .text(
          "SHIPPING ADDRESS",
          shipmentX + 12,
          addressTop + 12
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(textColor)
        .text(
          customerName,
          shipmentX + 12,
          addressTop + 31
        );

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(mutedColor)
        .text(
          shippingAddressText,
          shipmentX + 12,
          addressTop + 46,
          {
            width:
              columnWidth - 24,
            height: 28,
            ellipsis: true,
          }
        );

      doc.text(
        `Phone: ${customerPhone
          ? `+91 ${customerPhone}`
          : "-"
        }`,
        shipmentX + 12,
        addressTop + 75
      );

      // ============================================================
      // PRODUCT TABLE
      // ============================================================

      let tableTop = 394;

      const tableColumns = {
        no: {
          x: 40,
          width: 28,
        },

        sku: {
          x: 68,
          width: 85,
        },

        description: {
          x: 153,
          width: 176,
        },

        qty: {
          x: 329,
          width: 42,
        },

        price: {
          x: 371,
          width: 72,
        },

        discount: {
          x: 443,
          width: 55,
        },

        total: {
          x: 498,
          width: 57,
        },
      };

      const drawProductHeader =
        (top) => {
          doc
            .rect(
              40,
              top,
              515,
              28
            )
            .fill(tableHeaderBg);

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(7)
            .fillColor("#FFFFFF");

          doc.text(
            "#",
            tableColumns.no.x +
            8,
            top + 9
          );

          doc.text(
            "SKU / ID",
            tableColumns.sku.x +
            5,
            top + 9
          );

          doc.text(
            "PRODUCT / ITEM DESCRIPTION",
            tableColumns.description
              .x + 5,
            top + 9
          );

          doc.text(
            "QTY",
            tableColumns.qty.x,
            top + 9,
            {
              width:
                tableColumns.qty
                  .width,
              align: "center",
            }
          );

          doc.text(
            "UNIT PRICE",
            tableColumns.price.x,
            top + 9,
            {
              width:
                tableColumns.price
                  .width -
                5,
              align: "right",
            }
          );

          doc.text(
            "DISC.",
            tableColumns.discount
              .x,
            top + 9,
            {
              width:
                tableColumns.discount
                  .width -
                3,
              align: "right",
            }
          );

          doc.text(
            "TOTAL",
            tableColumns.total.x,
            top + 9,
            {
              width:
                tableColumns.total
                  .width -
                5,
              align: "right",
            }
          );

          return top + 28;
        };

      let rowY =
        drawProductHeader(
          tableTop
        );

      products.forEach(
        (item, index) => {
          const quantity =
            normalizeNumber(
              item.quantity || 1
            );

          const price =
            normalizeNumber(
              item.price
            );

          const itemDiscount =
            normalizeNumber(
              item.discount
            );

          const itemTotal =
            normalizeNumber(
              item.total
            ) ||
            price * quantity;

          const title =
            item.title ||
            item.name ||
            "Product";

          const sku =
            item.sku ||
            item.id ||
            "-";

          const variant =
            item.variantTitle ||
            item.variant ||
            "";

          const size =
            item.priceSectionTitle ||
            item.size ||
            "";

          const descriptionLines =
            [
              title,
              variant
                ? `Variant: ${variant}`
                : "",
              size
                ? `Size: ${size}`
                : "",
            ].filter(Boolean);

          const rowHeight =
            descriptionLines.length >
              1
              ? 48
              : 36;

          // PAGE BREAK
          if (
            rowY +
            rowHeight >
            690
          ) {
            doc.addPage();

            tableTop = 50;

            rowY =
              drawProductHeader(
                tableTop
              );
          }

          if (
            index % 2 === 1
          ) {
            doc
              .rect(
                40,
                rowY,
                515,
                rowHeight
              )
              .fill("#F8FAFC");
          }

          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor(textColor)
            .text(
              String(index + 1),
              tableColumns.no.x +
              8,
              rowY + 10
            );

          doc
            .fontSize(6.5)
            .text(
              safe(sku),
              tableColumns.sku.x +
              5,
              rowY + 10,
              {
                width:
                  tableColumns.sku
                    .width -
                  10,
                height: 26,
                ellipsis: true,
              }
            );

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(8)
            .text(
              title,
              tableColumns.description
                .x + 5,
              rowY + 8,
              {
                width:
                  tableColumns
                    .description
                    .width -
                  10,
                height: 16,
                ellipsis: true,
              }
            );

          let descriptionY =
            rowY + 22;

          if (variant) {
            doc
              .font("Helvetica")
              .fontSize(6.5)
              .fillColor(mutedColor)
              .text(
                `Variant: ${variant}`,
                tableColumns
                  .description.x +
                5,
                descriptionY
              );

            descriptionY += 10;
          }

          if (size) {
            doc
              .font("Helvetica")
              .fontSize(6.5)
              .fillColor(mutedColor)
              .text(
                `Size: ${size}`,
                tableColumns
                  .description.x +
                5,
                descriptionY
              );
          }

          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor(textColor)
            .text(
              String(quantity),
              tableColumns.qty.x,
              rowY + 10,
              {
                width:
                  tableColumns.qty
                    .width,
                align: "center",
              }
            );

          doc.text(
            formatINR(price),
            tableColumns.price.x,
            rowY + 10,
            {
              width:
                tableColumns.price
                  .width -
                5,
              align: "right",
            }
          );

          doc.text(
            itemDiscount
              ? formatINR(
                itemDiscount
              )
              : "-",
            tableColumns.discount.x,
            rowY + 10,
            {
              width:
                tableColumns
                  .discount
                  .width -
                3,
              align: "right",
            }
          );

          doc
            .font(
              "Helvetica-Bold"
            )
            .text(
              formatINR(
                itemTotal
              ),
              tableColumns.total.x,
              rowY + 10,
              {
                width:
                  tableColumns.total
                    .width -
                  5,
                align: "right",
              }
            );

          rowY +=
            rowHeight;

          doc
            .moveTo(
              40,
              rowY
            )
            .lineTo(
              555,
              rowY
            )
            .strokeColor(
              borderColor
            )
            .lineWidth(0.5)
            .stroke();
        }
      );

      // ============================================================
      // PACKAGE / DELIVERY DETAILS
      // ============================================================

      let packageTop =
        rowY + 12;

      if (
        packageTop > 610
      ) {
        doc.addPage();

        packageTop = 55;
      }

      drawBox({
        x: 40,
        y: packageTop,
        width: 515,
        height: 64,
        fill: lightBg,
      });

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(9)
        .fillColor(primaryColor)
        .text(
          "DELIVERY / PACKAGE INFORMATION",
          52,
          packageTop + 12
        );

      const packageWeight =
        order.shipping_meta
          ?.weight ||
        order.labelData?.weight ||
        "-";

      const dimensions =
        order.shipping_meta
          ?.dimensions ||
        order.labelData
          ?.dimensions ||
        "-";

      const pieces =
        order.shipping_meta
          ?.pieces ||
        order.labelData?.pieces ||
        products.reduce(
          (sum, item) =>
            sum +
            normalizeNumber(
              item.quantity || 1
            ),
          0
        ) ||
        1;

      const packageColumns =
        [
          {
            label: "Carrier",
            value:
              order.courier_name ||
              "-",
          },
          {
            label: "Tracking",
            value:
              order.tracking_number ||
              "-",
          },
          {
            label:
              "Shipping Mode",
            value:
              order.shipping_meta
                ?.shipping_mode ||
              "Express Shipping",
          },
          {
            label: "Weight",
            value: packageWeight,
          },
          {
            label: "Dimensions",
            value:
              typeof dimensions ===
                "object"
                ? `${dimensions.length || "-"} × ${dimensions.width || "-"} × ${dimensions.height || "-"} cm`
                : dimensions,
          },
          {
            label: "Pieces",
            value: pieces,
          },
        ];

      packageColumns.forEach(
        (item, index) => {
          const column =
            index % 3;

          const row =
            Math.floor(
              index / 3
            );

          const x =
            52 +
            column * 165;

          const y =
            packageTop +
            32 +
            row * 18;

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(7)
            .fillColor(
              mutedColor
            )
            .text(
              `${item.label}:`,
              x,
              y
            );

          doc
            .font(
              "Helvetica"
            )
            .fillColor(
              textColor
            )
            .text(
              safe(
                item.value
              ),
              x + 53,
              y,
              {
                width: 105,
                height: 12,
                ellipsis: true,
              }
            );
        }
      );

      // ============================================================
      // TERMS + AMOUNT SUMMARY
      // ============================================================

      let summaryTop =
        packageTop + 77;

      if (
        summaryTop + 115 >
        doc.page.height - 55
      ) {
        doc.addPage();

        summaryTop = 55;
      }

      drawBox({
        x: 40,
        y: summaryTop,
        width: 272,
        height: 105,
      });

      drawBox({
        x: 324,
        y: summaryTop,
        width: 231,
        height: 105,
      });

      // TERMS
      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(9)
        .fillColor(primaryColor)
        .text(
          "TERMS & CUSTOMER NOTES",
          52,
          summaryTop + 12
        );

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(mutedColor)
        .text(
          "1. This invoice is generated against the order and shipment record.",
          52,
          summaryTop + 31,
          {
            width: 245,
          }
        )
        .text(
          "2. Returns and replacements are subject to Cadmax Interior policies.",
          52,
          summaryTop + 48,
          {
            width: 245,
          }
        )
        .text(
          "3. Courier tracking and delivery status may update separately.",
          52,
          summaryTop + 65,
          {
            width: 245,
          }
        )
        .text(
          "4. For support: support@cadmaxinterior.com",
          52,
          summaryTop + 82,
          {
            width: 245,
          }
        );

      // SUMMARY
      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(9)
        .fillColor(primaryColor)
        .text(
          "AMOUNT SUMMARY",
          336,
          summaryTop + 12
        );

      let amountY =
        summaryTop + 32;

      const drawAmountRow = (
        label,
        value,
        options = {}
      ) => {
        doc
          .font(
            options.bold
              ? "Helvetica-Bold"
              : "Helvetica"
          )
          .fontSize(8)
          .fillColor(
            options.color ||
            mutedColor
          )
          .text(
            label,
            336,
            amountY,
            {
              width: 115,
            }
          );

        doc
          .font(
            "Helvetica-Bold"
          )
          .fillColor(
            options.valueColor ||
            textColor
          )
          .text(
            value,
            445,
            amountY,
            {
              width: 95,
              align: "right",
            }
          );

        amountY += 16;
      };

      drawAmountRow(
        "Subtotal",
        formatINR(
          subtotal
        )
      );

      if (
        discountAmount > 0
      ) {
        drawAmountRow(
          "Discount",
          `- ${formatINR(
            discountAmount
          )}`,
          {
            valueColor:
              greenColor,
          }
        );
      }

      drawAmountRow(
        taxRate
          ? `Tax (${taxRate})`
          : "Tax / GST",
        taxAmount
          ? formatINR(
            taxAmount
          )
          : "-"
      );

      drawAmountRow(
        "Shipping",
        shippingFee > 0
          ? formatINR(
            shippingFee
          )
          : "FREE",
        {
          valueColor:
            shippingFee > 0
              ? textColor
              : greenColor,
        }
      );

      // GRAND TOTAL
      doc
        .roundedRect(
          332,
          summaryTop + 80,
          215,
          20,
          2
        )
        .fill(
          accentColor
        );

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(8)
        .fillColor("#FFFFFF")
        .text(
          "GRAND TOTAL",
          340,
          summaryTop + 86
        );

      doc
        .fontSize(9)
        .text(
          formatINR(
            totalAmount
          ),
          440,
          summaryTop + 86,
          {
            width: 98,
            align: "right",
          }
        );

      // ============================================================
      // FOOTER ON ALL PAGES
      // ============================================================

      const pageRange =
        doc.bufferedPageRange();

      for (
        let i = 0;
        i <
        pageRange.count;
        i++
      ) {
        doc.switchToPage(
          pageRange.start + i
        );

        const pageHeight =
          doc.page.height;

        doc
          .moveTo(
            40,
            pageHeight - 44
          )
          .lineTo(
            555,
            pageHeight - 44
          )
          .strokeColor(
            borderColor
          )
          .lineWidth(0.5)
          .stroke();

        doc
          .font(
            "Helvetica"
          )
          .fontSize(7)
          .fillColor(
            "#94A3B8"
          )
          .text(
            "Computer-generated invoice. Signature not required.",
            40,
            pageHeight - 33
          );

        doc
          .font(
            "Helvetica-Bold"
          )
          .text(
            `Cadmax Interior  |  Page ${i + 1
            } of ${pageRange.count
            }`,
            350,
            pageHeight - 33,
            {
              width: 205,
              align: "right",
            }
          );
      }


      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateOrderInvoicePdf,
};
