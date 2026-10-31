import webpush from "web-push";
import AdminNotification from "../models/adminNotificationsModel.js";
import SuperAdmin from "../models/adminModel.js";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@bachatbazaar.tech",
  "BH3ZrB8pA_N_IgdtS_9qkQSSmga9n68-jPIGCWaGfExXO_dpnpTf_vuT8u-aliFgv85hK23jkKZU_OlT8oHL3HU",
  "T4uqQriK35NbTNhLFkdU9FFxwgUQN5QdU5P92ZP032Q"
);

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

    // 2. Broadcast via Socket.io
    const io = req.app.get("socketio");
    if (io) {
      io.to("admin_notifications_room").emit("admin_realtime_notification", newNotification);
    }

    // 3. Send Web Push
    const admins = await SuperAdmin.find({ "pushSubscriptions.0": { $exists: true } });
    console.log(`[WebPush] Found ${admins.length} super admin(s) with push subscriptions.`);

    const payload = JSON.stringify({ title, body: message });

    for (const admin of admins) {
      if (admin.pushSubscriptions && admin.pushSubscriptions.length > 0) {
        let updated = false;
        const validSubscriptions = [];

        for (const sub of admin.pushSubscriptions) {
          try {
            console.log(`[WebPush] Attempting to send to endpoint: ${sub.endpoint.substring(0, 40)}...`);
            const result = await webpush.sendNotification(sub, payload);

            console.log(result)
            console.log(`[WebPush] Successfully sent! Response status:`, result.statusCode);
            validSubscriptions.push(sub);
          } catch (err) {
            console.error(`[WebPush] Failed for endpoint. StatusCode:`, err.statusCode, `Message:`, err.message);
            if (err.statusCode === 410 || err.statusCode === 404) {
              console.warn(`[WebPush] Removing dead subscription token.`);
              updated = true;
            } else {
              validSubscriptions.push(sub); // Keep for other errors
            }
          }
        }

        if (updated) {
          admin.pushSubscriptions = validSubscriptions;
          await admin.save();
        }
      }
    }

    return newNotification;
  } catch (error) {
    console.error("Trigger Admin Notification Error:", error);
  }
};