import PDFDocument from 'pdfkit';
import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import Payment from '../models/Payment.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { simplifyDebts } from '../utils/debtSimplifier.js';
import { getIO } from '../utils/socket.js';
import sendEmail from '../utils/sendEmail.js';

export const getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email upiId')
      .sort({ createdAt: -1 });

    res.json({ groups });
  } catch (error) {
    console.error('Get User Groups Error:', error);
    res.status(500).json({ error: 'Server error fetching groups.' });
  }
};

export const createGroup = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    
    // Initialize members array if not provided
    let groupMembers = members ? [...members] : [];

    // Automatically add the currently authenticated user if they aren't already in the list
    if (!groupMembers.includes(req.user._id.toString())) {
      groupMembers.push(req.user._id.toString());
    }

    const newGroup = new Group({
      name,
      description,
      members: groupMembers,
    });

    await newGroup.save();

    const populatedGroup = await Group.findById(newGroup._id).populate('members', 'name email upiId');

    // Notifications and Sockets
    const io = getIO();
    
    // 1. Notify the creator
    const creatorNotification = new Notification({
      recipientId: req.user._id,
      type: 'group_invite',
      message: `You created the group: ${name}`,
      link: `/groups/${newGroup._id}`
    });
    await creatorNotification.save();
    io.to(req.user._id.toString()).emit('newNotification');

    // 2. Notify other members
    const otherMembers = groupMembers.filter(id => id !== req.user._id.toString());
    for (const memberId of otherMembers) {
      const memberNotification = new Notification({
        recipientId: memberId,
        type: 'group_invite',
        message: `${req.user.name} added you to the group: ${name}`,
        link: `/groups/${newGroup._id}`
      });
      await memberNotification.save();
      io.to(memberId.toString()).emit('newNotification');
    }

    res.status(201).json({
      message: 'Group created successfully',
      group: populatedGroup,
    });
  } catch (error) {
    console.error('Create Group Error:', error);
    res.status(500).json({ error: 'Server error creating group.' });
  }
};

export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findById(id).populate('members', 'name email upiId');

    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Get Group BY ID Error:', error);
    res.status(500).json({ error: 'Server error fetching group details.' });
  }
};

// Settlements calculation
export const getGroupSettlements = async (req, res) => {
  try {
    const [expenses, payments] = await Promise.all([
      Expense.find({ groupId: req.params.id }).lean(),
      Payment.find({ groupId: req.params.id }).lean(),
    ]);
    const transactions = simplifyDebts(expenses, payments);

    res.json({ transactions });
  } catch (error) {
    console.error('Get Group Settlements Error:', error);
    res.status(500).json({ error: 'Server error calculating settlements.' });
  }
};

// Activities and Comments
export const getGroupActivities = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find({ groupId: id })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Activity.countDocuments({ groupId: id })
    ]);

    res.json({ 
      activities,
      hasMore: total > skip + limit
    });
  } catch (error) {
    console.error('Get Group Activities Error:', error);
    res.status(500).json({ error: 'Server error fetching group activities.' });
  }
};

export const addGroupComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    const activity = new Activity({
      groupId: id,
      userId: req.user._id,
      type: 'comment',
      text: text.trim(),
    });

    await activity.save();

    const populatedActivity = await Activity.findById(activity._id).populate('userId', 'name email');

    const io = getIO();
    io.to(id).emit('activityAdded');

    res.status(201).json({
      message: 'Comment added successfully',
      activity: populatedActivity,
    });
  } catch (error) {
    console.error('Add Group Comment Error:', error);
    res.status(500).json({ error: 'Server error adding comment.' });
  }
};

export const addGroupMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { friendEmail } = req.body;

    if (!friendEmail?.trim()) {
      return res.status(400).json({ error: 'Friend email is required.' });
    }

    const userToAdd = await User.findOne({ email: friendEmail.toLowerCase().trim() });
    if (!userToAdd) {
      return res.status(404).json({ error: 'User with this email not found.' });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Check if user is already a member
    if (group.members.includes(userToAdd._id)) {
      return res.status(400).json({ error: 'User is already a member of this group.' });
    }

    group.members.push(userToAdd._id);
    await group.save();

    const io = getIO();
    io.to(id).emit('groupUpdated');

    // Create notification for the added user
    const notification = new Notification({
      recipientId: userToAdd._id,
      type: 'group_invite',
      message: `You were added to the group: ${group.name}`,
      link: `/groups/${id}`
    });
    await notification.save();
    io.to(userToAdd._id.toString()).emit('newNotification');

    res.json({
      message: 'Member added successfully',
      member: {
        _id: userToAdd._id,
        name: userToAdd.name,
        email: userToAdd.email
      }
    });
  } catch (error) {
    console.error('Add Group Member Error:', error);
    res.status(500).json({ error: 'Server error adding group member.' });
  }
};

export const sendNudge = async (req, res) => {
  try {
    const { id } = req.params; // groupId
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ error: 'Receiver ID is required.' });
    }

    // Anti-spam check: 24h cooldown
    const lastReminder = await Notification.findOne({
      recipientId: receiverId,
      type: 'reminder',
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (lastReminder) {
      return res.status(429).json({ error: 'You can only send one reminder per person every 24 hours.' });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found.' });
    }

    const notification = new Notification({
      recipientId: receiverId,
      type: 'reminder',
      message: `${req.user.name} sent a gentle reminder to settle your balances in ${group.name}`,
      link: `/groups/${id}`
    });

    await notification.save();

    const io = getIO();
    io.to(receiverId.toString()).emit('newNotification');

    // Fire-and-forget email notification
    sendEmail({
      to: receiver.email,
      subject: `VibeSplit - Settle up reminder in ${group.name}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0c0d10; color: #ffffff; padding: 30px; border-radius: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
          <h2 style="color: #10b981; font-size: 24px; margin-top: 0; font-weight: 800; border-bottom: 1px solid #1e293b; padding-bottom: 15px;">Balance Nudge on VibeSplit</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Hi ${receiver.name},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;"><strong>${req.user.name}</strong> has sent you a gentle reminder to settle your outstanding balances in the group <strong>${group.name}</strong>.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="http://localhost:5173/groups/${group._id}" style="background-color: #10b981; color: #000000; text-decoration: none; padding: 12px 30px; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">Settle Up in VibeSplit</a>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-top: 20px;">Or verify your profile settings if you've already completed the payment.</p>
          <p style="font-size: 12px; line-height: 1.6; color: #64748b; border-top: 1px solid #1e293b; padding-top: 15px; margin-bottom: 0;">If you have already settled, please confirm with ${req.user.name} directly on the VibeSplit app.</p>
        </div>
      `
    }).catch(err => console.error('Failed to send nudge email:', err));

    res.json({ message: 'Nudge sent successfully!' });
  } catch (error) {
    console.error('Send Nudge Error:', error);
    res.status(500).json({ error: 'Server error sending nudge.' });
  }
};

/**
 * Server-side PDF Trip Report Generator
 * Builds and streams a beautifully formatted PDF summarizing group spend and balances.
 */
export const generatePdfReport = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findById(id).populate('members', 'name email upiId');
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const [expenses, leanExpenses, leanPayments] = await Promise.all([
      Expense.find({ groupId: id }).populate('payerId', 'name email').sort({ date: -1 }),
      Expense.find({ groupId: id }).lean(),
      Payment.find({ groupId: id }).lean()
    ]);

    // Calculate net balances (who owes who) using standard simplifyDebts logic
    const transactions = simplifyDebts(leanExpenses, leanPayments);

    // Calculate total spend
    const totalGroupSpend = leanExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Initialize PDF Document with buffer pages enabled for page numbers in footer
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

    // Set Response Headers for Direct PDF Streaming
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="VibeSplit-${group.name.replace(/\s+/g, '-')}-Report.pdf"`
    );
    doc.pipe(res);

    // Color Palette Definition (Premium Minimalist with Emerald Accents)
    const primaryColor = '#10B981'; // Emerald
    const textDark = '#0F172A';     // Slate 900
    const textMuted = '#475569';    // Slate 600
    const lightBg = '#F8FAFC';      // Slate 50
    const borderColor = '#E2E8F0';  // Slate 200

    // --- PAGE 1 HEADER ---
    doc
      .fillColor(primaryColor)
      .fontSize(26)
      .font('Helvetica-Bold')
      .text('VIBESPLIT', { characterSpacing: 2 })
      .moveDown(0.1);

    doc
      .fillColor(textDark)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(`Trip Report: ${group.name}`)
      .moveDown(0.2);

    doc
      .fillColor(textMuted)
      .fontSize(10)
      .font('Helvetica')
      .text(`Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`)
      .moveDown(1.5);

    // Primary separator line
    doc
      .strokeColor(primaryColor)
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke()
      .moveDown(1.5);

    // --- SUMMARY BANNER ---
    const summaryY = doc.y;
    doc
      .rect(50, summaryY, 495, 65)
      .fill(lightBg)
      .strokeColor(borderColor)
      .lineWidth(1)
      .stroke();

    doc
      .fillColor(textDark)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('TOTAL GROUP SPEND', 70, summaryY + 15);

    doc
      .fillColor(primaryColor)
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(`$${totalGroupSpend.toFixed(2)}`, 70, summaryY + 28);

    doc.y = summaryY + 95;

    // --- BALANCES MATRIX SECTION ---
    doc
      .fillColor(textDark)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Optimized Debt Settlements', 50, doc.y)
      .moveDown(0.6);

    const memberMap = {};
    group.members.forEach(m => {
      memberMap[m._id.toString()] = m;
    });

    if (transactions.length === 0) {
      doc
        .fillColor(textMuted)
        .fontSize(10)
        .font('Helvetica-Oblique')
        .text('All members are fully settled up! No outstanding balances.')
        .moveDown(2);
    } else {
      transactions.forEach(t => {
        const fromName = memberMap[t.from]?.name || 'Unknown';
        const toName = memberMap[t.to]?.name || 'Unknown';
        doc
          .fillColor(textDark)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`${fromName}`, { continued: true })
          .font('Helvetica')
          .fillColor(textMuted)
          .text(' owes ', { continued: true })
          .font('Helvetica-Bold')
          .fillColor(textDark)
          .text(`${toName}: `, { continued: true })
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text(`$${Number(t.amount).toFixed(2)}`)
          .moveDown(0.35);
      });
      doc.moveDown(1.5);
    }

    // --- EXPENSE LEDGER SECTION ---
    doc
      .fillColor(textDark)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Expense Ledger', 50, doc.y)
      .moveDown(0.8);

    // Ledger Table Header
    const ledgerHeaderY = doc.y;
    doc
      .fillColor(textMuted)
      .fontSize(9)
      .font('Helvetica-Bold');

    doc.text('DATE', 50, ledgerHeaderY);
    doc.text('DESCRIPTION', 135, ledgerHeaderY);
    doc.text('PAID BY', 335, ledgerHeaderY);
    doc.text('AMOUNT', 470, ledgerHeaderY, { width: 75, align: 'right' });

    doc
      .strokeColor(borderColor)
      .lineWidth(1)
      .moveTo(50, ledgerHeaderY + 12)
      .lineTo(545, ledgerHeaderY + 12)
      .stroke();

    doc.y = ledgerHeaderY + 20;

    // Ledger Table Rows
    if (expenses.length === 0) {
      doc
        .fillColor(textMuted)
        .fontSize(10)
        .font('Helvetica-Oblique')
        .text('No expenses recorded in this group.', 50, doc.y)
        .moveDown(1.5);
    } else {
      expenses.forEach(e => {
        // Page Overflow Safeguard
        if (doc.y > 740) {
          doc.addPage();
          doc
            .fillColor(textMuted)
            .fontSize(8)
            .font('Helvetica-Bold')
            .text(`VibeSplit Trip Report: ${group.name} (Continued)`, 50, 30)
            .moveDown(1.5);
          doc.y = 55;
        }

        const formattedDate = new Date(e.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        const payerName = e.payerId?.name || 'Unknown';
        const description = e.description || 'Expense';
        const amountStr = `$${Number(e.amount || 0).toFixed(2)}`;

        const rowY = doc.y;
        doc
          .fillColor(textDark)
          .fontSize(9)
          .font('Helvetica');

        doc.text(formattedDate, 50, rowY);
        doc.text(description, 135, rowY, { width: 190, lineBreak: false });
        doc.text(payerName, 335, rowY, { width: 130, lineBreak: false });
        doc.fillColor(primaryColor).font('Helvetica-Bold').text(amountStr, 470, rowY, { width: 75, align: 'right' });

        doc
          .strokeColor('#F1F5F9') // Slate 100 row border
          .lineWidth(0.5)
          .moveTo(50, rowY + 15)
          .lineTo(545, rowY + 15)
          .stroke();

        doc.y = rowY + 22;
      });
    }

    // --- DYNAMIC PAGE FOOTER OVERLAYS ---
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      // Footer Divider
      doc
        .strokeColor(borderColor)
        .lineWidth(0.5)
        .moveTo(50, 785)
        .lineTo(545, 785)
        .stroke();

      // Footer Text
      doc
        .fillColor(textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text('Generated by VibeSplit — Frictionless Group Expense Sharing', 50, 792);

      // Page Count
      doc
        .text(`Page ${i + 1} of ${pages.count}`, 470, 792, { width: 75, align: 'right' });
    }

    doc.end();
  } catch (error) {
    console.error('Generate PDF Report Error:', error);
    res.status(500).json({ error: 'Server error generating PDF report.' });
  }
};

