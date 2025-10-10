require('dotenv').config();
const DeepSeekService = require('./server/services/DeepSeekService');

async function testDeepSeekAPI() {
  console.log('🧪 开始测试 DeepSeek API 连接...');
  
  const service = new DeepSeekService();
  
  console.log('🔧 API 配置信息:');
  console.log('- API Key:', service.apiKey ? `${service.apiKey.substring(0, 10)}...` : 'Not found');
  console.log('- Base URL:', service.baseURL);
  console.log('- Model:', service.model);
  
  try {
    console.log('\n🚀 测试简单文本生成...');
    const result = await service.generateText('请说"你好"', {
      maxTokens: 50,
      temperature: 0.1
    });
    
    console.log('✅ API 调用成功!');
    console.log('📝 响应内容:', result);
    
  } catch (error) {
    console.error('❌ API 调用失败:');
    console.error('- 错误类型:', error.constructor.name);
    console.error('- 错误消息:', error.message);
    console.error('- 完整错误:', error);
  }
}

testDeepSeekAPI().catch(console.error);