import Notification from "../models/Notification.js";

/**
 * Helper to identify recipient context from request auth middleware
 */
const getRecipientContext = (req) => {
  if (req.user) {
    return { recipientId: req.user._id, recipientType: "User" };
  } else if (req.merchant) {
    return { recipientId: req.merchant._id, recipientType: "Merchant" };
  }
  return null;
};

/**
 * GET /api/notifications
 * Query Params: ?page=1&limit=20&unreadOnly=false&type=CIRCLE_INVITATION
 * Get paginated notifications list for the logged-in user or merchant
 */
export const getMyNotifications = async (req, res) => {
  try {
    const authContext = getRecipientContext(req);
    if (!authContext) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Missing authentication context.",
      });
    }

    const { page = 1, limit = 20, unreadOnly, type } = req.query;

    const query = {
      recipientId: authContext.recipientId,
      recipientType: authContext.recipientType,
    };

    if (unreadOnly === "true") {
      query.isRead = false;
    }

    if (type) {
      query.type = type;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({
        recipientId: authContext.recipientId,
        recipientType: authContext.recipientType,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      unreadCount,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: notifications,
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const authContext = getRecipientContext(req);
    if (!authContext) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        recipientId: authContext.recipientId,
        recipientType: authContext.recipientType,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or access denied.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: notification,
    });
  } catch (error) {
    console.error("Mark Read Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all unread notifications as read
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const authContext = getRecipientContext(req);
    if (!authContext) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const result = await Notification.updateMany(
      {
        recipientId: authContext.recipientId,
        recipientType: authContext.recipientType,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark All Read Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const authContext = getRecipientContext(req);
    if (!authContext) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipientId: authContext.recipientId,
      recipientType: authContext.recipientType,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Notification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
      error: error.message,
    });
  }
};