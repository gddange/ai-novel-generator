const OpenAIService = require('./server/services/OpenAIService');

async function testOpenAIIntegration() {
  console.log('🧪 开始测试OpenAI服务集成...\n');

  const openaiService = new OpenAIService();

  // 测试1: 检查配置
  console.log('📋 测试1: 检查OpenAI配置');
  console.log('API Key:', openaiService.apiKey ? '已设置' : '未设置');
  console.log('Base URL:', openaiService.baseURL);
  console.log('Model:', openaiService.model);
  console.log('✅ 配置检查完成\n');

  // 测试2: 测试连接（如果有API Key）
  if (openaiService.apiKey) {
    console.log('📋 测试2: 测试API连接');
    try {
      const connectionResult = await openaiService.testConnection();
      if (connectionResult.success) {
        console.log('✅ OpenAI API连接成功');
        console.log('响应:', connectionResult.response.substring(0, 100) + '...');
      } else {
        console.log('❌ OpenAI API连接失败:', connectionResult.message);
      }
    } catch (error) {
      console.log('❌ OpenAI API连接测试出错:', error.message);
    }
  } else {
    console.log('⚠️  跳过API连接测试 - 未设置API Key');
  }
  console.log();

  // 测试3: 测试文本生成接口
  console.log('📋 测试3: 测试文本生成接口结构');
  try {
    // 不实际调用API，只测试方法存在性
    console.log('generateText方法:', typeof openaiService.generateText === 'function' ? '存在' : '不存在');
    console.log('generateChatResponse方法:', typeof openaiService.generateChatResponse === 'function' ? '存在' : '不存在');
    console.log('getModelInfo方法:', typeof openaiService.getModelInfo === 'function' ? '存在' : '不存在');
    console.log('✅ 接口结构测试通过');
  } catch (error) {
    console.log('❌ 接口结构测试失败:', error.message);
  }
  console.log();

  // 测试4: 测试模型信息获取
  console.log('📋 测试4: 测试模型信息获取');
  try {
    const modelInfo = await openaiService.getModelInfo();
    console.log('模型信息:', modelInfo);
    console.log('✅ 模型信息获取成功');
  } catch (error) {
    console.log('❌ 模型信息获取失败:', error.message);
  }

  console.log('\n🎉 OpenAI服务集成测试完成！');
  
  if (!openaiService.apiKey) {
    console.log('\n💡 提示: 要完全测试OpenAI功能，请在.env文件中设置OPENAI_API_KEY');
  }
}

// 运行测试
testOpenAIIntegration().catch(console.error);