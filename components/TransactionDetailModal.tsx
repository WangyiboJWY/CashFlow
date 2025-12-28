
import React from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants';
import { X, Calendar, FileText, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface Props {
  transaction: Transaction | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const TransactionDetailModal: React.FC<Props> = ({ transaction, onClose, onDelete }) => {
  if (!transaction) return null;

  const isExpense = transaction.type === TransactionType.EXPENSE;
  
  // Extract main category for styling
  const mainCategory = transaction.category.split(' - ')[0];

  const color = CATEGORY_COLORS[mainCategory] || '#999';
  const Icon = CATEGORY_ICONS[mainCategory] || CATEGORY_ICONS[Category.OTHER];
  
  // Format date to include time with seconds
  const formattedDate = new Date(transaction.date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const handleDelete = () => {
    if (confirm("确定要永久删除这条记录吗？")) {
      onDelete(transaction.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={20} className="text-gray-500" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center mb-6 mt-4">
          <div 
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-lg mb-4 transform transition-transform"
            style={{ backgroundColor: color, boxShadow: `0 10px 25px -5px ${color}66` }}
          >
            <Icon size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{transaction.category}</h2>
          <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${isExpense ? 'text-red-500' : 'text-green-500'}`}>
            {isExpense ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
            {isExpense ? '支出' : '收入'}
          </div>
        </div>

        {/* Amount */}
        <div className="text-center mb-8">
          <span className={`text-4xl font-mono font-bold tracking-tight ${isExpense ? 'text-gray-900' : 'text-green-600'}`}>
            {isExpense ? '-' : '+'}{transaction.amount.toFixed(2)}
          </span>
        </div>

        {/* Details List */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="p-2 bg-white rounded-lg shadow-sm text-gray-400">
               <Calendar size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">日期时间</p>
              <p className="text-gray-700 font-medium">{formattedDate}</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="p-2 bg-white rounded-lg shadow-sm text-gray-400">
               <FileText size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">备注</p>
              <p className="text-gray-700 font-medium leading-relaxed">
                {transaction.note || "无备注"}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <button 
          onClick={handleDelete}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-red-50 text-red-600 font-bold hover:bg-red-50 hover:border-red-100 transition-all active:scale-95"
        >
          <Trash2 size={18} />
          删除此记录
        </button>
      </div>
    </div>
  );
};
