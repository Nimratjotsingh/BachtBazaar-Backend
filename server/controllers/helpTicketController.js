import HelpTicket from "../models/HelpTicketModel.js";

/**
 * POST /api/help/tickets
 * Create a new ticket and push initial message into the thread
 */
export const createHelpTicket = async (req, res) => {
  try {
    const { subject, description, category, priority, attachments } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: "Subject and description are required.",
      });
    }

    let requesterType;
    let requesterId;

    if (req.merchant) {
      requesterType = "Merchant";
      requesterId = req.merchant._id;
    } else if (req.user) {
      requesterType = "User";
      requesterId = req.user._id;
    } else {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access.",
      });
    }

    let attachmentUrls = [];
    if (req.files && Array.isArray(req.files)) {
      attachmentUrls = req.files.map((file) => `/uploads/tickets/${file.filename}`);
    } else if (Array.isArray(attachments)) {
      attachmentUrls = attachments;
    }

    const ticket = new HelpTicket({
      requesterType,
      requesterId,
      subject: subject.trim(),
      category: category || "Other",
      priority: priority || "Medium",
      messages: [
        {
          senderType: requesterType,
          senderId: requesterId,
          message: description.trim(),
          attachments: attachmentUrls,
        },
      ],
    });

    await ticket.save();

    return res.status(201).json({
      success: true,
      message: "Help ticket created successfully.",
      data: ticket,
    });
  } catch (error) {
    console.error("Create Help Ticket Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create help ticket.",
      error: error.message,
    });
  }
};

/**
 * POST /api/help/tickets/:id/reply
 * Merchant/User sends a follow-up message to an existing ticket
 */
export const replyToTicketByRequester = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text is required.",
      });
    }

    const requesterId = req.merchant?._id || req.user?._id;
    const requesterType = req.merchant ? "Merchant" : "User";

    const ticket = await HelpTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    // Verify ownership
    if (ticket.requesterId.toString() !== requesterId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to reply to this ticket.",
      });
    }

    // Block replying if admin explicitly closed the ticket
    if (ticket.status === "Closed") {
      return res.status(400).json({
        success: false,
        message: "This ticket has been permanently closed. Please create a new ticket if you need further help.",
      });
    }

    let attachmentUrls = [];
    if (req.files && Array.isArray(req.files)) {
      attachmentUrls = req.files.map((file) => `/uploads/tickets/${file.filename}`);
    } else if (Array.isArray(attachments)) {
      attachmentUrls = attachments;
    }

    // Push new message to thread
    ticket.messages.push({
      senderType: requesterType,
      senderId: requesterId,
      message: message.trim(),
      attachments: attachmentUrls,
    });

    // Reopen ticket if it was marked as Resolved
    if (ticket.status === "Resolved") {
      ticket.status = "In_Progress";
      ticket.resolvedAt = null;
    }

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Reply added to ticket thread successfully.",
      data: ticket,
    });
  } catch (error) {
    console.error("Requester Reply Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to post reply.",
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/help/tickets/:id/reply
 * Admin sends a response to the user/merchant and optionally updates status
 */
export const replyToTicketByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, status, priority, attachments } = req.body;
    const adminId = req.admin?._id || req.user?._id;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Response message cannot be empty.",
      });
    }

    const ticket = await HelpTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    let attachmentUrls = [];
    if (req.files && Array.isArray(req.files)) {
      attachmentUrls = req.files.map((file) => `/uploads/tickets/${file.filename}`);
    } else if (Array.isArray(attachments)) {
      attachmentUrls = attachments;
    }

    // Append admin response to thread
    ticket.messages.push({
      senderType: "Admin",
      senderId: adminId,
      message: message.trim(),
      attachments: attachmentUrls,
    });

    // Update assignment and status
    ticket.assignedAdminId = adminId;
    if (priority) ticket.priority = priority;

    if (status) {
      ticket.status = status;
      if (status === "Resolved" || status === "Closed") {
        ticket.resolvedAt = new Date();
      } else {
        ticket.resolvedAt = null;
      }
    } else {
      ticket.status = "In_Progress";
    }

    await ticket.save();

    const updatedTicket = await HelpTicket.findById(id)
      .populate("requesterId", "name email phone storeName profileImage")
      .populate("assignedAdminId", "name email")
      .populate("messages.senderId", "name email storeName profileImage")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Admin response posted successfully.",
      data: updatedTicket,
    });
  } catch (error) {
    console.error("Admin Reply Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to post admin response.",
      error: error.message,
    });
  }
};

/**
 * GET /api/help/tickets/my-tickets
 * Fetch requester's tickets
 */
export const getMyHelpTickets = async (req, res) => {
  try {
    const requesterId = req.merchant?._id || req.user?._id;
    const requesterType = req.merchant ? "Merchant" : "User";

    if (!requesterId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const tickets = await HelpTicket.find({ requesterId, requesterType })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      total: tickets.length,
      data: tickets,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/help/tickets/:id
 * Fetch single ticket with full message history populated
 */
export const getHelpTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.merchant?._id || req.user?._id;
    const isAdmin = !!(req.admin || req.user?.isAdmin);

    const ticket = await HelpTicket.findById(id)
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }

    

    return res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/help/tickets
 * Admin list view
 */
export const getAllHelpTicketsAdmin = async (req, res) => {
  try {
    const { status, priority, requesterType } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (requesterType) query.requesterType = requesterType;

    const tickets = await HelpTicket.find(query)
      .populate("requesterId", "name email phone storeName profileImage")
      .populate("assignedAdminId", "name email")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, total: tickets.length, data: tickets });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};