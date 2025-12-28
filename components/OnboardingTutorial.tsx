
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const STEPS = [
  {
    targetId: 'tour-balance',
    title: '资产概览与预算',
    description: '默认展示您的总资产状况。如果您在设置中设定了“月度预算”，这里将自动切换为预算进度条，助您更直观地控制消费。',
    position: 'bottom'
  },
  {
    targetId: 'tour-ai-input',
    title: 'AI 极速记账',
    description: '核心黑科技！像聊天一样输入 "打车去公司35元"，AI 会自动识别金额和分类。请记得点击设置图标配置 DeepSeek API Key 以激活此功能。',
    position: 'bottom'
  },
  {
    targetId: 'tour-add-btn',
    title: '手动记账 & 模板',
    description: '点击“+”号开始记账。支持极速数字键盘，您还可以将常记的账单存为“快捷模板”，下次一键点击即可完成。',
    position: 'top'
  },
  {
    targetId: 'nav-calendar',
    title: '日历视图',
    description: '点击此处切换。以日历形式回顾历史收支，配合“热力图”色彩深浅，一眼看清哪天消费最高。',
    position: 'top'
  },
  {
    targetId: 'nav-habits',
    title: '习惯养成',
    description: '不仅仅是记账。在这里设定喝水、运动、背单词等日常目标，每天坚持打卡，见证更好的自己。',
    position: 'top'
  },
  {
    targetId: 'nav-stats',
    title: '数据报表',
    description: '钱都去哪了？通过饼图和趋势柱状图，全方位分析您的消费结构和财务健康度，支持月度和年度切换。',
    position: 'top'
  },
  {
    targetId: 'tour-settings',
    title: '更多设置',
    description: '点击这里配置 AI 参数、管理自定义分类，或调整您的月度预算限额。',
    position: 'bottom'
  }
];

export const OnboardingTutorial: React.FC<Props> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // 获取当前步骤的目标元素位置
  useLayoutEffect(() => {
    const targetId = STEPS[currentStep].targetId;
    const element = document.getElementById(targetId);

    if (element) {
      // 滚动到元素位置，确保它在视口内
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // 稍微延迟一下等待滚动完成（或直接计算，通常 React 更新很快）
      const updateRect = () => {
        const newRect = element.getBoundingClientRect();
        // 稍微扩大一点高亮区域，不要贴得太死
        setRect(newRect);
      };

      updateRect();
      window.addEventListener('resize', updateRect);
      window.addEventListener('scroll', updateRect);
      
      return () => {
        window.removeEventListener('resize', updateRect);
        window.removeEventListener('scroll', updateRect);
      };
    } else {
      // 如果找不到元素（极少情况），跳过该步或结束
      console.warn(`Tutorial target not found: ${targetId}`);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  if (!rect) return null;

  const currentConfig = STEPS[currentStep];
  const padding = 8; // 高亮区域内边距
  
  // 计算高亮框的样式
  const highlightStyle: React.CSSProperties = {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + (padding * 2),
    height: rect.height + (padding * 2),
    position: 'absolute',
    borderRadius: '16px', // 统一圆角
    transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)', // 平滑过渡动画
    // 核心魔法：使用巨大的 box-shadow 形成遮罩
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)', 
    zIndex: 60,
    pointerEvents: 'none' // 允许点击穿透（虽然引导层盖住了，但视觉上需要穿透感，实际交互由下方控制按钮处理）
  };

  // 计算说明卡片的位置
  const isTopPosition = currentConfig.position === 'top' || (rect.bottom > window.innerHeight - 200);
  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: 20,
    right: 20,
    // 如果位置是 top，则放在高亮区域上方，否则放在下方
    top: isTopPosition ? 'auto' : (rect.bottom + padding + 20),
    bottom: isTopPosition ? (window.innerHeight - rect.top + padding + 20) : 'auto',
    zIndex: 61, // 比遮罩高一层
    margin: '0 auto',
    maxWidth: '400px',
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* 高亮遮罩层 (Spotlight) */}
      <div style={highlightStyle} className="ring-2 ring-indigo-400/50" />

      {/* 说明卡片 */}
      <div style={cardStyle} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-2xl p-5 shadow-2xl relative">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-gray-900">{currentConfig.title}</h3>
            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {currentStep + 1} / {STEPS.length}
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            {currentConfig.description}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onComplete}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              跳过
            </button>
            <button
              onClick={handleNext}
              className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {currentStep === STEPS.length - 1 ? '开始体验' : '下一步'}
              {currentStep === STEPS.length - 1 ? <Check size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>

          {/* 小三角箭头 (装饰) */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 ${isTopPosition ? '-bottom-2' : '-top-2'}`}
          />
        </div>
      </div>
    </div>
  );
};
