const axios = require('axios');

class QwenService {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.QWEN_API_KEY;
    this.baseURL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com';
    this.model = process.env.QWEN_MODEL || 'qwen-turbo';

    if (!this.apiKey) {
      console.warn('Qwen API key not found in environment variables or constructor parameter');
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
        message: 'Qwen API连接成功',
        response
      };
    } catch (error) {
      return {
        success: false,
        message: 'Qwen API连接失败',
        error: error.message
      };
    }
  }

  async generateText(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('Qwen API key not configured');
    }

    const {
      maxTokens = 2000,
      temperature = 0.7,
      systemPrompt = null
    } = options;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const response = await axios.post(
        `${this.baseURL}/api/v1/services/aigc/chat/completions`,
        {
          model: this.model,
          input: { messages },
          parameters: {
            temperature,
            max_tokens: maxTokens
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-DashScope-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const data = response.data;
      // Qwen返回格式可能为 { output: { choices: [ { message: { content } } ] } }
      if (data?.output?.choices?.length > 0) {
        const choice = data.output.choices[0];
        return choice?.message?.content || choice?.content || '';
      }

      throw new Error('Invalid response format from Qwen API');
    } catch (error) {
      if (error.response) {
        throw new Error(`Qwen API Error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Network error: Unable to reach Qwen API');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  async getModelInfo() {
    return {
      model: this.model,
      provider: 'Qwen (DashScope)',
      baseURL: this.baseURL,
      configured: !!this.apiKey
    };
  }
}

module.exports = QwenService;