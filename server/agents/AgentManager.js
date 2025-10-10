const AuthorAgent = require('./AuthorAgent');
const OutlineEditorAgent = require('./OutlineEditorAgent');
const StyleEditorAgent = require('./StyleEditorAgent');
const fs = require('fs-extra');
const path = require('path');

class AgentManager {
  constructor(apiProvider = 'deepseek') {
    this.apiProvider = apiProvider;
    this.author = new AuthorAgent(apiProvider);
    this.outlineEditor = new OutlineEditorAgent(apiProvider);
    this.styleEditor = new StyleEditorAgent(apiProvider);
    
    this.currentProject = null;
    this.workflowState = 'idle'; // idle, planning, writing, polishing
    this.completedChapters = [];
    this.pendingChapters = [];
    this.projectsDir = path.join(__dirname, '../../data/projects');
    
    this.initializeDataDirectory();
  }

  /**
   * 设置API提供商
   */
  setApiProvider(provider, apiKey) {
    this.apiProvider = provider;
    this.author.setApiService(provider, apiKey);
    this.outlineEditor.setApiService(provider, apiKey);
    this.styleEditor.setApiService(provider, apiKey);
  }

  /**
   * 初始化数据目录
   */
  async initializeDataDirectory() {
    try {
      await fs.ensureDir(this.projectsDir);
    } catch (error) {
      console.error('创建数据目录失败:', error);
    }
  }

  /**
   * 开始新的小说项目
   */
  async startNewProject(projectInfo) {
    this.currentProject = {
      id: this.generateProjectId(),
      title: projectInfo.title,
      genre: projectInfo.genre,
      theme: projectInfo.theme,
      description: projectInfo.description,
      createdAt: new Date(),
      status: 'planning',
      chapters: [],
      outline: null
    };

    this.workflowState = 'planning';
    this.completedChapters = [];
    this.pendingChapters = [];

    // 设置各agent的当前项目
    this.author.setCurrentNovel(this.currentProject);

    // 保存项目信息
    await this.saveProject();

    return {
      projectId: this.currentProject.id,
      status: 'started',
      message: '项目已创建，开始制定大纲...'
    };
  }

  /**
   * 执行大纲制定流程
   */
  async executePlanningPhase() {
    console.log('🎬 开始执行规划阶段...');
    console.log('📚 项目信息:', this.currentProject);
    
    if (this.workflowState !== 'planning') {
      throw new Error('当前不在规划阶段');
    }

    try {
      console.log('📊 更新项目状态为规划中...');
      
      console.log('👥 创建AI代理...');
      
      console.log('🤝 开始大纲协作...');
      // 第一步：作者和大纲编辑协作制定大纲
      const outlineDiscussion = await this.author.collaborateOnOutline(
        this.outlineEditor, 
        this.currentProject
      );

      console.log('💾 保存大纲到项目...');
      // 保存大纲到项目
      this.currentProject.outline = outlineDiscussion.finalOutline;
      this.currentProject.outlineDiscussion = outlineDiscussion;

      console.log('📖 解析大纲为章节...');
      // 解析大纲，生成章节计划
      const parsedOutline = this.outlineEditor.parseOutline(outlineDiscussion.finalOutline);
      this.pendingChapters = parsedOutline.chapters.map(ch => ({
        number: ch.number,
        title: ch.title,
        outline: ch.content,
        status: 'pending'
      }));

      console.log('📝 保存章节信息...');
      
      console.log('✅ 规划阶段完成，准备开始写作...');
      this.currentProject.status = 'ready_to_write';
      this.workflowState = 'writing';

      await this.saveProject();

      return {
        status: 'planning_completed',
        outline: outlineDiscussion.finalOutline,
        totalChapters: this.pendingChapters.length,
        message: '大纲制定完成，准备开始创作'
      };
    } catch (error) {
      console.error('❌ 大纲制定失败:', error);
      throw new Error('大纲制定过程中出现错误');
    }
  }

  /**
   * 执行写作流程
   */
  async executeWritingPhase(chaptersToWrite = 3) {
    if (this.workflowState !== 'writing') {
      throw new Error('当前不在写作阶段');
    }

    const writtenChapters = [];
    const chaptersToProcess = this.pendingChapters.slice(0, chaptersToWrite);

    try {
      // 逐章创作
      for (const chapterPlan of chaptersToProcess) {
        const chapterOutline = this.outlineEditor.getChapterOutline(chapterPlan.number);
        const chapter = await this.author.writeChapter(
          chapterPlan.number, 
          chapterOutline?.outline || chapterPlan.outline
        );

        writtenChapters.push(chapter);
        
        // 更新章节状态
        const pendingIndex = this.pendingChapters.findIndex(ch => ch.number === chapterPlan.number);
        if (pendingIndex !== -1) {
          this.pendingChapters.splice(pendingIndex, 1);
        }
      }

      // 如果写了2-3章，进入润色阶段
      if (writtenChapters.length >= 2) {
        this.workflowState = 'polishing';
        const polishResult = await this.executePolishingPhase(writtenChapters);
        return polishResult;
      }

      return {
        status: 'chapters_written',
        chapters: writtenChapters,
        remaining: this.pendingChapters.length,
        message: `完成${writtenChapters.length}章创作`
      };
    } catch (error) {
      console.error('写作过程失败:', error);
      throw new Error('章节创作过程中出现错误');
    }
  }

  /**
   * 执行润色流程
   */
  async executePolishingPhase(chapters) {
    if (this.workflowState !== 'polishing') {
      throw new Error('当前不在润色阶段');
    }

    try {
      // 如果是第一次润色，建立文风基准
      if (this.completedChapters.length === 0 && chapters.length > 0) {
        await this.styleEditor.establishStyleBaseline(chapters);
      }

      // 润色章节
      const polishedChapters = await this.styleEditor.polishChapters(chapters);

      // 保存润色后的章节
      for (const chapter of polishedChapters) {
        await this.saveChapter(chapter);
        this.completedChapters.push(chapter);
        
        // 更新项目章节列表
        const existingIndex = this.currentProject.chapters.findIndex(ch => ch.number === chapter.number);
        if (existingIndex !== -1) {
          this.currentProject.chapters[existingIndex] = chapter;
        } else {
          this.currentProject.chapters.push(chapter);
        }
      }

      // 生成润色报告
      const polishReport = this.styleEditor.generatePolishReport(chapters, polishedChapters);

      // 更新项目状态
      this.currentProject.lastPolishedAt = new Date();
      await this.saveProject();

      // 检查是否还有待写章节
      if (this.pendingChapters.length > 0) {
        this.workflowState = 'writing';
      } else {
        this.workflowState = 'completed';
        this.currentProject.status = 'completed';
        this.currentProject.completedAt = new Date();
        await this.saveProject();
      }

      return {
        status: 'polishing_completed',
        polishedChapters: polishedChapters.length,
        polishReport,
        totalCompleted: this.completedChapters.length,
        remaining: this.pendingChapters.length,
        nextPhase: this.workflowState,
        message: `完成${polishedChapters.length}章润色`
      };
    } catch (error) {
      console.error('润色过程失败:', error);
      throw new Error('章节润色过程中出现错误');
    }
  }

  /**
   * 执行完整的创作循环
   */
  async executeFullWorkflow(projectInfo) {
    try {
      // 1. 开始项目
      const startResult = await this.startNewProject(projectInfo);
      
      // 2. 制定大纲
      const planningResult = await this.executePlanningPhase();
      
      const results = {
        projectStart: startResult,
        planning: planningResult,
        writingCycles: []
      };

      // 3. 循环执行写作和润色
      while (this.pendingChapters.length > 0 && this.workflowState !== 'completed') {
        const cycleResult = await this.executeWritingPhase(3);
        results.writingCycles.push(cycleResult);
        
        // 如果项目完成，跳出循环
        if (this.workflowState === 'completed') {
          break;
        }
      }

      return {
        status: 'workflow_completed',
        projectId: this.currentProject.id,
        results,
        finalStats: this.getProjectStats()
      };
    } catch (error) {
      console.error('完整工作流程失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目统计信息
   */
  getProjectStats() {
    if (!this.currentProject) {
      return null;
    }

    const totalWords = this.completedChapters.reduce((sum, ch) => sum + (ch.wordCount || ch.content.length), 0);
    
    return {
      projectId: this.currentProject.id,
      title: this.currentProject.title,
      status: this.currentProject.status,
      totalChapters: this.completedChapters.length,
      pendingChapters: this.pendingChapters.length,
      totalWords,
      averageWordsPerChapter: this.completedChapters.length > 0 ? Math.round(totalWords / this.completedChapters.length) : 0,
      createdAt: this.currentProject.createdAt,
      lastUpdated: new Date(),
      agentStats: {
        author: this.author.getWritingStats(),
        outlineEditor: this.outlineEditor.getOutlineStats(),
        styleEditor: this.styleEditor.getPolishStats()
      }
    };
  }

  /**
   * 保存项目数据
   */
  async saveProject() {
    if (!this.currentProject) return;

    const projectPath = path.join(this.projectsDir, `${this.currentProject.id}.json`);
    const projectData = {
      ...this.currentProject,
      completedChapters: this.completedChapters,
      pendingChapters: this.pendingChapters,
      workflowState: this.workflowState,
      agents: {
        author: this.author.export(),
        outlineEditor: this.outlineEditor.export(),
        styleEditor: this.styleEditor.export()
      }
    };

    try {
      await fs.writeJson(projectPath, projectData, { spaces: 2 });
    } catch (error) {
      console.error('保存项目失败:', error);
    }
  }

  /**
   * 保存章节内容
   */
  async saveChapter(chapter) {
    if (!this.currentProject) return;

    const chaptersDir = path.join(this.projectsDir, this.currentProject.id, 'chapters');
    await fs.ensureDir(chaptersDir);

    const chapterPath = path.join(chaptersDir, `chapter_${chapter.number}.md`);
    const chapterContent = `# ${chapter.title || `第${chapter.number}章`}

${chapter.content}

---
创作时间: ${chapter.createdAt || new Date()}
${chapter.polishedAt ? `润色时间: ${chapter.polishedAt}` : ''}
字数: ${chapter.wordCount || chapter.content.length}
`;

    try {
      await fs.writeFile(chapterPath, chapterContent, 'utf8');
    } catch (error) {
      console.error('保存章节失败:', error);
    }
  }

  /**
   * 加载项目
   */
  async loadProject(projectId) {
    const projectPath = path.join(this.projectsDir, `${projectId}.json`);
    
    try {
      const projectData = await fs.readJson(projectPath);
      
      this.currentProject = projectData;
      this.completedChapters = projectData.completedChapters || [];
      this.pendingChapters = projectData.pendingChapters || [];
      this.workflowState = projectData.workflowState || 'idle';

      // 恢复agent状态
      if (projectData.agents) {
        this.author.import(projectData.agents.author);
        this.outlineEditor.import(projectData.agents.outlineEditor);
        this.styleEditor.import(projectData.agents.styleEditor);
      }

      return this.currentProject;
    } catch (error) {
      console.error('加载项目失败:', error);
      throw new Error('项目加载失败');
    }
  }

  /**
   * 获取所有项目列表
   */
  async getProjectList() {
    try {
      const files = await fs.readdir(this.projectsDir);
      const projects = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const projectPath = path.join(this.projectsDir, file);
            const projectData = await fs.readJson(projectPath);
            projects.push({
              id: projectData.id,
              title: projectData.title,
              genre: projectData.genre,
              status: projectData.status,
              createdAt: projectData.createdAt,
              totalChapters: projectData.chapters?.length || 0
            });
          } catch (error) {
            console.error(`读取项目文件失败: ${file}`, error);
          }
        }
      }

      return projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('获取项目列表失败:', error);
      return [];
    }
  }

  /**
   * 生成项目ID
   */
  generateProjectId() {
    return `novel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取当前状态
   */
  getCurrentState() {
    return {
      currentProject: this.currentProject,
      workflowState: this.workflowState,
      completedChapters: this.completedChapters.length,
      pendingChapters: this.pendingChapters.length,
      agents: {
        author: this.author.getStatus(),
        outlineEditor: this.outlineEditor.getStatus(),
        styleEditor: this.styleEditor.getStatus()
      }
    };
  }

  /**
   * 重置管理器状态
   */
  reset() {
    this.currentProject = null;
    this.workflowState = 'idle';
    this.completedChapters = [];
    this.pendingChapters = [];
    
    this.author.reset();
    this.outlineEditor.reset();
    this.styleEditor.reset();
  }
}

module.exports = AgentManager;