const admin = require("./firebase");

const sendPushNotification = async ({ tokens, title, body, data = {} }) => {
  try {
    if (!tokens || tokens.length === 0) {
      throw new Error("No tokens provided");
    }

    let results = [];

    for (const token of tokens) {
      const message = {
        token: token,
        notification: {
          title: title || "Notification",
          body: body || "You have a new message",
        },
        data: {
          ...data,
        },
      };

      try {
        const response = await admin.messaging().send(message);
        results.push({ token, success: true, response });
      } catch (err) {
        console.error("Error for token:", token, err.message);
        results.push({ token, success: false, error: err.message });
      }
    }

    return {
      status: true,
      results,
    };

  } catch (error) {
    console.error("Push Error:", error);
    return {
      status: false,
      error: error.message,
    };
  }
};

module.exports = { sendPushNotification };