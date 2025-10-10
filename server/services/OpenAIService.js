const axios = require('axios');

class OpenAIService {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
    this.baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    
    if (!this.apiKey) {
      console.warn('OpenAI API key not found in environment variables or constructor parameter');
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
        message: 'OpenAI API连接成功',
        response: response
      };
    } catch (error) {
      return {
        success: false,
        message: 'OpenAI API连接失败',
        error: error.message
      };
    }
  }

  /**
   * 生成文本
   */
  async generateText(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
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
        throw new Error('Invalid response format from OpenAI API');
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`OpenAI API Error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Network error: Unable to reach OpenAI API');
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
      throw new Error('OpenAI API key not configured');
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
        throw new Error(`OpenAI API Error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Network error: Unable to reach OpenAI API');
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
      provider: 'OpenAI',
      baseURL: this.baseURL,
      configured: !!this.apiKey
    };
  }
}

module.exports = OpenAIService;