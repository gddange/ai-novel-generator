const BaseAgent = require('./BaseAgent');

class StyleEditorAgent extends BaseAgent {
  constructor(apiProvider = 'deepseek') {
    super('润色编辑', 'style_editor', `你是一位专业的文字润色编辑，擅长文案优化和风格统一。你的职责包括：
1. 对作者创作的章节内容进行文案润色
2. 确保全文写作风格的一致性
3. 保持人物角色行为逻辑的统一性
4. 优化语言表达和文字流畅度
5. 修正语法错误和表达不当之处
6. 提升文章的可读性和艺术性

你的专业技能：
- 敏锐的语言感知能力
- 丰富的文学修辞技巧
- 严谨的逻辑思维
- 细致的校对能力
- 对不同文体风格的深度理解
- 角色一致性的把控能力`, apiProvider);
    
    this.establishedStyle = null;
    this.characterProfiles = new Map();
    this.styleGuidelines = new Map();
    this.consistencyRules = [];
    this.initializeStyleGuidelines();
  }

  /**
   * 初始化风格指导原则
   */
  initializeStyleGuidelines() {
    this.styleGuidelines.set('narrative', {
      name: '叙述风格',
      aspects: ['人称', '时态', '语调', '节奏'],
      rules: []
    });

    this.styleGuidelines.set('dialogue', {
      name: '对话风格',
      aspects: ['语言特色', '说话习惯', '情感表达', '个性化'],
      rules: []
    });

    this.styleGuidelines.set('description', {
      name: '描写风格',
      aspects: ['详细程度', '修辞手法', '感官描写', '氛围营造'],
      rules: []
    });
  }

  /**
   * 分析并建立文风基准
   */
  async establishStyleBaseline(initialChapters) {
    this.setCurrentTask('建立文风基准');
    
    const prompt = `请分析以下章节内容，建立文风基准：

${initialChapters.map(ch => `第${ch.number}章：\n${ch.content}`).join('\n\n')}

请分析并总结：
1. 整体叙述风格特点（人称、时态、语调等）
2. 对话风格特征（各角色的说话特点）
3. 描写风格偏好（详略程度、修辞手法等）
4. 情感表达方式
5. 文字节奏和韵律特点
6. 需要保持一致的关键要素

请提供详细的风格分析报告。`;

    try {
      const response = await this.apiService.generateText(prompt, {
        systemPrompt: this.systemPrompt,
        maxTokens: 1200,
        temperature: 0.5
      });

      const styleAnalysis = response;
      this.establishedStyle = this.parseStyleAnalysis(styleAnalysis);
      this.addToContext(`文风基准建立：${styleAnalysis}`, 1.0);
      this.completeTask();
      return styleAnalysis;
    } catch (error) {
      console.error('建立文风基准失败:', error);
      this.completeTask();
      return '暂时无法建立文风基准，请稍后重试。';
    }
  }

  /**
   * 解析风格分析结果
   */
  parseStyleAnalysis(analysis) {
    const style = {
      narrative: {},
      dialogue: {},
      description: {},
      characters: {},
      consistency: []
    };

    const lines = analysis.split('\n');
    let currentSection = null;

    lines.forEach(line => {
      line = line.trim();
      if (!line) return;

      if (line.includes('叙述') || line.includes('narrative')) {
        currentSection = 'narrative';
      } else if (line.includes('对话') || line.includes('dialogue')) {
        currentSection = 'dialogue';
      } else if (line.includes('描写') || line.includes('description')) {
        currentSection = 'description';
      } else if (line.includes('角色') || line.includes('character')) {
        currentSection = 'characters';
      } else if (currentSection && line.length > 10) {
        if (!style[currentSection].features) {
          style[currentSection].features = [];
        }
        style[currentSection].features.push(line);
      }
    });

    return style;
  }

  /**
   * 润色章节内容
   */
  async polishChapters(chapters) {
    this.setCurrentTask(`润色${chapters.length}个章节`);
    
    const polishedChapters = [];
    
    for (const chapter of chapters) {
      const polished = await this.polishSingleChapter(chapter);
      polishedChapters.push(polished);
    }
    
    this.completeTask();
    return polishedChapters;
  }

  /**
   * 润色单个章节
   */
  async polishSingleChapter(chapter) {
    const styleContext = this.getStyleContext();
    const characterContext = this.getCharacterContext();
    
    const prompt = `请对以下章节进行润色，确保风格一致性：

章节内容：
${chapter.content}

已建立的文风基准：
${JSON.stringify(this.establishedStyle, null, 2)}

角色一致性要求：
${Array.from(this.characterProfiles.entries()).map(([name, profile]) => 
  `${name}：${profile.traits?.join('、') || '待完善'}`
).join('\n')}

润色要求：
1. 保持与已建立文风的一致性
2. 确保角色对话符合其性格特点
3. 优化语言表达，提升流畅度
4. 修正语法错误和表达不当
5. 保持情节逻辑的连贯性
6. 增强文字的感染力和可读性

请提供润色后的完整章节内容：`;

    try {
      const response = await this.apiService.generateText(prompt, {
        systemPrompt: this.systemPrompt,
        maxTokens: 3000,
        temperature: 0.6
      });

      const polishedContent = response;
      
      // 更新角色档案
      this.updateCharacterProfiles(polishedContent);
      
      // 记录润色历史
      this.addToContext(`润色第${chapter.number}章：优化了语言表达和风格一致性`, 0.8);
      
      return {
        ...chapter,
        content: polishedContent,
        polishedAt: new Date(),
        changes: this.identifyChanges(chapter.content, polishedContent)
      };
    } catch (error) {
      console.error('润色章节失败:', error);
      return {
        ...chapter,
        error: '润色失败，请稍后重试'
      };
    }
  }

  /**
   * 识别修改内容
   */
  identifyChanges(original, polished) {
    const changes = {
      wordCount: {
        original: original.length,
        polished: polished.length,
        difference: polished.length - original.length
      },
      majorChanges: [],
      improvements: []
    };

    // 简单的变化检测
    if (Math.abs(changes.wordCount.difference) > original.length * 0.1) {
      changes.majorChanges.push('内容长度有显著变化');
    }

    // 这里可以添加更复杂的文本比较逻辑
    changes.improvements.push('语言表达优化', '风格一致性调整');

    return changes;
  }

  /**
   * 更新角色档案
   */
  updateCharacterProfiles(content) {
    // 提取对话和角色行为
    const dialogueMatches = content.match(/"([^"]+)"/g);
    const actionMatches = content.match(/(\w+)(说道?|想到?|做了?|去了?)/g);
    
    if (dialogueMatches || actionMatches) {
      // 简单的角色特征提取
      const characters = this.extractCharacterNames(content);
      characters.forEach(name => {
        if (!this.characterProfiles.has(name)) {
          this.characterProfiles.set(name, {
            name,
            traits: [],
            speechPatterns: [],
            behaviors: [],
            appearances: 0
          });
        }
        
        const profile = this.characterProfiles.get(name);
        profile.appearances++;
        this.characterProfiles.set(name, profile);
      });
    }
  }

  /**
   * 提取角色名称
   */
  extractCharacterNames(content) {
    // 简单的中文姓名提取
    const namePattern = /[\u4e00-\u9fa5]{2,4}(?=说|道|想|做|去|来|的|，|。)/g;
    const matches = content.match(namePattern) || [];
    
    // 过滤常见词汇，保留可能的人名
    const commonWords = ['这样', '那样', '什么', '怎么', '为什么', '因为', '所以', '但是', '然后', '现在', '刚才', '一直', '已经', '正在'];
    return [...new Set(matches.filter(name => 
      name.length >= 2 && 
      !commonWords.includes(name) &&
      !/\d/.test(name)
    ))];
  }

  /**
   * 检查风格一致性
   */
  async checkStyleConsistency(chapters) {
    this.setCurrentTask('检查风格一致性');
    
    const prompt = `请检查以下章节的风格一致性：

已建立的文风基准：
${JSON.stringify(this.establishedStyle, null, 2)}

待检查章节：
${chapters.map(ch => `第${ch.number}章摘要：${ch.content.substring(0, 300)}...`).join('\n\n')}

请检查：
1. 叙述风格是否保持一致
2. 角色对话是否符合各自特点
3. 描写风格是否统一
4. 情感表达方式是否协调
5. 文字节奏是否和谐
6. 发现的不一致之处及建议

请提供详细的一致性检查报告。`;

    try {
      const response = await this.apiService.generateText(prompt, {
        systemPrompt: this.systemPrompt,
        maxTokens: 1500,
        temperature: 0.7
      });

      const feedback = response;
      this.addToContext(`风格一致性检查：${feedback}`, 0.7);
      this.completeTask();
      return feedback;
    } catch (error) {
      console.error('检查风格一致性失败:', error);
      this.completeTask();
      return '暂时无法完成一致性检查，请稍后重试。';
    }
  }

  /**
   * 生成润色报告
   */
  generatePolishReport(originalChapters, polishedChapters) {
    const report = {
      summary: {
        totalChapters: polishedChapters.length,
        totalChanges: 0,
        averageImprovement: 0
      },
      chapters: [],
      styleConsistency: this.establishedStyle ? '已建立' : '待建立',
      characterProfiles: Array.from(this.characterProfiles.entries()).map(([name, profile]) => ({
        name,
        appearances: profile.appearances,
        traits: profile.traits.length
      })),
      recommendations: []
    };

    polishedChapters.forEach((polished, index) => {
      const original = originalChapters[index];
      const chapterReport = {
        number: polished.number,
        title: polished.title,
        changes: polished.changes || {},
        improvements: polished.changes?.improvements || []
      };
      
      report.chapters.push(chapterReport);
      if (polished.changes) {
        report.summary.totalChanges += polished.changes.improvements?.length || 0;
      }
    });

    report.summary.averageImprovement = report.summary.totalChanges / polishedChapters.length;

    // 生成建议
    if (!this.establishedStyle) {
      report.recommendations.push('建议先建立文风基准');
    }
    if (this.characterProfiles.size < 3) {
      report.recommendations.push('建议完善主要角色档案');
    }

    return report;
  }

  /**
   * 获取风格上下文
   */
  getStyleContext() {
    return {
      establishedStyle: this.establishedStyle,
      guidelines: Array.from(this.styleGuidelines.entries()),
      consistencyRules: this.consistencyRules
    };
  }

  /**
   * 获取角色上下文
   */
  getCharacterContext() {
    return {
      profiles: Array.from(this.characterProfiles.entries()),
      totalCharacters: this.characterProfiles.size
    };
  }

  /**
   * 获取润色统计
   */
  getPolishStats() {
    const context = this.getContext();
    let polishedChapters = 0;
    let totalImprovements = 0;

    context.recent.forEach(msg => {
      if (msg.content.includes('润色第') && msg.content.includes('章')) {
        polishedChapters++;
      }
      if (msg.content.includes('优化了')) {
        totalImprovements++;
      }
    });

    return {
      polishedChapters,
      totalImprovements,
      characterProfiles: this.characterProfiles.size,
      styleEstablished: !!this.establishedStyle,
      averageImprovementsPerChapter: polishedChapters > 0 ? totalImprovements / polishedChapters : 0
    };
  }

  /**
   * 重置风格设置
   */
  resetStyle() {
    this.establishedStyle = null;
    this.characterProfiles.clear();
    this.consistencyRules = [];
    this.addToContext('重置了风格设置和角色档案', 0.5);
  }
}

module.exports = StyleEditorAgent;