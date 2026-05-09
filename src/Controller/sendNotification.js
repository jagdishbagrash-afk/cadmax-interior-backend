const NotificationModel = require("../Model/Notification");

const sendNotification = async ({ senderId, receiverId, referenceId = null, referenceType }) => {
  try {
    await NotificationModel.create({
      SenderId: senderId,
      ReciverId: receiverId,
      referenceId: referenceId || null,
      referenceType,
    });
  } catch (err) {
    console.log("Notification Error:", err);
  }
};

module.exports = sendNotification;