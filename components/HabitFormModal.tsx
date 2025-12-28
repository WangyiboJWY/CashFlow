
import React, { useState, useEffect } from 'react';
import { X, Check, Info } from 'lucide-react';
import { Habit, HabitPeriod } from '../types';
import { HABIT_ICONS, HABIT_COLORS } from '../constants';

interface Props {
  habit?: Habit | null; // Null for create mode
  isOpen: boolean;
  onClose: () => void;
  onSave: (habit: Habit) => void;
  onDelete: (id: string) => void;
}

export const HabitFormModal: React.FC<Props> = ({ habit, isOpen, onClose, onSave, onDelete }) => {
  const [name, setName] = useState('');
  const [iconKey, setIconKey] = useState('check');
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [targetCount, setTargetCount] = useState<number>(1);
  const [period, setPeriod] = useState<HabitPeriod>('daily');
  const [customInterval, setCustomInterval] = useState<number>(2);
  const [allowExceed, setAllowExceed] = useState<boolean>(false);

  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setIconKey(habit.icon);
      setColor(habit.color);
      setTargetCount(habit.targetCount);
      setPeriod(habit.period);
      setAllowExceed(habit.allowExceed ?? false);
      if (habit.period === 'custom' && habit.customInterval) {
        setCustomInterval(habit.customInterval);
      }
    } else {
      // Reset for new
      setName('');
      setIconKey('check');
      setColor(HABIT_COLORS[0]);
      setTargetCount(1);
      setPeriod('daily');
      setCustomInterval(2);
      setAllowExceed(false); // Default false
    }
  }, [habit, isOpen]);

  const handleSubmit = () => {
    if (!name.trim()) {
      alert("请输入习惯名称");
      return;
    }
    
    // Construct incomplete habit object (ID and Logs handled by service)
    const newHabit: any = {
      id: habit?.id,
      name,
      icon: iconKey,
      color,
      targetCount,
      period,
      allowExceed,
      customInterval: period === 'custom' ? customInterval : undefined,
      logs: habit?.logs || []
    };

    onSave(newHabit);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 relative max-h-[90vh] overflow-y-auto no-scrollbar">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">{habit ? '编辑习惯' : '新建习惯'}</h2>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-5">
           {/* Name */}
           <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">习惯名称</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：喝水、背单词"
                className="w-full bg-gray-50 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-indigo-100"
              />
           </div>

           {/* Period & Target */}
           <div className="flex gap-4">
              <div className="flex-1">
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">频率周期</label>
                 <select 
                    value={period} 
                    onChange={(e) => setPeriod(e.target.value as HabitPeriod)}
                    className="w-full bg-gray-50 rounded-xl px-3 py-3 font-medium outline-none appearance-none"
                 >
                    <option value="daily">每天</option>
                    <option value="weekly">每周</option>
                    <option value="monthly">每月</option>
                    <option value="custom">自定义</option>
                 </select>
              </div>
              <div className="w-1/3">
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">目标次数</label>
                 <input 
                    type="number" 
                    min="1"
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    className="w-full bg-gray-50 rounded-xl px-3 py-3 font-medium outline-none text-center"
                 />
              </div>
           </div>

           {/* Custom Interval Input */}
           {period === 'custom' && (
             <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">自定义周期天数</label>
                <div className="flex items-center gap-3">
                   <span className="text-gray-600 font-medium text-sm">每</span>
                   <input 
                      type="number" 
                      min="2"
                      value={customInterval}
                      onChange={(e) => setCustomInterval(Math.max(1, Number(e.target.value)))}
                      className="w-20 bg-white rounded-lg px-2 py-2 text-center font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                   />
                   <span className="text-gray-600 font-medium text-sm">天刷新一次</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">例如设置 2 天，即表示“每两天完成 {targetCount} 次”。</p>
             </div>
           )}

           {/* Allow Exceed Toggle */}
           <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
             <div className="flex items-center gap-2">
               <Info size={16} className="text-gray-400" />
               <span className="text-sm font-bold text-gray-600">允许超额打卡</span>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
               <input 
                  type="checkbox" 
                  checked={allowExceed}
                  onChange={(e) => setAllowExceed(e.target.checked)}
                  className="sr-only peer" 
               />
               <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
             </label>
           </div>
           <p className="text-[10px] text-gray-400 -mt-3 px-1">
             开启后，即使达到目标次数，仍可继续记录（适合“喝水”等无上限习惯）；关闭后，达到目标即锁定（默认）。
           </p>

           {/* Icon Selection */}
           <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">选择图标</label>
              <div className="flex flex-wrap gap-3">
                 {Object.keys(HABIT_ICONS).map(key => {
                    const Icon = HABIT_ICONS[key];
                    const isSelected = iconKey === key;
                    return (
                       <button
                         key={key}
                         onClick={() => setIconKey(key)}
                         className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-gray-800 text-white shadow-md scale-110' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                       >
                          <Icon size={20} />
                       </button>
                    );
                 })}
              </div>
           </div>

           {/* Color Selection */}
           <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">主题颜色</label>
              <div className="flex flex-wrap gap-3">
                 {HABIT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-all border-2 ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                 ))}
              </div>
           </div>
        </div>

        <div className="mt-8 space-y-3">
           <button 
             onClick={handleSubmit}
             className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
           >
             <Check size={20} /> 保存
           </button>
           
           {habit && (
              <button 
                onClick={() => { if(confirm("确定删除这个习惯吗？")) onDelete(habit.id); }}
                className="w-full bg-red-50 text-red-500 py-3 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
              >
                删除此习惯
              </button>
           )}
        </div>

      </div>
    </div>
  );
};
