
import { Transaction, TransactionType, SummaryStats, TransactionTemplate, CustomCategoryMap, CustomMainCategoryMap } from '../types';
import { APP_STORAGE_KEY, APP_TEMPLATES_KEY, APP_CUSTOM_CATEGORIES_KEY, APP_CUSTOM_MAIN_CATS_KEY } from '../constants';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
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

// 导出 CSV (返回文件名) - 改为异步
export const exportToCSV = async (transactions: Transaction[]): Promise<string> => {
  const headers = ['ID', '日期', '类型', '分类', '金额', '备注'];
  const rows = transactions.map(t => [
    t.id,
    new Date(t.date).toLocaleString(),
    t.type === TransactionType.INCOME ? '收入' : '支出',
    t.category, // This will naturally export "Main - Sub"
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

// 备份逻辑升级：包含 Custom Sub Categories 和 Custom Main Categories (返回文件名) - 改为异步
export const exportBackup = async (transactions: Transaction[]): Promise<string> => {
  const customCategories = getCustomCategories();
  const customMainCategories = getCustomMainCategories();
  const budget = getBudgetLimit();
  const backupData = {
    version: 5, // Increment version to 5
    transactions: transactions,
    customCategories: customCategories,
    customMainCategories: customMainCategories,
    budget: budget
  };
  const jsonContent = JSON.stringify(backupData, null, 2);
  
  // 生成带时间戳的文件名，避免覆盖
  const fileName = `CashFlow_Backup_${getDateString()}.json`;
  await downloadFile(jsonContent, fileName, 'application/json');
  return fileName;
};

// 恢复逻辑升级：兼容所有版本
export const importBackup = (file: File): Promise<{ 
  transactions: Transaction[], 
  customCategories: CustomCategoryMap,
  customMainCategories: CustomMainCategoryMap,
  budget?: number
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

        if (Array.isArray(data)) {
          // Version 1: Just an array of transactions
          txs = data;
        } else if (data.transactions) {
          // Version 2 & 3 & 4 & 5
          txs = Array.isArray(data.transactions) ? data.transactions : [];
          subCats = data.customCategories || {};
          budget = data.budget || 0;
          
          if (data.customMainCategories) {
            mainCats = data.customMainCategories;
          }
        } else {
          reject(new Error("存档文件格式不正确"));
          return;
        }

        resolve({ 
          transactions: txs, 
          customCategories: subCats,
          customMainCategories: mainCats,
          budget: budget
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
  // 检测是否为 Native App 环境 (Android/iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      // 1. 将文件写入缓存目录 (Cache 目录不需要额外权限)
      const result = await Filesystem.writeFile({
        path: fileName,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      // 2. 调用系统分享，让用户选择保存位置 (如“保存到文件”或发送给微信)
      await Share.share({
        title: 'CashFlow 数据导出',
        text: `这是您的 CashFlow 数据文件：${fileName}`,
        url: result.uri,
        dialogTitle: '保存或分享文件'
      });
      
    } catch (e) {
      console.error('File export failed:', e);
      throw new Error('导出失败，请重试');
    }
  } else {
    // Web 浏览器环境：使用传统的 a 标签下载
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

// 优化时间戳格式: YYYY-MM-DD-HHmm
const getDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hour}${minute}`;
};
