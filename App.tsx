
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, PieChart, Home, Settings, X, Calendar, Wallet, Save, Upload, FileText, Database, Search, KeyRound, CheckCircle2, AlertCircle, Loader2, Cloud, ShieldCheck, Bookmark, Trash2, Zap, Keyboard, List, ChevronRight, ArrowLeft, CalendarDays, Coins, Layers, Smartphone, Bot } from 'lucide-react';
import { Transaction, TransactionType, TransactionTemplate, CustomCategoryMap, CustomMainCategoryMap } from './types';
import { 
  getTransactions, 
  saveTransaction, 
  deleteTransaction, 
  calculateSummary, 
  exportToCSV, 
  exportBackup,
  overwriteTransactions,
  importBackup,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  getCustomCategories,
  saveCustomCategories,
  getCustomMainCategories,
  saveCustomMainCategories,
  getBudgetLimit,
  saveBudgetLimit
} from './services/storageService';
import { getStoredApiKey, setStoredApiKey, testConnection, isApiReady } from './services/geminiService';
import { TransactionItem } from './components/TransactionItem';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { StatsView } from './components/StatsView';
import { MagicInput } from './components/MagicInput';
import { NumPad } from './components/NumPad'; 
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { CalendarView } from './components/CalendarView';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS, APP_STORAGE_KEY, MAX_SUB_CATEGORIES_PER_MAIN, MAX_TOTAL_CUSTOM_CATEGORIES, MAX_CUSTOM_MAIN_CATEGORIES, APP_ONBOARDING_KEY } from './constants';
import { Capacitor } from '@capacitor/core';

type Tab = 'home' | 'stats';
const STORAGE_KEY_FORM_DRAFT = 'cashflow_form_draft';

const getLocalToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  
  // Categories Data
  const [customCategories, setCustomCategories] = useState<CustomCategoryMap>({});
  const [customMainCategories, setCustomMainCategories] = useState<CustomMainCategoryMap>({ 
    [TransactionType.EXPENSE]: [], 
    [TransactionType.INCOME]: [] 
  });
  
  // Budget State
  const [budgetLimit, setBudgetLimit] = useState<number>(0);
  
  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  
  // Settings Modals State Split
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false); // Main Menu
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);   // Sub Modal: Budget
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);           // Sub Modal: AI
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false); // Sub Modal: Categories

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Calendar State
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Category Manager Local States
  const [managerTab, setManagerTab] = useState<TransactionType>(TransactionType.EXPENSE);
  const [editingSubCategoryMain, setEditingSubCategoryMain] = useState<string | null>(null);

  // Form States
  const [showNumPad, setShowNumPad] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Separate Inputs for separate modals
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [budgetInput, setBudgetInput] = useState(''); 
  
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  
  const [aiReady, setAiReady] = useState(isApiReady());

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getLocalToday());

  // Load data and drafts on startup
  useEffect(() => {
    // 0. Check Onboarding
    const hasOnboarded = localStorage.getItem(APP_ONBOARDING_KEY);
    if (!hasOnboarded) {
      setShowOnboarding(true);
    }

    // 1. Load and Sanitize Transactions
    const loadedTx = getTransactions();
    let dataChanged = false;
    const sanitizedTx = loadedTx.map(t => {
      if (!t.id) {
        t.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        dataChanged = true;
      } else {
        t.id = String(t.id);
      }
      return t;
    });

    if (dataChanged) {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(sanitizedTx));
    }
    setTransactions(sanitizedTx);

    // 2. Load Templates
    setTemplates(getTemplates());
    
    // 3. Load Custom Sub Categories
    setCustomCategories(getCustomCategories());

    // 4. Load Custom Main Categories
    setCustomMainCategories(getCustomMainCategories());

    // 5. Load API Key (Initial State)
    setApiKeyInput(getStoredApiKey());

    // 6. Load Budget
    setBudgetLimit(getBudgetLimit());

    // 7. Load Draft
    const savedForm = localStorage.getItem(STORAGE_KEY_FORM_DRAFT);
    if (savedForm) {
      try {
        const draft = JSON.parse(savedForm);
        if (draft.amount || draft.note || draft.category !== EXPENSE_CATEGORIES[0]) {
           setAmount(draft.amount || '');
           setCategory(draft.category || EXPENSE_CATEGORIES[0]);
           setType(draft.type || TransactionType.EXPENSE);
           setNote(draft.note || '');
           if (draft.date) setDate(draft.date);
        }
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
  }, []);

  useEffect(() => {
    const draft = { amount, category, type, note, date };
    localStorage.setItem(STORAGE_KEY_FORM_DRAFT, JSON.stringify(draft));
  }, [amount, category, type, note, date]);

  const summary = calculateSummary(transactions);

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // 1. Calendar Filter (Priority)
    if (selectedCalendarDate) {
      result = result.filter(t => t.date.startsWith(selectedCalendarDate));
    }

    // 2. Search Filter
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter(t => {
        const matchNote = t.note.toLowerCase().includes(query);
        const matchCategory = t.category.includes(query);
        const matchAmount = t.amount.toString().includes(query);
        const matchDate = t.date.includes(query); 
        return matchNote || matchCategory || matchAmount || matchDate;
      });
    }

    return result;
  }, [transactions, searchQuery, selectedCalendarDate]);

  // Compute available main categories (Merged Default + Custom)
  const getAvailableMainCategories = (t: TransactionType) => {
    const defaults = t === TransactionType.EXPENSE ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const customs = customMainCategories[t] || [];
    return [...defaults, ...customs];
  };

  // Current form's available categories
  const currentFormMainCategories = useMemo(() => {
    return getAvailableMainCategories(type);
  }, [type, customMainCategories]);

  // Manager's available categories
  const managerMainCategories = useMemo(() => {
    return getAvailableMainCategories(managerTab);
  }, [managerTab, customMainCategories]);


  const handleAddTransaction = () => {
    if (!amount || isNaN(Number(amount))) {
      alert("请输入有效金额");
      return;
    }

    let finalDateIso = new Date(date).toISOString();
    if (date === getLocalToday()) {
      finalDateIso = new Date().toISOString();
    }

    const newTx: Transaction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      amount: parseFloat(amount),
      type,
      category,
      note: note || category,
      date: finalDateIso,
      createdAt: Date.now()
    };
    
    setTransactions(prev => [newTx, ...prev].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ));
    
    saveTransaction(newTx);
    
    localStorage.removeItem(STORAGE_KEY_FORM_DRAFT);
    resetForm();
    setIsFormOpen(false);
  };

  const handleNumPadInput = (val: string) => {
    setAmount(prev => {
      if (prev.length > 9) return prev;
      if (val === '.') {
        if (prev.includes('.')) return prev;
        if (prev === '') return '0.';
        return prev + '.';
      }
      if (prev === '0' && val !== '.') {
        return val;
      }
      if (prev.includes('.')) {
        const [, decimal] = prev.split('.');
        if (decimal && decimal.length >= 2) return prev;
      }
      return prev + val;
    });
  };

  const handleNumPadDelete = () => {
    setAmount(prev => prev.slice(0, -1));
  };

  // --- Category Management Logic ---

  const handleManagerAddMainCategory = () => {
    const currentList = customMainCategories[managerTab] || [];
    if (currentList.length >= MAX_CUSTOM_MAIN_CATEGORIES) {
      alert(`自定义大分类数量已达上限 (${MAX_CUSTOM_MAIN_CATEGORIES}个)`);
      return;
    }

    const name = prompt("请输入新大分类名称：");
    if (!name || !name.trim()) return;
    
    const safeName = name.trim();
    const allCurrent = getAvailableMainCategories(managerTab);
    if (allCurrent.includes(safeName)) {
      alert("该分类已存在");
      return;
    }

    const newMap = {
      ...customMainCategories,
      [managerTab]: [...currentList, safeName]
    };
    setCustomMainCategories(newMap);
    saveCustomMainCategories(newMap);
  };

  const handleManagerDeleteMainCategory = (catName: string) => {
    const defaults = managerTab === TransactionType.EXPENSE ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (defaults.includes(catName as any)) {
      alert("系统默认分类不可删除");
      return;
    }

    if (confirm(`确定删除大分类"${catName}"吗？\n该分类下的历史账单保留，但分类选项将消失。`)) {
      const currentList = customMainCategories[managerTab] || [];
      const newMap = {
        ...customMainCategories,
        [managerTab]: currentList.filter(c => c !== catName)
      };
      setCustomMainCategories(newMap);
      saveCustomMainCategories(newMap);
      
      // If currently editing this one, go back
      if (editingSubCategoryMain === catName) {
        setEditingSubCategoryMain(null);
      }
      // If main form selected this, reset it
      if (category.startsWith(catName)) {
        setCategory(defaults[0]);
      }
    }
  };

  const handleManagerAddSubCategory = (mainCat: string) => {
    let totalCustom = 0;
    Object.values(customCategories).forEach(arr => totalCustom += arr.length);
    if (totalCustom >= MAX_TOTAL_CUSTOM_CATEGORIES) {
      alert(`自定义子分类总数已达上限 (${MAX_TOTAL_CUSTOM_CATEGORIES}个)`);
      return;
    }

    const currentSubs = customCategories[mainCat] || [];
    if (currentSubs.length >= MAX_SUB_CATEGORIES_PER_MAIN) {
      alert(`每个大分类最多添加 ${MAX_SUB_CATEGORIES_PER_MAIN} 个子分类`);
      return;
    }

    const subName = prompt(`请输入"${mainCat}"的子分类名称:`);
    if (!subName || !subName.trim()) return;
    
    const safeSubName = subName.trim();
    if (currentSubs.includes(safeSubName)) {
      alert("该子分类已存在");
      return;
    }

    const newMap = {
      ...customCategories,
      [mainCat]: [...currentSubs, safeSubName]
    };
    setCustomCategories(newMap);
    saveCustomCategories(newMap);
  };

  const handleManagerDeleteSubCategory = (mainCat: string, subName: string) => {
    if (confirm(`确定删除子分类"${subName}"吗？`)) {
       const currentSubs = customCategories[mainCat] || [];
       const newMap = {
         ...customCategories,
         [mainCat]: currentSubs.filter(s => s !== subName)
       };
       setCustomCategories(newMap);
       saveCustomCategories(newMap);
       
       if (category === `${mainCat} - ${subName}`) {
         setCategory(mainCat);
       }
    }
  };

  // ---------------------------------

  const handleSaveTemplate = () => {
    if (!amount || isNaN(Number(amount))) {
      alert("请先输入金额");
      return;
    }

    const templateName = note || category;
    const newTemplate: TransactionTemplate = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: templateName,
      amount: parseFloat(amount),
      type,
      category,
      note
    };

    const result = saveTemplate(newTemplate);
    if (result.success) {
      setTemplates(result.templates);
      alert("已保存为模板！下次可直接点击使用。");
    } else {
      alert(result.message);
    }
  };

  const handleApplyTemplate = (t: TransactionTemplate) => {
    setAmount(t.amount.toString());
    setType(t.type);
    setCategory(t.category);
    setNote(t.note);
    setShowNumPad(true);
  };

  const handleDeleteTemplate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (window.confirm("确定要删除这个模板吗？")) {
       setTemplates(prev => prev.filter(t => String(t.id) !== String(id)));
       deleteTemplate(id);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("确定删除这条记录吗？")) {
      setTransactions(prev => prev.filter(t => String(t.id) !== String(id)));
      deleteTransaction(id);
    }
  };

  const handleDetailDelete = (id: string) => {
     setTransactions(prev => prev.filter(t => String(t.id) !== String(id)));
     deleteTransaction(id);
  };

  const resetForm = () => {
    setAmount('');
    setNote('');
    setType(TransactionType.EXPENSE);
    setCategory(EXPENSE_CATEGORIES[0]);
    setDate(getLocalToday());
    setShowNumPad(true);
  };

  const handleMagicParsed = (data: any) => {
    setAmount(data.amount.toString());
    setCategory(data.category);
    setType(data.type);
    setNote(data.note);
    if (data.date) {
      const parsedDate = new Date(data.date);
      if (!isNaN(parsedDate.getTime())) {
         setDate(parsedDate.toISOString().slice(0, 10));
      }
    }
    setIsFormOpen(true);
    setShowNumPad(true);
  };

  const handleTestConnection = async () => {
    if (!apiKeyInput.trim()) {
      setTestStatus('error');
      setTestMessage("请输入 API Key");
      return;
    }
    setTestStatus('testing');
    const result = await testConnection(apiKeyInput.trim());
    if (result.success) {
      setTestStatus('success');
      setTestMessage("连接成功！");
    } else {
      setTestStatus('error');
      setTestMessage(result.message || "连接失败");
    }
  };

  // --- NEW: SPLIT SETTINGS HANDLERS ---

  // 1. Open Methods
  const handleOpenSettingsMenu = () => {
    setIsSettingsMenuOpen(true);
  };

  const handleOpenBudgetModal = () => {
    setBudgetInput(budgetLimit > 0 ? budgetLimit.toString() : '');
    setIsSettingsMenuOpen(false);
    setIsBudgetModalOpen(true);
  };

  const handleOpenAIModal = () => {
    setApiKeyInput(getStoredApiKey());
    setTestStatus('idle'); // Reset test status when opening modal
    setIsSettingsMenuOpen(false);
    setIsAIModalOpen(true);
  };

  const handleOpenCategoryManager = () => {
    setIsSettingsMenuOpen(false);
    setIsCategoryManagerOpen(true);
  };

  // 2. Save Methods (Completely Separated)
  
  const handleSaveBudget = () => {
    const newBudget = parseFloat(budgetInput);
    let finalBudget = 0;
    
    // Allow saving 0 or NaN (as 0) to disable budget
    if (!isNaN(newBudget) && newBudget >= 0) {
      finalBudget = newBudget;
    } else if (!budgetInput) {
       finalBudget = 0;
    } else {
       alert("请输入有效的预算金额");
       return;
    }

    setBudgetLimit(finalBudget);
    saveBudgetLimit(finalBudget);
    setIsBudgetModalOpen(false);
    alert("预算设置已保存");
  };

  const handleSaveAI = () => {
    const inputKey = apiKeyInput.trim();
    const storedKey = getStoredApiKey();
    const isKeyChanged = inputKey !== storedKey;
    
    let isVerified = false;

    if (isKeyChanged) {
      // If key changed, user must have successfully tested it in this session
      isVerified = testStatus === 'success';
    } else {
      // If key hasn't changed, check if we just tested it successfully, OR rely on old verification
      if (testStatus === 'success') {
        isVerified = true;
      } else {
        // Keep existing verification status
        isVerified = isApiReady();
      }
    }

    setStoredApiKey(inputKey, isVerified);
    setAiReady(isVerified);
    setIsAIModalOpen(false);
    alert("AI 配置已保存");
  };

  const handleSaveGame = async () => {
    try {
      const fileName = await exportBackup(transactions);
      if (Capacitor.isNativePlatform()) {
        // Native shows a share dialog, no need for specific folder path alert
        // The toast/alert is handled after share, or just implicit
      } else {
        alert(`备份导出成功！✅\n\n📂 保存位置：手机内部存储 > Download 文件夹\n📄 文件名：${fileName}\n\n请妥善保管此文件。`);
      }
    } catch (e) {
      alert("导出失败");
    }
  };

  const handleLoadGameClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm("警告：读取备份将覆盖当前的记账数据！确定要继续吗？")) {
      if (fileInputRef.current) fileInputRef.current.value = ''; 
      return;
    }

    try {
      const data = await importBackup(file);
      const updated = overwriteTransactions(data.transactions);
      setTransactions(updated);
      setCustomCategories(data.customCategories);
      saveCustomCategories(data.customCategories);
      
      // Load Custom Main Categories
      if (data.customMainCategories) {
        setCustomMainCategories(data.customMainCategories);
        saveCustomMainCategories(data.customMainCategories);
      }
      
      // Load Budget
      if (data.budget !== undefined) {
         setBudgetLimit(data.budget);
         saveBudgetLimit(data.budget);
      }

      alert("数据恢复成功！");
      setIsDataMenuOpen(false);
    } catch (error) {
      alert("读取备份失败：文件格式不正确或已损坏。");
      console.error(error);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportCSV = async () => {
    try {
      const fileName = await exportToCSV(transactions);
      if (Capacitor.isNativePlatform()) {
        // Native
      } else {
        alert(`报表导出成功！✅\n\n📂 保存位置：手机内部存储 > Download 文件夹\n📄 文件名：${fileName}\n\n您可以使用 Excel 或 WPS 打开查看。`);
      }
    } catch(e) {
      alert("导出失败");
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem(APP_ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  // Helper calculation for budget bar
  const calculateBudgetProgress = () => {
     if (budgetLimit <= 0) return { percent: 0, color: 'bg-gray-200' };
     const percent = (summary.monthExpense / budgetLimit) * 100;
     let color = 'bg-green-500';
     if (percent > 80) color = 'bg-orange-500';
     if (percent >= 100) color = 'bg-red-500';
     return { percent: Math.min(percent, 100), color, rawPercent: percent };
  };

  const budgetState = calculateBudgetProgress();
  const remainingBudget = Math.max(0, budgetLimit - summary.monthExpense);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 max-w-md mx-auto shadow-2xl relative flex flex-col">
      {/* Onboarding Tutorial */}
      {showOnboarding && <OnboardingTutorial onComplete={handleOnboardingComplete} />}

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {activeTab === 'home' && (
          <>
            <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-md px-4 pt-4 pb-2">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="搜索备注、分类、金额或日期..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white rounded-xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 outline-none text-sm transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 bg-gray-100 rounded-full"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {!searchQuery ? (
              <>
                {budgetLimit > 0 ? (
                  // Budget Progress Card
                  <div id="tour-balance" className="mx-4 mt-2 bg-white p-6 rounded-[2rem] shadow-xl mb-6 animate-in slide-in-from-top-4 duration-300 relative border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                       <div>
                         <h2 className="text-gray-500 text-xs font-bold uppercase tracking-wide">本月预算剩余</h2>
                         <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-3xl font-bold text-gray-900">
                              ¥{remainingBudget.toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">/ ¥{budgetLimit}</span>
                         </div>
                       </div>
                       
                       <div className="flex gap-2">
                         <button 
                          id="tour-settings"
                          onClick={handleOpenSettingsMenu}
                          className="bg-gray-50 p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95 text-gray-500"
                          title="设置"
                        >
                          <Settings size={20} />
                        </button>
                        <button 
                          onClick={() => setIsDataMenuOpen(true)}
                          className="bg-gray-50 p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95 text-gray-500"
                          title="存档管理"
                        >
                          <Database size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
                       <div 
                          className={`absolute top-0 left-0 h-full transition-all duration-700 ease-out ${budgetState.color}`}
                          style={{ width: `${budgetState.percent}%` }}
                       ></div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-gray-400 font-medium">
                       <span>已支出: ¥{summary.monthExpense.toFixed(2)}</span>
                       <span>{budgetState.rawPercent.toFixed(1)}%</span>
                    </div>
                  </div>
                ) : (
                  // Original Total Balance Card (For users with no budget)
                  <div id="tour-balance" className="mx-4 mt-2 bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-[2rem] shadow-xl mb-6 animate-in slide-in-from-top-4 duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-indigo-200 text-sm font-medium">总资产 (Balance)</p>
                          <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            <ShieldCheck size={10} className="text-green-300" />
                            <span className="text-[10px] text-indigo-100 font-medium tracking-wide">已自动存档</span>
                          </div>
                        </div>
                        <h1 className="text-4xl font-bold font-mono tracking-tight">¥{summary.balance.toFixed(2)}</h1>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          id="tour-settings"
                          onClick={handleOpenSettingsMenu}
                          className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors backdrop-blur-sm active:scale-95 text-white"
                          title="设置"
                        >
                          <Settings size={20} />
                        </button>
                        <button 
                          onClick={() => setIsDataMenuOpen(true)}
                          className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors backdrop-blur-sm active:scale-95 text-white"
                          title="存档管理"
                        >
                          <Database size={20} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 bg-white/10 rounded-xl p-3 backdrop-blur-sm relative z-10">
                      <div>
                        <p className="text-indigo-100 text-xs mb-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> 本月收入
                        </p>
                        <p className="font-semibold text-lg">+ {summary.monthIncome.toFixed(2)}</p>
                      </div>
                      <div className="border-l border-indigo-400/30 pl-4">
                        <p className="text-indigo-100 text-xs mb-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> 本月支出
                        </p>
                        <p className="font-semibold text-lg">- {summary.monthExpense.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="px-4">
                  {/* ID ADDED HERE: tour-ai-input */}
                  <div id="tour-ai-input">
                    <MagicInput 
                      onParsed={handleMagicParsed} 
                      onOpenSettings={handleOpenAIModal} 
                      disabled={!aiReady}
                    />
                  </div>
                  
                  {/* Header Row: Recent Details + Calendar Toggle */}
                  <div className="flex justify-between items-center mb-4 mt-6">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                      <Calendar size={18} className="text-indigo-600"/>
                      近期明细
                    </h3>
                    <button 
                      onClick={() => {
                        // Closing calendar: clear date filter to show all recent
                        if (showCalendar) {
                          setSelectedCalendarDate(null);
                        }
                        setShowCalendar(!showCalendar);
                      }}
                      className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${showCalendar ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
                    >
                      <CalendarDays size={14} />
                      {showCalendar ? '收起日历' : '日历视图'}
                    </button>
                  </div>

                  {/* Calendar View */}
                  {showCalendar && (
                    <CalendarView 
                       transactions={transactions} 
                       onSelectDate={(date) => setSelectedCalendarDate(date)}
                       selectedDate={selectedCalendarDate}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="px-4 pt-2">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                      <Search size={18} className="text-indigo-600"/>
                      搜索结果 ({filteredTransactions.length})
                    </h3>
                 </div>
              </div>
            )}

            <div className="px-4">
              {filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 opacity-60">
                  <Wallet size={64} className="mb-4 text-gray-200" />
                  <p>
                    {searchQuery 
                       ? "未找到相关记录" 
                       : selectedCalendarDate 
                         ? "该日期暂无记账" 
                         : "暂无数据，点击 \"+\" 开始记账"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(searchQuery ? filteredTransactions : filteredTransactions.slice(0, 50)).map(tx => (
                    <TransactionItem 
                      key={tx.id} 
                      transaction={tx} 
                      onDelete={handleDelete} 
                      onClick={(t) => setSelectedTransaction(t)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ... (Stats Tab content unchanged) ... */}
        {activeTab === 'stats' && (
          <div className="pt-6">
             <div className="px-6 mb-4">
               <h2 className="text-2xl font-bold text-gray-900">数据报表</h2>
               <p className="text-gray-500 text-sm">基于当前所有账单的汇总分析</p>
             </div>
             {/* Pass totalBalance to StatsView */}
             <StatsView transactions={transactions} totalBalance={summary.balance} />
          </div>
        )}
      </div>
      
      {/* ... (Bottom Navigation and Modals remain unchanged) ... */}

      <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-30 pb-safe">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <Home size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">明细</span>
        </button>

        <div className="relative -top-8">
          {/* ID ADDED HERE: tour-add-btn */}
          <button
            id="tour-add-btn"
            onClick={() => { resetForm(); setIsFormOpen(true); }}
            className="w-14 h-14 bg-indigo-600 rounded-full shadow-lg shadow-indigo-300 text-white flex items-center justify-center hover:bg-indigo-700 active:scale-90 transition-transform"
          >
            <Plus size={28} />
          </button>
        </div>

        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'stats' ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <PieChart size={24} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">统计</span>
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-200 overflow-y-auto max-h-[95vh] no-scrollbar flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">记一笔</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
              <button
                onClick={() => { setType(TransactionType.EXPENSE); setCategory(EXPENSE_CATEGORIES[0]); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${type === TransactionType.EXPENSE ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}
              >
                支出
              </button>
              <button
                onClick={() => { setType(TransactionType.INCOME); setCategory(INCOME_CATEGORIES[0]); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${type === TransactionType.INCOME ? 'bg-white shadow text-green-500' : 'text-gray-500'}`}
              >
                收入
              </button>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-baseline mb-2">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">金额</label>
                 {templates.length < 5 && amount && Number(amount) > 0 && (
                    <button 
                      onClick={handleSaveTemplate}
                      className="text-xs text-indigo-500 font-medium flex items-center gap-1 hover:text-indigo-700"
                    >
                      <Bookmark size={12} />
                      存为模板
                    </button>
                 )}
              </div>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-300">¥</span>
                <div 
                  onClick={() => setShowNumPad(true)}
                  className={`w-full pl-8 text-4xl font-bold border-b-2 py-2 bg-transparent transition-all cursor-pointer ${
                    showNumPad 
                      ? 'border-indigo-500 text-indigo-900 bg-indigo-50/30' 
                      : 'border-gray-100 text-gray-800'
                  } ${!amount ? 'text-gray-300' : ''}`}
                >
                  {amount || '0.00'}
                  {showNumPad && (
                    <span className="inline-block w-0.5 h-8 bg-indigo-500 ml-1 animate-pulse align-middle"></span>
                  )}
                </div>
              </div>
            </div>

            {/* 内容区域 (可滚动) */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 mb-4">
              {templates.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Zap size={12} /> 快捷模板
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {templates.map(t => {
                      const mainCat = t.category.split(' - ')[0];
                      const Icon = CATEGORY_ICONS[mainCat] || CATEGORY_ICONS.Other;
                      return (
                        <div 
                          key={t.id}
                          onClick={() => handleApplyTemplate(t)}
                          className="flex-shrink-0 bg-indigo-50 border border-indigo-100 rounded-xl p-3 w-32 relative cursor-pointer active:scale-95 transition-transform hover:bg-indigo-100 group"
                        >
                          <button 
                            onClick={(e) => handleDeleteTemplate(e, t.id)}
                            type="button"
                            className="absolute -top-2 -right-2 p-2 bg-white text-gray-400 hover:text-red-500 border border-gray-100 rounded-full shadow-md z-30"
                          >
                            <Trash2 size={14} />
                          </button>
                          
                          <div className="flex flex-col items-center text-center gap-1">
                            <div 
                               className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs mb-1"
                               style={{ backgroundColor: CATEGORY_COLORS[mainCat] || '#999' }}
                            >
                               <Icon size={14} />
                            </div>
                            <span className="font-bold text-indigo-900 text-sm truncate w-full">{t.note || t.category}</span>
                            <span className="text-xs text-indigo-600 font-mono font-medium">¥{t.amount}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">分类</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {currentFormMainCategories.map(cat => {
                    const isSelected = category.startsWith(cat);
                    
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat as any)} 
                        className={`py-2 px-1 rounded-lg text-xs font-medium transition-all border ${isSelected ? 'border-transparent text-white scale-105' : 'border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                        style={{ backgroundColor: isSelected ? (CATEGORY_COLORS[cat] || '#95A5A6') : 'transparent' }} 
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
                
                {/* Sub Categories Area */}
                {(() => {
                  const mainCat = category.split(' - ')[0];
                  // Show sub-categories if the main category is valid
                  if (currentFormMainCategories.includes(mainCat)) {
                     const subs = customCategories[mainCat] || [];
                     return (
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
                           <div className="flex flex-wrap gap-2 items-center">
                              {/* Default Main Option */}
                              <button
                                onClick={() => setCategory(mainCat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${category === mainCat ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                              >
                                默认
                              </button>
                              
                              {/* Sub Options */}
                              {subs.map(sub => {
                                 const fullCatName = `${mainCat} - ${sub}`;
                                 return (
                                   <button
                                      key={sub}
                                      onClick={() => setCategory(fullCatName)}
                                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border relative group ${category === fullCatName ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                   >
                                      {sub}
                                   </button>
                                 );
                              })}
                           </div>
                        </div>
                     );
                  }
                  return null;
                })()}

              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">备注</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="添加备注..."
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                </div>
                <div className="w-1/3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">日期</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                </div>
              </div>
            </div>

            {showNumPad && (
              <div className="mb-4 animate-in slide-in-from-bottom duration-200">
                <NumPad 
                  onInput={handleNumPadInput} 
                  onDelete={handleNumPadDelete} 
                  onConfirm={() => setShowNumPad(false)} 
                />
              </div>
            )}

            {!showNumPad && (
              <div 
                onClick={() => setShowNumPad(true)} 
                className="flex items-center justify-center py-2 mb-4 text-gray-400 text-xs bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <Keyboard size={14} className="mr-1" />
                点击展开键盘
              </div>
            )}

            <button
              onClick={handleAddTransaction}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black active:scale-[0.98] transition-all shadow-lg"
            >
              保存记录
            </button>
          </div>
        </div>
      )}

      {/* --- NEW: MAIN SETTINGS MENU MODAL --- */}
      {isSettingsMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
             <button 
                onClick={() => setIsSettingsMenuOpen(false)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
             >
                <X size={20} />
             </button>
             
             <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                 <Settings size={20} />
               </div>
               <div>
                 <h2 className="text-xl font-bold text-gray-800">应用设置</h2>
                 <p className="text-xs text-gray-500">个性化您的记账体验</p>
               </div>
             </div>

             <div className="space-y-3">
               <button
                 onClick={handleOpenBudgetModal}
                 className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 transition-colors group"
               >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                      <Coins size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-800">预算限额</h3>
                      <p className="text-xs text-gray-500">设定每月支出上限</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-indigo-400" />
               </button>

               <button
                 onClick={handleOpenCategoryManager}
                 className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 transition-colors group"
               >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                      <List size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-800">分类管理</h3>
                      <p className="text-xs text-gray-500">添加/删除自定义分类</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-indigo-400" />
               </button>

               <div className="h-px bg-gray-100 my-2"></div>

               <button
                 onClick={handleOpenAIModal}
                 className="w-full flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-colors group"
               >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                      <Bot size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-800">AI 智能配置</h3>
                      <p className="text-xs text-gray-500">DeepSeek API 设置</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-indigo-400" />
               </button>
             </div>
           </div>
        </div>
      )}

      {/* --- BUDGET SETTING MODAL --- */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                      <Coins size={16} />
                   </div>
                   <h2 className="text-lg font-bold text-gray-800">设置预算</h2>
                </div>
                <button 
                  onClick={() => setIsBudgetModalOpen(false)} 
                  className="p-1.5 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500"
               >
                  <X size={18} />
               </button>
             </div>

             <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">月度总预算</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                  <input 
                    type="number" 
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    placeholder="0 (未设置)"
                    autoFocus
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-3 text-lg font-bold focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none transition-all"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                  {budgetInput && Number(budgetInput) > 0 
                    ? "首页将显示预算进度条，提醒您控制消费。" 
                    : "设置为 0 或留空，首页将显示经典的“总资产”统计卡片。"
                  }
                </p>
             </div>

             <button 
               onClick={handleSaveBudget}
               className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-black active:scale-95 transition-all shadow-md"
             >
               保存预算
             </button>
           </div>
        </div>
      )}

      {/* --- AI SETTING MODAL --- */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                      <Bot size={16} />
                   </div>
                   <h2 className="text-lg font-bold text-gray-800">AI 配置</h2>
                </div>
                <button 
                  onClick={() => setIsAIModalOpen(false)} 
                  className="p-1.5 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500"
               >
                  <X size={18} />
               </button>
             </div>
             
             <div className="mb-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                      <KeyRound size={12} /> SiliconFlow API Key
                    </label>
                    <input 
                      type="password" 
                      value={apiKeyInput}
                      onChange={(e) => {
                        setApiKeyInput(e.target.value);
                        setTestStatus('idle');
                      }}
                      placeholder="sk-..."
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                    
                    {testStatus === 'success' && (
                      <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-lg text-xs mt-2 border border-green-100">
                        <CheckCircle2 size={14} />
                        <span>{testMessage}</span>
                      </div>
                    )}
                    {testStatus === 'error' && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg text-xs mt-2 border border-red-100 break-all">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{testMessage}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-3">
                        <button 
                          onClick={handleTestConnection}
                          disabled={!apiKeyInput || testStatus === 'testing'}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors ml-auto"
                        >
                          {testStatus === 'testing' && <Loader2 size={12} className="animate-spin" />}
                          测试连接
                        </button>
                    </div>
                 </div>
                 <p className="text-[10px] text-gray-400 mt-2 px-1">
                   API Key 仅存储在您的设备本地，用于请求 AI 服务。
                 </p>
             </div>

             <button 
               onClick={handleSaveAI}
               className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
             >
               保存配置
             </button>
           </div>
        </div>
      )}

      {/* --- CATEGORY MANAGER MODAL (Refactored to match new style) --- */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm h-[600px] max-h-[90vh] rounded-2xl p-0 shadow-2xl animate-in zoom-in-95 duration-200 relative flex flex-col overflow-hidden">
             
             {/* Header */}
             <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
               {editingSubCategoryMain ? (
                 <button 
                    onClick={() => setEditingSubCategoryMain(null)}
                    className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 text-sm font-medium"
                 >
                   <ArrowLeft size={18} /> 返回
                 </button>
               ) : (
                 <div className="flex items-center gap-2">
                   <List size={20} className="text-indigo-600"/>
                   <h2 className="text-lg font-bold text-gray-800">分类管理</h2>
                 </div>
               )}
               <button 
                  onClick={() => setIsCategoryManagerOpen(false)} 
                  className="p-1.5 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500"
               >
                  <X size={18} />
               </button>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
               {!editingSubCategoryMain ? (
                 // View 1: Main Categories List
                 <>
                   <div className="flex bg-white rounded-lg p-1 mb-4 shadow-sm border border-gray-100">
                     <button
                       onClick={() => setManagerTab(TransactionType.EXPENSE)}
                       className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${managerTab === TransactionType.EXPENSE ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                     >
                       支出分类
                     </button>
                     <button
                       onClick={() => setManagerTab(TransactionType.INCOME)}
                       className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${managerTab === TransactionType.INCOME ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                     >
                       收入分类
                     </button>
                   </div>
                   
                   <div className="space-y-2">
                     {managerMainCategories.map(cat => {
                        const isDefault = (managerTab === TransactionType.EXPENSE ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).includes(cat as any);
                        const subCount = (customCategories[cat] || []).length;
                        const color = CATEGORY_COLORS[cat] || '#999';

                        return (
                          <div key={cat} onClick={() => setEditingSubCategoryMain(cat)} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer group">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs" style={{backgroundColor: color}}>
                                 {cat.charAt(0)}
                               </div>
                               <div>
                                 <div className="font-bold text-sm text-gray-800">{cat}</div>
                                 <div className="text-[10px] text-gray-400">
                                   {isDefault ? '系统默认' : '自定义'} · {subCount} 个子分类
                                 </div>
                               </div>
                             </div>
                             <div className="flex items-center gap-2">
                               {!isDefault && (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleManagerDeleteMainCategory(cat); }}
                                   className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                 >
                                   <Trash2 size={16} />
                                 </button>
                               )}
                               <ChevronRight size={16} className="text-gray-300" />
                             </div>
                          </div>
                        );
                     })}
                     
                     {(customMainCategories[managerTab] || []).length < MAX_CUSTOM_MAIN_CATEGORIES && (
                       <button 
                         onClick={handleManagerAddMainCategory}
                         className="w-full py-3 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                       >
                         <Plus size={16} /> 新增{managerTab === TransactionType.EXPENSE ? '支出' : '收入'}大分类
                       </button>
                     )}
                   </div>
                 </>
               ) : (
                 // View 2: Sub Categories List
                 <div className="animate-in slide-in-from-right-4 duration-200">
                   <div className="mb-4 flex items-center gap-2 text-gray-500 text-xs">
                     <span className="bg-white px-2 py-1 rounded border border-gray-200">{editingSubCategoryMain}</span>
                     <span>/</span>
                     <span>子分类管理</span>
                   </div>

                   <div className="space-y-2">
                     {(customCategories[editingSubCategoryMain] || []).map(sub => (
                       <div key={sub} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                         <span className="font-medium text-sm text-gray-700 ml-1">{sub}</span>
                         <button 
                           onClick={() => handleManagerDeleteSubCategory(editingSubCategoryMain, sub)}
                           className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
                     ))}

                     {(customCategories[editingSubCategoryMain] || []).length === 0 && (
                       <div className="text-center py-8 text-gray-400 text-sm">
                         暂无子分类
                       </div>
                     )}

                     {(customCategories[editingSubCategoryMain] || []).length < MAX_SUB_CATEGORIES_PER_MAIN && (
                       <button 
                         onClick={() => handleManagerAddSubCategory(editingSubCategoryMain)}
                         className="w-full py-3 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                       >
                         <Plus size={16} /> 新增子分类
                       </button>
                     )}
                     
                     <p className="text-[10px] text-gray-400 text-center mt-2">
                       最多可添加 {MAX_SUB_CATEGORIES_PER_MAIN} 个子分类
                     </p>
                   </div>
                 </div>
               )}
             </div>

           </div>
        </div>
      )}

      {/* Data Menu Modal ... (Unchanged) */}
      {isDataMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
             <button 
                onClick={() => setIsDataMenuOpen(false)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
             >
                <X size={20} />
             </button>
             
             <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                 <Database size={20} />
               </div>
               <div>
                 <h2 className="text-xl font-bold text-gray-800">备份与恢复</h2>
                 <p className="text-xs text-gray-500">数据已自动保存到本机。此处可导出文件备份。</p>
               </div>
             </div>

             <div className="space-y-3">
               <button 
                 onClick={handleSaveGame}
                 className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all group text-left"
               >
                 <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                   <Save size={20} />
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-800">导出备份 (Export)</h3>
                   <p className="text-xs text-gray-500">将所有数据保存为 JSON 文件</p>
                 </div>
               </button>

               <button 
                 onClick={handleLoadGameClick}
                 className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all group text-left"
               >
                 <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                   <Upload size={20} />
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-800">导入备份 (Import)</h3>
                   <p className="text-xs text-gray-500">从 JSON 文件恢复数据</p>
                 </div>
               </button>
               <input 
                 type="file" 
                 accept=".json" 
                 ref={fileInputRef} 
                 className="hidden" 
                 onChange={handleFileChange}
               />

               <div className="h-px bg-gray-100 my-2"></div>

               <button 
                 onClick={handleExportCSV}
                 className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-green-50 hover:border-green-200 transition-all group text-left"
               >
                 <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                   <FileText size={20} />
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-800">导出报表 (Excel)</h3>
                   <p className="text-xs text-gray-500">生成 CSV 文件用于办公软件</p>
                 </div>
               </button>
             </div>
           </div>
        </div>
      )}

      {selectedTransaction && (
        <TransactionDetailModal 
          transaction={selectedTransaction} 
          onClose={() => setSelectedTransaction(null)}
          onDelete={handleDetailDelete}
        />
      )}
    </div>
  );
}
