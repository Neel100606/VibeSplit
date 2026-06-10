import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Users, Split, ChevronRight, Check, Sparkles, Plus, Trash2 } from 'lucide-react';
import ReceiptScanner from '../ReceiptScanner.jsx';
import ItemizedRow from '../ItemizedRow.jsx';

const roundToTwo = (value) => Number(Number(value || 0).toFixed(2));

export default function AddExpenseModal({ 
  isOpen, 
  onClose, 
  members, 
  onSubmit, 
  user,
  groupName 
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState(user?._id || '');
  const [splitValues, setSplitValues] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [splitType, setSplitType] = useState('equal');

  useEffect(() => {
    if (isOpen) {
      if (members.length > 0) {
        const initialSplits = {};
        members.forEach(m => initialSplits[m._id] = '');
        setSplitValues(initialSplits);
        setPayerId(user?._id || members[0]?._id);
      }
      setDescription('');
      setAmount('');
      setLineItems([]);
      setSplitType('equal');
    }
  }, [isOpen, members, user?._id]);

  const handleScanSuccess = (items) => {
    const formattedItems = items.map((item, index) => ({
      id: Date.now() + index,
      itemName: item.itemName || '',
      itemPrice: (item.itemPrice || 0).toString(),
      assignedMembers: members.map(m => m._id),
    }));
    setLineItems(formattedItems);
    setSplitType('itemized');
    setIsScannerOpen(false);

    const totalSum = formattedItems.reduce((sum, item) => sum + Number(item.itemPrice || 0), 0);
    setAmount(totalSum > 0 ? totalSum.toFixed(2) : '');

    if (!description || description.trim() === '') {
      const summary = items.map(i => i.itemName).slice(0, 3).join(', ');
      const suffix = items.length > 3 ? '...' : '';
      setDescription(summary + suffix);
    }
  };

  const handleItemChange = (itemId, field, value) => {
    const updated = lineItems.map((item) => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setLineItems(updated);

    if (field === 'itemPrice') {
      const totalSum = updated.reduce((sum, item) => sum + Number(item.itemPrice || 0), 0);
      setAmount(totalSum > 0 ? totalSum.toFixed(2) : '');
    }
  };

  const handleRemoveItem = (itemId) => {
    const updated = lineItems.filter((item) => item.id !== itemId);
    setLineItems(updated);

    const totalSum = updated.reduce((sum, item) => sum + Number(item.itemPrice || 0), 0);
    setAmount(totalSum > 0 ? totalSum.toFixed(2) : '');
  };

  const handleAddItemRow = () => {
    setLineItems((current) => [
      ...current,
      {
        id: Date.now(),
        itemName: '',
        itemPrice: '',
        assignedMembers: members.map(m => m._id),
      },
    ]);
  };

  const handleAssignmentChange = (itemId, assignedMemberIds) => {
    setLineItems((current) =>
      current.map((item) => {
        if (item.id === itemId) {
          return { ...item, assignedMembers: assignedMemberIds };
        }
        return item;
      })
    );
  };

  const splitSum = useMemo(() => {
    return roundToTwo(
      Object.values(splitValues).reduce((sum, current) => sum + Number(current || 0), 0),
    );
  }, [splitValues]);

  const totalAmount = roundToTwo(amount);

  const splitsMatch = useMemo(() => {
    const totalAmt = roundToTwo(amount);
    if (totalAmt <= 0) return false;

    if (splitType === 'itemized') {
      const allItemsAssigned = lineItems.every(
        (item) => item.assignedMembers && item.assignedMembers.length > 0
      );
      if (!allItemsAssigned) return false;

      const totalItemPrices = roundToTwo(
        lineItems.reduce((sum, item) => sum + Number(item.itemPrice || 0), 0)
      );
      return Math.abs(totalItemPrices - totalAmt) <= 0.01;
    } else {
      return Math.abs(totalAmt - splitSum) <= 0.01;
    }
  }, [amount, splitType, lineItems, splitSum]);

  const itemizedSplits = useMemo(() => {
    if (splitType !== 'itemized') return {};

    const totals = {};
    members.forEach((m) => {
      totals[m._id] = 0;
    });

    lineItems.forEach((item) => {
      const price = Number(item.itemPrice) || 0;
      const assigned = item.assignedMembers || [];
      if (assigned.length === 0) return;

      const priceCents = Math.round(price * 100);
      const shareCents = Math.floor(priceCents / assigned.length);
      const remainderCents = priceCents % assigned.length;

      assigned.forEach((memberId, index) => {
        const extraCent = index < remainderCents ? 1 : 0;
        totals[memberId] += (shareCents + extraCent) / 100;
      });
    });

    return totals;
  }, [lineItems, splitType, members]);

  const handleSplitEqually = () => {
    if (!members.length || totalAmount <= 0) return;
    const totalCents = Math.round(totalAmount * 100);
    const memberCount = members.length;
    const baseShareCents = Math.floor(totalCents / memberCount);
    const remainder = totalCents % memberCount;
    const nextSplitValues = {};
    members.forEach((member, index) => {
      const cents = baseShareCents + (index === memberCount - 1 ? remainder : 0);
      nextSplitValues[member._id] = (cents / 100).toFixed(2);
    });
    setSplitValues(nextSplitValues);
  };

  const handleSplitChange = (memberId, value) => {
    if (value !== '' && Number(value) < 0) return;
    setSplitValues(current => ({ ...current, [memberId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || !splitsMatch || isSubmitting) return;

    setIsSubmitting(true);

    let payload;

    if (splitType === 'itemized') {
      const itemsPayload = lineItems.map((item) => ({
        itemName: item.itemName.trim() || 'Item',
        itemPrice: roundToTwo(item.itemPrice),
        assignedMembers: item.assignedMembers,
      }));

      const splits = Object.keys(itemizedSplits).map((memberId) => ({
        userId: memberId,
        owedAmount: roundToTwo(itemizedSplits[memberId]),
      }));

      payload = {
        description: description.trim(),
        amount: totalAmount,
        payerId,
        paidBy: payerId,
        splitType: 'itemized',
        items: itemsPayload,
        splits,
      };
    } else {
      const splits = members.map((member) => ({
        userId: member._id,
        owedAmount: roundToTwo(splitValues[member._id] || 0),
      }));

      payload = {
        description: description.trim(),
        amount: totalAmount,
        payerId,
        paidBy: payerId,
        splitType: 'equal',
        splits,
      };
    }

    const success = await onSubmit(payload);

    if (success) {
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          {/* Clickable backdrop overlay to close modal */}
          <div className="absolute inset-0 -z-10" onClick={onClose} />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg md:max-w-xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tighter text-white font-outfit">Add Expense</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Splitting in <span className="text-emerald-500">{groupName}</span></p>
              </div>
              <button 
                onClick={onClose}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Collapsible AI Scan Accordion */}
              <div className="border border-white/5 bg-[#0D0F12]/40 rounded-3xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(!isScannerOpen)}
                  className="flex items-center justify-between w-full px-6 py-4 text-left font-bold text-slate-200 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-extrabold font-outfit text-white">✨ Auto-Fill via AI Receipt Scan</span>
                  </div>
                  {isScannerOpen ? (
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">Hide</span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">Expand</span>
                  )}
                </button>
                
                {isScannerOpen && (
                  <div className="p-5 border-t border-white/5">
                    <ReceiptScanner onScanSuccess={handleScanSuccess} />
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div className="relative">
                <div className="flex items-center justify-center py-10">
                  <span className="text-4xl font-extrabold text-emerald-500 mr-2">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent text-center text-7xl font-extrabold tracking-tighter text-white outline-none placeholder:text-white/10 font-outfit [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex justify-center">
                  <input 
                    type="text" 
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What was it for?"
                    className="w-full max-w-xs bg-[#0D0F12] border border-slate-800 rounded-xl text-center text-xl font-bold text-slate-100 outline-none placeholder:text-slate-600 py-3"
                  />
                </div>
              </div>

              {/* Payer Selection */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Paid By</h3>
                  <p className="text-xs font-bold text-emerald-500">Selection</p>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {members.map((member) => (
                    <button
                      key={member._id}
                      type="button"
                      onClick={() => setPayerId(member._id)}
                      className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${payerId === member._id ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} className="h-5 w-5 rounded-full" />
                      {member._id === user?._id ? 'You' : member.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Split Type Selector */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Split Type</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 bg-white/5 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setSplitType('equal');
                      handleSplitEqually();
                    }}
                    className={`py-3 rounded-xl text-sm font-bold transition-all ${
                      splitType !== 'itemized'
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Equal Split
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSplitType('itemized');
                      if (lineItems.length === 0) {
                        setLineItems([
                          {
                            id: Date.now(),
                            itemName: description || 'Item 1',
                            itemPrice: amount || '0.00',
                            assignedMembers: members.map((m) => m._id),
                          },
                        ]);
                      }
                    }}
                    className={`py-3 rounded-xl text-sm font-bold transition-all ${
                      splitType === 'itemized'
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Itemized Split
                  </button>
                </div>
              </div>

              {/* Splits Selection or Itemized Matrix */}
              {splitType === 'itemized' ? (
                <div className="space-y-6">
                  {/* Itemized Rows list */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Itemized Assignments</h3>
                      <button
                        type="button"
                        onClick={handleAddItemRow}
                        className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full hover:bg-emerald-500/20 transition-colors"
                      >
                        <Plus size={14} /> Add Row
                      </button>
                    </div>

                    <div className="space-y-3">
                      {lineItems.map((item) => (
                        <div key={item.id} className="space-y-2">
                          <ItemizedRow
                            item={item}
                            members={members}
                            onAssignmentChange={handleAssignmentChange}
                          />
                          <div className="flex gap-2 items-center px-1">
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)}
                              placeholder="Edit item name"
                              className="flex-1 rounded-xl bg-[#0D0F12] py-2 px-3 text-xs text-slate-300 outline-none border border-slate-800/80 focus:ring-1 focus:ring-emerald-500/30"
                            />
                            <div className="relative w-20 shrink-0">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.itemPrice}
                                onChange={(e) => handleItemChange(item.id, 'itemPrice', e.target.value)}
                                placeholder="0.00"
                                className="w-full rounded-xl bg-[#0D0F12] py-2 pl-5 pr-2.5 text-right text-xs font-bold text-slate-300 outline-none border border-slate-800/80 focus:ring-1 focus:ring-emerald-500/30"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Breakdown Calculator display */}
                  <div className="space-y-3 pt-4 border-t border-white/5 bg-[#0D0F12]/30 p-5 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Itemized Breakdown</h4>
                      <span className="text-[10px] font-bold text-emerald-500/80 uppercase">Calculated</span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {members.map((member) => {
                        const debt = itemizedSplits[member._id] || 0;
                        return (
                          <div key={member._id} className="flex items-center justify-between rounded-xl bg-[#0F1115] px-4 py-2 border border-slate-800/80">
                            <span className="text-xs font-semibold text-slate-300 truncate max-w-[120px]">
                              {member._id === user?._id ? 'You' : member.name.split(' ')[0]}
                            </span>
                            <span className="text-xs font-black text-emerald-500">
                              ${debt.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Splits Selection */
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Split Between</h3>
                    <button 
                      type="button"
                      onClick={handleSplitEqually}
                      className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full hover:bg-emerald-500/20 transition-colors"
                    >
                      <Split size={14} /> Split Equally
                    </button>
                  </div>

                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member._id} className="group flex items-center justify-between rounded-3xl bg-[#0D0F12] p-4 transition-all border border-slate-800">
                        <div className="flex items-center gap-4">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} className="h-10 w-10 rounded-xl bg-slate-800" />
                          <div>
                            <p className="text-sm font-bold text-slate-100">{member.name}</p>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Debtor</p>
                          </div>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">$</span>
                          <input 
                            type="number" 
                            step="0.01"
                            value={splitValues[member._id] || ''}
                            onChange={(e) => handleSplitChange(member._id, e.target.value)}
                            placeholder="0.00"
                            className="w-24 rounded-2xl bg-[#13151A] py-2.5 pl-7 pr-4 text-right text-sm font-bold text-slate-100 outline-none border border-slate-800 focus:ring-1 focus:ring-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Info */}
              {!splitsMatch && totalAmount > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl bg-rose-500/10 p-4 ring-1 ring-rose-500/50"
                >
                  <p className="text-center text-xs font-bold text-rose-500">
                    Split total ({splitSum}) does not match amount ({totalAmount})
                  </p>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!description || !splitsMatch || isSubmitting}
                className="group relative w-full overflow-hidden rounded-3xl bg-emerald-500 py-6 text-lg font-black uppercase tracking-tighter text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 shadow-2xl shadow-emerald-500/30"
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {isSubmitting ? (
                     <div className="h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  ) : (
                    <>
                      <span>{splitsMatch ? 'Confirm Expense' : 'Calculating Spliv...'}</span>
                      <ChevronRight size={24} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </div>
                <div className="absolute inset-0 translate-y-full bg-white/20 transition-transform group-hover:translate-y-0" />
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
