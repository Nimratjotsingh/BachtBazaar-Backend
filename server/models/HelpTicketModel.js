import mongoose from "mongoose";

const ticketMessageSchema = new mongoose.Schema(
  {
    senderType: {
      type: String,
      enum: ["Merchant", "User", "Admin"],
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "messages.senderType",
    },
    message: {
      type: String,
      required: [true, "Message body cannot be empty"],
      trim: true,
      maxlength: 2000,
    },
    attachments: [
      {
        type: String,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const helpTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },
    requesterType: {
      type: String,
      enum: ["Merchant", "User"],
      required: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "requesterType",
      index: true,
    },
    subject: {
      type: String,
      required: [true, "Ticket subject is required"],
      trim: true,
      maxlength: 150,
    },
    category: {
      type: String,
      enum: [
        "Account & Verification",
        "Offers & Redemptions",
        "Bachat Coins & Billing",
        "Technical Issue",
        "Report/Abuse",
        "Other",
      ],
      default: "Other",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Open", "In_Progress", "Resolved", "Closed"],
      default: "Open",
      index: true,
    },
    assignedAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    // --- THREADED MESSAGES ARRAY ---
    messages: [ticketMessageSchema],

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Pre-save hook for clean human-readable ticket ID
helpTicketSchema.pre("save", function (next) {
  if (this.isNew && !this.ticketId) {
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    const prefix = this.requesterType === "Merchant" ? "M" : "U";
    this.ticketId = `TKT-${prefix}-${randomString}`;
  }
  next();
});

helpTicketSchema.index({ status: 1, priority: -1, createdAt: -1 });

const HelpTicket = mongoose.models.HelpTicket || mongoose.model("HelpTicket", helpTicketSchema);

export default HelpTicket;