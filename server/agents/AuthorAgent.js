const BaseAgent = require('./BaseAgent');
const DeepSeekService = require('../services/DeepSeekService');
const SearchService = require('../services/SearchService');
const ContextManager = require('../utils/ContextManager');

class AuthorAgent extends BaseAgent {
  constructor(apiProvider = 'deepseek') {
    super('作家', 'author', '你是一位专业的小说作家，擅长创作引人入胜的故事情节和生动的人物形象。', apiProvider);
    this.contextManager = new ContextManager();
    this.searchService = new SearchService();
    this.writingContext = {
      characters: new Map(),
      plotPoints: [],
      worldBuilding: {},
      writingStyle: null
    };
  }

  /**
   * 设置当前小说项目
   */
  setCurrentNovel(novel) {
    this.currentNovel = novel;
    this.addToContext(`开始创作小说：${novel.title}，类型：${novel.genre}，主题：${novel.theme}`, 1.0);
  }

  /**
   * 与大纲编辑协作制定大纲
   */
  async collaborateOnOutline(outlineEditor, novelInfo) {
    console.log('🤝 开始与大纲编辑协作制定大纲...');
    this.setCurrentTask('制定大纲');
    
    try {
      // 发送初始创作想法给大纲编辑
      console.log('💭 生成初始创作想法...');
      const initialIdeas = await this.generateInitialIdeas(novelInfo);
      
      console.log('📤 向大纲编辑发送创作想法...');
      await this.communicateWith(outlineEditor, `我对《${novelInfo.title}》的初始创作想法：${initialIdeas}`);
      
      // 等待大纲编辑的反馈和建议
      console.log('💬 开始大纲讨论...');
      const outlineDiscussion = await this.discussOutline(outlineEditor, novelInfo);
      
      console.log('✅ 大纲协作完成');
      this.completeTask();
      return outlineDiscussion;
    } catch (error) {
      console.error('❌ 大纲协作失败:', error);
      throw error;
    }
  }

  /**
   * 生成初始创作想法
   */
  async generateInitialIdeas(novelInfo) {
    console.log('🎯 开始生成初始创作想法...');
    console.log('📖 小说信息:', {
      title: novelInfo.title,
      genre: novelInfo.genre,
      description: novelInfo.description
    });

    const prompt = `请为以下小说生成初始创作想法：
标题：${novelInfo.title}
类型：${novelInfo.genre}
主题：${novelInfo.theme || novelInfo.description}
描述：${novelInfo.description || ''}

请提供：
1. 主要角色设定（2-3个核心角色）
2. 基本故事背景和设定
3. 主要冲突和矛盾
4. 大致的故事走向
5. 预期的情感基调

要求简洁明了，重点突出。`;

    try {
      console.log('🤖 调用API生成创作想法...');
      const ideas = await this.apiService.generateText(prompt, {
        maxTokens: 1000,
        temperature: 0.8
      });

      console.log('✅ 初始创作想法生成成功');
      console.log('💡 生成的想法:', ideas.substring(0, 200) + '...');
      
      this.addToContext(`初始创作想法：${ideas}`, 0.9);
      return ideas;
    } catch (error) {
      console.error('❌ 生成初始想法失败:', error);
      const fallbackIdeas = `基于《${novelInfo.title}》的基本创作框架：
1. 主角设定：一个面临重大选择的角色
2. 故事背景：${novelInfo.genre}类型的世界观
3. 核心冲突：内心与外界的双重挑战
4. 故事走向：从困境到成长的转变过程
5. 情感基调：充满希望的成长故事`;
      
      console.log('🔄 使用备用创作想法');
      return fallbackIdeas;
    }
  }

  /**
   * 与大纲编辑讨论大纲
   */
  async discussOutline(outlineEditor, novelInfo) {
    console.log('💬 开始大纲讨论...');
    this.setCurrentTask('与大纲编辑讨论');
    
    const discussion = {
      participants: [this.name, outlineEditor.name],
      rounds: [],
      finalOutline: null
    };

    // 第一轮：大纲编辑提供结构建议
    console.log('📋 第一轮：获取结构建议...');
    const structureSuggestion = await outlineEditor.generateStructure(novelInfo);
    discussion.rounds.push({
      from: outlineEditor.name,
      content: structureSuggestion,
      timestamp: new Date()
    });

    // 第二轮：作者提供反馈和补充
    console.log('💭 第二轮：提供反馈...');
    const authorFeedback = await this.provideFeedbackOnStructure(structureSuggestion);
    discussion.rounds.push({
      from: this.name,
      content: authorFeedback,
      timestamp: new Date()
    });

    // 第三轮：确定最终大纲
    console.log('🎯 第三轮：确定最终大纲...');
    console.log('🔧 OutlineEditor API Service:', outlineEditor.apiService.constructor.name);
    console.log('🔑 OutlineEditor API Key存在:', !!outlineEditor.apiService.apiKey);
    
    try {
      const finalOutline = await outlineEditor.finalizePlot(authorFeedback, novelInfo);
      discussion.rounds.push({
        from: outlineEditor.name,
        content: finalOutline,
        timestamp: new Date()
      });

      discussion.finalOutline = finalOutline;
      this.plotOutline = finalOutline;
      this.addToContext(`最终大纲确定：${finalOutline}`, 1.0);

      console.log('✅ 大纲讨论完成');
      return discussion;
    } catch (error) {
      console.error('❌ 大纲讨论中的finalizePlot调用失败:', error);
      throw error;
    }
  }

  /**
   * 对结构建议提供反馈
   */
  async provideFeedbackOnStructure(structure) {
    const prompt = `作为小说作者，请对以下大纲结构提供反馈和补充建议：

${structure}

请从以下角度提供意见：
1. 情节的可行性和吸引力
2. 角色设定的合理性
3. 冲突设置是否足够有张力
4. 故事节奏是否合适
5. 需要补充或修改的地方

请给出具体的建议和理由。`;

    try {
      const response = await this.apiService.generateText(prompt, {
        systemPrompt: this.systemPrompt,
        maxTokens: 2000,
        temperature: 0.8
      });

      const feedback = response;
      this.addToContext(`对大纲结构的反馈：${feedback}`, 0.8);
      return feedback;
    } catch (error) {
      console.error('生成反馈失败:', error);
      return '暂时无法生成反馈，请稍后重试。';
    }
  }

  /**
   * 创作章节内容
   */
  async writeChapter(chapterNumber, chapterOutline) {
    this.setCurrentTask(`创作第${chapterNumber}章`);
    
    const context = this.getRelevantWritingContext();
    const prompt = this.buildChapterPrompt(chapterNumber, chapterOutline, context);
    
    try {
      const response = await this.apiService.generateText(prompt, {
        systemPrompt: this.systemPrompt,
        maxTokens: 3000,
        temperature: 0.8
      });

      const chapterContent = response;
      
      // 记录章节内容到上下文
      this.addToContext(`第${chapterNumber}章内容：${chapterContent}`, 0.9);
      
      // 更新角色信息
      this.updateCharacterInfo(chapterContent);
      
      this.completeTask();
      
      return {
        chapterNumber,
        title: this.extractChapterTitle(chapterContent),
        content: chapterContent,
        wordCount: chapterContent.length,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('创作章节失败:', error);
      this.completeTask();
      throw new Error('章节创作失败，请稍后重试');
    }
  }

  /**
   * 构建章节创作提示词
   */
  buildChapterPrompt(chapterNumber, chapterOutline, context) {
    let prompt = `请创作小说《${this.currentNovel?.title || '未命名'}》的第${chapterNumber}章。

章节大纲：
${chapterOutline}

`;

    if (context.previousChapters.length > 0) {
      prompt += `前面章节摘要：
${context.previousChapters.map(ch => `第${ch.number}章：${ch.summary}`).join('\n')}

`;
    }

    if (context.characters.size > 0) {
      prompt += `主要角色信息：
${Array.from(context.characters.entries()).map(([name, info]) => `${name}：${info}`).join('\n')}

`;
    }

    if (this.writingStyle.tone) {
      prompt += `写作风格要求：${this.writingStyle.tone}

`;
    }

    prompt += `创作要求：
1. 字数控制在1500-2500字
2. 保持与前面章节的连贯性
3. 注重人物对话和心理描写
4. 场景描写要生动具体
5. 推进主要情节发展
6. 保持适当的悬念和张力

请开始创作：`;

    return prompt;
  }

  /**
   * 获取相关写作上下文
   */
  getRelevantWritingContext() {
    const context = this.getContext();
    
    return {
      previousChapters: this.extractPreviousChapters(context),
      characters: this.characters,
      plotPoints: this.extractPlotPoints(context),
      writingStyle: this.writingStyle
    };
  }

  /**
   * 提取前面章节信息
   */
  extractPreviousChapters(context) {
    const chapters = [];
    context.recent.forEach(msg => {
      if (msg.content.includes('章内容：')) {
        const match = msg.content.match(/第(\d+)章内容：(.+)/);
        if (match) {
          chapters.push({
            number: parseInt(match[1]),
            summary: match[2].substring(0, 200) + '...'
          });
        }
      }
    });
    return chapters.slice(-3); // 只保留最近3章
  }

  /**
   * 提取情节要点
   */
  extractPlotPoints(context) {
    const plotPoints = [];
    context.important.forEach(msg => {
      if (msg.type === 'plot' || msg.content.includes('情节')) {
        plotPoints.push(msg.content);
      }
    });
    return plotPoints;
  }

  /**
   * 更新角色信息
   */
  updateCharacterInfo(chapterContent) {
    // 简单的角色信息提取
    const dialogueMatches = chapterContent.match(/"[^"]*"/g);
    if (dialogueMatches) {
      dialogueMatches.forEach(dialogue => {
        // 这里可以添加更复杂的角色分析逻辑
      });
    }
  }

  /**
   * 提取章节标题
   */
  extractChapterTitle(content) {
    const lines = content.split('\n');
    const firstLine = lines[0].trim();
    
    // 如果第一行看起来像标题，就使用它
    if (firstLine.length < 50 && !firstLine.includes('。')) {
      return firstLine;
    }
    
    return `第${this.getCurrentChapterNumber()}章`;
  }

  /**
   * 获取当前章节号
   */
  getCurrentChapterNumber() {
    const context = this.getContext();
    let maxChapter = 0;
    
    context.recent.forEach(msg => {
      const match = msg.content.match(/第(\d+)章/);
      if (match) {
        maxChapter = Math.max(maxChapter, parseInt(match[1]));
      }
    });
    
    return maxChapter + 1;
  }

  /**
   * 设置写作风格
   */
  setWritingStyle(style) {
    this.writingStyle = { ...this.writingStyle, ...style };
    this.addToContext(`写作风格更新：${JSON.stringify(style)}`, 0.7);
  }

  /**
   * 获取创作统计
   */
  getWritingStats() {
    const context = this.getContext();
    let totalChapters = 0;
    let totalWords = 0;
    
    context.recent.forEach(msg => {
      if (msg.content.includes('章内容：')) {
        totalChapters++;
        totalWords += msg.content.length;
      }
    });
    
    return {
      totalChapters,
      totalWords,
      averageWordsPerChapter: totalChapters > 0 ? Math.round(totalWords / totalChapters) : 0,
      currentNovel: this.currentNovel?.title || '无'
    };
  }

  /**
   * 搜索相关资料
   */
  async searchReference(query, type = 'general') {
    try {
      console.log(`[作者] 搜索资料: ${query} (类型: ${type})`);
      
      const results = await this.searchService.search(query, type, this.agentId);
      
      // 将搜索结果添加到上下文中
      this.contextManager.addMessage({
        role: 'system',
        content: `搜索结果 - ${query}: ${JSON.stringify(results.slice(0, 3))}`,
        type: 'search_result',
        metadata: {
          query,
          type,
          timestamp: new Date().toISOString()
        }
      });
      
      return results;
    } catch (error) {
      console.error('[作者] 搜索失败:', error);
      return [];
    }
  }

  /**
   * 基于搜索结果生成创作灵感
   */
  async generateInspirationFromSearch(searchResults, context = '') {
    try {
      const prompt = `基于以下搜索结果，为小说创作提供灵感和建议：

搜索结果：
${searchResults.map((result, index) => `${index + 1}. ${result.title}: ${result.content}`).join('\n')}

当前创作背景：${context}

请提供：
1. 可以融入故事的元素
2. 角色设定的灵感
3. 情节发展的建议
4. 场景描写的参考`;

      const response = await this.apiService.generateText(prompt, {
        systemPrompt: '你是一位经验丰富的小说作家，善于从各种资料中提取创作灵感。',
        maxTokens: 1000,
        temperature: 0.8
      });

      const inspiration = response;
      
      // 保存灵感到上下文
      this.contextManager.addMessage({
        role: 'assistant',
        content: inspiration,
        type: 'inspiration',
        metadata: {
          source: 'search_results',
          timestamp: new Date().toISOString()
        }
      });

      return inspiration;
    } catch (error) {
      console.error('[作者] 生成创作灵感失败:', error);
      return '暂时无法生成创作灵感，请稍后再试。';
    }
  }

  /**
   * 搜索角色相关资料
   */
  async searchCharacterReference(characterName, traits = []) {
    const queries = [
      `${characterName} 角色设定`,
      `${traits.join(' ')} 性格特征`,
      `${characterName} 人物原型`
    ];

    const searchPromises = queries.map(query => 
      this.searchReference(query, 'character')
    );

    const results = await Promise.all(searchPromises);
    return results.flat();
  }

  /**
   * 搜索情节相关资料
   */
  async searchPlotReference(plotType, genre = '') {
    const queries = [
      `${plotType} 情节结构`,
      `${genre} ${plotType} 故事模式`,
      `${plotType} 经典案例`
    ];

    const searchPromises = queries.map(query => 
      this.searchReference(query, 'plot')
    );

    const results = await Promise.all(searchPromises);
    return results.flat();
  }

  /**
   * 搜索世界观设定资料
   */
  async searchWorldBuildingReference(setting, period = '') {
    const queries = [
      `${setting} 世界观设定`,
      `${period} ${setting} 背景`,
      `${setting} 文化特征`
    ];

    const searchPromises = queries.map(query => 
      this.searchReference(query, 'setting')
    );

    const results = await Promise.all(searchPromises);
    return results.flat();
  }
}

module.exports = AuthorAgent;