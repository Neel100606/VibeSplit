import express from 'express';
import { 
  createExpense, 
  updateExpense,
  deleteExpense,
  getExpenses, 
  getExpenseDetails, 
  getGroupExpenses, 
  settlePayment, 
  getActivityLedger 
} from '../controllers/expenseController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, createExpense);
router.get('/', auth, getExpenses);
router.get('/group/:groupId', auth, getGroupExpenses);
router.post('/settle', auth, settlePayment);
router.get('/activity', auth, getActivityLedger);
router.get('/:id', auth, getExpenseDetails);
router.put('/:id', auth, updateExpense);
router.delete('/:id', auth, deleteExpense);

export default router;
