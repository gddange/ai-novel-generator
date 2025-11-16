const axios = require('axios');

class GeminiService {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    this.baseURL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
    this.model = process.env.GEMINI_MODEL || 'gemini-pro';

    if (!this.apiKey) {
      console.warn('Gemini API key not found in environment variables or constructor parameter');
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
        message: 'Gemini API连接成功',
        response
      };
    } catch (error) {
      return {
        success: false,
        message: 'Gemini API连接失败',
        error: error.message
      };
    }
  }

  async generateText(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const {
      maxTokens = 2000,
      temperature = 0.7,
      systemPrompt = null
    } = options;

    // Gemini的请求结构为contents，支持systemInstruction
    const contents = [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];

    const payload = {
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature
      }
    };

    if (systemPrompt) {
      payload.systemInstruction = {
        role: 'system',
        parts: [{ text: systemPrompt }]
      };
    }

    try {
      const url = `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`;
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      const data = response.data;
      // 解析candidates -> content -> parts[0].text
      if (
        data?.candidates?.length > 0 &&
        data.candidates[0]?.content?.parts?.length > 0 &&
        typeof data.candidates[0].content.parts[0].text === 'string'
      ) {
        return data.candidates[0].content.parts[0].text;
      }

      throw new Error('Invalid response format from Gemini API');
    } catch (error) {
      if (error.response) {
        throw new Error(`Gemini API Error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Network error: Unable to reach Gemini API');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  async getModelInfo() {
    return {
      model: this.model,
      provider: 'Gemini',
      baseURL: this.baseURL,
      configured: !!this.apiKey
    };
  }
}

module.exports = GeminiService;