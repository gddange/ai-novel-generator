/**
 * API Key 验证和安全处理工具
 */
class ApiKeyValidator {
  /**
   * 验证API Key格式
   * @param {string} apiKey - API Key
   * @param {string} provider - API提供商 ('openai'|'gpt'|'deepseek'|'kimi'|'qwen'|'gemini')
   * @returns {Object} 验证结果
   */
  static validateApiKey(apiKey, provider) {
    if (!apiKey || typeof apiKey !== 'string') {
      return {
        valid: false,
        error: 'API Key不能为空'
      };
    }

    // 移除前后空格
    apiKey = apiKey.trim();

    // 基本长度检查
    if (apiKey.length < 10) {
      return {
        valid: false,
        error: 'API Key长度过短'
      };
    }

    const normalized = (provider || '').toLowerCase();

    switch (normalized) {
      case 'openai':
      case 'gpt':
        return this.validateOpenAIKey(apiKey);
      case 'deepseek':
        return this.validateDeepSeekKey(apiKey);
      case 'kimi':
        return this.validateKimiKey(apiKey);
      case 'qwen':
        return this.validateQwenKey(apiKey);
      case 'gemini':
        return this.validateGeminiKey(apiKey);
      default:
        return {
          valid: false,
          error: '不支持的API提供商'
        };
    }
  }

  /**
   * 验证OpenAI API Key格式
   */
  static validateOpenAIKey(apiKey) {
    if (!apiKey.startsWith('sk-')) {
      return {
        valid: false,
        error: 'OpenAI API Key格式错误，应以"sk-"开头'
      };
    }

    if (apiKey.length < 40 || apiKey.length > 100) {
      return {
        valid: false,
        error: 'OpenAI API Key长度不正确'
      };
    }

    return { valid: true, sanitized: apiKey.trim() };
  }

  /**
   * 验证DeepSeek API Key格式
   */
  static validateDeepSeekKey(apiKey) {
    if (!apiKey.startsWith('sk-')) {
      return {
        valid: false,
        error: 'DeepSeek API Key格式错误，应以"sk-"开头'
      };
    }

    if (apiKey.length < 32) {
      return {
        valid: false,
        error: 'DeepSeek API Key长度过短'
      };
    }

    const validPattern = /^sk-[a-zA-Z0-9]+$/;
    if (!validPattern.test(apiKey)) {
      return {
        valid: false,
        error: 'DeepSeek API Key包含无效字符'
      };
    }

    return { valid: true, sanitized: apiKey.trim() };
  }

  /**
   * 验证Kimi(Moonshot) API Key格式
   */
  static validateKimiKey(apiKey) {
    // Moonshot通常也使用sk-前缀；若无前缀则要求长度>=32
    const validPattern = /^(sk-[a-zA-Z0-9]+|[A-Za-z0-9-_]{32,})$/;
    if (!validPattern.test(apiKey)) {
      return {
        valid: false,
        error: 'Kimi API Key格式不符合预期'
      };
    }
    return { valid: true, sanitized: apiKey.trim() };
  }

  /**
   * 验证Qwen(DashScope) API Key格式
   */
  static validateQwenKey(apiKey) {
    // DashScope Key通常为较长的字母数字，允许-_.
    const validPattern = /^[A-Za-z0-9-_.]{24,}$/;
    if (!validPattern.test(apiKey)) {
      return {
        valid: false,
        error: 'Qwen API Key格式不符合预期'
      };
    }
    return { valid: true, sanitized: apiKey.trim() };
  }

  /**
   * 验证Gemini API Key格式
   */
  static validateGeminiKey(apiKey) {
    // 常见前缀：AIza
    if (!apiKey.startsWith('AIza')) {
      return {
        valid: false,
        error: 'Gemini API Key格式错误，应以"AIza"开头'
      };
    }
    const validPattern = /^AIza[0-9A-Za-z-_]{20,}$/;
    if (!validPattern.test(apiKey)) {
      return {
        valid: false,
        error: 'Gemini API Key包含无效字符或长度不足'
      };
    }
    return { valid: true, sanitized: apiKey.trim() };
  }

  /**
   * 脱敏API Key用于日志记录
   */
  static maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) {
      return '***';
    }
    
    const start = apiKey.substring(0, 6);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '*'.repeat(Math.max(0, apiKey.length - 10));
    
    return `${start}${middle}${end}`;
  }

  /**
   * 检查API Key是否可能泄露敏感信息
   */
  static isSafeForLogging(apiKey) {
    // 永远不要在日志中记录完整的API Key
    return false;
  }
}

module.exports = ApiKeyValidator;