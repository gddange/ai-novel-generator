/**
 * API Key 验证和安全处理工具
 */
class ApiKeyValidator {
  /**
   * 验证API Key格式
   * @param {string} apiKey - API Key
   * @param {string} provider - API提供商 ('openai' 或 'deepseek')
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

    // 根据提供商进行特定验证
    switch (provider.toLowerCase()) {
      case 'openai':
        return this.validateOpenAIKey(apiKey);
      case 'deepseek':
        return this.validateDeepSeekKey(apiKey);
      default:
        return {
          valid: false,
          error: '不支持的API提供商'
        };
    }
  }

  /**
   * 验证OpenAI API Key格式
   * @param {string} apiKey - OpenAI API Key
   * @returns {Object} 验证结果
   */
  static validateOpenAIKey(apiKey) {
    // OpenAI API Key通常以sk-开头
    if (!apiKey.startsWith('sk-')) {
      return {
        valid: false,
        error: 'OpenAI API Key格式错误，应以"sk-"开头'
      };
    }

    // 检查长度（OpenAI API Key通常为51个字符）
    if (apiKey.length < 40 || apiKey.length > 60) {
      return {
        valid: false,
        error: 'OpenAI API Key长度不正确'
      };
    }

    return {
      valid: true,
      sanitized: apiKey.trim()
    };
  }

  /**
   * 验证DeepSeek API Key格式
   * @param {string} apiKey - DeepSeek API Key
   * @returns {Object} 验证结果
   */
  static validateDeepSeekKey(apiKey) {
    // DeepSeek API Key通常以sk-开头
    if (!apiKey.startsWith('sk-')) {
      return {
        valid: false,
        error: 'DeepSeek API Key格式错误，应以"sk-"开头'
      };
    }

    // 基本长度检查 - DeepSeek API Key应该有合理的长度
    if (apiKey.length < 32) {
      return {
        valid: false,
        error: 'DeepSeek API Key长度过短'
      };
    }

    // 检查是否包含有效字符（字母数字和连字符）
    const validPattern = /^sk-[a-zA-Z0-9]+$/;
    if (!validPattern.test(apiKey)) {
      return {
        valid: false,
        error: 'DeepSeek API Key包含无效字符'
      };
    }

    return {
      valid: true,
      sanitized: apiKey.trim()
    };
  }

  /**
   * 脱敏API Key用于日志记录
   * @param {string} apiKey - 原始API Key
   * @returns {string} 脱敏后的API Key
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
   * @param {string} apiKey - API Key
   * @returns {boolean} 是否安全
   */
  static isSafeForLogging(apiKey) {
    // 永远不要在日志中记录完整的API Key
    return false;
  }
}

module.exports = ApiKeyValidator;