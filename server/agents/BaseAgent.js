const { v4: uuidv4 } = require('uuid');
const ContextManager = require('../utils/ContextManager');
const DeepSeekService = require('../services/DeepSeekService');
const OpenAIService = require('../services/OpenAIService');

class BaseAgent {
  constructor(name, role, systemPrompt, apiProvider = 'deepseek') {
    this.id = uuidv4();
    this.name = name;
    this.role = role;
    this.systemPrompt = systemPrompt;
    this.contextManager = new ContextManager(name);
    this.apiProvider = apiProvider;
    this.setApiService(apiProvider);
    this.isActive = false;
    this.currentTask = null;
    this.createdAt = new Date();
  }

  /**
   * 设置API服务
   */
  setApiService(provider, apiKey) {
    const validProviders = ['openai', 'deepseek'];
    
    if (!validProviders.includes(provider.toLowerCase())) {
      throw new Error(`不支持的API提供商: ${provider}。支持的提供商: ${validProviders.join(', ')}`);
    }

    switch (provider.toLowerCase()) {
      case 'openai':
        this.apiService = new OpenAIService(apiKey);
        break;
      case 'deepseek':
      default:
        this.apiService = new DeepSeekService(apiKey);
        break;
    }
  }

  /**
   * 设置Agent的系统提示词
   */
  setSystemPrompt(prompt) {
    this.systemPrompt = prompt;
  }

  /**
   * 添加消息到上下文
   */
  addToContext(message, importance = 1) {
    this.contextManager.addMessage({
      id: uuidv4(),
      content: message,
      timestamp: new Date(),
      importance,
      type: 'message'
    });
  }

  /**
   * 获取当前上下文
   */
  getContext() {
    return this.contextManager.getContext();
  }

  /**
   * 压缩上下文
   */
  async compressContext() {
    await this.contextManager.compressContext();
  }

  /**
   * 设置当前任务
   */
  setCurrentTask(task) {
    this.currentTask = task;
    this.isActive = true;
  }

  /**
   * 完成当前任务
   */
  completeTask() {
    this.currentTask = null;
    this.isActive = false;
  }

  /**
   * 获取Agent状态
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      isActive: this.isActive,
      currentTask: this.currentTask,
      contextSize: this.contextManager.getContextSize(),
      createdAt: this.createdAt
    };
  }

  /**
   * 与其他Agent通信
   */
  async communicateWith(otherAgent, message) {
    // 记录通信历史
    this.addToContext(`与${otherAgent.name}通信: ${message}`, 0.8);
    otherAgent.addToContext(`收到${this.name}消息: ${message}`, 0.8);
    
    return {
      from: this.name,
      to: otherAgent.name,
      message,
      timestamp: new Date()
    };
  }

  /**
   * 处理消息 - 子类需要实现
   */
  async processMessage(message, context = {}) {
    throw new Error('processMessage方法需要在子类中实现');
  }

  /**
   * 生成响应 - 使用配置的API服务
   */
  async generateResponse(prompt, context = {}) {
    try {
      const response = await this.apiService.generateText(prompt, {
        systemPrompt: this.systemPrompt,
        maxTokens: context.maxTokens || 2000,
        temperature: context.temperature || 0.7
      });
      
      // 将响应添加到上下文
      this.addToContext(`AI回复: ${response}`, 0.8);
      
      return response;
    } catch (error) {
      console.error(`${this.name} 生成响应失败:`, error.message);
      throw error;
    }
  }

  /**
   * 重置Agent状态
   */
  reset() {
    this.contextManager.clearContext();
    this.currentTask = null;
    this.isActive = false;
  }

  /**
   * 导出Agent数据
   */
  export() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      systemPrompt: this.systemPrompt,
      context: this.contextManager.export(),
      status: this.getStatus()
    };
  }

  /**
   * 从数据导入Agent状态
   */
  import(data) {
    if (data.context) {
      this.contextManager.import(data.context);
    }
    if (data.systemPrompt) {
      this.systemPrompt = data.systemPrompt;
    }
  }
}

module.exports = BaseAgent;