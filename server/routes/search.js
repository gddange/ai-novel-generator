const express = require('express');
const router = express.Router();
const SearchService = require('../services/SearchService');

const searchService = new SearchService();

/**
 * 通用搜索接口 - 支持POST /api/search
 */
router.post('/', async (req, res) => {
  try {
    const { query, type = 'content', agentId = 'unknown' } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词不能为空'
      });
    }

    const results = await searchService.search(query.trim(), type, agentId);
    
    res.json({
      success: true,
      data: results,
      message: '搜索完成'
    });
  } catch (error) {
    console.error('搜索失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索失败',
      error: error.message
    });
  }
});

/**
 * 执行搜索查询
 */
router.post('/query', async (req, res) => {
  try {
    const { query, type = 'general', agentId = 'unknown' } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '搜索关键词不能为空'
      });
    }

    const results = await searchService.search(query.trim(), type, agentId);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('搜索查询失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取搜索建议
 */
router.get('/suggestions', (req, res) => {
  try {
    const { q: partialQuery = '', type = 'general' } = req.query;
    
    const suggestions = searchService.getSearchSuggestions(partialQuery, type);
    
    res.json({
      success: true,
      data: {
        query: partialQuery,
        type,
        suggestions
      }
    });
  } catch (error) {
    console.error('获取搜索建议失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取搜索历史
 */
router.get('/history/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 10 } = req.query;
    
    const history = searchService.getSearchHistory(agentId, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        agentId,
        history,
        total: history.length
      }
    });
  } catch (error) {
    console.error('获取搜索历史失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 清除搜索历史
 */
router.delete('/history/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    
    searchService.clearSearchHistory(agentId);
    
    res.json({
      success: true,
      message: '搜索历史已清除'
    });
  } catch (error) {
    console.error('清除搜索历史失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取搜索统计
 */
router.get('/stats/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    
    const stats = searchService.getSearchStats(agentId);
    
    res.json({
      success: true,
      data: {
        agentId,
        stats
      }
    });
  } catch (error) {
    console.error('获取搜索统计失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量搜索
 */
router.post('/batch', async (req, res) => {
  try {
    const { queries, type = 'general', agentId = 'unknown' } = req.body;
    
    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({
        success: false,
        error: '查询列表不能为空'
      });
    }

    if (queries.length > 10) {
      return res.status(400).json({
        success: false,
        error: '批量搜索最多支持10个查询'
      });
    }

    const results = await Promise.all(
      queries.map(query => searchService.search(query.trim(), type, agentId))
    );
    
    res.json({
      success: true,
      data: {
        queries,
        results,
        total: results.length
      }
    });
  } catch (error) {
    console.error('批量搜索失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 搜索类型信息
 */
router.get('/types', (req, res) => {
  try {
    const searchTypes = [
      {
        id: 'general',
        name: '通用搜索',
        description: '适用于一般性的资料查询',
        icon: 'fas fa-search'
      },
      {
        id: 'character',
        name: '角色相关',
        description: '人物塑造、性格设定、角色关系等',
        icon: 'fas fa-user'
      },
      {
        id: 'plot',
        name: '情节相关',
        description: '故事结构、情节发展、冲突设计等',
        icon: 'fas fa-book'
      },
      {
        id: 'setting',
        name: '设定相关',
        description: '世界观、背景环境、文化设定等',
        icon: 'fas fa-globe'
      },
      {
        id: 'historical',
        name: '历史相关',
        description: '历史事件、文化背景、时代特征等',
        icon: 'fas fa-history'
      }
    ];
    
    res.json({
      success: true,
      data: {
        types: searchTypes,
        total: searchTypes.length
      }
    });
  } catch (error) {
    console.error('获取搜索类型失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 搜索服务状态
 */
router.get('/status', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        status: 'running',
        version: '1.0.0',
        features: [
          'general_search',
          'typed_search',
          'search_suggestions',
          'search_history',
          'batch_search',
          'search_cache'
        ],
        cache: {
          size: searchService.cache.size,
          maxSize: 1000
        },
        uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('获取搜索服务状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;