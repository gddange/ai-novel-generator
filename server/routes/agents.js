const express = require('express');
const router = express.Router();
const AgentManager = require('../agents/AgentManager');

// 创建全局agent管理器实例
const agentManager = new AgentManager();

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
    const { title, genre, theme, description } = req.body;
    
    if (!title || !genre || !theme) {
      return res.status(400).json({
        success: false,
        error: '标题、类型和主题为必填项'
      });
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
      io.emit('project-started', result);
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
      io.emit('planning-completed', result);
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
      io.emit('writing-progress', result);
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
    if (io) {
      io.emit('workflow-started', { title, genre, theme });
    }

    const result = await agentManager.executeFullWorkflow({
      title,
      genre,
      theme,
      description
    });

    // 通过Socket.IO发送完成通知
    if (io) {
      io.emit('workflow-completed', result);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    // 通过Socket.IO发送错误通知
    const io = req.app.get('io');
    if (io) {
      io.emit('workflow-error', { error: error.message });
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

module.exports = router;