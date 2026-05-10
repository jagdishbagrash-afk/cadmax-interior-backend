const { sendPushNotification } = require("../Utill/notificationService");
const User = require("../Model/User");

exports.notifyAllUsers = async (req, res) => {
  try {
    const { title, body } = req.body;

    // ✅ sab users ke tokens nikaalo
    const users = await User.find({ fcmToken: { $ne: null } }).select("fcmToken");

    const tokens = users.map(u => u.fcmToken).filter(Boolean);

    if (tokens.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No users found with FCM tokens",
      });
    }

    const result = await sendPushNotification({
      tokens,
      title: title || "New Product Added 🛍️",
      body: body || "Check out our latest product!",
      data: {
        type: "NEW_PRODUCT",
      },
    });

    if (!result.status) {
      return res.status(400).json(result);
    }

    return res.status(200).json({
      status: true,
      message: `Notification sent to ${tokens.length} users`,
      data: result.results,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};