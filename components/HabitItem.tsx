
import React, { useRef, useState, useEffect } from 'react';
import { Habit } from '../types';
import { HABIT_ICONS } from '../constants';
import { getHabitProgress, calculateHabitStats } from '../services/storageService';
import { Settings, Check, Lock, RotateCcw, Plus, Flame, Trophy } from 'lucide-react';

interface Props {
  habit: Habit;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onEdit: (habit: Habit) => void;
}

export const HabitItem: React.FC<Props> = ({ habit, onIncrement, onDecrement, onEdit }) => {
  const Icon = HABIT_ICONS[habit.icon] || HABIT_ICONS['check'];
  
  // Stats Calculation
  const progress = getHabitProgress(habit);
  const { streak, totalAccumulated } = calculateHabitStats(habit);
  
  const percentage = Math.min(100, (progress / habit.targetCount) * 100);
  const isCompleted = progress >= habit.targetCount;
  
  const canExceed = habit.allowExceed ?? false;
  const isLocked = isCompleted && !canExceed;

  // --- Interaction State ---
  const [isPressing, setIsPressing] = useState(false);
  const [feedbackHint, setFeedbackHint] = useState<string>('');
  const [animState, setAnimState] = useState<'idle' | 'pop' | 'shake'>('idle');
  
  const timerRef = useRef<any>(null);
  const isLongPressTriggered = useRef(false);
  const hintTimeoutRef = useRef<any>(null);

  // Helper to show temporary hint
  const showHint = (text: string, duration = 1500) => {
    setFeedbackHint(text);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => setFeedbackHint(''), duration);
  };

  const handleStart = (e: React.PointerEvent) => {
    e.preventDefault();
    isLongPressTriggered.current = false;
    setIsPressing(true);
    setAnimState('idle'); // Reset animations
    
    // Show hint immediately for long press instruction
    if (progress > 0) {
        setFeedbackHint('长按撤销');
    }

    timerRef.current = setTimeout(() => {
      // Trigger Long Press (Decrement)
      if (progress > 0) {
        isLongPressTriggered.current = true;
        if (navigator.vibrate) navigator.vibrate(50);
        onDecrement(habit.id);
        showHint('已撤销 -1');
      } else {
        // Nothing to decrement
        isLongPressTriggered.current = true; // Mark as handled to prevent click
        showHint('无记录');
      }
      setIsPressing(false);
    }, 600);
  };

  const handleEnd = (e: React.PointerEvent) => {
    e.preventDefault();
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);

    // Handle Click (Increment)
    if (!isLongPressTriggered.current) {
       if (isLocked) {
         if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
         setAnimState('shake');
         setTimeout(() => setAnimState('idle'), 400);
         showHint('已达上限');
         return;
       }
       
       // Success Click
       onIncrement(habit.id);
       setAnimState('pop');
       setTimeout(() => setAnimState('idle'), 200);
       showHint('打卡 +1');
    }
  };

  const handleCancel = (e: React.PointerEvent) => {
    e.preventDefault();
    if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }
    setIsPressing(false);
    setFeedbackHint(''); // Clear hint if cancelled
  };

  const getPeriodLabel = () => {
    if (habit.period === 'daily') return '每天';
    if (habit.period === 'weekly') return '每周';
    if (habit.period === 'monthly') return '每月';
    if (habit.period === 'custom') return `每 ${habit.customInterval || 1} 天`;
    return '周期';
  };

  return (
    <div 
      className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-3 relative overflow-hidden select-none touch-none transition-all duration-200
        ${isLocked ? 'opacity-90 bg-gray-50/50' : 'cursor-pointer active:scale-[0.99]'} 
        ${isPressing ? 'scale-[0.98] bg-gray-50' : ''}
        ${animState === 'shake' ? 'animate-shake' : ''}
      `}
      style={{
        animation: animState === 'shake' ? 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both' : 'none'
      }}
      onPointerDown={handleStart}
      onPointerUp={handleEnd}
      onPointerLeave={handleCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>

      <div className="flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-4">
           {/* Icon Circle */}
           <div className={`relative w-14 h-14 flex items-center justify-center transition-transform duration-300 ${animState === 'pop' ? 'scale-110' : ''}`}>
              {/* Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  className="text-gray-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  style={{ color: habit.color, transition: 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  strokeDasharray={`${percentage}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Icon */}
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm"
                style={{ 
                    backgroundColor: isCompleted ? habit.color : '#f9fafb', 
                    color: isCompleted ? 'white' : habit.color,
                    transform: isPressing ? 'scale(0.9)' : 'scale(1)'
                }}
              >
                  {isCompleted ? <Check size={20} strokeWidth={3} /> : <Icon size={20} />}
              </div>
           </div>

           {/* Info */}
           <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                 <h3 className="font-bold text-gray-800 text-lg leading-none">
                   {habit.name}
                 </h3>
                 {isLocked && <Lock size={12} className="text-gray-400" />}
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
                  {/* Streak */}
                  <div className={`flex items-center gap-1 ${streak > 0 ? 'text-orange-500 font-bold' : ''}`}>
                     <Flame size={12} fill={streak > 0 ? "currentColor" : "none"} />
                     <span>连续 {streak}</span>
                  </div>
                  {/* Total */}
                  <div className="flex items-center gap-1">
                     <Trophy size={12} />
                     <span>累计 {totalAccumulated}</span>
                  </div>
              </div>

              {/* Progress Detail */}
              <div className="flex items-center gap-2 text-xs mt-0.5">
                 <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-400 uppercase">
                    {getPeriodLabel()}
                 </span>
                 <span className="font-mono flex items-center">
                   <span className={`font-bold text-sm transition-colors duration-300 ${isCompleted ? 'text-green-600' : 'text-gray-900'}`}>{progress}</span>
                   <span className="text-gray-300 mx-0.5">/</span>
                   {habit.targetCount}
                 </span>
              </div>
           </div>
        </div>

        {/* Setting Button (With stopPropagation) */}
        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onEdit(habit); }}
          className="p-2 text-gray-300 hover:text-gray-600 rounded-full transition-colors z-10 pointer-events-auto active:bg-gray-100"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Dynamic Hint Overlay */}
      <div className={`absolute bottom-2 right-14 flex items-center justify-end gap-1.5 pointer-events-none transition-all duration-300 ${feedbackHint ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
         {feedbackHint === '长按撤销' && <RotateCcw size={10} className="text-gray-400 animate-spin-slow" />}
         {feedbackHint === '打卡 +1' && <Plus size={10} className="text-green-500" />}
         {feedbackHint === '已撤销 -1' && <RotateCcw size={10} className="text-red-500" />}
         {feedbackHint === '已达上限' && <Lock size={10} className="text-orange-500" />}
         
         <span className={`text-[10px] font-bold ${
            feedbackHint.includes('+1') ? 'text-green-600' :
            feedbackHint.includes('-1') ? 'text-red-500' :
            feedbackHint.includes('上限') ? 'text-orange-500' :
            'text-gray-400'
         }`}>
            {feedbackHint}
         </span>
      </div>
      
      {/* Progress Bar for Long Press */}
      {isPressing && progress > 0 && (
         <div className="absolute bottom-0 left-0 h-1 bg-red-400 transition-all ease-linear duration-[600ms] w-full origin-left" 
              style={{ width: '100%', animation: 'fillBar 0.6s linear forwards' }} 
         />
      )}
      <style>{`
        @keyframes fillBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-spin-slow {
           animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};
