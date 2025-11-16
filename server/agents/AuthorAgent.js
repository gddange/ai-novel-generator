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
      if (!this.isFallbackEnabled()) {
        throw error;
      }
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
      if (!this.isFallbackEnabled()) {
        throw error;
      }
      return '暂时无法生成反馈，请稍后重试。';
    }
  }

  /**
   * 创作章节内容
   */
  async writeChapter(chapterNumber, chapterOutline, previousChapters = [], outlineContext = {}) {
    this.setCurrentTask(`创作第${chapterNumber}章`);
    
    const context = this.getRelevantWritingContext();
    const prompt = this.buildChapterPrompt(chapterNumber, chapterOutline, context, previousChapters, outlineContext);
    
    try {
      console.log(`🤖 开始调用API创作第${chapterNumber}章...`);
      const response = await this.apiService.generateText(prompt, {
        systemPrompt: this.systemPrompt,
        maxTokens: 3000,
        temperature: 0.8
      });

      const chapterContent = response;
      console.log(`📝 第${chapterNumber}章创作完成，字数: ${chapterContent.length}`);
      
      // 记录章节内容到上下文
      this.addToContext(`第${chapterNumber}章内容：${chapterContent}`, 0.9);
      
      // 更新角色信息
      this.updateCharacterInfo(chapterContent);
      
      this.completeTask();
      
      return {
        number: chapterNumber, // 添加number字段以保持一致性
        chapterNumber,
        title: this.extractChapterTitle(chapterContent),
        content: chapterContent,
        wordCount: chapterContent.length,
        createdAt: new Date()
      };
    } catch (error) {
      console.error(`❌ 创作第${chapterNumber}章失败:`, error);
      this.completeTask();
      if (this.isFallbackEnabled()) {
        const offline = this.composeOfflineChapter(chapterNumber, chapterOutline, previousChapters, outlineContext);
        return {
          number: chapterNumber,
          chapterNumber,
          title: this.extractChapterTitle(offline) || `第${chapterNumber}章（离线生成）`,
          content: offline,
          wordCount: offline.length,
          createdAt: new Date()
        };
      }
      throw new Error(`第${chapterNumber}章创作失败: ${error.message}`);
    }
  }

  /**
   * 离线兜底：根据大纲与上下文生成章节草稿
   */
  composeOfflineChapter(chapterNumber, chapterOutline, previousChapters = [], outlineContext = {}) {
    const prevSummary = previousChapters.map(ch => `第${ch.number}章回顾：${(ch.content || '').slice(0, 160)}...`).join('\n');
    const points = (outlineContext.plotPoints || []).map((p,i)=>`- ${i+1}. ${p}`).join('\n');
    const charsArr = (outlineContext.characters || []);
    const chars = charsArr.map((c,i)=>`- ${i+1}. ${c}`).join('\n');

    const profileLines = [];
    const profiles = outlineContext.characterProfiles || {};
    for (const name of Object.keys(profiles || {})) {
      const p = profiles[name];
      profileLines.push(`- ${name}：${typeof p==='string' ? p : [p?.role,p?.traits?.join('、'),p?.goal].filter(Boolean).join('；')}`);
    }

    const lexicon = outlineContext.characterLexicon || {};
    const lexiconLines = Object.keys(lexicon).slice(0, 10).map(n => `- ${n}：${Array.isArray(lexicon[n]) ? lexicon[n].slice(0,3).join('、') : (lexicon[n]?.traits||[]).slice(0,3).join('、')}`);

    const recentSummaries = outlineContext.recentSummaries || [];
    const summariesBlock = recentSummaries.map(s => `- 第${s.number}章摘要：${s.summary?.slice(0,160) || ''}`).join('\n');

    const leadChar = charsArr[0] || '主角';

    const content = [
      `# 第${chapterNumber}章`,
      '',
      '【前情提要】',
      prevSummary || summariesBlock || '无',
      '',
      '【大纲要点】',
      chapterOutline || '（无大纲，采用自由叙述）',
      '',
      '【关键情节点】',
      points || '（未提供）',
      '',
      '【登场角色】',
      chars || '（未提供）',
      '',
      '【角色人设提示】',
      profileLines.join('\n') || '（未提供）',
      '',
      '【记忆词典】',
      lexiconLines.join('\n') || '（未提供）',
      '',
      '【故事正文】',
      `夜色像一层薄纱笼罩着街巷。${leadChar}在微弱的路灯下整理散乱的线索片段，记忆里那句若隐若现的低语忽远忽近。`,
      '他将零碎的事实一一摆开，试图让它们像齿轮般咬合。每当一个缺口被填补，另一个更大的空洞便在黑暗中显形。',
      '与此同时，一个熟悉的身影从拐角处出现，带来新的证词，也带来新的疑问。',
      '在这章里，角色之间的信任与怀疑交替生长，线索与误导纠缠成网，直至一处被忽略的细节忽然对齐，推开下一扇门。',
      '',
      '【本章结尾】',
      '他停下脚步，凝视那张被折角的照片，终于意识到：真相并不在眼前，而躲在下一段记忆背后。'
    ].join('\n');

    return content;
  }

  /**
   * 写作前react阶段：审阅前序、对齐大纲、人设，明确本章目标与人物，并将未出场角色加入角色词典记忆
   */
  async reactBeforeWriting(chapterNumber, chapterOutline, previousChapters = [], outlineContext = {}) {
    this.setCurrentTask(`react前置分析：第${chapterNumber}章`);

    const objectives = Array.from(new Set((outlineContext.plotPoints || []).filter(Boolean))).slice(0, 4);
    const plannedSet = new Set([...(outlineContext.characters || []), ...Object.keys(outlineContext.characterProfiles || {})]);

    // 已出场角色：来自持久化摘要
    const appeared = new Set();
    const summaries = Array.isArray(outlineContext.recentSummaries) ? outlineContext.recentSummaries : [];
    summaries.forEach(s => (Array.isArray(s.characters) ? s.characters : []).forEach(n => { if (n) appeared.add(n); }));

    // 已出场角色：来自前序章节正文（对话动词语境）
    const speechVerbs = '(?:说道|说|问|答|喊|笑|低声道|回道|叫道|冷笑道|沉声道|叹道)';
    const nameRegex = new RegExp(`([\\u4e00-\\u9fa5]{2,4})(?:[，,：: ]?)${speechVerbs}`, 'g');
    (previousChapters || []).forEach(ch => {
      const text = String(ch.content || '');
      let m; while ((m = nameRegex.exec(text)) !== null) {
        const name = (m[1] || '').trim();
        if (name) appeared.add(name);
      }
    });

    // 也从本章大纲文本中抽取作为种子
    const outlineText = String(chapterOutline || '');
    let m2; const outlineNameRegex = /([\\u4e00-\\u9fa5]{2,4})/g;
    while ((m2 = outlineNameRegex.exec(outlineText)) !== null) {
      const token = (m2[1] || '').trim();
      if (token && token.length >= 2 && token.length <= 4) plannedSet.add(token);
    }

    // 屏蔽结构词
    const bannedNames = new Set(['第一幕','第二幕','第三幕','最终小说大纲','第一章','第二章','章节']);
    const bannedPrefix = /^(第|章|幕|大纲|情节|结构|建议|标题|摘要|分析)$/;

    const plannedCharacters = Array.from(plannedSet).filter(n => n && !bannedNames.has(n) && !bannedPrefix.test(n));
    const appearedCharacters = Array.from(appeared);
    const newCharacters = plannedCharacters.filter(n => !appeared.has(n));

    // 生成词典更新
    const lexiconUpdates = {};
    newCharacters.forEach(name => {
      lexiconUpdates[name] = {
        name,
        role: '预定出场角色（react阶段）',
        bio: `计划在第${chapterNumber}章出场。`,
        relationships: '',
        conflicts: '',
        plannedFunctions: objectives[0] ? `支撑本章：${objectives[0]}` : '支撑本章剧情',
        keyScenesPlanned: [chapterNumber],
        tags: ['预定','react'],
        source: 'react',
        lastUpdated: new Date().toISOString()
      };
    });

    const note = [
      `React阶段规划 - 第${chapterNumber}章`,
      `目标：${objectives.join('；') || '未提供'}`,
      `预定角色：${plannedCharacters.join('、') || '未提供'}`,
      `已出场角色（截止上一章）：${appearedCharacters.join('、') || '无'}`,
      `新增入词典：${newCharacters.join('、') || '无'}`
    ].join('\n');

    this.addToContext(note, 0.85);
    this.completeTask();

    return {
      objectives,
      plannedCharacters,
      appearedCharacters,
      newCharacters,
      lexiconUpdates
    };
  }

  /**
   * 构建章节创作提示词（增强版）
   */
  buildChapterPrompt(chapterNumber, chapterOutline, context, previousChapters = [], outlineContext = {}) {
    let prompt = `请创作小说《${this.currentNovel?.title || '未命名'}》的第${chapterNumber}章。

章节大纲：
${chapterOutline}

`;

    // 注入当前章的大纲情节点与预期角色
    const { plotPoints = [], characters = [], characterProfiles = {} } = outlineContext || {};
    if (plotPoints.length > 0) {
      prompt += `本章关键情节点（请覆盖且合理展开）：
${plotPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

`;
    }

    // 预期登场角色：融合大纲给出与前序章节实际出现的高频名字，过滤结构词
    {
      const bannedNames = new Set(['第一幕','第二幕','第三幕','最终小说大纲','第一章','第二章','章节']);
      const bannedPrefix = /^(第|章|幕|大纲|情节|结构|建议|标题|摘要|分析)$/;
      const isNameLike = (s) => /^[\u4e00-\u9fa5]{2,4}$/.test(s);
      const surnameSet = new Set('赵钱孙李周吴郑王冯陈蒋沈韩杨朱秦许何吕施张孔曹严华金魏陶姜谢邹喻苏潘葛范彭鲁韦马方俞袁柳唐罗薛顾丁邓霍崔贾傅包欧司上林梁刘胡高郭文程邱康汪田董于章云'.split(''));
      const compoundSurnames = ['欧阳','司马','上官','诸葛','夏侯','太史','端木','东方','独孤','南宫'];
      const validSurname = (s) => compoundSurnames.some(p=>s.startsWith(p)) || surnameSet.has(s[0]);
      const isNicknameSurname = (s) => s.length===2 && ['老','小','阿'].includes(s[0]) && surnameSet.has(s[1]);
      const isValidPersonName = (s) => isNameLike(s) && (validSurname(s) || isNicknameSurname(s)) && !bannedNames.has(s) && !bannedPrefix.test(s);
      const pronouns = new Set(['我','你','他','她','它','我们','你们','他们','她们','它们']);

      const outlineNames = (characters || []).filter(n => n && isValidPersonName(n) && !pronouns.has(n));

      // 从前序章节正文中提取高频名字（对话动词语境），增强稳定性
      const speechVerbs = '(?:说道|说|问|答|喊|笑|低声道|回道|叫道|冷笑道|沉声道|叹道)';
      const nameRegex = new RegExp(`[“\s，,：:]([\\u4e00-\\u9fa5]{2,4})(?:[，,：: ]?)${speechVerbs}`, 'g');
      const counts = {};
      (previousChapters || []).slice(-3).forEach(ch => {
        const text = String(ch.content || '');
        let m; while ((m = nameRegex.exec(text)) !== null) {
          const name = (m[1] || '').trim();
          if (name) counts[name] = (counts[name] || 0) + 1;
        }
      });
      const prevNames = Object.entries(counts)
        .filter(([n, c]) => isValidPersonName(n) && !pronouns.has(n) && c >= 2)
        .sort((a, b) => b[1] - a[1])
        .map(([n]) => n)
        .slice(0, 4);

      // 兜底：从情节点文本中抽取名字，要求以非汉字边界包围，避免“林默想为”等误配
      const extractNamesFromText = (text) => {
        const out = new Set();
        const t = String(text || '');
        const SUR_CLASS = '[' + Array.from(surnameSet).join('') + ']';
        const reSingle2 = new RegExp(`${SUR_CLASS}[\u4e00-\u9fa5]{1}`, 'g');
        const reSingle3 = new RegExp(`${SUR_CLASS}[\u4e00-\u9fa5]{2}`, 'g');
        const reCompound = new RegExp(`(?:${compoundSurnames.join('|')})[\u4e00-\u9fa5]{2}`, 'g');
        const reNickname = new RegExp(`[老小阿]${SUR_CLASS}`, 'g');
        const pushFiltered = (token) => {
          const n = (token || '').trim();
          if (!n) return;
          if (pronouns.has(n) || bannedNames.has(n) || bannedPrefix.test(n)) return;
          const len = n.length;
          const badTailChars = new Set(['想','说','问','在','有','将','把','与','和','及','会','能','要','已','未','等','像','画','给','的','里','中','上','下','前','后','创']);
          const badGivenChars = new Set(['有','在','将','把','与','和','及','会','能','要','已','未','等','像','画','给','的','里','中','上','下','前','后','说','问','想','是','肖']);
          
          if (len === 2) {
            // 单姓+1名 或 昵称姓
            if (!(validSurname(n) || isNicknameSurname(n))) return;
            // 单姓两字名的第二字黑名单拦截，如“张肖”、“何有”
            if (validSurname(n) && badGivenChars.has(n[1])) return;
          } else if (len === 3) {
            // 单姓+2名
            if (!validSurname(n)) return;
            if (badTailChars.has(n[2])) return;
          } else if (len === 4) {
            // 复姓+2名
            if (!compoundSurnames.some(p => n.startsWith(p))) return;
          } else {
            return;
          }
          out.add(n);
        };
        (t.match(reSingle2) || []).forEach(pushFiltered);
        (t.match(reSingle3) || []).forEach(pushFiltered);
        (t.match(reCompound) || []).forEach(pushFiltered);
        (t.match(reNickname) || []).forEach(pushFiltered);
        return Array.from(out);
      };

      const plotText = Array.isArray(plotPoints) ? plotPoints.join('\n') : String(plotPoints || '');
      const plotNames = extractNamesFromText(plotText).slice(0, 6);

      const expected = Array.from(new Set([ ...plotNames, ...outlineNames, ...prevNames ])).slice(0, 6);
      if (expected.length > 0) {
        prompt += `本章预期登场角色（优先体现其动机与互动）：\n${expected.join('、')}\n\n`;
      }

    }

    // 新增：角色人设文档
    if (characterProfiles && Object.keys(characterProfiles).length > 0) {
      const lines = Object.entries(characterProfiles).map(([name, p]) => {
        const personality = Array.isArray(p.personality) ? p.personality.join('、') : (p.personality || '');
        const tags = Array.isArray(p.tags) ? p.tags.join('、') : (p.tags || '');
        return `${name}：\n- 角色定位：${p.role || ''}\n- 功能：${p.function || ''}\n- 性格：${personality}\n- 动机与目标：${p.motivations || ''}；${p.goals || ''}\n- 关系与冲突：${p.relationships || ''}；${p.conflicts || ''}\n- 说话风格：${p.speechStyle || ''}\n- 发展轨迹：${p.arc || ''}\n- 标签：${tags}`;
      }).join('\n\n');
      prompt += `角色人设文档（写作须严格遵循）：\n${lines}\n\n`;
    }

    // 新增：角色词典记忆（精简摘要版）
    const lex = outlineContext?.characterLexicon || {};
    if (lex && Object.keys(lex).length > 0) {
      const lines = Object.entries(lex)
        .filter(([name, e]) => {
          if (!e) return false;
          if (e.source === 'writing') {
            const conf = typeof e.confidence === 'number' ? e.confidence : 0.5;
            return conf >= 0.7;
          }
          return true;
        })
        .map(([name, e]) => {
          const parts = [];
          if (e.role) parts.push(`定位：${e.role}`);
          if (e.bio) parts.push(`经历：${String(e.bio).slice(0, 60)}…`);
          if (e.plannedFunctions) parts.push(`本章功能：${e.plannedFunctions}`);
          if (Array.isArray(e.tags) && e.tags.length) parts.push(`标签：${e.tags.join('、')}`);
          return `${name}（${parts.join('；')}）`;
        })
        .slice(0, 20)
        .join('\n');
      prompt += `角色词典记忆（供一致性参考，简述版）：\n${lines}\n\n`;
    }

    // 优化前序章节正文注入：最近3章精炼摘要 + 上一章尾段摘录
    const persistedSummaries = Array.isArray(outlineContext?.recentSummaries) ? outlineContext.recentSummaries : [];
    if (persistedSummaries.length > 0) {
      // 使用持久化摘要，保证一致性与更高压缩质量
      prompt += `前情提要（基于持久化摘要，最近${persistedSummaries.length}章）：\n${persistedSummaries.map(s => `第${s.chapterNumber}章《${s.title || ''}》：${String(s.summary || '').slice(0, 180)}`).join('\n')}\n\n`;
      // 仍保留上一章尾段以承接口感
      const lastPrev = previousChapters && previousChapters.length > 0 ? previousChapters[previousChapters.length - 1] : null;
      if (lastPrev && lastPrev.content) {
        const tailLen = 300;
        const tail = lastPrev.content.length > tailLen
          ? lastPrev.content.substring(lastPrev.content.length - tailLen)
          : lastPrev.content;
        prompt += `上一章尾段关键片段（请自然承接、保持逻辑延续）：\n${tail}\n\n`;
      }
    } else if (previousChapters && previousChapters.length > 0) {
      const recentChapters = previousChapters.slice(-3);
      // 前情提要：每章160字以内摘要
      prompt += `前情提要（最近${recentChapters.length}章）：\n${recentChapters.map(ch => {
        const text = ch.content || '';
        const summary = text.length > 160 ? text.substring(0, 160) + '...' : text;
        return `第${ch.number}章《${ch.title || ''}》：${summary}`;
      }).join('\n')}\n\n`;
      // 上一章尾段关键片段：用于自然承接
      const lastChapter = previousChapters[previousChapters.length - 1];
      if (lastChapter && lastChapter.content) {
        const tailLen = 300;
        const tail = lastChapter.content.length > tailLen
          ? lastChapter.content.substring(lastChapter.content.length - tailLen)
          : lastChapter.content;
        prompt += `上一章尾段关键片段（请自然承接、保持逻辑延续）：\n${tail}\n\n`;
      }
    }

    // 历史上下文中的章节摘要（来自ContextManager），作为额外参考
    if (context.previousChapters && context.previousChapters.length > 0) {
      prompt += `历史摘要（系统自动提取）：
${context.previousChapters.map(ch => `第${ch.number}章：${ch.summary}`).join('\n')}

`;
    }

    // 主要角色与写作风格
    if (context.characters && context.characters.size > 0) {
      prompt += `主要角色信息：
${Array.from(context.characters.entries()).map(([name, info]) => `${name}：${info}`).join('\n')}

`;
    }

    if (this.writingContext.writingStyle && this.writingContext.writingStyle.tone) {
      prompt += `写作风格要求：${this.writingContext.writingStyle.tone}

`;
    }

    prompt += `创作要求：
1. 字数控制在1500-2500字
2. 严格保持与前面章节的剧情连贯性和逻辑一致性
3. 角色性格和行为要与人设文档保持一致，避免混淆
4. 注重人物对话和心理描写
5. 场景描写要生动具体
6. 围绕本章关键情节点推进主要情节发展
7. 保持适当的悬念和张力
8. 与第${chapterNumber-1}章的结尾自然衔接
9. 严禁擅自改名或使用别称；角色名字必须与人设一致
10. 若出现新角色，须明确命名并保持后续一致性

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
      characters: this.writingContext.characters, // 修复：使用正确的属性路径
      plotPoints: this.extractPlotPoints(context),
      writingStyle: this.writingContext.writingStyle // 修复：使用正确的属性路径
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
    this.writingContext.writingStyle = { ...this.writingContext.writingStyle, ...style }; // 修复：使用正确的属性路径
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
      
      // 保存灵到家到上下文
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