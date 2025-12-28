
import React from 'react';
import { Delete, ChevronDown } from 'lucide-react';

interface Props {
  onInput: (value: string) => void;
  onDelete: () => void;
  onConfirm: () => void;
  className?: string;
}

export const NumPad: React.FC<Props> = ({ onInput, onDelete, onConfirm, className = '' }) => {
  const handleVibrate = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleInput = (key: string) => {
    handleVibrate();
    onInput(key);
  };

  return (
    <div className={`grid grid-cols-4 gap-2 ${className}`}>
      {/* Row 1 */}
      <button type="button" onClick={() => handleInput('1')} className="h-14 rounded-xl bg-white border border-gray-100 shadow-sm text-2xl font-bold text-gray-700 active:bg-gray-50 active:scale-95 transition-all">1</button>
      <button type="button" onClick={() => handleInput('2')} className="h-14 rounded-xl bg-white border border-gray-100 shadow-sm text-2xl font-bold text-gray-700 active:bg-gray-50 active:scale-95 transition-all">2</button>
      <button type="button" onClick={() => handleInput('3')} className="h-14 rounded-xl bg-white border border-gray-100 shadow-sm text-2xl font-bold text-gray-700 active:bg-gray-50 active:scale-95 transition-all">3</button>
      <button 
        type="button" 
        onClick={() => { handleVibrate(); onDelete(); }} 
        className="h-14 rounded-xl bg-gray-100 border border-gray-200 shadow-sm text-gray-600 active:bg-gray-200 active:scale-95 transition-all flex items-center justify-center"
      >
        <Delete size={24} />
      </button>

      {/* Row 2 */}
      <button type="button" onClick={() => handleInput('4')} className="h-14 rounded-xl bg-white border border-gray-100 shadow-sm text-2xl font-bold text-gray-700 active:bg-gray-50 active:scale-95 transition-all">4</button>
      <button type="button" onClick={() => handleInput('5')} className="h-14 rounded-xl bg-white border border-gray-100 shadow-sm text-2xl font-bold text-gray-700 active:bg-gray-50 active:scale-95 transition-all">5</button>
      <button type="button" onClick={() => handleInput('6')} className="h-14 rounded-xl bg-white border border-gray-100 shadow-sm text-2xl font-bold text-gray-700 active:bg-gray-50 active:scale-95 transition-all">6</button>
      
      {/* Confirm / Hide Button (Spans 3 rows) */}
      <button 
        type="button" 
        onClick={() => { handleVibrate(); onConfirm(); }} 
        className="row-span-3 rounded-xl bg-indigo-600 border border-indigo-700 shadow-md text-white active:bg-indigo-700 active:scale-95 transition-all flex flex-col items-center justify-center gap-1"
      >
        <ChevronDown size={32} />
      </button>

      {/* Row 3 */}
      <button type="button" onClick={() => handleInput('7')} className="h-14 rounded-xl bg-white border border-gray-100 shadow-sm text-2xl font-bold text-gray-700 active:bg-gray-50 active:scale-95 transition-all">7</button>
      <button type="button" onClick={() => handleInput('8')} className="h-14 rounded-xl bg-white border border-gray-100 shadow-sm text-2xl font-bold text-gray-700 active:bg-gray-50 active:scale-95 transition-all">8</button>
      <button type="button" onClick={() => handleInput('9')} className="h-14 rounded-xl bg-white border border-gray-100 shadow-sm text-2xl font-bold text-gray-700 active:bg-gray-50 active:scale-95 transition-all">9</button>

      {/* Row 4 */}
      <button type="button" onClick={() => handleInput('.')} className="h-14 rounded-xl bg-white border border-gray-100 shadow-sm text-2xl font-bold text-gray-700 active:bg-gray-50 active:scale-95 transition-all">.</button>
      <button type="button" onClick={() => handleInput('0')} className="col-span-2 h-14 rounded-xl bg-white border border-gray-100 shadow-sm text-2xl font-bold text-gray-700 active:bg-gray-50 active:scale-95 transition-all">0</button>
    </div>
  );
};
