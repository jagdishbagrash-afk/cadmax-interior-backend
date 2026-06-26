const admin = require("firebase-admin");

const PLACEHOLDER_PREFIX = "your_";

const stripWrappingQuotes = (value) => {
  if (!value) {
    return value;
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const normalizePrivateKey = (value) => {
  if (!value) {
    return null;
  }

  let normalizedKey = stripWrappingQuotes(value.trim()).replace(/\\n/g, "\n");

  if (!normalizedKey.includes("BEGIN PRIVATE KEY")) {
    try {
      const decodedKey = Buffer.from(normalizedKey, "base64").toString("utf8").trim();
      if (decodedKey.includes("BEGIN PRIVATE KEY")) {
        normalizedKey = decodedKey;
      }
    } catch (_error) {
      return normalizedKey;
    }
  }

  return normalizedKey;
};

const getFirebaseConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  const missingFields = [
    ["FIREBASE_PROJECT_ID", projectId],
    ["FIREBASE_CLIENT_EMAIL", clientEmail],
    ["FIREBASE_PRIVATE_KEY", privateKey],
  ]
    .filter(([, value]) => !value || value.startsWith(PLACEHOLDER_PREFIX))
    .map(([key]) => key);

  if (missingFields.length > 0) {
    throw new Error(
      `Firebase Admin credentials are not configured. Set valid values for: ${missingFields.join(
        ", "
      )}.`
    );
  }

  return { projectId, clientEmail, privateKey };
};

const getFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin;
  }

  const { projectId, clientEmail, privateKey } = getFirebaseConfig();

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    return admin;
  } catch (error) {
    throw new Error(
      `Firebase Admin initialization failed: ${error.message}. ` +
        "Ensure the private key is a valid PEM string with preserved newlines or a base64-encoded PEM."
    );
  }
};

module.exports = { getFirebaseAdmin };
