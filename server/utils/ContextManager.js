class ContextManager {
  constructor(agentName, maxContextSize = 10000) {
    this.agentName = agentName;
    this.maxContextSize = maxContextSize;
    this.context = [];
    this.compressedContext = [];
    this.importantMemories = [];
  }

  /**
   * 添加消息到上下文
   */
  addMessage(message) {
    const messageWithScore = {
      ...message,
      importance: this.calculateImportance(message),
      accessCount: 0,
      lastAccessed: new Date()
    };
    
    this.context.push(messageWithScore);
    
    // 检查是否需要压缩
    if (this.getContextSize() > this.maxContextSize) {
      this.compressContext();
    }
  }

  /**
   * 计算消息重要性
   */
  calculateImportance(message) {
    let importance = message.importance || 0.5;
    
    // 时间衰减：越新的内容重要性越高
    const now = new Date();
    const messageAge = (now - new Date(message.timestamp)) / (1000 * 60 * 60); // 小时
    const timeDecay = Math.exp(-messageAge / 24); // 24小时衰减
    
    // 内容类型权重
    const typeWeights = {
      'outline': 1.0,      // 大纲最重要
      'chapter': 0.9,      // 章节内容
      'character': 0.8,    // 角色信息
      'plot': 0.8,         // 情节信息
      'style': 0.7,        // 文风信息
      'message': 0.5,      // 普通消息
      'system': 0.3        // 系统消息
    };
    
    const typeWeight = typeWeights[message.type] || 0.5;
    
    // 关键词权重
    const keywords = ['大纲', '框架', '主角', '情节', '结局', '转折', '冲突'];
    let keywordBonus = 0;
    keywords.forEach(keyword => {
      if (message.content.includes(keyword)) {
        keywordBonus += 0.1;
      }
    });
    
    // 综合计算重要性
    importance = Math.min(1.0, importance * typeWeight * timeDecay + keywordBonus);
    
    return importance;
  }

  /**
   * 获取上下文大小
   */
  getContextSize() {
    return JSON.stringify(this.context).length;
  }

  /**
   * 压缩上下文
   */
  compressContext() {
    // 按重要性和时间排序
    const sortedContext = this.context.sort((a, b) => {
      const scoreA = a.importance * (1 + a.accessCount * 0.1);
      const scoreB = b.importance * (1 + b.accessCount * 0.1);
      return scoreB - scoreA;
    });
    
    // 保留最重要的内容
    const keepCount = Math.floor(this.context.length * 0.7);
    const toKeep = sortedContext.slice(0, keepCount);
    const toCompress = sortedContext.slice(keepCount);
    
    // 压缩不重要的内容
    if (toCompress.length > 0) {
      const compressed = this.compressMessages(toCompress);
      this.compressedContext.push({
        id: `compressed_${Date.now()}`,
        content: compressed,
        timestamp: new Date(),
        type: 'compressed',
        importance: 0.3,
        originalCount: toCompress.length
      });
    }
    
    // 更新上下文
    this.context = toKeep;
    
    // 保存重要记忆
    this.updateImportantMemories();
  }

  /**
   * 压缩消息内容
   */
  compressMessages(messages) {
    const summary = {
      characters: new Set(),
      plotPoints: [],
      themes: new Set(),
      timeframe: null
    };
    
    messages.forEach(msg => {
      // 提取角色名
      const characterMatches = msg.content.match(/[\u4e00-\u9fa5]{2,4}(?=说|道|想|做|去|来)/g);
      if (characterMatches) {
        characterMatches.forEach(char => summary.characters.add(char));
      }
      
      // 提取主题词
      const themeMatches = msg.content.match(/(爱情|友情|冒险|悬疑|科幻|奇幻|历史|现代|古代)/g);
      if (themeMatches) {
        themeMatches.forEach(theme => summary.themes.add(theme));
      }
      
      // 提取情节要点
      if (msg.content.length > 100) {
        const sentences = msg.content.split(/[。！？]/);
        const importantSentences = sentences.filter(s => 
          s.length > 10 && (s.includes('决定') || s.includes('发现') || s.includes('遇到'))
        );
        summary.plotPoints.push(...importantSentences.slice(0, 2));
      }
    });
    
    return `[压缩内容] 涉及角色: ${Array.from(summary.characters).join('、')}; ` +
           `主题: ${Array.from(summary.themes).join('、')}; ` +
           `关键情节: ${summary.plotPoints.slice(0, 3).join('；')}`;
  }

  /**
   * 更新重要记忆
   */
  updateImportantMemories() {
    const veryImportant = this.context.filter(msg => msg.importance > 0.8);
    this.importantMemories = veryImportant.slice(-20); // 保留最近20个重要记忆
  }

  /**
   * 获取相关上下文
   */
  getRelevantContext(query, limit = 10) {
    const allContext = [...this.context, ...this.compressedContext];
    
    // 简单的相关性计算
    const scored = allContext.map(msg => {
      let relevance = 0;
      const queryWords = query.toLowerCase().split(/\s+/);
      const contentWords = msg.content.toLowerCase().split(/\s+/);
      
      queryWords.forEach(word => {
        if (contentWords.some(cWord => cWord.includes(word))) {
          relevance += 1;
        }
      });
      
      return {
        ...msg,
        relevance: relevance * msg.importance
      };
    });
    
    return scored
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  /**
   * 获取完整上下文
   */
  getContext() {
    return {
      recent: this.context.slice(-10),
      important: this.importantMemories,
      compressed: this.compressedContext.slice(-5),
      stats: {
        totalMessages: this.context.length,
        compressedSections: this.compressedContext.length,
        contextSize: this.getContextSize()
      }
    };
  }

  /**
   * 清空上下文
   */
  clearContext() {
    this.context = [];
    this.compressedContext = [];
    this.importantMemories = [];
  }

  /**
   * 导出上下文数据
   */
  export() {
    return {
      agentName: this.agentName,
      context: this.context,
      compressedContext: this.compressedContext,
      importantMemories: this.importantMemories,
      maxContextSize: this.maxContextSize
    };
  }

  /**
   * 导入上下文数据
   */
  import(data) {
    this.context = data.context || [];
    this.compressedContext = data.compressedContext || [];
    this.importantMemories = data.importantMemories || [];
    this.maxContextSize = data.maxContextSize || this.maxContextSize;
  }

  /**
   * 记录访问
   */
  recordAccess(messageId) {
    const message = this.context.find(msg => msg.id === messageId);
    if (message) {
      message.accessCount++;
      message.lastAccessed = new Date();
    }
  }
}

module.exports = ContextManager;