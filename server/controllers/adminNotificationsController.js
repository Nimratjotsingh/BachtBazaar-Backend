import AdminNotification from "../models/adminNotificationsModel.js";

// GET /api/admin/notifications (Fetch pagination/list)
export const getAdminNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = {};

    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      AdminNotification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AdminNotification.countDocuments(query),
      AdminNotification.countDocuments({ isRead: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      total,
      unreadCount,
    });
  } catch (error) {
    console.error("Get Admin Notifications Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch notifications." });
  }
};

// PATCH /api/admin/notifications/:id/read (Mark single notification as read)
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await AdminNotification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update notification." });
  }
};

// PATCH /api/admin/notifications/mark-all-read (Mark all as read)
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    await AdminNotification.updateMany({ isRead: false }, { isRead: true });
    return res.status(200).json({ success: true, message: "All notifications marked as read." });
  } catch (error) {
    console.error("Mark All Read Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update notifications." });
  }
};