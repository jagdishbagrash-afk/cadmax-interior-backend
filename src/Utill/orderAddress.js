const mongoose = require("mongoose");
const Address = require("../Model/MultipleAddress");

const toSafeString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const buildLegacyAddressString = (snapshot = {}) =>
  [
    snapshot.street_address,
    snapshot.city,
    snapshot.state,
    snapshot.country,
    snapshot.pincode,
  ]
    .map(toSafeString)
    .filter(Boolean)
    .join(", ");

const parseLegacyAddressString = (address) => {
  const normalized = toSafeString(address);

  if (!normalized) {
    return {};
  }

  const parts = normalized
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const pincodeMatch = normalized.match(/\b\d{4,10}\b/);

  return {
    street_address: parts[0] || normalized,
    city: parts.length >= 3 ? parts[parts.length - 3] : "",
    state: parts.length >= 2 ? parts[parts.length - 2] : "",
    country:
      parts.length >= 1
        ? parts[parts.length - 1].replace(/-\s*\d{4,10}.*$/, "").trim()
        : "",
    pincode: pincodeMatch ? pincodeMatch[0] : "",
    addressType: "",
  };
};

const buildShippingAddressSnapshot = ({
  name = "",
  mobile = "",
  addressRecord = {},
} = {}) => {
  const snapshot = {
    name: toSafeString(name || addressRecord?.name),
    mobile: toSafeString(mobile || addressRecord?.mobile),
    street_address: toSafeString(
      addressRecord?.street_address ||
        addressRecord?.addressLine1 ||
        addressRecord?.address ||
        addressRecord?.streetAddress
    ),
    city: toSafeString(addressRecord?.city || addressRecord?.cityName),
    state: toSafeString(addressRecord?.state || addressRecord?.provinceName),
    country: toSafeString(addressRecord?.country),
    pincode: toSafeString(
      addressRecord?.pincode ||
        addressRecord?.postalCode ||
        addressRecord?.zip
    ),
    addressType: toSafeString(addressRecord?.addressType),
  };

  return snapshot;
};

const hasShippingAddressSnapshot = (order = {}) => {
  const snapshot = order?.shippingAddress || {};

  return [
    snapshot?.street_address,
    snapshot?.city,
    snapshot?.state,
    snapshot?.country,
    snapshot?.pincode,
  ].some((value) => toSafeString(value) !== "");
};

const resolveOrderShippingAddressSnapshot = (order = {}, addressRecord = null) => {
  if (hasShippingAddressSnapshot(order)) {
    return buildShippingAddressSnapshot({
      name: order?.shippingAddress?.name || order?.name,
      mobile: order?.shippingAddress?.mobile || order?.mobile,
      addressRecord: order?.shippingAddress,
    });
  }

  if (addressRecord) {
    return buildShippingAddressSnapshot({
      name: order?.name,
      mobile: order?.mobile,
      addressRecord,
    });
  }

  const legacyAddress = parseLegacyAddressString(order?.address);
  const snapshot = buildShippingAddressSnapshot({
    name: order?.name,
    mobile: order?.mobile,
    addressRecord: legacyAddress,
  });

  return hasShippingAddressSnapshot({ shippingAddress: snapshot }) ? snapshot : null;
};

const resolveOwnedAddress = async ({ addressId, userId }) => {
  const normalizedAddressId = toSafeString(addressId);

  if (!normalizedAddressId || !mongoose.Types.ObjectId.isValid(normalizedAddressId)) {
    return {
      ok: false,
      reason: "invalid",
      address: null,
    };
  }

  const address = await Address.findById(normalizedAddressId).lean();

  if (!address) {
    return {
      ok: false,
      reason: "not_found",
      address: null,
    };
  }

  if (userId && toSafeString(address.userId) !== toSafeString(userId)) {
    return {
      ok: false,
      reason: "unauthorized",
      address: null,
    };
  }

  return {
    ok: true,
    reason: null,
    address,
  };
};

const ensureOrderShippingAddress = async (order, { userId, persist = false } = {}) => {
  const ownedAddressResult = order?.addressId
    ? await resolveOwnedAddress({ addressId: order.addressId, userId })
    : null;

  const shippingAddress = resolveOrderShippingAddressSnapshot(
    order,
    ownedAddressResult?.ok ? ownedAddressResult.address : null
  );

  if (!shippingAddress) {
    return {
      shippingAddress: null,
      hydrated: false,
      addressRecord: ownedAddressResult?.ok ? ownedAddressResult.address : null,
    };
  }

  const nextLegacyAddress = buildLegacyAddressString(shippingAddress);
  const shouldHydrate =
    !hasShippingAddressSnapshot(order) ||
    (nextLegacyAddress && toSafeString(order?.address) !== nextLegacyAddress);

  if (shouldHydrate && order && typeof order === "object") {
    order.shippingAddress = shippingAddress;

    if (nextLegacyAddress) {
      order.address = nextLegacyAddress;
    }

    if (persist && typeof order.save === "function") {
      await order.save();
    }
  }

  return {
    shippingAddress,
    hydrated: shouldHydrate,
    addressRecord: ownedAddressResult?.ok ? ownedAddressResult.address : null,
  };
};

const toCourierAddress = (snapshot = {}) => ({
  name: toSafeString(snapshot?.name),
  mobile: toSafeString(snapshot?.mobile),
  street_address: toSafeString(snapshot?.street_address),
  address: buildLegacyAddressString(snapshot),
  addressLine1: toSafeString(snapshot?.street_address),
  city: toSafeString(snapshot?.city),
  state: toSafeString(snapshot?.state),
  country: toSafeString(snapshot?.country || "India"),
  pincode: toSafeString(snapshot?.pincode),
  postalCode: toSafeString(snapshot?.pincode),
  addressType: toSafeString(snapshot?.addressType),
});

module.exports = {
  buildLegacyAddressString,
  buildShippingAddressSnapshot,
  ensureOrderShippingAddress,
  hasShippingAddressSnapshot,
  resolveOrderShippingAddressSnapshot,
  resolveOwnedAddress,
  toCourierAddress,
};
