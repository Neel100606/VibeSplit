import mongoose from 'mongoose';

const splitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  owedAmount: {
    type: Number,
    required: true,
  },
}, { _id: false });

const itemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
  },
  itemPrice: {
    type: Number,
    required: true,
  },
  assignedMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { _id: false });

const expenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: false, // Can be null for non-group expenses
  },
  payerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  splitType: {
    type: String,
    enum: ['equal', 'exact', 'percentage', 'itemized'],
    default: 'equal',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  splits: [splitSchema],
  items: {
    type: [itemSchema],
    validate: {
      validator: function(v) {
        if (this.splitType === 'itemized') {
          return Array.isArray(v) && v.length > 0;
        }
        return true;
      },
      message: 'Items array must not be empty when splitType is itemized.',
    },
  },
}, {
  timestamps: true,
});

// Synchronize payerId and paidBy fields pre-validation
expenseSchema.pre('validate', function(next) {
  if (this.paidBy && !this.payerId) {
    this.payerId = this.paidBy;
  } else if (this.payerId && !this.paidBy) {
    this.paidBy = this.payerId;
  }
  next();
});

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
