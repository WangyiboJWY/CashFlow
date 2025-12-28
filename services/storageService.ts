
import { Transaction, TransactionType, SummaryStats, TransactionTemplate, CustomCategoryMap, CustomMainCategoryMap, Habit } from '../types';
import { APP_STORAGE_KEY, APP_TEMPLATES_KEY, APP_CUSTOM_CATEGORIES_KEY, APP_CUSTOM_MAIN_CATS_KEY, APP_HABITS_KEY } from '../constants';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';

export interface ExtendedSummaryStats extends SummaryStats {
  monthIncome: number;
  monthExpense: number;
}

const APP_BUDGET_KEY = 'cashflow_budget_limit_v1';

export const getTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(APP_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load transactions", error);
    return [];
  }
};

// Helper for unique ID
const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

export const saveTransaction = (transaction: Transaction): Transaction[] => {
  const current = getTransactions();
  // Ensure ID is unique if not provided or collision (unlikely with Date.now, but safe)
  if (!transaction.id) {
    transaction.id = generateId();
  }
  
  // Sort by date desc (newest first)
  const updated = [transaction, ...current].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

// Replace all transactions (Used for Load Game)
export const overwriteTransactions = (transactions: Transaction[]): Transaction[] => {
  const sorted = transactions.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(sorted));
  return sorted;
};

export const deleteTransaction = (id: string): Transaction[] => {
  const current = getTransactions();
  const updated = current.filter(t => String(t.id) !== String(id));
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const calculateSummary = (transactions: Transaction[]): ExtendedSummaryStats => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return transactions.reduce(
    (acc, curr) => {
      const txDate = new Date(curr.date);
      const isThisMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;

      if (curr.type === TransactionType.INCOME) {
        acc.totalIncome += curr.amount;
        acc.balance += curr.amount;
        if (isThisMonth) acc.monthIncome += curr.amount;
      } else {
        acc.totalExpense += curr.amount;
        acc.balance -= curr.amount;
        if (isThisMonth) acc.monthExpense += curr.amount;
      }
      return acc;
    },
    { totalIncome: 0, totalExpense: 0, balance: 0, monthIncome: 0, monthExpense: 0 }
  );
};

// --- Budget Management ---
export const getBudgetLimit = (): number => {
  try {
    const data = localStorage.getItem(APP_BUDGET_KEY);
    return data ? parseFloat(data) : 0;
  } catch {
    return 0;
  }
};

export const saveBudgetLimit = (amount: number) => {
  localStorage.setItem(APP_BUDGET_KEY, amount.toString());
};

// --- Custom Sub Category Management ---

export const getCustomCategories = (): CustomCategoryMap => {
  try {
    const data = localStorage.getItem(APP_CUSTOM_CATEGORIES_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    return {};
  }
};

export const saveCustomCategories = (map: CustomCategoryMap) => {
  localStorage.setItem(APP_CUSTOM_CATEGORIES_KEY, JSON.stringify(map));
};

// --- Custom Main Category Management ---

export const getCustomMainCategories = (): CustomMainCategoryMap => {
  try {
    const data = localStorage.getItem(APP_CUSTOM_MAIN_CATS_KEY);
    return data ? JSON.parse(data) : { [TransactionType.EXPENSE]: [], [TransactionType.INCOME]: [] };
  } catch (error) {
    return { [TransactionType.EXPENSE]: [], [TransactionType.INCOME]: [] };
  }
};

export const saveCustomMainCategories = (map: CustomMainCategoryMap) => {
  localStorage.setItem(APP_CUSTOM_MAIN_CATS_KEY, JSON.stringify(map));
};

// --- Template Management ---

export const getTemplates = (): TransactionTemplate[] => {
  try {
    const data = localStorage.getItem(APP_TEMPLATES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};

export const saveTemplate = (template: TransactionTemplate): { success: boolean, templates: TransactionTemplate[], message?: string } => {
  const current = getTemplates();
  if (current.length >= 5) {
    return { success: false, templates: current, message: "模板已满 (最多5个)，请先删除旧模板" };
  }
  if (!template.id) template.id = generateId();
  
  const updated = [...current, template];
  localStorage.setItem(APP_TEMPLATES_KEY, JSON.stringify(updated));
  return { success: true, templates: updated };
};

export const deleteTemplate = (id: string): TransactionTemplate[] => {
  const current = getTemplates();
  const updated = current.filter(t => String(t.id) !== String(id));
  localStorage.setItem(APP_TEMPLATES_KEY, JSON.stringify(updated));
  return updated;
};

// --- Habit Management ---

export const getHabits = (): Habit[] => {
  try {
    const data = localStorage.getItem(APP_HABITS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveHabit = (habit: Habit): Habit[] => {
  const current = getHabits();
  let updated;
  if (habit.id) {
    // Edit
    updated = current.map(h => h.id === habit.id ? { ...habit, logs: h.logs } : h);
  } else {
    // Add
    habit.id = generateId();
    habit.logs = [];
    habit.createdAt = Date.now();
    updated = [habit, ...current];
  }
  localStorage.setItem(APP_HABITS_KEY, JSON.stringify(updated));
  return updated;
};

export const deleteHabit = (id: string): Habit[] => {
  const current = getHabits();
  const updated = current.filter(h => h.id !== id);
  localStorage.setItem(APP_HABITS_KEY, JSON.stringify(updated));
  return updated;
};

// Log action: +1 or -1 (undo)
export const logHabitAction = (id: string, action: 'increment' | 'decrement'): Habit[] => {
  const current = getHabits();
  const updated = current.map(h => {
    if (h.id === id) {
      const now = Date.now();
      if (action === 'increment') {
        return { ...h, logs: [...h.logs, now] };
      } else {
        // Remove the most recent log
        const newLogs = [...h.logs];
        newLogs.pop(); // Remove last element
        return { ...h, logs: newLogs };
      }
    }
    return h;
  });
  localStorage.setItem(APP_HABITS_KEY, JSON.stringify(updated));
  return updated;
};

// Helper: Calculate Time Anchors based on Period Type
const getPeriodAnchor = (timestamp: number, period: Habit['period'], customInterval?: number, createdAt?: number): number => {
  const d = new Date(timestamp);
  
  if (period === 'daily') {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }
  
  if (period === 'weekly') {
    // Return start of the week (Monday)
    const day = d.getDay() || 7; // 1-7 (Mon-Sun)
    if (day !== 1) d.setHours(-24 * (day - 1));
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  
  if (period === 'monthly') {
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }
  
  if (period === 'custom' && customInterval) {
    // Anchored to creation time
    const start = new Date(createdAt || 0).setHours(0,0,0,0);
    const diff = timestamp - start;
    const intervalMs = customInterval * 86400000;
    const index = Math.floor(diff / intervalMs);
    return start + (index * intervalMs);
  }

  return 0;
};

// Helper: Get Previous Period Anchor
const getPrevPeriodAnchor = (currentAnchor: number, period: Habit['period'], customInterval?: number): number => {
  if (period === 'daily') return currentAnchor - 86400000;
  if (period === 'weekly') return currentAnchor - (7 * 86400000);
  if (period === 'monthly') {
    const d = new Date(currentAnchor);
    return new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
  }
  if (period === 'custom' && customInterval) {
    return currentAnchor - (customInterval * 86400000);
  }
  return 0;
};

// Get current progress count based on period (Used for UI progress bar)
export const getHabitProgress = (habit: Habit): number => {
  const now = Date.now();
  const anchor = getPeriodAnchor(now, habit.period, habit.customInterval, habit.createdAt);
  return habit.logs.filter(ts => ts >= anchor).length;
};

// NEW: Calculate Streak and Total Completion
export const calculateHabitStats = (habit: Habit): { streak: number, totalAccumulated: number } => {
  if (habit.logs.length === 0) return { streak: 0, totalAccumulated: 0 };

  const countsByPeriod = new Map<number, number>();

  // 1. Group logs by Period Anchor
  habit.logs.forEach(ts => {
    const anchor = getPeriodAnchor(ts, habit.period, habit.customInterval, habit.createdAt);
    countsByPeriod.set(anchor, (countsByPeriod.get(anchor) || 0) + 1);
  });

  // 2. Identify Successful Periods
  const successfulPeriods = new Set<number>();
  countsByPeriod.forEach((count, anchor) => {
    if (count >= habit.targetCount) {
      successfulPeriods.add(anchor);
    }
  });

  const totalAccumulated = successfulPeriods.size;

  // 3. Calculate Streak (Walking Backwards)
  let streak = 0;
  let checkAnchor = getPeriodAnchor(Date.now(), habit.period, habit.customInterval, habit.createdAt);

  // Special Check: If current period is completed, streak starts from 1.
  // If NOT completed, it's not a break yet (unless period is over), but we start checking from previous.
  // However, "Streak" usually implies continuous completion.
  // Logic: 
  // If Today is Done: Streak includes Today + Backwards.
  // If Today is Not Done: Streak starts from Yesterday (if Yesterday is Done).
  
  if (successfulPeriods.has(checkAnchor)) {
    streak++;
  }
  
  // Walk back
  while (true) {
    checkAnchor = getPrevPeriodAnchor(checkAnchor, habit.period, habit.customInterval);
    if (successfulPeriods.has(checkAnchor)) {
      streak++;
    } else {
      break;
    }
  }

  return { streak, totalAccumulated };
};

// --- Helper: Get Backup Data String (Internal) ---
const getBackupDataString = (transactions: Transaction[]): string => {
  const customCategories = getCustomCategories();
  const customMainCategories = getCustomMainCategories();
  const budget = getBudgetLimit();
  const habits = getHabits();

  const backupData = {
    version: 6, // Increment version to 6 (added habits)
    transactions: transactions,
    customCategories: customCategories,
    customMainCategories: customMainCategories,
    budget: budget,
    habits: habits
  };
  return JSON.stringify(backupData, null, 2);
};

// --- Export Features ---

// 1. Export CSV
export const exportToCSV = async (transactions: Transaction[]): Promise<string> => {
  const headers = ['ID', '日期', '类型', '分类', '金额', '备注'];
  const rows = transactions.map(t => [
    t.id,
    new Date(t.date).toLocaleString(),
    t.type === TransactionType.INCOME ? '收入' : '支出',
    t.category, 
    t.amount.toFixed(2),
    `"${t.note.replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const fileName = `CashFlow_Report_${getDateString()}.csv`;
  await downloadFile(csvContent, fileName, 'text/csv');
  return fileName;
};

// 2. Export JSON File
export const exportBackup = async (transactions: Transaction[]): Promise<string> => {
  const jsonContent = getBackupDataString(transactions);
  const fileName = `CashFlow_Backup_${getDateString()}.json`;
  await downloadFile(jsonContent, fileName, 'application/json');
  return fileName;
};

// 3. NEW: Copy Backup to Clipboard (Fallback)
export const copyBackupToClipboard = async (transactions: Transaction[]): Promise<void> => {
  const jsonContent = getBackupDataString(transactions);
  await Clipboard.write({
    string: jsonContent
  });
};

// 恢复逻辑升级：兼容所有版本
export const importBackup = (file: File): Promise<{ 
  transactions: Transaction[], 
  customCategories: CustomCategoryMap,
  customMainCategories: CustomMainCategoryMap,
  budget?: number,
  habits?: Habit[]
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const data = JSON.parse(result);
        
        let txs: Transaction[] = [];
        let subCats: CustomCategoryMap = {};
        let mainCats: CustomMainCategoryMap = { [TransactionType.EXPENSE]: [], [TransactionType.INCOME]: [] };
        let budget = 0;
        let habits: Habit[] = [];

        if (Array.isArray(data)) {
          txs = data;
        } else if (data.transactions) {
          txs = Array.isArray(data.transactions) ? data.transactions : [];
          subCats = data.customCategories || {};
          budget = data.budget || 0;
          if (data.customMainCategories) mainCats = data.customMainCategories;
          if (data.habits) habits = data.habits;
        } else {
          reject(new Error("存档文件格式不正确"));
          return;
        }

        resolve({ 
          transactions: txs, 
          customCategories: subCats,
          customMainCategories: mainCats,
          budget: budget,
          habits: habits
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsText(file);
  });
};

const downloadFile = async (content: string, fileName: string, mimeType: string) => {
  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Write to Cache
      const result = await Filesystem.writeFile({
        path: fileName,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      // 2. Optimized Share: Use 'files' array instead of 'url'. 
      // This is more compatible with Android File Managers.
      await Share.share({
        title: 'CashFlow 数据导出',
        text: `文件名: ${fileName}`,
        files: [result.uri], // Use 'files' instead of 'url'
        dialogTitle: '请选择保存位置 (或发送到电脑)'
      });
      
    } catch (e) {
      console.error('File export failed:', e);
      throw new Error('导出失败，请重试');
    }
  } else {
    // Web
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const getDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hour}${minute}`;
};
