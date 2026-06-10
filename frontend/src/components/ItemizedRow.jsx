import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * ItemizedRow Component
 * Renders an individual receipt line item with its description and price.
 * On the right side, displays a multi-select dropdown menu representing group members,
 * allowing the user to toggle which members are assigned to this item.
 */
export default function ItemizedRow({ item, members, onAssignmentChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const assignedIds = item.assignedMembers || [];
  const assignedSet = new Set(assignedIds);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleMemberToggle = (memberId) => {
    let newAssigned;
    if (assignedSet.has(memberId)) {
      newAssigned = assignedIds.filter((id) => id !== memberId);
    } else {
      newAssigned = [...assignedIds, memberId];
    }
    onAssignmentChange(item.id, newAssigned);
  };

  const getButtonText = () => {
    if (assignedIds.length === 0) {
      return 'Select Friends';
    }
    if (assignedIds.length === members.length) {
      return 'Everyone';
    }
    if (assignedIds.length === 1) {
      const member = members.find((m) => m._id === assignedIds[0]);
      return member ? `${member.name.split(' ')[0]}` : '1 Friend';
    }
    return `${assignedIds.length} Friends`;
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D0F12]/80 border border-slate-800 hover:border-white/5 transition-all duration-300">
      {/* Left side: Item details */}
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-bold text-slate-200 truncate">{item.itemName || 'Item'}</h4>
        <p className="text-xs font-bold text-emerald-500 mt-0.5">${Number(item.itemPrice || 0).toFixed(2)}</p>
      </div>

      {/* Right side: Customizable multi-select dropdown button */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-[#13151A] text-slate-300 hover:bg-slate-800/80 rounded-xl border border-slate-800 hover:border-white/10 transition-all cursor-pointer shadow-md"
        >
          <span className="truncate max-w-[120px]">{getButtonText()}</span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 max-h-60 overflow-y-auto bg-[#0A0C0E] border border-slate-800 rounded-xl shadow-2xl z-30 p-2 space-y-1 scrollbar-hide">
            {members.map((member) => {
              const isAssigned = assignedSet.has(member._id);
              return (
                <button
                  key={member._id}
                  type="button"
                  onClick={() => handleMemberToggle(member._id)}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-left text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                      alt={member.name}
                      className="h-6 w-6 rounded-lg bg-slate-800 shrink-0 object-cover"
                    />
                    <span className="truncate font-semibold">{member.name}</span>
                  </div>
                  <div className={`flex h-4.5 w-4.5 items-center justify-center rounded-md border transition-all duration-200 shrink-0 ${
                    isAssigned 
                      ? 'bg-emerald-500 border-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                      : 'border-slate-700 bg-transparent'
                  }`}>
                    {isAssigned && <Check size={12} strokeWidth={4} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

