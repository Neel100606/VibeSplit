const EPSILON = 0.01;

const roundCurrency = (value) => Number(value.toFixed(2));

const sortByBalanceDesc = (entries) => {
  entries.sort((a, b) => b.balance - a.balance);
};

export const simplifyDebts = (expenses = [], payments = []) => {
  const balances = new Map();

  for (const expense of expenses) {
    const payer = expense.payerId || expense.paidBy;
    if (!payer) continue;

    const payerId = payer.toString();
    const amount = Number(expense.amount) || 0;

    balances.set(payerId, roundCurrency((balances.get(payerId) || 0) + amount));

    for (const split of expense.splits || []) {
      if (!split.userId) continue;
      const userId = split.userId.toString();
      const owedAmount = Number(split.owedAmount) || 0;

      balances.set(userId, roundCurrency((balances.get(userId) || 0) - owedAmount));
    }
  }

  for (const payment of payments) {
    const payerId = payment.payerId.toString();
    const receiverId = payment.receiverId.toString();
    const amount = Number(payment.amount) || 0;

    // A recorded payment moves both sides closer to zero.
    balances.set(payerId, roundCurrency((balances.get(payerId) || 0) + amount));
    balances.set(receiverId, roundCurrency((balances.get(receiverId) || 0) - amount));
  }

  const creditors = [];
  const debtors = [];

  for (const [userId, balance] of balances.entries()) {
    if (balance > EPSILON) {
      creditors.push({ userId, balance: roundCurrency(balance) });
    } else if (balance < -EPSILON) {
      debtors.push({ userId, balance: roundCurrency(Math.abs(balance)) });
    }
  }

  sortByBalanceDesc(creditors);
  sortByBalanceDesc(debtors);

  const transactions = [];

  const creditorBuckets = new Map();
  for (const creditor of creditors) {
    const key = creditor.balance.toFixed(2);
    const bucket = creditorBuckets.get(key) || [];
    bucket.push(creditor);
    creditorBuckets.set(key, bucket);
  }

  const remainingDebtors = [];
  for (const debtor of debtors) {
    const key = debtor.balance.toFixed(2);
    const bucket = creditorBuckets.get(key);

    if (bucket && bucket.length > 0) {
      const creditor = bucket.pop();

      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: debtor.balance,
      });

      if (bucket.length === 0) {
        creditorBuckets.delete(key);
      }
    } else {
      remainingDebtors.push(debtor);
    }
  }

  const remainingCreditors = [];
  for (const bucket of creditorBuckets.values()) {
    remainingCreditors.push(...bucket);
  }

  sortByBalanceDesc(remainingDebtors);
  sortByBalanceDesc(remainingCreditors);

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < remainingDebtors.length && creditorIndex < remainingCreditors.length) {
    const debtor = remainingDebtors[debtorIndex];
    const creditor = remainingCreditors[creditorIndex];
    const amount = roundCurrency(Math.min(debtor.balance, creditor.balance));

    transactions.push({
      from: debtor.userId,
      to: creditor.userId,
      amount,
    });

    debtor.balance = roundCurrency(debtor.balance - amount);
    creditor.balance = roundCurrency(creditor.balance - amount);

    if (debtor.balance <= EPSILON) {
      debtorIndex += 1;
    }

    if (creditor.balance <= EPSILON) {
      creditorIndex += 1;
    }
  }

  return transactions;
};
