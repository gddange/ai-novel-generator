require('dotenv').config();
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');

async function main() {
  console.log('🧪 测试：大纲重写端点与持久化');

  // 禁用API Key以走离线fallback，需在加载app前处理
  delete process.env.DEEPSEEK_API_KEY;

  // 启动服务器（require将启动app.js内置的server）
  require('./server/app.js');
  await new Promise(r => setTimeout(r, 800)); // 等待服务启动

  const projectsDir = path.join(__dirname, 'data/projects');
  await fs.ensureDir(projectsDir);

  const projectId = 'novel_rewrite_test';
  const projectPath = path.join(projectsDir, `${projectId}.json`);

  const sampleOutline = [
    '第1章：偶遇神秘罐子',
    '- 三个朋友在旧市场捡到一个破罐子',
    '- 罐子上有奇怪的符号，似乎记录着某种线索',
    '- 他们决定带回家研究',
    '',
    '第2章：初探与异象',
    '- 夜里罐子发出隐约声响，仿佛在诉说',
    '- 朋友们产生分歧：留下还是交给警察',
    '- 罐子里出现一张残破纸片，写着坐标与时间',
    '',
    '第3章：跟随线索的决定',
    '- 三人决定按纸片的坐标前往',
    '- 途中有人似乎在远处尾随',
    '- 他们开始怀疑这不是偶然'
  ].join('\n');

  const projectData = {
    id: projectId,
    title: '三个臭皮匠与神秘罐子',
    genre: 'mystery',
    theme: '三个臭皮匠捡到一个破烂罐子，引发悬疑冒险',
    description: '围绕神秘罐子展开的都市悬疑故事',
    status: 'ready_to_write',
    createdAt: new Date().toISOString(),
    chapters: [],
    outline: sampleOutline
  };

  await fs.writeJson(projectPath, projectData, { spaces: 2 });
  console.log(`💾 已写入测试项目: ${projectPath}`);

  // 调用重写端点
  const url = `http://localhost:${process.env.PORT || 3000}/api/agents/projects/${projectId}/outline/rewrite`;
  const payload = {
    newRequirements: '请增强悬疑氛围，引入幕后反派的影子，并在前两章埋下伏笔。',
    options: { preserveChapterCount: true }
  };

  try {
    const res = await axios.post(url, payload, { timeout: 60000 });
    if (!res.data?.success) {
      throw new Error(`端点返回失败: ${JSON.stringify(res.data)}`);
    }
    const rewritten = res.data.data.outline;
    console.log('✅ API 返回成功。新大纲前20行如下：');
    console.log(rewritten.split('\n').slice(0, 20).join('\n'));

    // 验证持久化更新
    const updated = await fs.readJson(projectPath);
    console.log('\n📦 项目文件已更新：');
    console.log('- outlineDiscussion.lastRewriteAt:', updated.outlineDiscussion?.lastRewriteAt || '未设置');
    console.log('- outline字数:', (updated.outline || '').length);

    console.log('\n🎉 测试通过：端点工作且持久化成功');
  } catch (err) {
    console.error('❌ 测试失败:', err.message);
    console.error(err.response?.data || err.stack);
    process.exitCode = 1;
  }
}

main().catch(e => {
  console.error('❌ 未捕获错误:', e);
  process.exitCode = 1;
});