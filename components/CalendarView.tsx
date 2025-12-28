
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Transaction, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
  onSelectDate: (date: string | null) => void;
  selectedDate: string | null;
}

export const CalendarView: React.FC<Props> = ({ transactions, onSelectDate, selectedDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<TransactionType>(TransactionType.EXPENSE);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper: Get days in month
  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  // Helper: Get day of week for the 1st of the month (0-6, 0=Sunday)
  // We want Monday start, so adjust: 0(Sun)->6, 1(Mon)->0, etc.
  const getFirstDayOfMonth = (y: number, m: number) => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getFirstDayOfMonth(year, month);
  
  // 1. Calculate Daily Stats & Find Max Values for Heatmap
  const { dailyStats, maxValues } = useMemo(() => {
    const stats: Record<string, { income: number; expense: number }> = {};
    let maxInc = 0;
    let maxExp = 0;
    
    transactions.forEach(t => {
      const tDate = new Date(t.date);
      // Filter by current view month
      if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        const dayStr = tDate.getDate().toString();
        if (!stats[dayStr]) {
          stats[dayStr] = { income: 0, expense: 0 };
        }
        if (t.type === TransactionType.INCOME) {
          stats[dayStr].income += t.amount;
        } else {
          stats[dayStr].expense += t.amount;
        }
      }
    });

    // Calculate Max after aggregating
    Object.values(stats).forEach(val => {
      if (val.income > maxInc) maxInc = val.income;
      if (val.expense > maxExp) maxExp = val.expense;
    });

    return { dailyStats: stats, maxValues: { income: maxInc, expense: maxExp } };
  }, [transactions, year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (selectedDate === dateStr) {
      onSelectDate(null); // Deselect
    } else {
      onSelectDate(dateStr);
    }
  };

  // Helper: Get Heatmap Color Class based on amount ratio
  const getHeatmapClass = (amount: number, max: number, type: TransactionType) => {
    if (amount === 0 || max === 0) return 'bg-white text-gray-700';
    
    const ratio = amount / max;

    if (type === TransactionType.EXPENSE) {
      if (ratio < 0.15) return 'bg-red-50 text-gray-700';
      if (ratio < 0.35) return 'bg-red-100 text-red-900';
      if (ratio < 0.60) return 'bg-red-200 text-red-900';
      if (ratio < 0.85) return 'bg-red-300 text-white';
      return 'bg-red-400 text-white font-medium shadow-sm';
    } else {
      if (ratio < 0.15) return 'bg-green-50 text-gray-700';
      if (ratio < 0.35) return 'bg-green-100 text-green-900';
      if (ratio < 0.60) return 'bg-green-200 text-green-900';
      if (ratio < 0.85) return 'bg-green-300 text-white';
      return 'bg-green-400 text-white font-medium shadow-sm';
    }
  };

  // Generate grid cells
  const renderCalendar = () => {
    const totalSlots = startDay + daysInMonth;
    const grid = [];

    // Week Headers
    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
    
    // Empty slots before 1st day
    for (let i = 0; i < startDay; i++) {
      grid.push(<div key={`empty-${i}`} className="h-14"></div>);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      
      const stat = dailyStats[day.toString()];
      const currentAmount = stat ? (viewType === TransactionType.EXPENSE ? stat.expense : stat.income) : 0;
      const maxAmount = viewType === TransactionType.EXPENSE ? maxValues.expense : maxValues.income;
      
      // Determine background style
      let cellClass = getHeatmapClass(currentAmount, maxAmount, viewType);
      
      // Override if selected (Strong Highlight)
      if (isSelected) {
        cellClass = 'bg-gray-900 text-white shadow-md scale-105 z-10 border-gray-900';
      } else if (isToday && currentAmount === 0) {
        // Today but no data
        cellClass = 'bg-indigo-50 text-indigo-600 border-indigo-200 border';
      } else {
        // Add subtle border to non-empty heatmap cells
        if (currentAmount > 0) cellClass += ' border-transparent';
        else cellClass += ' border-gray-50';
      }

      grid.push(
        <div 
          key={day} 
          onClick={() => handleDayClick(day)}
          className={`h-12 relative rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 border ${cellClass}`}
        >
          <span className="text-[10px] absolute top-1 left-1 opacity-70 leading-none">{day}</span>
          
          {currentAmount > 0 && (
            <span className="text-xs font-bold mt-1.5">
               {Math.round(currentAmount)}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 animate-in slide-in-from-top-2 duration-300">
        {/* Header Controls */}
        <div className="flex flex-col gap-4 mb-4">
          {/* Month Nav */}
          <div className="flex justify-between items-center">
             <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
               <ChevronLeft size={20} />
             </button>
             <span className="font-bold text-gray-800 text-sm">
               {year}年 {month + 1}月
             </span>
             <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
               <ChevronRight size={20} />
             </button>
          </div>

          {/* Type Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
             <button
               onClick={() => setViewType(TransactionType.EXPENSE)}
               className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                 viewType === TransactionType.EXPENSE 
                   ? 'bg-white text-red-500 shadow-sm' 
                   : 'text-gray-400 hover:text-gray-600'
               }`}
             >
               <ArrowUpCircle size={14} /> 支出日历
             </button>
             <button
               onClick={() => setViewType(TransactionType.INCOME)}
               className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                 viewType === TransactionType.INCOME 
                   ? 'bg-white text-green-500 shadow-sm' 
                   : 'text-gray-400 hover:text-gray-600'
               }`}
             >
               <ArrowDownCircle size={14} /> 收入日历
             </button>
          </div>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
          {weekDays.map(d => (
            <div key={d} className="text-[10px] text-gray-400 font-medium">{d}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {grid}
        </div>
        
        {selectedDate && (
          <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
             <span className="text-xs text-indigo-600 font-medium">已筛选: {selectedDate}</span>
             <button 
               onClick={() => onSelectDate(null)}
               className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600"
             >
               <X size={12} /> 清除筛选
             </button>
          </div>
        )}
      </div>
    );
  };

  return renderCalendar();
};
