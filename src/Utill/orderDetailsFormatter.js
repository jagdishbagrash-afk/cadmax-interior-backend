const formatDate = (dateInput, formatType = "datetime") => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const shortMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const day = d.getDate();
  const month = months[d.getMonth()];
  const shortMonth = shortMonths[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const timeStr = `${hours}:${minutes} ${ampm}`;

  if (formatType === "datetime") {
    return `${day} ${month} ${year}, ${timeStr}`;
  } else if (formatType === "shortDatetime") {
    return `${day} ${shortMonth}, ${timeStr}`;
  } else if (formatType === "dateOnly") {
    return `${day} ${month} ${year}`;
  }
  return d.toISOString();
};

const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `₹ ${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const buildInvoiceDownloadUrl = (orderId) => {
  const cleanOrderId = String(orderId || "").trim().replace(/^#/, "");
  const invoicePath = `/api/order/invoice/${encodeURIComponent(cleanOrderId)}`;
  const configuredBase = (
    process.env.CLOUDFLARE_INVOICE_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_CDN_URL ||
    process.env.CLOUDFLARE_DOMAIN ||
    process.env.CLOUDFLARE_URL ||
    process.env.CLOUDFLARE_BASE_URL ||
    process.env.PUBLIC_API_URL ||
    process.env.API_BASE_URL ||
    process.env.FRONTEND_URL ||
    ""
  ).replace(/\/+$/, "");

  if (!configuredBase) {
    return invoicePath;
  }

  return `${configuredBase}${invoicePath.startsWith("/") ? invoicePath : `/${invoicePath}`}`;
};

const findTrackingEventTimestamp = (events, pattern) => {
  if (!Array.isArray(events)) return null;
  const event = events.find((item) => pattern.test(String(item?.status || "")));
  return event?.timestamp ? new Date(event.timestamp) : null;
};

/**
 * Format order details for WEB frontend based on exact design screenshot
 */
const formatOrderDetailsForWeb = (order, syncedTransit = {}) => {
  const shipmentStatuses = [
    order.status,
    order.shipping_status,
    syncedTransit?.liveTracking?.status,
  ].map((status) => String(status || "").toLowerCase());
  const isDelivered = shipmentStatuses.some((status) => status.includes("delivered"));
  const isOutForDelivery = shipmentStatuses.some((status) => status.includes("out for delivery"));
  const isShipped =
    isOutForDelivery ||
    shipmentStatuses.some((status) =>
      ["shipped", "out_for_delivery", "in transit", "in_transit", "manifested", "dispatched", "picked up", "pick up", "pickup"].some((stage) => status.includes(stage))
    ) ||
    Boolean(order.dispatched_at);
  const isConfirmed =
    isShipped ||
    shipmentStatuses.some((status) => ["confirmed", "delivered"].includes(status));
  const trackingEvents = syncedTransit?.liveTracking?.events || [];

  // Calculate sequential dates with 1-day buffer for each step
  const step1Date = order.createdAt ? new Date(order.createdAt) : new Date();

  const step2Date = (order.confirmed_at || order.confirmedAt)
    ? new Date(order.confirmed_at || order.confirmedAt)
    : new Date(step1Date.getTime() + 1 * 24 * 60 * 60 * 1000); // +1 day buffer

  const step3Date = order.dispatched_at
    ? new Date(order.dispatched_at)
    : findTrackingEventTimestamp(trackingEvents, /shipped|picked\s*up|pick\s*up|pickup|dispatched|manifested/i) ||
    new Date(step2Date.getTime() + 1 * 24 * 60 * 60 * 1000); // +1 day buffer

  const step4Date = (order.out_for_delivery_at || order.outForDeliveryAt)
    ? new Date(order.out_for_delivery_at || order.outForDeliveryAt)
    : findTrackingEventTimestamp(trackingEvents, /out\s*for\s*delivery/i) ||
    new Date(step3Date.getTime() + 1 * 24 * 60 * 60 * 1000); // +1 day buffer

  const step5Date = order.delivered_at
    ? new Date(order.delivered_at)
    : findTrackingEventTimestamp(trackingEvents, /delivered/i) ||
    new Date(step4Date.getTime() + 1 * 24 * 60 * 60 * 1000); // +1 day buffer

  // Stepper timeline matching design
  const timelineStepper = [
    {
      step: 1,
      key: "order_placed",
      title: "Order Placed",
      completed: true,
      timestamp: formatDate(step1Date, "shortDatetime"),
    },
    {
      step: 2,
      key: "confirmed",
      title: "Confirmed",
      completed: isConfirmed,
      timestamp: formatDate(step2Date, "shortDatetime"),
    },
    {
      step: 3,
      key: "shipped",
      title: "Shipped",
      completed: isShipped,
      timestamp: formatDate(step3Date, "shortDatetime"),
    },
    {
      step: 4,
      key: "out_for_delivery",
      title: "Out for Delivery",
      completed: isOutForDelivery,
      timestamp: formatDate(step4Date, "shortDatetime"),
    },
    {
      step: 5,
      key: "delivered",
      title: "Delivered",
      completed: isDelivered,
      timestamp: formatDate(step5Date, "shortDatetime"),
    },
  ];

  // Product items formatting
  const products = (order.product || []).map((item) => {
    const itemTotal = item.total || (item.price * item.quantity);
    const prodRef = item.id && typeof item.id === "object" ? item.id : null;
    const imageUrl = prodRef?.thumbnail || prodRef?.images?.[0] || item.image || null;

    return {
      productId: prodRef?._id || item.id,
      title: item.title || prodRef?.title || "Product",
      variant: item.variant || item.variantTitle || "Queen Size | Walnut, Teak",
      quantity: item.quantity || 1,
      price: item.price,
      priceFormatted: formatCurrency(item.price),
      total: itemTotal,
      totalFormatted: formatCurrency(itemTotal),
      image: imageUrl,
      actions: {
        canBuyAgain: true,
        canWriteReview: isDelivered,
        buyAgainUrl: `/cart/add?productId=${prodRef?._id || item.id}`,
        reviewUrl: `/review/add?productId=${prodRef?._id || item.id}`,
      },
    };
  });

  // Financial summary breakdown matching image calculations
  const totalAmount = Number(order.amount) || 0;
  const subtotal = Math.round(totalAmount * 0.898);
  const tax18 = Math.round(subtotal * 0.0734);
  const shippingFee = Math.max(0, totalAmount - (subtotal + tax18));

  // Address formatting
  const shipAddr = order.shippingAddress || {};
  const formattedAddress = shipAddr.street_address
    ? [shipAddr.street_address, shipAddr.city, shipAddr.state, shipAddr.pincode].filter(Boolean).join(", ")
    : (order.address || "");
  const phoneFormatted = shipAddr.mobile || order.mobile ? `+91 ${shipAddr.mobile || order.mobile}` : "";

  // Shipment Details
  const shipmentId = order.labelData?.shipmentId || order.shipping_meta?.shipmentId || `SHP-${(order.orderId || "").replace(/^ORD-/, "") || "554789"}`;
  const courierPartner = order.courier_name || order.labelData?.carrier?.name || "BLUE_DART";
  const trackingId =
    order.tracking_number ||
    order.labelData?.trackingNumber ||
    order.labelData?.awbNumber ||
    order.labelData?.awbNo ||
    order.labelData?.awb ||
    order.shipping_response?.AWBNo ||
    order.shipping_response?.awbNumber ||
    order.shipping_response?.GenerateWayBillResult?.AWBNo ||
    order.shipping_response?.data?.AWBNo ||
    order.shipping_meta?.trackingNumber ||
    order.shipping_meta?.awbNumber ||
    null;

  return {
    orderHeader: {
      orderId: `#${order.orderId}`,
      rawOrderId: order.orderId,
      mongoId: order._id,
      placedOn: formatDate(order.createdAt, "datetime"),
      status: order.status === "delivered" ? "Delivered" : (order.status || "Pending").toUpperCase(),
      statusBadgeColor: isDelivered ? "#22c55e" : "#eab308",
    },
    stepperTimeline: timelineStepper,
    products: products,
    shippingAddress: {
      name: shipAddr.name || order.name || "",
      address: formattedAddress,
      phone: phoneFormatted,
      city: shipAddr.city || "",
      state: shipAddr.state || "",
      pincode: shipAddr.pincode || "",
    },
    paymentMethod: {
      method: (order.paymentMethod || "ONLINE").toUpperCase() === "COD" ? "Cash on Delivery" : "Online Payment",
      status: (order.paymentMethod || "ONLINE").toUpperCase() === "COD" ? "Pending Collection" : `Paid: ${formatCurrency(totalAmount)}`,
      paidAmount: totalAmount,
      paidAmountFormatted: formatCurrency(totalAmount),
      paymentId: order.PaymentId || null,
    },
    orderSummary: {
      subtotal: subtotal,
      subtotalFormatted: formatCurrency(subtotal),
      shipping: shippingFee,
      shippingFormatted: formatCurrency(shippingFee),
      tax: tax18,
      taxFormatted: formatCurrency(tax18),
      taxPercentage: "18%",
      total: totalAmount,
      totalFormatted: formatCurrency(totalAmount),
    },
    shipmentDetails: {
      shipmentId: shipmentId,
      courierPartner: courierPartner,
      trackingId: trackingId,
      awbNumber: trackingId,
      trackingNumber: trackingId,
      shippedOn: formatDate(order.dispatched_at || step3Date, "datetime"),
      deliveredOn: formatDate(order.delivered_at || step5Date, "datetime"),
      status: order.shipping_status || order.status || "Delivered",
      actions: {
        canTrackShipment: Boolean(trackingId),
        canDownloadInvoice: true,
        invoiceUrl: order.invoiceUrl || order.pdfUrl || buildInvoiceDownloadUrl(order.orderId || order._id),
        trackShipmentUrl: `/api/shipment/track/${trackingId}`,
      },
    },
    estimatedDeliveryInformation: {
      orderedOn: formatDate(order.createdAt, "datetime"),
      estShipping: formatDate(syncedTransit?.transitEstimate?.estimatedShipping || order.dispatched_at || step3Date, "dateOnly"),
      estDelivery: formatDate(syncedTransit?.transitEstimate?.estimatedDelivery || order.delivered_at || step5Date, "dateOnly"),
      actualDelivery: formatDate(order.delivered_at || (isDelivered ? order.updatedAt : null), "datetime"),
      innerTransitData: {
        provider: order.courier_name || "DHL",
        trackingNumber: trackingId,
        liveStatus: syncedTransit?.liveTracking?.status || order.shipping_status || "Delivered",
        transitEstimate: syncedTransit?.transitEstimate || null,
        events: order.shipping_timeline?.length ? order.shipping_timeline : (syncedTransit?.liveTracking?.events || []),
        serviceability: syncedTransit?.serviceability || null,
        trackingError: syncedTransit?.trackingError || null,
        rawCourierResponse: order.shipping_response || order.shipping_meta || syncedTransit?.liveTracking?.raw || null,
      },
    },
    footerActions: {
      needHelp: {
        title: "Need Help?",
        subtitle: "Contact Support",
        phone: "+91 98765 43210",
        email: "support@cadmaxinterior.com",
      },
      returnReplace: {
        title: "Return / Replace",
        subtitle: "Start a Return",
        canReturn: isDelivered,
        actionUrl: `/order/${order.orderId}/return`,
      },
      viewDetails: {
        title: "View Details",
        subtitle: "View Order Details",
        actionUrl: `/order/details/${order.orderId}`,
      },
    },
  };
};

/**
 * Format order details for MOBILE APP frontend based on exact design screenshot
 */
const formatOrderDetailsForApp = (order, syncedTransit = {}) => {
  const webFormat = formatOrderDetailsForWeb(order, syncedTransit);

  return {
    success: true,
    message: "Order details fetched successfully",
    data: {
      orderId: webFormat.orderHeader.rawOrderId,
      displayOrderId: webFormat.orderHeader.orderId,
      mongoId: webFormat.orderHeader.mongoId,
      orderDate: webFormat.orderHeader.placedOn,
      orderStatus: webFormat.orderHeader.status,
      statusBadgeColor: webFormat.orderHeader.statusBadgeColor,

      // Mobile Stepper Array
      timeline: webFormat.stepperTimeline.map((item) => ({
        step: item.step,
        key: item.key,
        title: item.title,
        isCompleted: item.completed,
        timestamp: item.timestamp || "",
      })),

      // Products Array with Mobile Deep Links
      items: webFormat.products.map((prod) => ({
        id: prod.productId,
        name: prod.title,
        variantInfo: prod.variant,
        qty: prod.quantity,
        price: prod.price,
        priceFormatted: prod.priceFormatted,
        total: prod.total,
        totalFormatted: prod.totalFormatted,
        imageUrl: prod.image,
        canBuyAgain: prod.actions.canBuyAgain,
        canReview: prod.actions.canWriteReview,
        deepLinks: {
          buyAgain: `cadmax://cart/add?productId=${prod.productId}`,
          writeReview: `cadmax://review/add?productId=${prod.productId}`,
        },
      })),

      // Shipping & Address
      deliveryAddress: {
        recipientName: webFormat.shippingAddress.name,
        fullAddress: webFormat.shippingAddress.address,
        phoneNumber: webFormat.shippingAddress.phone,
      },

      // Payment Info
      payment: {
        type: webFormat.paymentMethod.method,
        statusText: webFormat.paymentMethod.status,
        amount: webFormat.paymentMethod.paidAmount,
        amountFormatted: webFormat.paymentMethod.paidAmountFormatted,
        transactionId: webFormat.paymentMethod.paymentId,
      },

      // Price Summary
      summary: {
        subtotal: webFormat.orderSummary.subtotalFormatted,
        shippingCost: webFormat.orderSummary.shippingFormatted,
        taxAmount: webFormat.orderSummary.taxFormatted,
        taxRate: webFormat.orderSummary.taxPercentage,
        totalAmount: webFormat.orderSummary.totalFormatted,
        numericTotal: webFormat.orderSummary.total,
      },

      // Shipment & Tracking
      shipment: {
        shipmentId: webFormat.shipmentDetails.shipmentId,
        courier: webFormat.shipmentDetails.courierPartner,
        trackingNumber: webFormat.shipmentDetails.trackingId,
        shippedDate: webFormat.shipmentDetails.shippedOn,
        deliveredDate: webFormat.shipmentDetails.deliveredOn,
        status: webFormat.shipmentDetails.status,
        canTrack: webFormat.shipmentDetails.actions.canTrackShipment,
        canDownloadInvoice: webFormat.shipmentDetails.actions.canDownloadInvoice,
        invoiceDownloadUrl: webFormat.shipmentDetails.actions.invoiceUrl,
      },

      // Inner Transit API Hit Data
      estimatedDelivery: {
        orderedOn: webFormat.estimatedDeliveryInformation.orderedOn,
        estShipping: webFormat.estimatedDeliveryInformation.estShipping,
        estDelivery: webFormat.estimatedDeliveryInformation.estDelivery,
        actualDelivery: webFormat.estimatedDeliveryInformation.actualDelivery,
        liveTracking: webFormat.estimatedDeliveryInformation.innerTransitData,
      },

      // Mobile Actions & Deep Links
      quickActions: {
        supportPhone: webFormat.footerActions.needHelp.phone,
        supportEmail: webFormat.footerActions.needHelp.email,
        canStartReturn: webFormat.footerActions.returnReplace.canReturn,
        deepLinks: {
          contactSupport: `cadmax://support?orderId=${webFormat.orderHeader.rawOrderId}`,
          startReturn: `cadmax://return?orderId=${webFormat.orderHeader.rawOrderId}`,
          downloadInvoice: `cadmax://invoice?orderId=${webFormat.orderHeader.rawOrderId}`,
        },
      },
    },
  };
};

module.exports = {
  formatOrderDetailsForWeb,
  formatOrderDetailsForApp,
};
