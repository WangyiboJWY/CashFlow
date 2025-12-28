
import React, { useMemo, useState, useRef, useLayoutEffect } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip 
} from 'recharts';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Calendar, ChevronDown, PieChart as PieChartIcon, ShieldCheck } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  totalBalance: number;
}

type TimeRange = 'month' | 'year';

export const StatsView: React.FC<Props> = ({ transactions, totalBalance }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  
  // Ref for the scrollable chart container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Helper: 获取所有可用的月份或年份
  const availablePeriods = useMemo(() => {
    const periods = new Set<string>();
    transactions.forEach(t => {
      const date = new Date(t.date);
      if (timeRange === 'month') {
        // Format: YYYY-MM
        periods.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
      } else {
        // Format: YYYY
        periods.add(`${date.getFullYear()}`);
      }
    });
    // Sort descending
    const sorted = Array.from(periods).sort((a, b) => b.localeCompare(a));
    // Set default selection if empty
    if (!selectedPeriod && sorted.length > 0) {
      setSelectedPeriod(sorted[0]);
    }
    return sorted;
  }, [transactions, timeRange, selectedPeriod]);

  // Ensure selectedPeriod is valid when range changes
  React.useEffect(() => {
    if (availablePeriods.length > 0 && !availablePeriods.includes(selectedPeriod)) {
      setSelectedPeriod(availablePeriods[0]);
    }
  }, [availablePeriods, selectedPeriod]);

  // 2. Filter Transactions based on selection
  const filteredTransactions = useMemo(() => {
    if (!selectedPeriod) return [];
    return transactions.filter(t => {
      const date = new Date(t.date);
      if (timeRange === 'month') {
        const currentPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return currentPeriod === selectedPeriod;
      } else {
        const currentPeriod = `${date.getFullYear()}`;
        return currentPeriod === selectedPeriod;
      }
    });
  }, [transactions, selectedPeriod, timeRange]);

  // 3. Calculate Summary (Income, Expense, Balance)
  const summary = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => {
      if (curr.type === TransactionType.INCOME) {
        acc.income += curr.amount;
      } else {
        acc.expense += curr.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTransactions]);

  // 4. Prepare Pie Chart Data (Category Breakdown)
  const categoryData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE);
    const categoryMap: Record<string, number> = {};
    
    expenses.forEach(t => {
      if (!categoryMap[t.category]) categoryMap[t.category] = 0;
      categoryMap[t.category] += t.amount;
    });

    return Object.keys(categoryMap).map(cat => {
      const mainCat = cat.split(' - ')[0];
      return {
        name: cat,
        value: categoryMap[cat],
        color: CATEGORY_COLORS[mainCat] || '#999'
      };
    }).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // 5. Prepare Bar Chart Data (Trend)
  const trendData = useMemo(() => {
    const dataMap = new Map<string, { name: string, income: number, expense: number }>();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();
    
    // Initialize structure based on range
    if (timeRange === 'month') {
      // Create days for the selected month
      if (selectedPeriod) {
        const [year, month] = selectedPeriod.split('-').map(Number);
        
        let daysLimit = new Date(year, month, 0).getDate();
        
        // 如果是当前月份，只显示到今天
        if (year === currentYear && month === currentMonth) {
            daysLimit = currentDay;
        }
        
        for (let i = 1; i <= daysLimit; i++) {
          dataMap.set(String(i), { name: `${i}日`, income: 0, expense: 0 });
        }
      }
    } else {
      // Create months
      let monthsLimit = 12;
      const selectedYear = Number(selectedPeriod);
      
      // 如果是当前年份，只显示到当前月份
      if (selectedYear === currentYear) {
          monthsLimit = currentMonth;
      }
      
      for (let i = 1; i <= monthsLimit; i++) {
        dataMap.set(String(i), { name: `${i}月`, income: 0, expense: 0 });
      }
    }

    // Fill data
    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      const key = timeRange === 'month' ? String(date.getDate()) : String(date.getMonth() + 1);
      
      const item = dataMap.get(key);
      if (item) {
        if (t.type === TransactionType.INCOME) {
          item.income += t.amount;
        } else {
          item.expense += t.amount;
        }
      }
    });

    return Array.from(dataMap.values());
  }, [filteredTransactions, timeRange, selectedPeriod]);

  // 6. Auto-scroll to the end (latest date) when data changes
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [trendData, timeRange, selectedPeriod]);

  // Chart Width Calculation
  // 60px per item ensures about 5-6 items visible on a typical mobile screen (360-390px width)
  const CHART_ITEM_WIDTH = 60; 
  const chartWidth = Math.max(trendData.length * CHART_ITEM_WIDTH, 350); // Minimum width to prevent squeeze

  return (
    <div className="pb-24">
      {/* 顶部：总净资产卡片 (原首页位置移到这里) */}
      <div className="px-4 mb-6">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <p className="text-indigo-200 text-sm font-medium">历史总净资产 (Total Net Assets)</p>
            <ShieldCheck size={14} className="text-green-300 opacity-80" />
          </div>
          <h1 className="text-4xl font-bold font-mono tracking-tight relative z-10">¥{totalBalance.toFixed(2)}</h1>
          <p className="text-xs text-indigo-200 mt-2 opacity-70">统计自开始记账以来的所有累积结余</p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-10 text-gray-400">
          <PieChartIcon size={48} className="mb-4 opacity-50" />
          <p>暂无数据，请先记一笔</p>
        </div>
      ) : (
        <>
          {/* Header Controls */}
          <div className="px-4 mb-6">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex mb-4">
              <button
                onClick={() => setTimeRange('month')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${timeRange === 'month' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500'}`}
              >
                月度报表
              </button>
              <button
                onClick={() => setTimeRange('year')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${timeRange === 'year' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500'}`}
              >
                年度报表
              </button>
            </div>

            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 text-gray-800 font-bold py-3 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                {availablePeriods.map(p => (
                  <option key={p} value={p}>
                    {timeRange === 'month' ? `${p.split('-')[0]}年 ${p.split('-')[1]}月` : `${p}年`}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>
          </div>

          {/* Summary Cards (Filtered Period) */}
          <div className="px-4 grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <ArrowDownCircle size={18} />
                </div>
                <span className="text-xs text-gray-500 font-medium">期间收入</span>
              </div>
              <p className="text-xl font-bold text-gray-800">¥{summary.income.toFixed(2)}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <ArrowUpCircle size={18} />
                </div>
                <span className="text-xs text-gray-500 font-medium">期间支出</span>
              </div>
              <p className="text-xl font-bold text-gray-800">¥{summary.expense.toFixed(2)}</p>
            </div>
            
            <div className="col-span-2 bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-2xl shadow-md text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Wallet size={20} />
                 </div>
                 <div>
                   <p className="text-xs text-gray-300">期间结余</p>
                   <p className="text-2xl font-bold">¥{(summary.income - summary.expense).toFixed(2)}</p>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-xs text-gray-400 opacity-80">{timeRange === 'month' ? '本月结余' : '本年结余'}</p>
              </div>
            </div>
          </div>

          {filteredTransactions.length > 0 ? (
            <>
              {/* Trend Chart (Horizontal Scroll) */}
              <div className="mb-6">
                <div className="px-4 mb-3 flex items-center justify-between">
                   <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-600" />
                    收支趋势
                   </h3>
                   <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                     左右滑动查看更多
                   </span>
                </div>
                
                <div 
                  ref={scrollContainerRef}
                  className="overflow-x-auto no-scrollbar pb-2 pl-4 pr-4"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-64" style={{ width: chartWidth }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="name" 
                          tick={{fontSize: 10}} 
                          tickLine={false} 
                          axisLine={false} 
                          interval={0} // Force show all labels since we have enough scrolling width
                        />
                        <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          cursor={{fill: '#f3f4f6', radius: 4}}
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar dataKey="income" name="收入" fill="#4ade80" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={40} />
                        <Bar dataKey="expense" name="支出" fill="#f87171" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Category Pie Chart */}
              <div className="px-4 mb-6">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <PieChartIcon size={18} className="text-indigo-600" />
                  支出构成
                </h3>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="h-64 w-full">
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `¥${value.toFixed(2)}`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
                        本期暂无支出数据
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rankings */}
              <div className="px-4">
                <h3 className="font-semibold text-gray-700 mb-3">支出排行榜</h3>
                {categoryData.length > 0 ? (
                  categoryData.map(item => {
                    const mainCat = item.name.split(' - ')[0];
                    const Icon = CATEGORY_ICONS[mainCat] || CATEGORY_ICONS[Category.OTHER];
                    return (
                      <div key={item.name} className="flex items-center justify-between bg-white p-3 rounded-xl mb-2 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: item.color }}>
                            <Icon size={16} />
                          </div>
                          <span className="text-gray-700 font-medium">{item.name}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-gray-900">¥{item.value.toFixed(2)}</span>
                          <span className="text-[10px] text-gray-400">
                             {((item.value / summary.expense) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                   <p className="text-center text-gray-400 text-sm py-4">无支出记录</p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <p>该时间段没有记录</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
