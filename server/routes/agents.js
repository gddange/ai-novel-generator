const express = require('express');
const router = express.Router();
const AgentManager = require('../agents/AgentManager');
const ApiKeyValidator = require('../utils/ApiKeyValidator');

// 创建全局代理管理器实例
const agentManager = new AgentManager('deepseek');

/**
 * 获取所有agent状态
 */
router.get('/status', (req, res) => {
  try {
    const status = agentManager.getCurrentState();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 开始新的小说项目
 */
router.post('/projects/start', async (req, res) => {
  try {
    const { title, genre, theme, description, apiProvider, apiKey } = req.body;
    
    console.log('📥 收到项目创建请求:', {
      title,
      genre,
      theme,
      apiProvider,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0
    });
    
    if (!title || !genre || !theme) {
      console.log('❌ 缺少必填字段');
      return res.status(400).json({
        success: false,
        error: '标题、类型和主题为必填项'
      });
    }

    if (!apiKey) {
      console.log('❌ 缺少API Key');
      return res.status(400).json({
        success: false,
        error: 'API Key为必填项'
      });
    }

    // 验证API Key格式
    console.log('🔍 开始验证API Key...');
    const validation = ApiKeyValidator.validateApiKey(apiKey, apiProvider || 'deepseek');
    console.log('🔍 验证结果:', validation);
    
    if (!validation.valid) {
      console.log('❌ API Key验证失败:', validation.error);
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    console.log(`🔑 使用${apiProvider || 'deepseek'}服务，API Key: ${ApiKeyValidator.maskApiKey(apiKey)}`);

    // 设置API提供商和API Key
    if (apiProvider) {
      agentManager.setApiProvider(apiProvider, validation.sanitized);
    }

    const result = await agentManager.startNewProject({
      title,
      genre,
      theme,
      description
    });

    // 通过Socket.IO通知前端
    const io = req.app.get('io');
    if (io) {
      io.to(result.projectId).emit('project-started', result);
      console.log(`📡 发送project-started事件到房间: ${result.projectId}`);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ 项目创建失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 执行大纲制定阶段
 */
router.post('/projects/:projectId/planning', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // 如果当前项目ID不匹配，尝试加载项目
    if (!agentManager.currentProject || agentManager.currentProject.id !== projectId) {
      await agentManager.loadProject(projectId);
    }

    const result = await agentManager.executePlanningPhase();

    // 通过Socket.IO通知前端
    const io = req.app.get('io');
    if (io) {
      io.to(projectId).emit('planning-completed', result);
      console.log(`📡 发送planning-completed事件到房间: ${projectId}`);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 执行写作阶段
 */
router.post('/projects/:projectId/writing', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { chaptersToWrite = 3 } = req.body;
    
    // 如果当前项目ID不匹配，尝试加载项目
    if (!agentManager.currentProject || agentManager.currentProject.id !== projectId) {
      await agentManager.loadProject(projectId);
    }

    const result = await agentManager.executeWritingPhase(chaptersToWrite);

    // 通过Socket.IO通知前端
    const io = req.app.get('io');
    if (io) {
      io.to(projectId).emit('writing-progress', result);
      console.log(`📡 发送writing-progress事件到房间: ${projectId}`);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 执行完整工作流程
 */
router.post('/projects/workflow', async (req, res) => {
  try {
    const { title, genre, theme, description } = req.body;
    
    if (!title || !genre || !theme) {
      return res.status(400).json({
        success: false,
        error: '标题、类型和主题为必填项'
      });
    }

    // 通过Socket.IO发送开始通知
    const io = req.app.get('io');
    let projectId = null;
    
    const result = await agentManager.executeFullWorkflow({
      title,
      genre,
      theme,
      description
    });
    
    projectId = result.projectId;
    
    if (io && projectId) {
      io.to(projectId).emit('workflow-started', { title, genre, theme });
      console.log(`📡 发送workflow-started事件到房间: ${projectId}`);
    }

    // 通过Socket.IO发送完成通知
    if (io && projectId) {
      io.to(projectId).emit('workflow-completed', result);
      console.log(`📡 发送workflow-completed事件到房间: ${projectId}`);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    // 通过Socket.IO发送错误通知
    const io = req.app.get('io');
    if (io) {
      // 如果有项目ID，发送到特定房间，否则广播
      if (agentManager.currentProject?.id) {
        io.to(agentManager.currentProject.id).emit('workflow-error', { error: error.message });
        console.log(`📡 发送workflow-error事件到房间: ${agentManager.currentProject.id}`);
      } else {
        io.emit('workflow-error', { error: error.message });
        console.log('📡 广播workflow-error事件');
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取项目统计信息
 */
router.get('/projects/:projectId/stats', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // 如果当前项目ID不匹配，尝试加载项目
    if (!agentManager.currentProject || agentManager.currentProject.id !== projectId) {
      await agentManager.loadProject(projectId);
    }

    const stats = agentManager.getProjectStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取所有项目列表
 */
router.get('/projects', async (req, res) => {
  try {
    const projects = await agentManager.getProjectList();
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 加载特定项目
 */
router.get('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await agentManager.loadProject(projectId);
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: '项目不存在或加载失败'
    });
  }
});

/**
 * 获取特定agent的详细信息
 */
router.get('/:agentType/info', (req, res) => {
  try {
    const { agentType } = req.params;
    let agent;
    
    switch (agentType) {
      case 'author':
        agent = agentManager.author;
        break;
      case 'outline-editor':
        agent = agentManager.outlineEditor;
        break;
      case 'style-editor':
        agent = agentManager.styleEditor;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '无效的agent类型'
        });
    }

    const info = {
      status: agent.getStatus(),
      context: agent.getContext(),
      stats: agent.getWritingStats ? agent.getWritingStats() : 
             agent.getOutlineStats ? agent.getOutlineStats() :
             agent.getPolishStats ? agent.getPolishStats() : {}
    };

    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 重置agent状态
 */
router.post('/reset', (req, res) => {
  try {
    agentManager.reset();
    
    res.json({
      success: true,
      message: '所有agent状态已重置'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取agent之间的通信历史
 */
router.get('/communications', (req, res) => {
  try {
    const communications = [];
    
    // 从各agent的上下文中提取通信记录
    [agentManager.author, agentManager.outlineEditor, agentManager.styleEditor].forEach(agent => {
      const context = agent.getContext();
      context.recent.forEach(msg => {
        if (msg.content.includes('通信:') || msg.content.includes('收到')) {
          communications.push({
            agent: agent.name,
            message: msg.content,
            timestamp: msg.timestamp,
            importance: msg.importance
          });
        }
      });
    });

    // 按时间排序
    communications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: communications.slice(0, 50) // 返回最近50条通信记录
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/projects/:projectId/outline/rewrite', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { newRequirements = '', options = {}, apiProvider, apiKey } = req.body;

    // 确保加载项目
    if (!agentManager.currentProject || agentManager.currentProject.id !== projectId) {
      await agentManager.loadProject(projectId);
    }

    // 可选：更新API提供商与Key
    if (apiKey) {
      const validation = ApiKeyValidator.validateApiKey(apiKey, apiProvider || agentManager.apiProvider || 'deepseek');
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
      }
      agentManager.setApiProvider(apiProvider || 'deepseek', validation.sanitized);
    }

    // 调用重写方法
    const rewrittenText = await agentManager.outlineEditor.rewriteOutline(
      newRequirements,
      agentManager.currentProject,
      options
    );

    // 更新项目和待写章节
    agentManager.currentProject.outline = rewrittenText;
    agentManager.currentProject.outlineDiscussion = agentManager.currentProject.outlineDiscussion || {};
    agentManager.currentProject.outlineDiscussion.rewrittenRequirements = newRequirements;
    agentManager.currentProject.outlineDiscussion.lastRewriteAt = new Date().toISOString();

    const parsedOutline = agentManager.outlineEditor.parseOutline(rewrittenText);
    agentManager.outlineEditor.currentOutline = parsedOutline;
    agentManager.pendingChapters = parsedOutline.chapters.map(ch => ({
      number: ch.number,
      title: ch.title,
      outline: ch.outline || ch.content,
      status: 'pending'
    }));

    await agentManager.saveProject();

    // Socket通知
    const io = req.app.get('io');
    if (io) {
      io.to(projectId).emit('outline-rewritten', {
        projectId,
        outline: rewrittenText,
        stats: agentManager.outlineEditor.getOutlineStats()
      });
    }

    res.json({
      success: true,
      data: {
        outline: rewrittenText,
        stats: agentManager.outlineEditor.getOutlineStats()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;