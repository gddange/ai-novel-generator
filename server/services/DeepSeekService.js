const axios = require('axios');

class DeepSeekService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    this.model = 'deepseek-chat';
    
    if (!this.apiKey) {
      console.warn('DeepSeek API key not found in environment variables');
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
      stream = false
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

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      } else {
        throw new Error('Invalid response format from DeepSeek API');
      }
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