require('dotenv').config();
const OutlineEditorAgent = require('./server/agents/OutlineEditorAgent.js');

console.log('创建OutlineEditorAgent...');
try {
  const agent = new OutlineEditorAgent('deepseek');
  console.log('✅ Agent创建成功');
  console.log('API Service:', agent.apiService.constructor.name);
  console.log('API Key存在:', !!agent.apiService.apiKey);
  console.log('Base URL:', agent.apiService.baseURL);
  
  // 测试简单的API调用
  console.log('\n测试API调用...');
  agent.apiService.generateText('Hello', { maxTokens: 50, temperature: 0.1 })
    .then(response => {
      console.log('✅ API调用成功:', response.substring(0, 100));
    })
    .catch(error => {
      console.error('❌ API调用失败:', error.message);
    });
} catch (error) {
  console.error('❌ Agent创建失败:', error.message);
}