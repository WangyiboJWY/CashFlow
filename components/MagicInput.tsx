import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Send, MessageSquareText, XCircle } from 'lucide-react';
import { parseTransactionFromText } from '../services/geminiService';
import { TransactionType } from '../types';

interface Props {
  onParsed: (data: { amount: number, category: string, type: TransactionType, note: string, date?: string }) => void;
  onOpenSettings: () => void;
  disabled?: boolean;
}

const STORAGE_KEY_MAGIC_DRAFT = 'cashflow_magic_draft';

export const MagicInput: React.FC<Props> = ({ onParsed, onOpenSettings, disabled }) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextText, setContextText] = useState(''); // 存储之前的对话上下文
  const [aiQuestion, setAiQuestion] = useState('');   // 存储 AI 的追问

  const inputRef = useRef<HTMLInputElement>(null);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEY_MAGIC_DRAFT);
    if (savedDraft) {
      setInputText(savedDraft);
    }
  }, []);

  // Save draft on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MAGIC_DRAFT, inputText);
  }, [inputText]);

  const handleMagic = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    
    // 如果有上下文，拼接之前的对话。例如： "午餐" + " " + "25元"
    const fullTextToProcess = contextText ? `${contextText} ${inputText}` : inputText;

    try {
      const result = await parseTransactionFromText(fullTextToProcess);
      
      if (result) {
        if (result.status === 'complete' && result.data) {
          // 成功：调用回调
          onParsed(result.data);
          // 成功后清空草稿和状态
          setInputText('');
          localStorage.removeItem(STORAGE_KEY_MAGIC_DRAFT);
          resetState();
        } else if (result.status === 'incomplete' && result.question) {
          // 失败/追问：保存上下文，显示问题
          setContextText(fullTextToProcess); 
          setAiQuestion(result.question);
          setInputText(''); // 清空输入框等待用户回答
          // 自动聚焦输入框
          setTimeout(() => inputRef.current?.focus(), 100);
        } else {
          alert("AI 解析结果异常，请手动输入。");
          resetState();
        }
      } else {
        alert("AI 无法理解该内容，请重试或手动输入。");
      }
    } catch (e: any) {
      if (e.message === 'API_KEY_MISSING') {
        if (confirm("未配置 AI API Key。是否现在前往设置页面填写？")) {
           onOpenSettings();
        }
      } else {
        alert("AI 服务连接失败: " + (e.message || "网络错误"));
      }
      resetState();
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    // 这里的 resetState 主要是重置对话上下文，不强制清空 inputText（除非是成功后调用）
    // 但如果在对话中途取消，用户手动删除文字即可
    setContextText('');
    setAiQuestion('');
  };

  if (disabled) {
    return (
      <div 
        onClick={onOpenSettings}
        className="bg-white p-4 rounded-xl border border-dashed border-indigo-200 shadow-sm mb-6 flex items-center justify-between cursor-pointer hover:bg-indigo-50/50 transition-colors group"
      >
        <div className="flex items-center gap-2 text-gray-400 group-hover:text-indigo-500 transition-colors">
          <Sparkles size={16} />
          <span className="text-sm font-medium">配置并测试 API 以启用 AI 记账</span>
        </div>
        <div className="text-indigo-500 text-xs font-bold border border-indigo-200 px-3 py-1.5 rounded-lg bg-white">
          去设置
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-4 rounded-xl border transition-all duration-300 shadow-sm mb-6 ${aiQuestion ? 'border-indigo-200 ring-4 ring-indigo-50' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-indigo-600 font-medium text-sm">
          <Sparkles size={16} className="text-indigo-500 fill-indigo-100" />
          <span>AI 极速记账</span>
        </div>
        {aiQuestion && (
           <button onClick={() => { resetState(); setInputText(''); }} className="text-gray-400 hover:text-gray-600">
             <XCircle size={16} />
           </button>
        )}
      </div>

      {/* AI Question Bubble */}
      {aiQuestion && (
        <div className="mb-3 flex items-start gap-2 animate-in slide-in-from-left-2 duration-200">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
            <MessageSquareText size={16} />
          </div>
          <div className="bg-indigo-50 text-indigo-900 px-3 py-2 rounded-2xl rounded-tl-none text-sm font-medium">
            {aiQuestion}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={aiQuestion ? "回复 AI..." : "例如：打车去公司花了35元..."}
          className="flex-1 bg-gray-50 border-gray-100 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          onKeyDown={(e) => e.key === 'Enter' && handleMagic()}
        />
        <button
          onClick={handleMagic}
          disabled={loading || !inputText.trim()}
          className="bg-indigo-600 text-white rounded-lg w-10 h-10 flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
};