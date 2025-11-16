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
      if (!this.isFallbackEnabled()) {
        throw error;
      }
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

    // 如果没有API Key，直接使用离线fallback，避免抛错中断流程
    if (!this.apiService.apiKey) {
      if (!this.isFallbackEnabled()) {
        this.completeTask();
        throw new Error('缺少API Key，已禁用兜底模式');
      }
      console.warn('⚠️ 无API Key，使用离线fallback大纲');
      const fallbackOutline = `最终大纲（离线生成）：\n标题：${novelInfo.title}\n类型：${novelInfo.genre}\n主题：${novelInfo.theme || novelInfo.description || ''}\n\n作者反馈摘要：${(authorFeedback || '').substring(0, 300)}...\n\n第1-3章：开篇设定与人物登场\n- 介绍主角与世界观设定\n- 埋下核心冲突伏笔\n\n第4-6章：冲突引入与第一次转折\n- 冲突显现，主角做出关键选择\n- 第一次明显的情节转折\n\n第7-12章：推进发展与角色成长\n- 推进主线任务，加深矛盾与复杂度\n- 角色关系发展与成长节点\n\n第13-15章：高潮与对抗\n- 核心冲突爆发，正面对抗\n- 关键牺牲与转机\n\n第16-18章：收尾与解决\n- 冲突解决与余波处理\n- 角色命运与主题落点\n\n主要角色\n- 主角：待定\n- 重要配角：待定\n\n情节要点\n- 开端遭遇\n- 中段挫败\n- 最终逆转`;
      this.currentOutline = this.parseOutline(fallbackOutline);
      this.addToContext(`最终大纲（fallback）：${fallbackOutline}`, 0.9);
      // 初始化角色人设与词典
      this.currentOutline.characterProfiles = await this.buildCharacterProfiles(novelInfo);
      this.currentOutline.characterLexicon = await this.buildCharacterLexiconFromOutline();
      this.completeTask();
      return fallbackOutline;
    }

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
      // 新增：构建主要角色人设文档与角色词典记忆，保存到currentOutline
      this.currentOutline.characterProfiles = await this.buildCharacterProfiles(novelInfo);
      this.currentOutline.characterLexicon = await this.buildCharacterLexiconFromOutline();
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
      if (!this.isFallbackEnabled()) {
        this.completeTask();
        throw error;
      }
      // API失败时使用离线fallback，保障流程可继续
      const fallbackOutline = `最终大纲（离线生成）：\n标题：${novelInfo.title}\n类型：${novelInfo.genre}\n主题：${novelInfo.theme || novelInfo.description || ''}\n\n作者反馈摘要：${(authorFeedback || '').substring(0, 300)}...\n\n第1-3章：开篇设定与人物登场\n- 介绍主角与世界观设定\n- 埋下核心冲突伏笔\n\n第4-6章：冲突引入与第一次转折\n- 冲突显现，主角做出关键选择\n- 第一次明显的情节转折\n\n第7-12章：推进发展与角色成长\n- 推进主线任务，加深矛盾与复杂度\n- 角色关系发展与成长节点\n\n第13-15章：高潮与对抗\n- 核心冲突爆发，正面对抗\n- 关键牺牲与转机\n\n第16-18章：收尾与解决\n- 冲突解决与余波处理\n- 角色命运与主题落点\n\n主要角色\n- 主角：待定\n- 重要配角：待定\n\n情节要点\n- 开端遭遇\n- 中段挫败\n- 最终逆转`;
      this.currentOutline = this.parseOutline(fallbackOutline);
      // 新增：构建主要角色人设文档与角色词典记忆，保存到currentOutline
      this.currentOutline.characterProfiles = await this.buildCharacterProfiles(novelInfo);
      this.currentOutline.characterLexicon = await this.buildCharacterLexiconFromOutline();
      this.addToContext(`最终大纲（fallback）：${fallbackOutline}`, 0.9);
      this.completeTask();
      return fallbackOutline;
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
    let currentChapter = null;
    let currentChapters = null; // 支持范围章节（如第17-19章）

    lines.forEach(line => {
      line = line.trim();
      if (!line) return;

      // 先识别范围章节：第x-y章：标题
      const rangeMatch = line.match(/第\s*(\d+)\s*[-–—至]\s*(\d+)\s*章[：:]\s*(.+)/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        const baseTitle = rangeMatch[3];
        currentChapters = [];
        currentChapter = null;

        for (let n = start; n <= end; n++) {
          const chObj = {
            number: n,
            title: `第${n}章：${baseTitle}`,
            content: '',
            outline: baseTitle
          };
          outline.chapters.push(chObj);
          currentChapters.push(chObj);
        }
        currentSection = 'chapter';
        return;
      }

      // 单一章节：第x章：标题 或 Chapter x: 标题
      const chapterMatch = line.match(/第?(\d+)章[：:]\s*(.+)/) || 
                           line.match(/Chapter\s+(\d+)[：:]?\s*(.+)/) ||
                           line.match(/第(\d+)章\s+(.+)/);
      // 注意：移除 (\d+)\.\s*(.+) 的匹配，避免列表序号误判为章节
      if (chapterMatch) {
        currentChapters = null;
        currentChapter = {
          number: parseInt(chapterMatch[1], 10),
          title: chapterMatch[2],
          content: '',
          outline: chapterMatch[2]
        };
        outline.chapters.push(currentChapter);
        currentSection = 'chapter';
        return;
      }

      // 如果在章节内容中，添加到当前章节（支持范围章节）
      if (currentSection === 'chapter' && line.length > 5) {
        if (currentChapters && currentChapters.length > 0) {
          currentChapters.forEach(ch => {
            ch.content = ch.content ? ch.content + '\n' + line : line;
            ch.outline = ch.outline === (ch.title.split('：')[1] || ch.outline)
              ? line
              : ch.outline + '\n' + line;
          });
          return;
        }
        if (currentChapter) {
          currentChapter.content = currentChapter.content ? currentChapter.content + '\n' + line : line;
          currentChapter.outline = currentChapter.outline === currentChapter.title
            ? line
            : currentChapter.outline + '\n' + line;
          return;
        }
      }

      // 识别角色
      if (line.includes('角色') || line.includes('人物') || line.includes('主要角色')) {
        currentSection = 'characters';
        currentChapter = null;
        currentChapters = null;
        return;
      }

      // 识别情节点
      if (line.includes('情节') || line.includes('转折') || line.includes('剧情')) {
        currentSection = 'plotPoints';
        currentChapter = null;
        currentChapters = null;
        return;
      }

      // 识别主题
      if (line.includes('主题') || line.includes('思想') || line.includes('核心思想')) {
        currentSection = 'themes';
        currentChapter = null;
        currentChapters = null;
        return;
      }

      // 根据当前部分添加内容
      if (currentSection && currentSection !== 'chapter' && line.length > 5) {
        outline[currentSection].push(line);
      }
    });

    // 去重并按章节号排序，避免重复编号（如误判导致的1,1,2...）
    if (outline.chapters.length > 0) {
      const uniqueMap = new Map();
      outline.chapters.forEach(ch => {
        if (uniqueMap.has(ch.number)) {
          const exist = uniqueMap.get(ch.number);
          if (ch.outline && ch.outline !== exist.outline) {
            exist.outline = exist.outline ? exist.outline + '\n' + ch.outline : ch.outline;
          }
          if (ch.content && ch.content !== exist.content) {
            exist.content = exist.content ? exist.content + '\n' + ch.content : ch.content;
          }
        } else {
          uniqueMap.set(ch.number, ch);
        }
      });
      outline.chapters = Array.from(uniqueMap.values()).sort((a, b) => a.number - b.number);
    }

    // 如果没有解析到章节，使用默认占位章节
    if (outline.chapters.length === 0) {
      const chapterCount = 18;
      for (let i = 1; i <= chapterCount; i++) {
        outline.chapters.push({
          number: i,
          title: `第${i}章`,
          content: `第${i}章内容`,
          outline: `第${i}章大纲`
        });
      }
    }

    console.log(`解析大纲完成，共${outline.chapters.length}章`);
    return outline;
  }

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
      outline: chapter.outline || chapter.content, // 使用outline字段，保持与解析一致
      plotPoints: this.getRelevantPlotPoints(chapterNumber),
      characters: this.getActiveCharacters(chapterNumber),
      // 新增：为本章提供已筛选的人设文档
      characterProfiles: this.getChapterCharacterProfiles(chapterNumber),
      // 新增：为本章提供已筛选的角色词典记忆
      characterLexicon: this.getChapterLexicon(chapterNumber)
    };
  }

  // 新增：根据章节大纲文本粗略提取情节要点
  getRelevantPlotPoints(chapterNumber) {
    const chapter = this.currentOutline?.chapters?.find(ch => ch.number === chapterNumber);
    if (!chapter) return [];
    const text = String(chapter.outline || chapter.content || '');
    const sentences = text.split(/[。！？!?；;、\n]/).map(s => s.trim()).filter(Boolean);
    // 取前3-4条作为要点，简单去重
    return Array.from(new Set(sentences)).slice(0, 4);
  }

  getActiveCharacters(chapterNumber) {
    if (!this.currentOutline) return [];
    const chapter = this.currentOutline.chapters.find(ch => ch.number === chapterNumber);
    if (!chapter) return [];
    const text = String(chapter.outline || chapter.content || '');

    // 优先根据人设中出现的名字匹配本章大纲文本
    const profileNames = Object.keys(this.currentOutline.characterProfiles || {});
    const hits = profileNames.filter(name => name && text.includes(name));

    if (hits.length > 0) {
      return Array.from(new Set(hits)).slice(0, 4);
    }

    // 退化策略：从解析到的角色列表中取前几个名字
    const base = (this.currentOutline.characters || [])
      .map(line => this.extractCharacterName(line))
      .filter(Boolean);

    return Array.from(new Set(base)).slice(0, 3);
  }

  // 新增：构建主要角色人设文档（API优先，失败走离线生成）
  async buildCharacterProfiles(novelInfo) {
    const rawNames = Array.isArray(this.currentOutline?.characters) ? this.currentOutline.characters : [];
    const names = rawNames.map(line => this.extractCharacterName(line)).filter(Boolean);
    const baseNames = names.length > 0 ? names.slice(0, 5) : ['主角', '搭档', '对手', '导师', '重要配角'];
    const uniqNames = Array.from(new Set(baseNames));

    const schemaHint = {
      fields: ['name','role','function','personality','motivations','goals','relationships','conflicts','speechStyle','arc','tags']
    };

    // 尝试使用API生成结构化人设
    if (this.apiService?.apiKey) {
      const prompt = `请基于以下小说信息与当前大纲，生成主要角色的人设文档（JSON数组，每个对象必须包含：name, role, function, personality(数组), motivations, goals, relationships, conflicts, speechStyle, arc, tags(数组)）：\n\n小说信息：\n${JSON.stringify(novelInfo, null, 2)}\n\n主要角色候选：${uniqNames.join('、')}\n\n当前大纲摘要（前400字）：\n${(this.currentOutline?.chapters?.map(ch=>ch.outline).join('\n')||'').substring(0,400)}\n\n请严格输出合法JSON，仅包含数组本体，不要额外文字。`;
      try {
        const raw = await this.apiService.generateText(prompt, { maxTokens: 1200, temperature: 0.4 });
        const jsonText = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '');
        const arr = JSON.parse(jsonText);
        const profiles = {};
        arr.forEach(p => { if (p && p.name) profiles[p.name] = p; });
        if (Object.keys(profiles).length > 0) return profiles;
      } catch (e) {
        console.warn('角色人设API生成失败，使用离线构建:', e.message);
      }
    }

    // 离线构建人设
    const profiles = {};
    const genre = novelInfo.genre || '';
    const theme = novelInfo.theme || novelInfo.description || '';
    const defaults = {
      roleMap: {
        '主角': '推动主线的核心视角角色',
        '搭档': '协助主角，提供支持与反差',
        '对手': '制造冲突与压力的主要对抗者',
        '导师': '给予关键指引与价值观影响',
        '重要配角': '在关键节点影响剧情走向'
      },
      speechMap: {
        '主角': '直接、略显冲动但真诚',
        '搭档': '幽默、轻松、缓和紧张气氛',
        '对手': '克制尖锐、带讽刺意味',
        '导师': '稳重、有智慧、用比喻',
        '重要配角': '朴实、直白，偶尔情绪化'
      }
    };

    uniqNames.forEach((name, idx) => {
      const role = defaults.roleMap[name] || (idx===0? '核心视角角色':'关键配角');
      profiles[name] = {
        name,
        role,
        function: `在${genre}题材下，围绕“${theme}”推动情节的职责`,
        personality: ['鲜明','一致','有弱点'],
        motivations: '与主题相关的内在驱动力',
        goals: '短期目标随章节推进，长期目标贯穿全书',
        relationships: '与主角/对手存在清晰关系链（合作/竞争/依赖）',
        conflicts: '基于价值观或目标差异形成的现实冲突',
        speechStyle: defaults.speechMap[name] || '自然口语化，保持专属表达习惯',
        arc: '从初始状态到关键事件的变化轨迹（至少两次拐点）',
        tags: ['一致性','动机明确','有成长']
      };
    });

    return profiles;
  }

  // 新增：从角色行文本中抽取角色名
  extractCharacterName(line) {
    if (!line) return null;
    const m = String(line).match(/^[•\-\*\d\.\s]*([^：:，,\-]+)(?:[：:，,\-].*)?$/);
    return m ? m[1].trim() : String(line).trim().slice(0, 8);
  }

  // 新增：获取本章相关的人设文档
  getChapterCharacterProfiles(chapterNumber) {
    const names = this.getActiveCharacters(chapterNumber) || [];
    const all = this.currentOutline?.characterProfiles || {};
    const filtered = {};
    names.forEach(n => { if (all[n]) filtered[n] = all[n]; });
    return filtered;
  }

  // 新增：根据当前大纲构建初始角色词典记忆
  async buildCharacterLexiconFromOutline() {
    const profiles = this.currentOutline?.characterProfiles || {};
    const chapters = Array.isArray(this.currentOutline?.chapters) ? this.currentOutline.chapters : [];
    const lexicon = {};

    // 统计每个角色在大纲中的出现章节
    const nameList = Object.keys(profiles);
    const appearances = {};
    nameList.forEach(name => { appearances[name] = []; });
    chapters.forEach(ch => {
      const text = String(ch.outline || ch.content || '');
      nameList.forEach(name => {
        if (name && text.includes(name)) {
          appearances[name].push(ch.number);
        }
      });
    });

    // 构建词典条目
    nameList.forEach(name => {
      const p = profiles[name] || {};
      lexicon[name] = {
        name,
        role: p.role || '',
        bio: p.arc || p.motivations || '',
        relationships: p.relationships || '',
        conflicts: p.conflicts || '',
        plannedFunctions: p.function || '',
        keyScenesPlanned: appearances[name],
        tags: Array.isArray(p.tags) ? p.tags : [],
        source: 'outline',
        lastUpdated: new Date().toISOString()
      };
    });

    return lexicon;
  }

  // 新增：获取本章相关的角色词典（按活跃角色过滤）
  getChapterLexicon(chapterNumber) {
    const names = this.getActiveCharacters(chapterNumber) || [];
    const all = this.currentOutline?.characterLexicon || {};
    const filtered = {};
    names.forEach(n => { if (all[n]) filtered[n] = all[n]; });
    return filtered;
  }

  // 新增：根据已完成章节内容动态更新角色词典（新增角色、补充出现记录与功能）
  updateLexiconFromChapter(chapter, chapterOutline = {}) {
    if (!this.currentOutline) return;
    if (!this.currentOutline.characterLexicon) this.currentOutline.characterLexicon = {};

    const lex = this.currentOutline.characterLexicon;
    const text = String(chapter.content || '');

    // 仅从“对话+叙述动词”模式中提取候选名字，降低误报
    const speechVerbs = '(?:说道|说|问|答|喊|笑|低声道|回道|叫道|冷笑道|沉声道|叹道)';
    const nameRegex = new RegExp(`([\\u4e00-\\u9fa5]{2,4})(?:[，,：: ]?)${speechVerbs}`, 'g');
    const matches = [];
    let m;
    while ((m = nameRegex.exec(text)) !== null) {
      const name = (m[1] || '').trim();
      const idx = m.index;
      if (name) matches.push({ name, idx });
    }

    // 统计出现次数
    const counts = {};
    matches.forEach(({ name }) => { counts[name] = (counts[name] || 0) + 1; });

    const activeNames = this.getActiveCharacters(chapter.number) || [];

    // 屏蔽明显结构化/非人名的模式与词
    const bannedNames = new Set(['第一幕','第二幕','第三幕','最终小说大纲','第一章','第二章','章节']);
    const bannedPrefix = /^(第|章|幕|大纲|情节|结构|建议|标题|摘要|分析)$/;

    // 计算候选与可信度
    const candidateSet = new Set(matches.map(x => x.name));
    const candidates = Array.from(candidateSet).filter(name => {
      if (!name) return false;
      if (bannedNames.has(name)) return false;
      if (bannedPrefix.test(name)) return false;
      const occ = counts[name] || 0;
      let conf = occ >= 3 ? 0.9 : (occ === 2 ? 0.7 : 0.5);
      if (activeNames.includes(name)) conf = Math.max(conf, 0.85);
      return conf >= 0.7; // 仅在较高可信度时新增词条
    });

    // 对已有词条（已验证）允许低门槛更新出现记录（但不新增）
    const updatableNames = Array.from(candidateSet).filter(name => lex[name]);

    // 新增或更新
    candidates.forEach(name => {
      if (!lex[name]) {
        const idx = text.indexOf(name);
        const contextSnippet = (() => {
          if (idx >= 0) {
            const start = Math.max(0, idx - 40);
            const end = Math.min(text.length, idx + 60);
            return text.substring(start, end).replace(/\n/g, ' ').slice(0, 80);
          }
          return `首次出现于第${chapter.number}章。`;
        })();
        lex[name] = {
          name,
          role: '新角色（写作阶段创建）',
          bio: contextSnippet,
          relationships: '',
          conflicts: '',
          plannedFunctions: (chapterOutline.plotPoints && chapterOutline.plotPoints[0]) ? `围绕本章：${chapterOutline.plotPoints[0]}` : '围绕当前章节推进情节',
          keyScenesPlanned: [chapter.number],
          tags: ['新角色','待完善'],
          source: 'writing',
          confidence: Math.min(1, (counts[name] || 1) * 0.35 + (activeNames.includes(name) ? 0.2 : 0)),
          lastUpdated: new Date().toISOString()
        };
      }
    });

    // 对已有条目，更新出现记录与最近功能（不改变角色基础信息）
    updatableNames.forEach(name => {
      const entry = lex[name];
      const ks = new Set(entry.keyScenesPlanned || []);
      ks.add(chapter.number);
      entry.keyScenesPlanned = Array.from(ks).sort((a, b) => a - b);
      if (chapterOutline.plotPoints && chapterOutline.plotPoints.length > 0) {
        entry.plannedFunctions = `围绕本章：${chapterOutline.plotPoints.slice(0, 2).join('；')}`;
      }
      // 如果之前没有confidence，基于出现次数给一个保守值
      if (entry.confidence == null) {
        const occ = counts[name] || 1;
        entry.confidence = Math.min(1, occ * 0.3 + (activeNames.includes(name) ? 0.2 : 0));
      }
      entry.lastUpdated = new Date().toISOString();
    });
  }

  // 新增：应用作者react阶段生成的角色词典更新
  applyLexiconUpdates(updates = {}) {
    if (!this.currentOutline) return;
    if (!this.currentOutline.characterLexicon) this.currentOutline.characterLexicon = {};
    const lex = this.currentOutline.characterLexicon;
    for (const [name, entry] of Object.entries(updates || {})) {
      if (!name) continue;
      const prev = lex[name] || {};
      const mergedKeyScenes = Array.from(new Set([...(prev.keyScenesPlanned || []), ...(entry.keyScenesPlanned || [])])).sort((a, b) => a - b);
      lex[name] = {
        ...prev,
        ...entry,
        keyScenesPlanned: mergedKeyScenes,
        source: prev.source || entry.source || 'react',
        lastUpdated: new Date().toISOString()
      };
    }
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
  // 覆盖导出，持久化人设扩展
  export() {
    const base = super.export();
    return {
      ...base,
      currentOutlineExtras: {
        characterProfiles: this.currentOutline?.characterProfiles || {},
        characterLexicon: this.currentOutline?.characterLexicon || {}
      }
    };
  }

  // 覆盖导入，保留人设扩展（真正合并在AgentManager.loadProject中进行）
  import(data) {
    super.import(data);
    this._persistedOutlineExtras = data?.currentOutlineExtras || {};
  }

  // 新增：重写大纲，结合新增要求
  async rewriteOutline(newRequirements, novelInfo = {}, options = {}) {
    console.log('📝 开始重写大纲...');
    this.setCurrentTask('重写大纲');
    const defaults = {
      preserveChapterCount: true,
      preserveCharacterNames: true,
      integrateNewTheme: true,
      temperature: 0.6,
      maxTokens: 2000
    };
    const cfg = { ...defaults, ...options };

    const outlineText = (typeof novelInfo.outline === 'string' && novelInfo.outline.trim().length > 0)
      ? novelInfo.outline
      : this.outlineToText(this.currentOutline);

    const reqText = String(newRequirements || '').trim();

    const prompt = `你是一位资深大纲编辑。请在保持连贯性与可执行性的前提下重写现有大纲。
现有大纲（节选）：
${outlineText.slice(0, 1800)}

新增要求：
${reqText}

重写要求：
- ${cfg.preserveChapterCount ? '保持章节数量与编号不变' : '允许调整章节数量，但需重新编号且说明原因'}
- ${cfg.preserveCharacterNames ? '保留已有角色姓名，避免改名；必要时可新增角色' : '允许更改角色设定与姓名'}
- 明确每章的标题与主要事件（2-4条要点）
- 标注关键转折与冲突升级位置
- 若有新增主题或设定，请在前几章埋下伏笔并在后续兑现
- 输出格式采用“第X章：标题”并分行列出要点`;

    let rewritten = '';
    if (!this.apiService.apiKey) {
      if (!this.isFallbackEnabled()) {
        this.completeTask();
        throw new Error('缺少API Key，已禁用兜底模式');
      }
      console.warn('⚠️ 无API Key，使用离线重写fallback');
      const lines = outlineText.split('\n');
      const resultLines = [];
      let injected = false;
      for (const line of lines) {
        resultLines.push(line);
        if (!injected && /^第?\s*\d+\s*章/.test(line)) {
          resultLines.push(`- 新增要求整合：${reqText.substring(0, 120)}...`);
          injected = true;
        }
      }
      rewritten = resultLines.join('\n');
    } else {
      rewritten = await this.apiService.generateText(prompt, {
        maxTokens: cfg.maxTokens,
        temperature: cfg.temperature,
        systemPrompt: '你是专业的小说大纲编辑，擅长结构重写与一致性维护。'
      });
    }

    this.currentOutline = this.parseOutline(rewritten);
    this.currentOutline.characterProfiles = await this.buildCharacterProfiles(novelInfo);
    this.currentOutline.characterLexicon = await this.buildCharacterLexiconFromOutline();

    this.addToContext(`大纲重写完成：${rewritten.substring(0, 300)}...`, 0.9);
    this.completeTask();
    return rewritten;
  }

  // 辅助：将currentOutline对象粗化为文本
  outlineToText(outlineObj = this.currentOutline) {
    if (!outlineObj || !Array.isArray(outlineObj.chapters)) return '';
    const lines = [];
    outlineObj.chapters
      .slice()
      .sort((a, b) => a.number - b.number)
      .forEach(ch => {
        const title = String(ch.title || `第${ch.number}章`).trim();
        const body = String(ch.outline || ch.content || '').trim();
        lines.push(`${title}`);
        if (body) {
          const points = body.split(/[。！？!?；;\n]/).map(s => s.trim()).filter(Boolean).slice(0, 4);
          points.forEach(p => lines.push(`- ${p}`));
        }
      });
    return lines.join('\n');
  }
}

module.exports = OutlineEditorAgent;