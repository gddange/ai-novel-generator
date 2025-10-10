const express = require('express');
const router = express.Router();
const ContextManager = require('../utils/ContextManager');

// 创建上下文管理器实例
const contextManager = new ContextManager('global');

/**
 * 获取上下文信息
 */
router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agentContextManager = new ContextManager(agentId);
    const context = agentContextManager.getContext();
    
    res.json({
      success: true,
      data: {
        agentId,
        context,
        contextLength: context.length,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('获取上下文失败:', error);
    res.status(500).json({
      success: false,
      message: '获取上下文失败',
      error: error.message
    });
  }
});

/**
 * 添加消息到上下文
 */
router.post('/:agentId/message', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { content, importance = 1, type = 'message' } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }
    
    const agentContextManager = new ContextManager(agentId);
    agentContextManager.addMessage({
      id: require('uuid').v4(),
      content,
      timestamp: new Date(),
      importance,
      type
    });
    
    res.json({
      success: true,
      message: '消息已添加到上下文',
      data: {
        agentId,
        messageAdded: true
      }
    });
  } catch (error) {
    console.error('添加消息到上下文失败:', error);
    res.status(500).json({
      success: false,
      message: '添加消息失败',
      error: error.message
    });
  }
});

/**
 * 压缩上下文
 */
router.post('/:agentId/compress', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agentContextManager = new ContextManager(agentId);
    
    await agentContextManager.compressContext();
    
    res.json({
      success: true,
      message: '上下文压缩完成',
      data: {
        agentId,
        compressed: true,
        newContextLength: agentContextManager.getContext().length
      }
    });
  } catch (error) {
    console.error('压缩上下文失败:', error);
    res.status(500).json({
      success: false,
      message: '压缩上下文失败',
      error: error.message
    });
  }
});

/**
 * 清空上下文
 */
router.delete('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agentContextManager = new ContextManager(agentId);
    
    agentContextManager.clearContext();
    
    res.json({
      success: true,
      message: '上下文已清空',
      data: {
        agentId,
        cleared: true
      }
    });
  } catch (error) {
    console.error('清空上下文失败:', error);
    res.status(500).json({
      success: false,
      message: '清空上下文失败',
      error: error.message
    });
  }
});

/**
 * 获取上下文统计信息
 */
router.get('/:agentId/stats', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agentContextManager = new ContextManager(agentId);
    const context = agentContextManager.getContext();
    
    const stats = {
      agentId,
      totalMessages: context.length,
      totalCharacters: context.reduce((sum, msg) => sum + (msg.content?.length || 0), 0),
      averageImportance: context.length > 0 
        ? context.reduce((sum, msg) => sum + (msg.importance || 0), 0) / context.length 
        : 0,
      messageTypes: {},
      timeRange: {
        earliest: null,
        latest: null
      }
    };
    
    // 统计消息类型
    context.forEach(msg => {
      const type = msg.type || 'unknown';
      stats.messageTypes[type] = (stats.messageTypes[type] || 0) + 1;
      
      // 更新时间范围
      if (msg.timestamp) {
        const timestamp = new Date(msg.timestamp);
        if (!stats.timeRange.earliest || timestamp < stats.timeRange.earliest) {
          stats.timeRange.earliest = timestamp;
        }
        if (!stats.timeRange.latest || timestamp > stats.timeRange.latest) {
          stats.timeRange.latest = timestamp;
        }
      }
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取上下文统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error.message
    });
  }
});

module.exports = router;