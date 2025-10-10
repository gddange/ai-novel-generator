require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

/**
 * 测试Agent功能和协作流程
 */
async function testAgentFunctionality() {
  console.log('🚀 开始测试AI小说生成器Agent功能...\n');
  
  try {
    // 1. 测试健康检查
    console.log('1. 测试API健康检查...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 健康检查通过:', healthResponse.data);
    console.log();
    
    // 2. 测试获取所有Agent
    console.log('2. 测试获取所有Agent...');
    const agentsResponse = await axios.get(`${BASE_URL}/agents`);
    console.log('✅ 获取Agent列表成功:', agentsResponse.data);
    console.log();
    
    // 3. 测试创建新小说项目
    console.log('3. 测试创建新小说项目...');
    const novelData = {
      title: '测试小说：时空穿越者',
      genre: '科幻',
      description: '一个关于时空穿越的科幻故事，主角意外获得穿越时空的能力，在不同的时代中寻找回家的路。',
      targetLength: 50000,
      style: '现代都市风格，节奏紧凑，情节跌宕起伏'
    };
    
    const createNovelResponse = await axios.post(`${BASE_URL}/novels`, novelData);
    console.log('✅ 创建小说项目成功:', createNovelResponse.data);
    const novelId = createNovelResponse.data.data.id;
    console.log();
    
    // 4. 测试大纲生成
    console.log('4. 测试大纲生成...');
    const outlineResponse = await axios.post(`${BASE_URL}/novels/${novelId}/outline`, {
      chapters: 10,
      detailLevel: 'detailed'
    });
    console.log('✅ 大纲生成成功:', outlineResponse.data);
    console.log();
    
    // 5. 测试章节内容生成
    console.log('5. 测试章节内容生成...');
    const chapterResponse = await axios.post(`${BASE_URL}/novels/${novelId}/chapters/1/generate`, {
      wordCount: 2000,
      style: '详细描述，对话生动'
    });
    console.log('✅ 章节生成成功:', chapterResponse.data);
    console.log();
    
    // 6. 测试获取小说详情
    console.log('6. 测试获取小说详情...');
    const novelDetailResponse = await axios.get(`${BASE_URL}/novels/${novelId}`);
    console.log('✅ 获取小说详情成功:', novelDetailResponse.data);
    console.log();
    
    // 7. 测试上下文管理
    console.log('7. 测试上下文管理...');
    const contextResponse = await axios.get(`${BASE_URL}/context/author-agent`);
    console.log('✅ 获取上下文成功:', contextResponse.data);
    console.log();
    
    // 8. 测试搜索功能
    console.log('8. 测试搜索功能...');
    const searchResponse = await axios.post(`${BASE_URL}/search`, {
      query: '时空穿越',
      type: 'content'
    });
    console.log('✅ 搜索功能测试成功:', searchResponse.data);
    console.log();
    
    console.log('🎉 所有Agent功能测试完成！系统运行正常。');
    
    return {
      success: true,
      novelId,
      message: '所有测试通过'
    };
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 测试Agent协作流程
 */
async function testAgentCollaboration() {
  console.log('\n🤝 开始测试Agent协作流程...\n');
  
  try {
    // 创建一个复杂的小说项目来测试协作
    const collaborationNovel = {
      title: '协作测试：魔法学院',
      genre: '奇幻',
      description: '一个关于魔法学院的奇幻故事，需要多个Agent协作完成',
      targetLength: 80000,
      style: '奇幻风格，世界观宏大'
    };
    
    console.log('1. 创建协作测试项目...');
    const novelResponse = await axios.post(`${BASE_URL}/novels`, collaborationNovel);
    const novelId = novelResponse.data.data.id;
    console.log('✅ 协作项目创建成功');
    
    console.log('2. 测试大纲编辑Agent...');
    const outlineResponse = await axios.post(`${BASE_URL}/novels/${novelId}/outline`, {
      chapters: 15,
      detailLevel: 'comprehensive'
    });
    console.log('✅ 大纲编辑Agent工作完成');
    
    console.log('3. 测试作者Agent生成内容...');
    const authorResponse = await axios.post(`${BASE_URL}/novels/${novelId}/chapters/1/generate`, {
      wordCount: 3000,
      style: '详细的世界观描述'
    });
    console.log('✅ 作者Agent内容生成完成');
    
    console.log('4. 测试风格编辑Agent...');
    const styleResponse = await axios.post(`${BASE_URL}/novels/${novelId}/chapters/1/edit`, {
      editType: 'style',
      instructions: '优化文字表达，增强代入感'
    });
    console.log('✅ 风格编辑Agent优化完成');
    
    console.log('🎉 Agent协作流程测试完成！');
    
    return {
      success: true,
      novelId,
      message: 'Agent协作测试通过'
    };
    
  } catch (error) {
    console.error('❌ 协作测试失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 运行测试
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🧪 AI小说生成器系统测试');
  console.log('='.repeat(60));
  
  const functionalityResult = await testAgentFunctionality();
  const collaborationResult = await testAgentCollaboration();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  console.log('功能测试:', functionalityResult.success ? '✅ 通过' : '❌ 失败');
  console.log('协作测试:', collaborationResult.success ? '✅ 通过' : '❌ 失败');
  
  if (functionalityResult.success && collaborationResult.success) {
    console.log('\n🎉 恭喜！AI小说生成器系统所有测试通过！');
    console.log('系统已准备好投入使用。');
  } else {
    console.log('\n⚠️  部分测试失败，请检查系统配置。');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testAgentFunctionality,
  testAgentCollaboration,
  runAllTests
};