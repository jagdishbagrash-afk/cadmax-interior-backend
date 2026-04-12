const ObjectId = require("mongoose").Types.ObjectId;
const mongoose = require("mongoose");
const catchAsync = require("../Utill/catchAsync");
const NotificationModel = require("../Model/Notification");


exports.createNotification = catchAsync(async (req, res) => {
  try {
    const { SenderId, ReciverId, referenceId, referenceType } = req.body;
    const recordData = {
      SenderId,
      referenceId,
      ReciverId,
referenceType    };

    const record = new NotificationModel(recordData);
    const data = await record.save();
  } catch (error) {
    console.error("Error saving notification:", error);
  }
});

exports.NotificationGet = catchAsync(async (req, res) => {
  const UserId = req.user.id;

  try {
    const query = {
      $or: [{ ReciverId: UserId, IsRead: false }],
    };

    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: "ShipmentId",
        select: "name", // Only fetch the name field
      })
      .populate({
        path: "ReciverId",
        select: "name email role", // Only fetch name and email from ReciverId.Receiver
      })
      .populate({
        path: "SenderId",
        select: "name email role", // Only fetch name and email from ReciverId.Receiver
      });

    const notificationCount = notifications.length;
    res.json({
      status: true,
      data: notifications,
      count: notificationCount,
      message: "Notifications fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Failed to fetch notifications",
    });
  }
});

exports.MarkNotificationAsRead = catchAsync(async (req, res) => {
  const { id } = req.body;
  try {
    if (!id) {
      return res.status(400).json({
        status: false,
        message: "ID is required",
      });
    }

    // Find notification by ID
    const notification = await NotificationModel.findById(id);

    if (!notification) {
      return res.status(404).json({
        status: false,
        message: "Notification not found",
      });
    }

    // Update the isRead field to true
    notification.IsRead = true;
    await notification.save();

    res.json({
      status: true,
      message: "Notification marked as read successfully",
      notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Failed to mark notification as read",
    });
  }
});

exports.updateReviewNotification = catchAsync(async (req, res) => {
  const {
    ShipmentId,
    receiverBrokerId,
    receiverDriverId,
    receiverCarrierId,
    receiverShipperId,
    receiverCustomerId,
    text1,
    text2,
    text,
  } = req.body;
  // broker  assign dispatch  sheet carrire then  carrier text 1
  // carrire  assign dispatch  sheet broker then  carrier text 2
  // broker  Reassign dispatch  sheet carrire then  carrier text 1

  try {
    const existingNotification = await NotificationModel.findOne({
      ShipmentId: ShipmentId,
    });
    await NotificationModel.findOneAndUpdate(
      existingNotification._id,
      {
        $set: {
          receiverDriverId: [
            { Receiver: receiverDriverId, IsRead: false, text: text },
          ],
        },
      },
      { new: true }
    );
    await NotificationModel.findOneAndUpdate(
      existingNotification._id,
      {
        $set: {
          receiverCarrierId: [
            {
              Receiver: receiverCarrierId,
              IsRead: false,
              text: text1 ? text1 : text,
            },
          ],
        },
      },
      { new: true }
    );
    await NotificationModel.findOneAndUpdate(
      existingNotification._id,
      {
        $set: {
          receiverBrokerId: [
            {
              Receiver: receiverBrokerId,
              IsRead: false,
              text: text2 ? text2 : text,
            },
          ],
        },
      },
      { new: true }
    );
    await NotificationModel.findOneAndUpdate(
      existingNotification._id,
      {
        $set: {
          receiverShipperId: [
            { Receiver: receiverShipperId, IsRead: false, text: text },
          ],
        },
      },
      { new: true }
    );
    await NotificationModel.findOneAndUpdate(
      existingNotification._id,
      {
        $set: {
          receiverCustomerId: [
            { Receiver: receiverCustomerId, IsRead: true, text: text },
          ],
        },
      },
      { new: true }
    );
  } catch (error) {
    console.log("eror", error);
  }
});

exports.deleteNotification = catchAsync(async (req, res) => {
  const { id } = req.params;

  const notification = await NotificationModel.findByIdAndDelete(id);

  if (!notification) {
    return res.status(404).json({
      status: false,
      message: "Notification not found",
    });
  }

  res.json({
    status: true,
    message: "Notification deleted successfully",
  });
});