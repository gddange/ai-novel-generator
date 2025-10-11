#!/usr/bin/env node

require('dotenv').config();
const readline = require('readline');
const AgentManager = require('./server/agents/AgentManager');
const ApiKeyValidator = require('./server/utils/ApiKeyValidator');

class CLINovelGenerator {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.agentManager = null;
    this.currentProject = null;
  }

  async start() {
    console.log('🎭 AI小说生成器 - 命令行版本');
    console.log('================================');
    
    try {
      await this.setupApiKey();
      await this.showMainMenu();
    } catch (error) {
      console.error('❌ 启动失败:', error.message);
      process.exit(1);
    }
  }

  async setupApiKey() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      console.log('❌ 未找到API Key，请设置环境变量 DEEPSEEK_API_KEY');
      const inputKey = await this.question('请输入您的DeepSeek API Key: ');
      
      const validation = ApiKeyValidator.validateApiKey(inputKey, 'deepseek');
      if (!validation.valid) {
        throw new Error(`API Key验证失败: ${validation.error}`);
      }
      
      this.agentManager = new AgentManager('deepseek');
      this.agentManager.setApiProvider('deepseek', validation.sanitized);
    } else {
      const validation = ApiKeyValidator.validateApiKey(apiKey, 'deepseek');
      if (!validation.valid) {
        throw new Error(`环境变量中的API Key无效: ${validation.error}`);
      }
      
      this.agentManager = new AgentManager('deepseek');
      this.agentManager.setApiProvider('deepseek', validation.sanitized);
      console.log('✅ API Key验证成功');
    }
  }

  async showMainMenu() {
    console.log('\n📚 主菜单:');
    console.log('1. 创建新小说项目');
    console.log('2. 查看现有项目');
    console.log('3. 继续现有项目');
    console.log('4. 退出');
    
    const choice = await this.question('请选择操作 (1-4): ');
    
    switch (choice) {
      case '1':
        await this.createNewProject();
        break;
      case '2':
        await this.listProjects();
        break;
      case '3':
        await this.continueProject();
        break;
      case '4':
        console.log('👋 再见！');
        this.rl.close();
        return;
      default:
        console.log('❌ 无效选择，请重试');
        await this.showMainMenu();
    }
  }

  async createNewProject() {
    console.log('\n📝 创建新项目');
    console.log('================');
    
    const title = await this.question('小说标题: ');
    if (!title.trim()) {
      console.log('❌ 标题不能为空');
      return await this.showMainMenu();
    }
    
    console.log('\n📖 选择小说类型:');
    console.log('1. 科幻 (sci-fi)');
    console.log('2. 奇幻 (fantasy)');
    console.log('3. 悬疑 (mystery)');
    console.log('4. 爱情 (romance)');
    console.log('5. 历史 (historical)');
    
    const genreChoice = await this.question('请选择类型 (1-5): ');
    const genres = {
      '1': 'sci-fi',
      '2': 'fantasy', 
      '3': 'mystery',
      '4': 'romance',
      '5': 'historical'
    };
    
    const genre = genres[genreChoice];
    if (!genre) {
      console.log('❌ 无效选择');
      return await this.showMainMenu();
    }
    
    const theme = await this.question('小说主题/简介: ');
    if (!theme.trim()) {
      console.log('❌ 主题不能为空');
      return await this.showMainMenu();
    }
    
    try {
      console.log('\n🚀 正在创建项目...');
      const result = await this.agentManager.startNewProject({
        title: title.trim(),
        genre,
        theme: theme.trim()
      });
      
      this.currentProject = this.agentManager.currentProject;
      console.log(`✅ 项目创建成功！项目ID: ${result.projectId}`);
      
      await this.showProjectMenu();
    } catch (error) {
      console.error('❌ 项目创建失败:', error.message);
      await this.showMainMenu();
    }
  }

  async listProjects() {
    console.log('\n📋 现有项目列表');
    console.log('==================');
    
    try {
      const projects = await this.agentManager.getProjectList();
      
      if (projects.length === 0) {
        console.log('📭 暂无项目');
      } else {
        projects.forEach((project, index) => {
          console.log(`${index + 1}. ${project.title} (${project.genre})`);
          console.log(`   ID: ${project.id}`);
          console.log(`   状态: ${project.status}`);
          console.log(`   创建时间: ${new Date(project.createdAt).toLocaleString()}`);
          console.log('');
        });
      }
    } catch (error) {
      console.error('❌ 获取项目列表失败:', error.message);
    }
    
    await this.showMainMenu();
  }

  async continueProject() {
    console.log('\n🔄 继续现有项目');
    console.log('==================');
    
    const projectId = await this.question('请输入项目ID: ');
    
    try {
      const project = await this.agentManager.loadProject(projectId);
      this.currentProject = project;
      console.log(`✅ 项目加载成功: ${project.title}`);
      
      await this.showProjectMenu();
    } catch (error) {
      console.error('❌ 项目加载失败:', error.message);
      await this.showMainMenu();
    }
  }

  async showProjectMenu() {
    if (!this.currentProject) {
      return await this.showMainMenu();
    }
    
    console.log(`\n📖 项目: ${this.currentProject.title}`);
    console.log('='.repeat(this.currentProject.title.length + 8));
    console.log('1. 执行大纲制定');
    console.log('2. 执行章节写作');
    console.log('3. 查看项目状态');
    console.log('4. 查看章节列表');
    console.log('5. 返回主菜单');
    
    const choice = await this.question('请选择操作 (1-5): ');
    
    switch (choice) {
      case '1':
        await this.executePlanning();
        break;
      case '2':
        await this.executeWriting();
        break;
      case '3':
        await this.showProjectStatus();
        break;
      case '4':
        await this.showChaptersList();
        break;
      case '5':
        await this.showMainMenu();
        return;
      default:
        console.log('❌ 无效选择，请重试');
        await this.showProjectMenu();
    }
  }

  async executePlanning() {
    console.log('\n📋 开始制定大纲...');
    
    try {
      const result = await this.agentManager.executePlanningPhase();
      console.log('✅ 大纲制定完成！');
      console.log('\n📝 大纲内容:');
      console.log('=============');
      
      if (result.outline) {
        console.log(`标题: ${result.outline.title}`);
        console.log(`主题: ${result.outline.theme}`);
        console.log(`背景: ${result.outline.background}`);
        
        if (result.outline.chapters && result.outline.chapters.length > 0) {
          console.log('\n章节安排:');
          result.outline.chapters.forEach((chapter, index) => {
            console.log(`第${index + 1}章: ${chapter.title}`);
            console.log(`  内容: ${chapter.content}`);
          });
        }
      }
      
    } catch (error) {
      console.error('❌ 大纲制定失败:', error.message);
    }
    
    await this.showProjectMenu();
  }

  async executeWriting() {
    console.log('\n✍️ 开始章节写作...');
    
    const chaptersCount = await this.question('要写作多少章节? (默认3章): ');
    const count = parseInt(chaptersCount) || 3;
    
    try {
      console.log(`📝 正在写作 ${count} 个章节...`);
      
      // 添加调试信息
      const currentState = this.agentManager.getCurrentState();
      console.log('🔍 当前项目状态:', currentState);
      
      const result = await this.agentManager.executeWritingPhase(count);
      
      console.log('✅ 章节写作完成！');
      console.log(`📊 完成章节数: ${result.completedChapters.length}`);
      
    } catch (error) {
      console.error('❌ 章节写作失败:', error.message);
      console.error('🔍 错误详情:', error.stack);
      
      // 添加状态检查
      const currentState = this.agentManager.getCurrentState();
      console.log('🔍 当前项目状态:', currentState);
    }
    
    await this.showProjectMenu();
  }

  async showProjectStatus() {
    console.log('\n📊 项目状态');
    console.log('=============');
    
    const stats = this.agentManager.getProjectStats();
    
    console.log(`项目ID: ${this.currentProject.id}`);
    console.log(`标题: ${this.currentProject.title}`);
    console.log(`类型: ${this.currentProject.genre}`);
    console.log(`状态: ${this.currentProject.status}`);
    console.log(`创建时间: ${new Date(this.currentProject.createdAt).toLocaleString()}`);
    console.log(`总章节数: ${stats.totalChapters}`);
    console.log(`已完成章节: ${stats.completedChapters}`);
    console.log(`总字数: ${stats.totalWords}`);
    
    await this.showProjectMenu();
  }

  async showChaptersList() {
    console.log('\n📚 章节列表');
    console.log('=============');
    
    if (!this.currentProject.chapters || this.currentProject.chapters.length === 0) {
      console.log('📭 暂无章节');
    } else {
      this.currentProject.chapters.forEach((chapter, index) => {
        console.log(`第${index + 1}章: ${chapter.title}`);
        console.log(`  字数: ${chapter.content ? chapter.content.length : 0}`);
        console.log(`  状态: ${chapter.status || '未知'}`);
        console.log('');
      });
    }
    
    await this.showProjectMenu();
  }

  question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }
}

// 启动CLI应用
if (require.main === module) {
  const cli = new CLINovelGenerator();
  cli.start().catch(console.error);
}

module.exports = CLINovelGenerator;