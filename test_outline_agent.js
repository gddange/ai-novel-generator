require('dotenv').config();
const OutlineEditorAgent = require('./server/agents/OutlineEditorAgent');

async function testOutlineAgent() {
  console.log('🧪 开始测试 OutlineEditorAgent...');
  
  const agent = new OutlineEditorAgent('deepseek');
  
  console.log('🔧 Agent 配置信息:');
  console.log('- API Service:', agent.apiService.constructor.name);
  console.log('- API Key:', agent.apiService.apiKey ? `${agent.apiService.apiKey.substring(0, 10)}...` : 'Not found');
  console.log('- Base URL:', agent.apiService.baseURL);
  
  const novelInfo = {
    title: '三个臭皮匠',
    genre: 'mystery',
    theme: '三个臭皮匠捡到一个破烂的罐子，故事开始',
    description: '一个关于三个朋友发现神秘罐子的冒险故事'
  };
  
  try {
    console.log('\n🚀 测试 generateStructure 方法...');
    const structure = await agent.generateStructure(novelInfo);
    
    console.log('✅ generateStructure 成功!');
    console.log('📝 结构内容:', structure.substring(0, 300) + '...');
    
    console.log('\n🚀 测试 finalizePlot 方法...');
    const feedback = '结构很好，建议增加更多悬疑元素';
    const finalPlot = await agent.finalizePlot(feedback, novelInfo);
    
    console.log('✅ finalizePlot 成功!');
    console.log('📝 最终大纲:', finalPlot.substring(0, 300) + '...');
    
  } catch (error) {
    console.error('❌ 测试失败:');
    console.error('- 错误类型:', error.constructor.name);
    console.error('- 错误消息:', error.message);
    console.error('- 完整错误:', error);
  }
}

testOutlineAgent().catch(console.error);