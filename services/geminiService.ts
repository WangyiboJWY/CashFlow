import { Category, TransactionType } from '../types';

// 使用 localStorage 存储 API Key
const STORAGE_KEY_API = 'cashflow_siliconflow_key';
const STORAGE_KEY_VERIFIED = 'cashflow_api_verified';
const API_URL = "https://api.siliconflow.cn/v1/chat/completions";
const MODEL_NAME = "deepseek-ai/DeepSeek-V3";

// 导出 Key 管理函数供 UI 调用
export const getStoredApiKey = () => localStorage.getItem(STORAGE_KEY_API) || '';

export const isApiReady = () => {
  const key = getStoredApiKey();
  const verified = localStorage.getItem(STORAGE_KEY_VERIFIED) === 'true';
  return !!key && verified;
};

export const setStoredApiKey = (key: string, verified: boolean = false) => {
  localStorage.setItem(STORAGE_KEY_API, key);
  localStorage.setItem(STORAGE_KEY_VERIFIED, String(verified));
};

// 测试连接函数
export const testConnection = async (apiKey: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "user", content: "Test" }
        ],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const err = await response.json().catch(() => ({}));
      return { success: false, message: err.message || `Status: ${response.status}` };
    }
  } catch (error: any) {
    return { success: false, message: error.message || "Network Error (CORS?)" };
  }
};

export interface AIResponse {
  status: 'complete' | 'incomplete';
  data?: {
    amount: number;
    category: string;
    type: TransactionType;
    note: string;
    date?: string;
  };
  question?: string; // 如果 status 是 incomplete，这里放置 AI 的追问
}

export const parseTransactionFromText = async (text: string): Promise<AIResponse | null> => {
  try {
    const apiKey = getStoredApiKey();
    if (!apiKey) {
      throw new Error("API_KEY_MISSING");
    }

    // 构造 System Prompt
    const systemPrompt = `
      你是一个专业的个人财务助手。你的任务是将用户的自然语言输入解析为结构化的记账数据。
      
      请严格遵守以下逻辑：
      1. 分析用户输入是否包含 **金额 (Amount)** 和 **交易内容** (用于推断 Category 和 Type)。
      2. 如果缺少 **金额**，或者内容太模糊无法判断是支出还是收入，你必须返回状态 "incomplete" 并提出一个简短的问题来获取缺失信息。
      3. 如果信息完整，返回状态 "complete" 并填充数据。
      
      返回格式必须是以下 JSON 结构之一 (不要使用 Markdown 代码块)：
      
      情况 A：信息完整
      {
        "status": "complete",
        "data": {
          "amount": number,
          "type": "expense" | "income",
          "category": "必须是以下之一: ${Object.values(Category).join(', ')}",
          "note": "简短备注",
          "date": "YYYY-MM-DD (基于当前日期推算，未提及则为当前时间)"
        }
      }

      情况 B：信息缺失 (例如用户只说了"午餐"但没说多少钱)
      {
        "status": "incomplete",
        "question": "请用自然的语气简短追问缺失的信息 (例如: '午餐花了多少钱？')"
      }
    `;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.1,
        max_tokens: 512
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("DeepSeek API Error:", response.status, errData);
      throw new Error(`API Request Failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return null;

    // 清理可能存在的 Markdown 代码块标记
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    
    try {
      const result = JSON.parse(jsonStr);
      // 基本结构校验
      if (result.status === 'complete' && result.data) {
        return result as AIResponse;
      }
      if (result.status === 'incomplete' && result.question) {
        return result as AIResponse;
      }
      return null;
    } catch (e) {
      console.error("JSON Parse Error", e);
      return null;
    }

  } catch (error: any) {
    if (error.message === 'API_KEY_MISSING') {
      throw error;
    }
    console.error("AI Parsing Error:", error);
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error("网络连接失败 (可能是 CORS 限制或网络问题)");
    }
    throw error;
  }
};