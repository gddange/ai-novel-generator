const axios = require('axios');
const http = require('http');
const https = require('https');

class KimiService {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.KIMI_API_KEY;
    this.baseURL = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn';
    this.model = process.env.KIMI_MODEL || 'moonshot-v1-8k';

    // 新增：连接与重试设置
    this.timeout = parseInt(process.env.KIMI_TIMEOUT || '30000', 10);
    this.maxRetries = parseInt(process.env.KIMI_MAX_RETRIES || '3', 10);
    this.retryDelay = parseInt(process.env.KIMI_RETRY_DELAY || '800', 10); // ms，线性/指数退避基准
    this.httpAgent = new http.Agent({ keepAlive: true, keepAliveMsecs: 1000, maxSockets: 50 });
    this.httpsAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 1000, maxSockets: 50 });

    if (!this.apiKey) {
      console.warn('Kimi API key not found in environment variables or constructor parameter');
    }
  }

  async testConnection() {
    try {
      const response = await this.generateText('Hello, this is a test message.', {
        maxTokens: 50,
        temperature: 0.1
      });
      return {
        success: true,
        message: 'Kimi API连接成功',
        response
      };
    } catch (error) {
      return {
        success: false,
        message: 'Kimi API连接失败',
        error: error.message
      };
    }
  }

  // 新增：是否可重试判断
  shouldRetry(error) {
    // 网络错误或5xx，或429节流，进行重试
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 429;
    }
    if (error.code) {
      const transientCodes = ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENETUNREACH', 'ECONNREFUSED'];
      return transientCodes.includes(error.code);
    }
    return !!error.request; // 无响应的网络错误
  }

  // 新增：带重试的POST
  async postWithRetry(url, data, config = {}) {
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(url, data, {
          ...config,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...(config.headers || {})
          },
          timeout: this.timeout,
          httpAgent: this.httpAgent,
          httpsAgent: this.httpsAgent,
        });
        return response;
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        const should = this.shouldRetry(error);
        console.error(`❌ Kimi请求失败 (尝试 ${attempt}/${this.maxRetries})`, {
          message: error.message,
          status,
          code: error.code,
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        });
        if (should && attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt; // 简单递增退避
          console.log(`⏳ ${delay}ms 后重试Kimi...`);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        // 不可重试或已到达上限
        throw error;
      }
    }
    // 理论上不会到这；保底抛出
    throw lastError || new Error('未知错误：Kimi请求失败');
  }

  async generateText(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('Kimi API key not configured');
    }

    const {
      maxTokens = 2000,
      temperature = 0.7,
      systemPrompt = null,
      stream = false
    } = options;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const response = await this.postWithRetry(
        `${this.baseURL}/v1/chat/completions`,
        {
          model: this.model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream
        }
      );

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      }
      throw new Error('Invalid response format from Kimi API');
    } catch (error) {
      if (error.response) {
        throw new Error(`Kimi API Error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Network error: Unable to reach Kimi API');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  async generateChatResponse(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('Kimi API key not configured');
    }

    const {
      maxTokens = 2000,
      temperature = 0.7,
      stream = false
    } = options;

    try {
      const response = await this.postWithRetry(
        `${this.baseURL}/v1/chat/completions`,
        {
          model: this.model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream
        }
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Kimi API Error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Network error: Unable to reach Kimi API');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  async getModelInfo() {
    return {
      model: this.model,
      provider: 'Kimi (Moonshot)',
      baseURL: this.baseURL,
      configured: !!this.apiKey
    };
  }
}

module.exports = KimiService;