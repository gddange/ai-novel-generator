const axios = require('axios');
const https = require('https');

class DeepSeekService {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY;
    this.baseURL = 'https://api.deepseek.com';
    this.model = 'deepseek-chat';
    
    // 创建自定义的 axios 实例，配置 HTTPS Agent
    this.axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 50,
        maxFreeSockets: 10,
        timeout: 60000,
        freeSocketTimeout: 30000,
        rejectUnauthorized: true
      }),
      timeout: 60000,
      headers: {
        'User-Agent': 'Novel-Generator/1.0.0',
        'Connection': 'keep-alive'
      }
    });
    
    if (!this.apiKey) {
      console.warn('⚠️ DeepSeek API key not provided');
    }
  }

  /**
   * 测试API连接
   */
  async testConnection() {
    try {
      const response = await this.generateText('Hello, this is a test message.', {
        maxTokens: 50,
        temperature: 0.1
      });
      return {
        success: true,
        message: 'DeepSeek API连接成功',
        response: response
      };
    } catch (error) {
      return {
        success: false,
        message: 'DeepSeek API连接失败',
        error: error.message
      };
    }
  }

  /**
   * 生成文本
   */
  async generateText(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const {
      maxTokens = 2000,
      temperature = 0.7,
      systemPrompt = null,
      stream = false,
      maxRetries = 3,
      retryDelay = 1000
    } = options;

    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: prompt
    });

    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 API调用尝试 ${attempt}/${maxRetries}...`);
        
        const response = await this.axiosInstance.post(
          `${this.baseURL}/v1/chat/completions`,
          {
            model: this.model,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature,
            stream: stream
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data && response.data.choices && response.data.choices.length > 0) {
          console.log(`✅ API调用成功 (尝试 ${attempt}/${maxRetries})`);
          return response.data.choices[0].message.content;
        } else {
          throw new Error('Invalid response format from DeepSeek API');
        }
      } catch (error) {
        lastError = error;
        console.error(`❌ API调用失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
        console.error(`🔍 错误详情:`, {
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          hostname: error.hostname,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            timeout: error.config?.timeout,
            headers: error.config?.headers ? Object.keys(error.config.headers) : null
          },
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          } : null
        });
        
        if (attempt < maxRetries) {
          const delay = retryDelay * attempt; // 递增延迟
          console.log(`⏳ ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // 所有重试都失败了，抛出最后一个错误
    if (lastError.response) {
      throw new Error(`DeepSeek API Error: ${lastError.response.status} - ${lastError.response.data?.error?.message || lastError.response.statusText}`);
    } else if (lastError.request) {
      throw new Error('Network error: Unable to reach DeepSeek API');
    } else {
      throw new Error(`Request error: ${lastError.message}`);
    }
  }

  /**
   * 生成对话回复
   */
  async generateChatResponse(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const {
      maxTokens = 2000,
      temperature = 0.7,
      stream = false
    } = options;

    try {
      const response = await axios.post(
        `${this.baseURL}/v1/chat/completions`,
        {
          model: this.model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature,
          stream: stream
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`DeepSeek API Error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Network error: Unable to reach DeepSeek API');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  /**
   * 获取模型信息
   */
  async getModelInfo() {
    return {
      model: this.model,
      provider: 'DeepSeek',
      baseURL: this.baseURL,
      configured: !!this.apiKey
    };
  }
}

module.exports = DeepSeekService;