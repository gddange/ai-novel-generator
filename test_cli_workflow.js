#!/usr/bin/env node

require('dotenv').config();
const AgentManager = require('./server/agents/AgentManager');

async function testCompleteWorkflow() {
  console.log('🧪 开始测试完整的CLI工作流程...\n');
  
  try {
    // 1. 创建AgentManager实例
    console.log('1️⃣ 创建AgentManager实例...');
    const agentManager = new AgentManager('deepseek');
    
    // 2. 创建新项目
    console.log('2️⃣ 创建新项目...');
    const projectInfo = {
      title: '测试小说',
      genre: '科幻',
      theme: '人工智能与人类的关系',
      description: '一个关于AI觉醒的故事'
    };
    
    const project = await agentManager.startNewProject(projectInfo);
    console.log('✅ 项目创建成功:', project.id);
    
    // 3. 执行规划阶段
    console.log('3️⃣ 执行规划阶段...');
    const planningResult = await agentManager.executePlanningPhase();
    console.log('✅ 规划阶段完成:', planningResult.message);
    console.log('📊 总章节数:', planningResult.totalChapters);
    
    // 4. 检查当前状态
    console.log('4️⃣ 检查当前状态...');
    const currentState = agentManager.getCurrentState();
    console.log('📋 当前状态:', JSON.stringify(currentState, null, 2));
    
    // 5. 执行写作阶段（只写1章进行测试）
    console.log('5️⃣ 执行写作阶段（测试1章）...');
    const writingResult = await agentManager.executeWritingPhase(1);
    console.log('✅ 写作阶段完成!');
    console.log('📝 完成章节:', writingResult.completedChapters.length);
    
    if (writingResult.completedChapters.length > 0) {
      const firstChapter = writingResult.completedChapters[0];
      console.log('📖 第一章标题:', firstChapter.title);
      console.log('📄 第一章字数:', firstChapter.wordCount);
      console.log('📝 第一章内容预览:', firstChapter.content.substring(0, 200) + '...');
    }
    
    console.log('\n🎉 完整工作流程测试成功！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('🔍 错误详情:', error.stack);
  }
}

testCompleteWorkflow();
