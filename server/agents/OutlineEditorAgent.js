const BaseAgent = require('./BaseAgent');
const DeepSeekService = require('../services/DeepSeekService');
const fs = require('fs-extra');
const path = require('path');
const ContextManager = require('../utils/ContextManager');
const SearchService = require('../services/SearchService');

class OutlineEditorAgent extends BaseAgent {
  constructor(apiProvider = 'deepseek') {
    super('大纲编辑', 'outline_editor', '你是一位专业的故事大纲编辑，擅长构建完整的故事结构和情节发展。', apiProvider);
    this.contextManager = new ContextManager();
    this.searchService = new SearchService();
    this.outlineData = {
      theme: '',
      genre: '',
      mainPlot: '',
      subPlots: [],
      characters: [],
      chapters: [],
      worldBuilding: {}
    };
    
    this.currentOutline = null;
    this.storyStructures = new Map();
    this.plotTemplates = new Map();
    this.initializeTemplates();
  }

  /**
   * 初始化故事模板
   */
  initializeTemplates() {
    // 三幕式结构
    this.storyStructures.set('three_act', {
      name: '三幕式结构',
      acts: [
        { name: '第一幕：建立', percentage: 25, description: '介绍角色、背景、建立冲突' },
        { name: '第二幕：对抗', percentage: 50, description: '发展冲突、角色成长、情节推进' },
        { name: '第三幕：解决', percentage: 25, description: '高潮、解决冲突、结局' }
      ]
    });

    // 英雄之旅
    this.storyStructures.set('hero_journey', {
      name: '英雄之旅',
      stages: [
        '平凡世界', '冒险召唤', '拒绝召唤', '遇见导师', '跨越第一道门槛',
        '试炼、盟友、敌人', '接近洞穴最深处', '磨难', '奖赏', '归途',
        '复活', '带着仙丹妙药归来'
      ]
    });

    // 类型模板
    this.plotTemplates.set('romance', {
      keyElements: ['相遇', '吸引', '障碍', '分离', '重聚', '承诺'],
      commonConflicts: ['误会', '身份差异', '外部阻力', '内心恐惧']
    });

    this.plotTemplates.set('mystery', {
      keyElements: ['案件发生', '调查开始', '线索收集', '红鲱鱼', '真相揭露', '结案'],
      commonConflicts: ['隐藏真相', '时间压力', '危险威胁', '道德选择']
    });
  }

  /**
   * 生成故事结构建议
   */
  async generateStructure(novelInfo) {
    console.log('📋 开始生成故事结构建议...');
    this.setCurrentTask('生成故事结构');
    
    const prompt = `请为以下小说设计详细的故事结构：

小说信息：
标题：${novelInfo.title}
类型：${novelInfo.genre}
主题：${novelInfo.theme}
描述：${novelInfo.description || ''}

请提供：
1. 推荐的故事结构类型（三幕式、英雄之旅等）
2. 详细的章节安排（建议15-20章）
3. 每章的主要情节要点
4. 主要角色的成长弧线
5. 关键转折点和高潮设置
6. 支线情节的安排

要求结构清晰，逻辑合理，符合该类型小说的特点。`;

    try {
      console.log('🤖 调用API生成故事结构...');
      console.log('🔧 API Service类型:', this.apiService.constructor.name);
      console.log('🔑 API Key存在:', !!this.apiService.apiKey);
      console.log('🌐 Base URL:', this.apiService.baseURL);
      
      const structure = await this.apiService.generateText(prompt, {
        maxTokens: 1500,
        temperature: 0.7
      });

      console.log('✅ 故事结构生成成功');
      console.log('📋 生成的结构:', structure.substring(0, 200) + '...');
      
      this.addToContext(`故事结构建议：${structure}`, 1.0);
      this.completeTask();
      return structure;
    } catch (error) {
      console.error('❌ 生成故事结构失败:', error);
      console.error('❌ 错误详情:', {
        message: error.message,
        stack: error.stack,
        apiService: this.apiService.constructor.name,
        hasApiKey: !!this.apiService.apiKey
      });
      this.completeTask();
      const fallbackStructure = `《${novelInfo.title}》基本结构框架：
1. 开篇设定（1-3章）：介绍主角和世界观
2. 冲突引入（4-6章）：主要矛盾出现
3. 发展阶段（7-12章）：情节推进和角色成长
4. 高潮部分（13-15章）：核心冲突爆发
5. 结局收尾（16-18章）：问题解决和结局`;
      
      console.log('🔄 使用备用故事结构');
      return fallbackStructure;
    }
  }

  /**
   * 确定最终情节大纲
   */
  async finalizePlot(authorFeedback, novelInfo) {
    console.log('📝 开始确定最终情节大纲...');
    this.setCurrentTask('确定最终大纲');
    
    const prompt = `基于作者的反馈，请制定最终的小说大纲：

小说信息：
${JSON.stringify(novelInfo, null, 2)}

作者反馈：
${authorFeedback}

请提供最终的详细大纲，包括：
1. 完整的章节列表（每章标题和主要内容）
2. 主要角色介绍和关系图
3. 核心冲突和解决方案
4. 重要情节转折点
5. 故事的情感基调和主题表达
6. 预期的读者体验

确保大纲既有创意又具有可执行性。`;

    try {
      console.log('🤖 调用API制定最终大纲...');
      console.log('🔧 API Service类型:', this.apiService.constructor.name);
      console.log('🔑 API Key存在:', !!this.apiService.apiKey);
      console.log('🌐 Base URL:', this.apiService.baseURL);
      
      const finalOutline = await this.apiService.generateText(prompt, {
        maxTokens: 2000,
        temperature: 0.6
      });

      console.log('✅ 最终大纲制定成功');
      console.log('📝 大纲内容:', finalOutline.substring(0, 300) + '...');
      
      this.currentOutline = this.parseOutline(finalOutline);
      this.addToContext(`最终大纲：${finalOutline}`, 1.0);
      this.completeTask();
      return finalOutline;
    } catch (error) {
      console.error('❌ 确定最终大纲失败:', error);
      console.error('❌ 错误详情:', {
        message: error.message,
        stack: error.stack,
        apiService: this.apiService.constructor.name,
        hasApiKey: !!this.apiService.apiKey
      });
      this.completeTask();
      throw new Error('大纲制定失败，请稍后重试');
    }
  }

  /**
   * 解析大纲内容
   */
  parseOutline(outlineText) {
    const outline = {
      chapters: [],
      characters: [],
      plotPoints: [],
      themes: []
    };

    const lines = outlineText.split('\n');
    let currentSection = null;

    lines.forEach(line => {
      line = line.trim();
      if (!line) return;

      // 识别章节
      const chapterMatch = line.match(/第?(\d+)章[：:]\s*(.+)/);
      if (chapterMatch) {
        outline.chapters.push({
          number: parseInt(chapterMatch[1]),
          title: chapterMatch[2],
          content: ''
        });
        return;
      }

      // 识别角色
      if (line.includes('角色') || line.includes('人物')) {
        currentSection = 'characters';
        return;
      }

      // 识别情节点
      if (line.includes('情节') || line.includes('转折')) {
        currentSection = 'plotPoints';
        return;
      }

      // 识别主题
      if (line.includes('主题') || line.includes('思想')) {
        currentSection = 'themes';
        return;
      }

      // 根据当前部分添加内容
      if (currentSection && line.length > 5) {
        outline[currentSection].push(line);
      }
    });

    return outline;
  }

  /**
   * 获取章节大纲
   */
  getChapterOutline(chapterNumber) {
    if (!this.currentOutline) {
      return null;
    }

    const chapter = this.currentOutline.chapters.find(ch => ch.number === chapterNumber);
    if (!chapter) {
      return null;
    }

    return {
      number: chapter.number,
      title: chapter.title,
      outline: chapter.content,
      plotPoints: this.getRelevantPlotPoints(chapterNumber),
      characters: this.getActiveCharacters(chapterNumber)
    };
  }

  /**
   * 获取相关情节点
   */
  getRelevantPlotPoints(chapterNumber) {
    if (!this.currentOutline) return [];
    
    // 简单的情节点分配逻辑
    const totalChapters = this.currentOutline.chapters.length;
    const plotPoints = this.currentOutline.plotPoints;
    const pointsPerChapter = Math.ceil(plotPoints.length / totalChapters);
    
    const startIndex = (chapterNumber - 1) * pointsPerChapter;
    const endIndex = Math.min(startIndex + pointsPerChapter, plotPoints.length);
    
    return plotPoints.slice(startIndex, endIndex);
  }

  /**
   * 获取活跃角色
   */
  getActiveCharacters(chapterNumber) {
    if (!this.currentOutline) return [];
    
    // 这里可以根据章节内容智能判断哪些角色会出现
    // 目前返回所有主要角色
    return this.currentOutline.characters.slice(0, 3);
  }

  /**
   * 监督创作进度
   */
  async reviewProgress(completedChapters) {
    this.setCurrentTask('审查创作进度');
    
    const prompt = `请审查当前小说的创作进度：

已完成章节：${completedChapters.length}章
总计划章节：${this.currentOutline?.chapters.length || '未知'}章

最近完成的章节摘要：
${completedChapters.slice(-3).map(ch => `第${ch.number}章：${ch.title}\n${ch.content.substring(0, 200)}...`).join('\n\n')}

请评估：
1. 当前进度是否符合大纲规划
2. 故事发展是否偏离主线
3. 角色发展是否合理
4. 情节节奏是否适当
5. 需要调整的地方
6. 对后续章节的建议

请给出专业的编辑意见。`;

    try {
      const response = await this.apiService.generateText(prompt, {
        systemPrompt: this.systemPrompt,
        maxTokens: 1000,
        temperature: 0.6
      });

      this.addToContext(`进度审查：${response}`, 0.8);
      this.completeTask();
      return response;
    } catch (error) {
      console.error('审查进度失败:', error);
      this.completeTask();
      return '暂时无法完成进度审查，请稍后重试。';
    }
  }

  /**
   * 提供情节建议
   */
  async suggestPlotDevelopment(currentChapter, context) {
    const prompt = `基于当前创作情况，请为下一章节提供情节发展建议：

当前章节：第${currentChapter}章
故事背景：${context.background || ''}
主要角色：${context.characters?.join('、') || ''}
当前情节状态：${context.currentPlot || ''}

请建议：
1. 下一章的主要情节发展方向
2. 可能的冲突和转折
3. 角色互动和成长机会
4. 情感张力的营造
5. 与整体大纲的衔接

要求建议具体可行，符合故事逻辑。`;

    try {
      const response = await this.apiService.generateText(prompt, {
        systemPrompt: this.systemPrompt,
        maxTokens: 2000,
        temperature: 0.6
      });

      const suggestions = response;
      this.addToContext(`情节建议：${suggestions}`, 0.7);
      return suggestions;
    } catch (error) {
      console.error('生成情节建议失败:', error);
      return '暂时无法生成情节建议，请稍后重试。';
    }
  }

  /**
   * 获取大纲统计信息
   */
  getOutlineStats() {
    if (!this.currentOutline) {
      return {
        totalChapters: 0,
        totalCharacters: 0,
        totalPlotPoints: 0,
        completionRate: 0
      };
    }

    return {
      totalChapters: this.currentOutline.chapters.length,
      totalCharacters: this.currentOutline.characters.length,
      totalPlotPoints: this.currentOutline.plotPoints.length,
      themes: this.currentOutline.themes.length,
      structure: this.identifyStructureType()
    };
  }

  /**
   * 识别故事结构类型
   */
  identifyStructureType() {
    if (!this.currentOutline) return '未知';
    
    const chapterCount = this.currentOutline.chapters.length;
    
    if (chapterCount >= 15 && chapterCount <= 25) {
      return '长篇小说结构';
    } else if (chapterCount >= 8 && chapterCount <= 15) {
      return '中篇小说结构';
    } else if (chapterCount <= 8) {
      return '短篇小说结构';
    }
    
    return '自定义结构';
  }

  /**
   * 导出大纲
   */
  exportOutline() {
    return {
      outline: this.currentOutline,
      stats: this.getOutlineStats(),
      context: this.getContext(),
      createdAt: new Date()
    };
  }

  /**
   * 导入大纲
   */
  importOutline(outlineData) {
    this.currentOutline = outlineData.outline;
    if (outlineData.context) {
      this.contextManager.import(outlineData.context);
    }
  }

  /**
   * 搜索故事结构相关资料
   */
  async searchStoryStructure(genre, theme) {
      try {
          console.log(`[大纲编辑] 搜索故事结构: ${genre} - ${theme}`);
          
          const queries = [
              `${genre} 小说结构模式`,
              `${theme} 故事大纲`,
              `${genre} 经典情节结构`,
              `三幕式结构 ${genre}`
          ];
  
          const searchPromises = queries.map(query => 
              this.searchService.search(query, 'plot', this.agentId)
          );
  
          const results = await Promise.all(searchPromises);
          const flatResults = results.flat();
  
          // 将搜索结果添加到上下文
          this.contextManager.addMessage({
              role: 'system',
              content: `故事结构搜索结果: ${JSON.stringify(flatResults.slice(0, 5))}`,
              type: 'search_result',
              metadata: {
                  queries,
                  type: 'story_structure',
                  timestamp: new Date().toISOString()
              }
          });
  
          return flatResults;
      } catch (error) {
          console.error('[大纲编辑] 搜索故事结构失败:', error);
          return [];
      }
  }
  
  /**
   * 搜索角色原型和关系设定
   */
  async searchCharacterArchetypes(characterTypes = []) {
      try {
          console.log(`[大纲编辑] 搜索角色原型:`, characterTypes);
          
          const queries = [
              '经典角色原型',
              '主角配角关系设定',
              ...characterTypes.map(type => `${type} 角色设定`),
              '角色成长弧线设计'
          ];
  
          const searchPromises = queries.map(query => 
              this.searchService.search(query, 'character', this.agentId)
          );
  
          const results = await Promise.all(searchPromises);
          return results.flat();
      } catch (error) {
          console.error('[大纲编辑] 搜索角色原型失败:', error);
          return [];
      }
  }
  
  /**
   * 搜索世界观和背景设定
   */
  async searchWorldBuilding(setting, period = '', genre = '') {
      try {
          console.log(`[大纲编辑] 搜索世界观设定: ${setting} - ${period} - ${genre}`);
          
          const queries = [
              `${setting} 世界观设定`,
              `${period} ${setting} 历史背景`,
              `${genre} 世界构建`,
              `${setting} 文化特征`
          ].filter(query => query.trim() !== '');
  
          const searchPromises = queries.map(query => 
              this.searchService.search(query, 'setting', this.agentId)
          );
  
          const results = await Promise.all(searchPromises);
          return results.flat();
      } catch (error) {
          console.error('[大纲编辑] 搜索世界观设定失败:', error);
          return [];
      }
  }
  
  /**
   * 基于搜索结果生成大纲建议
   */
  async generateOutlineSuggestions(searchResults, theme, genre) {
      try {
          const prompt = `基于以下搜索结果，为${genre}类型的"${theme}"主题小说生成大纲建议：
  
          搜索结果：
          ${searchResults.map((result, index) => `${index + 1}. ${result.title}: ${result.content}`).join('\n')}
  
          请提供：
          1. 故事整体结构建议
          2. 主要情节线设计
          3. 关键转折点安排
          4. 角色关系网络
          5. 章节划分建议
          6. 冲突设置方案`;
  
          const response = await this.apiService.generateText(prompt, {
              systemPrompt: '你是一位专业的小说大纲编辑，善于结构设计和情节规划。',
              maxTokens: 1500,
              temperature: 0.7
          });
  
          const suggestions = response;
          
          // 保存建议到上下文
          this.contextManager.addMessage({
              role: 'assistant',
              content: suggestions,
              type: 'outline_suggestions',
              metadata: {
                  theme,
                  genre,
                  source: 'search_results',
                  timestamp: new Date().toISOString()
              }
          });
  
          return suggestions;
      } catch (error) {
          console.error('[大纲编辑] 生成大纲建议失败:', error);
          return '暂时无法生成大纲建议，请稍后再试。';
      }
  }
  
  /**
   * 搜索情节发展模式
   */
  async searchPlotPatterns(plotType, conflict = '') {
      try {
          const queries = [
              `${plotType} 情节发展模式`,
              `${conflict} 冲突设计`,
              `${plotType} 经典案例分析`,
              '情节转折点设计'
          ].filter(query => query.trim() !== '');
  
          const searchPromises = queries.map(query => 
              this.searchService.search(query, 'plot', this.agentId)
          );
  
          const results = await Promise.all(searchPromises);
          return results.flat();
      } catch (error) {
          console.error('[大纲编辑] 搜索情节模式失败:', error);
          return [];
      }
  }
  
  /**
   * 综合搜索和分析
   */
  async comprehensiveResearch(theme, genre, additionalKeywords = []) {
      try {
          console.log(`[大纲编辑] 开始综合研究: ${theme} - ${genre}`);
          
          // 并行搜索多个方面
          const [
              structureResults,
              characterResults,
              worldResults,
              plotResults
          ] = await Promise.all([
              this.searchStoryStructure(genre, theme),
              this.searchCharacterArchetypes(['主角', '反派', '配角']),
              this.searchWorldBuilding(theme, '', genre),
              this.searchPlotPatterns('主线情节', '核心冲突')
          ]);
  
          // 如果有额外关键词，也进行搜索
          let additionalResults = [];
          if (additionalKeywords.length > 0) {
              const additionalPromises = additionalKeywords.map(keyword => 
                  this.searchService.search(keyword, 'general', this.agentId)
              );
              const additionalSearchResults = await Promise.all(additionalPromises);
              additionalResults = additionalSearchResults.flat();
          }
  
          const allResults = [
              ...structureResults,
              ...characterResults,
              ...worldResults,
              ...plotResults,
              ...additionalResults
          ];
  
          // 生成综合分析报告
          const analysis = await this.generateOutlineSuggestions(allResults, theme, genre);
  
          return {
              searchResults: {
                  structure: structureResults,
                  characters: characterResults,
                  worldBuilding: worldResults,
                  plot: plotResults,
                  additional: additionalResults
              },
              analysis,
              totalResults: allResults.length
          };
      } catch (error) {
          console.error('[大纲编辑] 综合研究失败:', error);
          return {
              searchResults: {},
              analysis: '综合研究失败，请稍后再试。',
              totalResults: 0
          };
      }
  }
}

module.exports = OutlineEditorAgent;