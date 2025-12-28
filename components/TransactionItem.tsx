
import React from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants';
import { Trash2 } from 'lucide-react';

interface Props {
  transaction: Transaction;
  onDelete: (id: string) => void;
  onClick: (transaction: Transaction) => void;
}

export const TransactionItem: React.FC<Props> = ({ transaction, onDelete, onClick }) => {
  const isExpense = transaction.type === TransactionType.EXPENSE;
  
  // Extract main category for styling
  const mainCategory = transaction.category.split(' - ')[0];
  
  const color = CATEGORY_COLORS[mainCategory] || '#999';
  const Icon = CATEGORY_ICONS[mainCategory] || CATEGORY_ICONS[Category.OTHER];

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡，防止打开详情页
    onDelete(transaction.id);
  };

  return (
    <div 
      onClick={() => onClick(transaction)}
      className="bg-white rounded-xl p-4 shadow-sm mb-3 flex items-center justify-between border border-gray-100 active:scale-[0.98] transition-all cursor-pointer hover:shadow-md group relative"
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm"
          style={{ backgroundColor: color }}
        >
          <Icon size={20} />
        </div>
        <div>
          {/* Display full category name (including sub) */}
          <h4 className="font-semibold text-gray-800">{transaction.category}</h4>
          <p className="text-xs text-gray-400">
            {new Date(transaction.date).toLocaleDateString()} · {transaction.note || transaction.category}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`font-bold text-lg ${isExpense ? 'text-gray-900' : 'text-green-600'}`}>
          {isExpense ? '-' : '+'}{transaction.amount.toFixed(2)}
        </span>
        
        {/* Delete Button - Z-index ensure it's on top, no negative margin */}
        <button
          type="button"
          onClick={handleDeleteClick}
          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
          title="删除"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};
