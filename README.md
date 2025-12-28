
# CashFlow - 智能记账 & 习惯养成

**CashFlow** 是一款基于 React 和 AI 技术构建的现代化个人财务管理与习惯养成应用。它专为移动端体验打造，结合了 **DeepSeek-V3** 的自然语言处理能力，让记账变得前所未有的简单和智能。

## ✨ 核心特性

### 🤖 AI 极速记账 (Magic Input)
告别繁琐的表单填写！只需像聊天一样输入（或语音转文字），AI 自动解析关键信息。
*   **自然语言处理**：支持输入 "打车去公司花了35元" 或 "发工资 15000"。
*   **智能解析**：自动识别 **金额**、**分类**、**交易类型** 和 **备注**。
*   **上下文追问**：如果信息缺失（如只说了"午餐"），AI 会温和地追问金额。
*   **模型支持**：集成 DeepSeek-V3 模型（通过 SiliconFlow API）。

### 📊 多维数据可视化
*   **收支趋势**：清晰的柱状图展示每日/每月的收支对比。
*   **支出构成**：饼图分析消费占比，精准定位开销大头。
*   **日历热力图**：通过日历视图的色彩深浅，直观回顾历史消费密度。
*   **资产概览**：实时计算总净资产，支持设定**月度预算**并实时监控进度。

### ✅ 习惯养成 (Habits)
不仅仅是记账，更是生活方式的管理。
*   **打卡追踪**：支持每日、每周、每月或自定义周期的习惯目标。
*   **统计激励**：自动计算**连续打卡天数 (Streak)** 和 **累计完成次数**，配合火焰🔥和奖杯🏆图标激励坚持。
*   **交互细节**：防止误触的防抖设计，支持**长按撤销**打卡，达成目标后的锁定反馈。

### 🛠️ 强大的管理功能
*   **自定义分类**：灵活管理支出/收入的大类与子类。
*   **快捷模板**：将常记的账单存为模板，一键入账。
*   **数据安全**：**隐私优先**，所有数据存储在设备本地。
*   **备份与恢复**：支持导出 JSON 备份文件（可复制到剪贴板或保存文件），支持导出 CSV 报表。

## 📱 技术栈

*   **前端框架**: [React 19](https://react.dev/)
*   **构建工具**: [Vite](https://vitejs.dev/)
*   **样式库**: [Tailwind CSS](https://tailwindcss.com/)
*   **移动端运行环境**: [Capacitor](https://capacitorjs.com/) (支持 iOS/Android 打包)
*   **图表库**: [Recharts](https://recharts.org/)
*   **图标库**: [Lucide React](https://lucide.dev/)
*   **AI 服务**: DeepSeek-V3 (via SiliconFlow API)

## 🚀 快速开始

### 1. 环境准备
确保您的电脑已安装 Node.js (推荐 v18+)。

### 2. 安装依赖
```bash
npm install
# 或者
yarn install
```

### 3. 启动开发服务器
```bash
npm run dev
```
浏览器访问即可预览。建议使用 Chrome 开发者工具切换到移动端模式获得最佳体验。

## 🤖 配置 AI 功能

为了使用“ai记账”功能，您需要配置 API Key：

1.  注册并登录 [SiliconFlow (硅基流动)](https://cloud.siliconflow.cn/)。
2.  创建 API Key。
3.  在 App 中点击底部导航栏的 **设置 (Settings)** -> **AI 智能配置**。
4.  填入 Key 并点击测试连接。

## 📦 构建移动端应用 (Android)

本项目使用 Capacitor 将 Web 应用封装为原生 App。

1.  **构建 Web 资源**:
    ```bash
    npm run build
    ```

2.  **同步资源到原生项目**:
    ```bash
    npx cap sync
    ```

3.  **打开 Android Studio 进行打包**:
    ```bash
    npx cap open android
    ```

## 📂 目录结构

```
src/
├── components/      # UI 组件 (卡片, 弹窗, 图表等)
├── services/        # 业务逻辑 (本地存储, AI API, 数据导出)
├── types/           # TypeScript 类型定义
├── constants.ts     # 常量配置 (图标映射, 颜色, Storage Keys)
├── App.tsx          # 主应用入口与路由逻辑
└── index.css        # Tailwind 全局样式
```

## 🔒 隐私说明

CashFlow 遵循**本地优先**原则。
*   **记账数据**：完全存储在您手机的 LocalStorage 中，不会上传到任何云端服务器（除非您手动导出）。
*   **API Key**：仅保存在本地，直接从您的设备向 AI 服务商发起请求。

---

**CashFlow** —— 记账，从此变成一种享受。
