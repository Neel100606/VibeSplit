import Expense from '../models/Expense.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Activity from '../models/Activity.js';
import { getIO } from '../utils/socket.js';

const roundToTwo = (value) => Number(Number(value || 0).toFixed(2));

const validateAndNormalizeExpensePayload = ({ groupId, description, amount, payerId, paidBy, splitType, splits, items }, fallbackPayerId) => {
  const finalPayerId = payerId || paidBy || fallbackPayerId;
  const numericAmount = Number(amount);
  const finalSplitType = splitType || 'equal';

  if (!description?.trim()) {
    return { error: 'Description is required.' };
  }

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { error: 'Amount must be a positive number.' };
  }

  let finalSplits = [];

  if (finalSplitType === 'itemized') {
    if (!Array.isArray(items) || items.length === 0) {
      return { error: 'Items array must not be empty when splitType is itemized.' };
    }

    const totalItemPrices = roundToTwo(
      items.reduce((sum, item) => sum + Number(item.itemPrice || 0), 0)
    );

    if (Math.abs(totalItemPrices - numericAmount) > 0.01) {
      return {
        error: `Validation failed: The sum of item prices (${totalItemPrices}) must exactly equal the total expense amount (${numericAmount}).`,
      };
    }

    const memberDebtMap = {};

    for (const item of items) {
      if (!Array.isArray(item.assignedMembers) || item.assignedMembers.length === 0) {
        return { error: `Item "${item.itemName}" must be assigned to at least one member.` };
      }

      // Distribute cents to avoid rounding mismatches
      const itemPriceCents = Math.round(Number(item.itemPrice) * 100);
      const costPerPersonCents = Math.floor(itemPriceCents / item.assignedMembers.length);
      const remainderCents = itemPriceCents % item.assignedMembers.length;

      item.assignedMembers.forEach((member, index) => {
        const memberIdStr = member.toString();
        // Distribute remainder cents to first few members
        const shareCents = costPerPersonCents + (index < remainderCents ? 1 : 0);
        const shareAmount = shareCents / 100;
        memberDebtMap[memberIdStr] = (memberDebtMap[memberIdStr] || 0) + shareAmount;
      });
    }

    finalSplits = Object.keys(memberDebtMap).map((memberId) => ({
      userId: memberId,
      owedAmount: roundToTwo(memberDebtMap[memberId]),
    }));
  } else {
    if (!Array.isArray(splits) || splits.length === 0) {
      return { error: 'Splits array is required.' };
    }

    finalSplits = splits.map((split) => ({
      userId: split.userId,
      owedAmount: roundToTwo(split.owedAmount),
    }));

    const totalSplits = roundToTwo(
      finalSplits.reduce((sum, split) => sum + Number(split.owedAmount), 0),
    );

    if (Math.abs(totalSplits - numericAmount) > 0.01) {
      return {
        error: `Validation failed: The sum of owed amounts (${totalSplits}) must exactly equal the total expense amount (${numericAmount}).`,
      };
    }
  }

  return {
    data: {
      groupId: groupId || null,
      description: description.trim(),
      amount: roundToTwo(numericAmount),
      payerId: finalPayerId,
      paidBy: finalPayerId,
      splitType: finalSplitType,
      splits: finalSplits,
      items: finalSplitType === 'itemized' ? items : undefined,
    },
  };
};

export const createExpense = async (req, res) => {
  try {
    const validation = validateAndNormalizeExpensePayload(req.body, req.user._id);

    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const newExpense = new Expense(validation.data);

    await newExpense.save();

    const populatedExpense = await Expense.findById(newExpense._id)
      .populate('payerId', 'name email')
      .populate('splits.userId', 'name email')
      .populate('items.assignedMembers', 'name email');

    const io = getIO();
    if (populatedExpense.groupId) {
      io.to(populatedExpense.groupId.toString()).emit('expenseUpdated');

      // Create activity
      const activity = new Activity({
        groupId: populatedExpense.groupId,
        userId: req.user._id,
        type: 'expense',
        text: 'added a new expense: ' + populatedExpense.description,
      });
      await activity.save();
      io.to(populatedExpense.groupId.toString()).emit('activityAdded');

      // Create notifications for ALL participants
      for (const split of populatedExpense.splits) {
        const recipientId = split.userId?._id || split.userId;
        const notification = new Notification({
          recipientId,
          type: 'expense_added',
          message: `${populatedExpense.payerId.name} added a new expense: ${populatedExpense.description}`,
          link: `/groups/${populatedExpense.groupId}`
        });
        await notification.save();
        io.to(recipientId.toString()).emit('newNotification');
      }
    }

    res.status(201).json({
      message: 'Expense created successfully',
      expense: populatedExpense,
    });
  } catch (error) {
    console.error('Create Expense Error:', error);
    res.status(500).json({ error: 'Server error creating expense.' });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const validation = validateAndNormalizeExpensePayload(req.body, req.user._id);

    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      validation.data,
      { new: true, runValidators: true },
    )
      .populate('payerId', 'name email')
      .populate('splits.userId', 'name email')
      .populate('items.assignedMembers', 'name email');

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    const io = getIO();
    if (expense.groupId) {
      io.to(expense.groupId.toString()).emit('expenseUpdated');
    }

    res.json({
      message: 'Expense updated successfully',
      expense,
    });
  } catch (error) {
    console.error('Update Expense Error:', error);
    res.status(500).json({ error: 'Server error updating expense.' });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    const io = getIO();
    if (expense.groupId) {
      io.to(expense.groupId.toString()).emit('expenseUpdated');
    }

    res.json({ message: 'Expense deleted successfully.' });
  } catch (error) {
    console.error('Delete Expense Error:', error);
    res.status(500).json({ error: 'Server error deleting expense.' });
  }
};

export const getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;

    const expenses = await Expense.find({ groupId })
      .populate('payerId', 'name email')
      .populate('splits.userId', 'name email')
      .populate('items.assignedMembers', 'name email');

    res.json({ expenses });
  } catch (error) {
    console.error('Fetch Group Expenses Error:', error);
    res.status(500).json({ error: 'Server error fetching group expenses.' });
  }
};

// Skeletons for future implementation
export const getExpenses = async (req, res) => { res.json({ message: 'Expenses fetched (skeleton)' }); };
export const getExpenseDetails = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('payerId', 'name email')
      .populate('splits.userId', 'name email')
      .populate('items.assignedMembers', 'name email');

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    res.json({ expense });
  } catch (error) {
    console.error('Get Expense Details Error:', error);
    res.status(500).json({ error: 'Server error fetching expense details.' });
  }
};
export const settlePayment = async (req, res) => {
  try {
    const { groupId, payerId, receiverId, amount } = req.body;

    if (!groupId || !payerId || !receiverId || !amount) {
      return res.status(400).json({ error: 'groupId, payerId, receiverId, and amount are required.' });
    }

    if (payerId === receiverId) {
      return res.status(400).json({ error: 'Payer and receiver must be different users.' });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    const payment = new Payment({
      groupId,
      payerId,
      receiverId,
      amount: numericAmount,
    });

    await payment.save();

    const io = getIO();
    io.to(groupId.toString()).emit('settlementUpdated');

    // Create activity
    const receiver = await User.findById(receiverId);
    const activity = new Activity({
      groupId,
      userId: req.user._id,
      type: 'settlement',
      text: 'settled up a payment',
    });
    await activity.save();
    io.to(groupId.toString()).emit('activityAdded');

    // Notifications for Payment
    const settlementMsg = `A payment of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD'}).format(numericAmount)} was settled`;
    
    // Notify Payer
    const payerNotification = new Notification({
      recipientId: payerId,
      type: 'settlement',
      message: settlementMsg,
      link: `/groups/${groupId}`
    });
    await payerNotification.save();
    io.to(payerId.toString()).emit('newNotification');

    // Notify Receiver
    const receiverNotification = new Notification({
      recipientId: receiverId,
      type: 'settlement',
      message: settlementMsg,
      link: `/groups/${groupId}`
    });
    await receiverNotification.save();
    io.to(receiverId.toString()).emit('newNotification');

    res.status(201).json({
      message: 'Payment recorded successfully.',
      payment,
    });
  } catch (error) {
    console.error('Settle Payment Error:', error);
    res.status(500).json({ error: 'Server error recording payment.' });
  }
};
export const getActivityLedger = async (req, res) => { res.json({ message: 'Activity ledger fetched (skeleton)' }); };
