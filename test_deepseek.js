require('dotenv').config();
const DeepSeekService = require('./server/services/DeepSeekService');

async function testDeepSeekAPI() {
  console.log('🔍 开始测试DeepSeek API...\n');
  
  const deepSeekService = new DeepSeekService();
  
  // 检查配置
  console.log('📋 配置信息:');
  const modelInfo = await deepSeekService.getModelInfo();
  console.log(`  模型: ${modelInfo.model}`);
  console.log(`  提供商: ${modelInfo.provider}`);
  console.log(`  API地址: ${modelInfo.baseURL}`);
  console.log(`  API密钥配置: ${modelInfo.configured ? '✅ 已配置' : '❌ 未配置'}\n`);
  
  if (!modelInfo.configured) {
    console.log('❌ 请在.env文件中配置DEEPSEEK_API_KEY');
    return;
  }
  
  // 测试连接
  console.log('🔗 测试API连接...');
  try {
    const connectionTest = await deepSeekService.testConnection();
    if (connectionTest.success) {
      console.log('✅ API连接成功!');
      console.log(`📝 测试响应: ${connectionTest.response}\n`);
    } else {
      console.log('❌ API连接失败:', connectionTest.message);
      console.log('错误详情:', connectionTest.error);
      return;
    }
  } catch (error) {
    console.log('❌ 连接测试异常:', error.message);
    return;
  }
  
  // 测试文本生成
  console.log('📝 测试文本生成功能...');
  try {
    const prompt = '请写一个关于未来科技的短篇小说开头，大约100字。';
    console.log(`用户提示: ${prompt}`);
    
    const response = await deepSeekService.generateText(prompt, {
      maxTokens: 200,
      temperature: 0.8,
      systemPrompt: '你是一个专业的科幻小说作家，擅长创作引人入胜的故事开头。'
    });
    
    console.log('✅ 文本生成成功!');
    console.log('📖 生成内容:');
    console.log('─'.repeat(50));
    console.log(response);
    console.log('─'.repeat(50));
    
  } catch (error) {
    console.log('❌ 文本生成失败:', error.message);
    return;
  }
  
  // 测试对话功能
  console.log('\n💬 测试对话功能...');
  try {
    const messages = [
      {
        role: 'system',
        content: '你是一个友善的AI助手，专门帮助用户进行创意写作。'
      },
      {
        role: 'user',
        content: '我想写一个关于时间旅行的故事，你能给我一些创意建议吗？'
      }
    ];
    
    const chatResponse = await deepSeekService.generateChatResponse(messages, {
      maxTokens: 300,
      temperature: 0.7
    });
    
    if (chatResponse.choices && chatResponse.choices.length > 0) {
      console.log('✅ 对话功能正常!');
      console.log('🤖 AI回复:');
      console.log('─'.repeat(50));
      console.log(chatResponse.choices[0].message.content);
      console.log('─'.repeat(50));
    }
    
  } catch (error) {
    console.log('❌ 对话测试失败:', error.message);
    return;
  }
  
  console.log('\n🎉 DeepSeek API测试完成! 所有功能正常。');
  console.log('✨ 系统已准备好使用DeepSeek进行小说生成。');
}

// 运行测试
testDeepSeekAPI().catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
});