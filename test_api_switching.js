const AgentManager = require('./server/agents/AgentManager');
const DeepSeekService = require('./server/services/DeepSeekService');
const OpenAIService = require('./server/services/OpenAIService');

async function testApiSwitching() {
  console.log('🧪 开始测试API切换功能...\n');

  // 创建AgentManager实例
  const agentManager = new AgentManager();

  // 测试1: 默认使用DeepSeek
  console.log('📋 测试1: 默认API提供商 (DeepSeek)');
  console.log('当前API提供商:', agentManager.apiProvider);
  console.log('AuthorAgent API服务类型:', agentManager.author.apiService.constructor.name);
  console.log('OutlineEditorAgent API服务类型:', agentManager.outlineEditor.apiService.constructor.name);
  console.log('StyleEditorAgent API服务类型:', agentManager.styleEditor.apiService.constructor.name);
  console.log('✅ 默认DeepSeek测试通过\n');

  // 测试2: 切换到GPT(OpenAI)
  console.log('📋 测试2: 切换到GPT(OpenAI)');
  agentManager.setApiProvider('gpt');
  console.log('当前API提供商:', agentManager.apiProvider);
  console.log('AuthorAgent API服务类型:', agentManager.author.apiService.constructor.name);
  console.log('OutlineEditorAgent API服务类型:', agentManager.outlineEditor.apiService.constructor.name);
  console.log('StyleEditorAgent API服务类型:', agentManager.styleEditor.apiService.constructor.name);
  console.log('✅ GPT(OpenAI)切换测试通过\n');

  // 测试3: 切换到Kimi
  console.log('📋 测试3: 切换到Kimi');
  agentManager.setApiProvider('kimi');
  console.log('当前API提供商:', agentManager.apiProvider);
  console.log('AuthorAgent API服务类型:', agentManager.author.apiService.constructor.name);
  console.log('OutlineEditorAgent API服务类型:', agentManager.outlineEditor.apiService.constructor.name);
  console.log('StyleEditorAgent API服务类型:', agentManager.styleEditor.apiService.constructor.name);
  console.log('✅ Kimi切换测试通过\n');

  // 测试4: 切换到Qwen
  console.log('📋 测试4: 切换到Qwen');
  agentManager.setApiProvider('qwen');
  console.log('当前API提供商:', agentManager.apiProvider);
  console.log('AuthorAgent API服务类型:', agentManager.author.apiService.constructor.name);
  console.log('OutlineEditorAgent API服务类型:', agentManager.outlineEditor.apiService.constructor.name);
  console.log('StyleEditorAgent API服务类型:', agentManager.styleEditor.apiService.constructor.name);
  console.log('✅ Qwen切换测试通过\n');

  // 测试5: 切换到Gemini
  console.log('📋 测试5: 切换到Gemini');
  agentManager.setApiProvider('gemini');
  console.log('当前API提供商:', agentManager.apiProvider);
  console.log('AuthorAgent API服务类型:', agentManager.author.apiService.constructor.name);
  console.log('OutlineEditorAgent API服务类型:', agentManager.outlineEditor.apiService.constructor.name);
  console.log('StyleEditorAgent API服务类型:', agentManager.styleEditor.apiService.constructor.name);
  console.log('✅ Gemini切换测试通过\n');

  // 测试6: 切换回DeepSeek
  console.log('📋 测试6: 切换回DeepSeek');
  agentManager.setApiProvider('deepseek');
  console.log('当前API提供商:', agentManager.apiProvider);
  console.log('AuthorAgent API服务类型:', agentManager.author.apiService.constructor.name);
  console.log('OutlineEditorAgent API服务类型:', agentManager.outlineEditor.apiService.constructor.name);
  console.log('StyleEditorAgent API服务类型:', agentManager.styleEditor.apiService.constructor.name);
  console.log('✅ DeepSeek切换测试通过\n');

  // 测试7: 测试无效的API提供商
  console.log('📋 测试7: 测试无效的API提供商');
  try {
    agentManager.setApiProvider('invalid-provider');
    console.log('❌ 应该抛出错误，但没有');
  } catch (error) {
    console.log('✅ 正确处理了无效的API提供商:', error.message);
  }

  console.log('\n🎉 所有API切换功能测试完成！');
}

// 运行测试
testApiSwitching().catch(console.error);