import mongoose from "mongoose";

const ticketMessageSchema = new mongoose.Schema(
  {
    senderType: {
      type: String,
      enum: ["User", "Admin"],
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "messages.senderType",
    },
    message: {
      type: String,
      required: [true, "Message body cannot be empty."],
      trim: true,
    },
    attachments: [
      {
        type: String, // URLs or file paths to uploaded images/docs
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

const userSupportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true, // e.g. "UST-10023"
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: [true, "Ticket subject is required."],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "general",
        "account",
        "redemption-issue",
        "offer-not-working",
        "payment-refund",
        "app-bug",
      ],
      default: "general",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    // Optional reference to a specific offer or shop if the issue relates to one
    relatedOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      default: null,
    },
    relatedShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MerchantShop",
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    messages: [ticketMessageSchema],
  },
  { timestamps: true }
);

// Auto-generate ticket number before validation (Async syntax without next)
userSupportTicketSchema.pre("validate", async function () {
  if (!this.ticketNumber) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    this.ticketNumber = `UST-${randomDigits}`;
  }
});

const UserSupportTicket =
  mongoose.models.UserSupportTicket ||
  mongoose.model("UserSupportTicket", userSupportTicketSchema);

export default UserSupportTicket;