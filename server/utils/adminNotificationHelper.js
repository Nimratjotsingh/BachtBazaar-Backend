import AdminNotification from "../models/adminNotificationsModel.js";

export const triggerAdminNotification = async (req, { title, message, category, referenceId }) => {
  try {
    // 1. Save to Database
    const newNotification = new AdminNotification({
      title,
      message,
      category,
      referenceId: referenceId || null,
      isRead: false,
    });
    await newNotification.save();

    // 2. Broadcast via Socket.io to connected admins
    const io = req.app.get("socketio");
    if (io) {
      io.to("admin_notifications_room").emit("admin_realtime_notification", newNotification);
    }

    return newNotification;
  } catch (error) {
    console.error("Trigger Admin Notification Error:", error);
  }
};