const axios = require('axios');

/**
 * 搜索引擎服务
 * 为作者和大纲编辑提供资料查询能力
 */
class SearchService {
    constructor() {
        this.searchHistory = new Map();
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30分钟缓存
    }

    /**
     * 执行搜索查询
     * @param {string} query - 搜索关键词
     * @param {string} type - 搜索类型 (general, character, plot, setting, historical)
     * @param {string} agentId - 发起搜索的agent ID
     * @returns {Promise<Object>} 搜索结果
     */
    async search(query, type = 'general', agentId = 'unknown') {
        try {
            // 检查缓存
            const cacheKey = `${query}_${type}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                this.recordSearch(agentId, query, type, 'cache');
                return cached;
            }

            // 根据搜索类型优化查询
            const optimizedQuery = this.optimizeQuery(query, type);
            
            // 执行搜索
            const results = await this.performSearch(optimizedQuery, type);
            
            // 缓存结果
            this.setCache(cacheKey, results);
            
            // 记录搜索历史
            this.recordSearch(agentId, query, type, 'success');
            
            return results;
        } catch (error) {
            console.error('搜索失败:', error);
            this.recordSearch(agentId, query, type, 'error');
            
            return {
                success: false,
                error: error.message,
                query,
                type,
                results: []
            };
        }
    }

    /**
     * 根据类型优化搜索查询
     * @param {string} query - 原始查询
     * @param {string} type - 搜索类型
     * @returns {string} 优化后的查询
     */
    optimizeQuery(query, type) {
        const typeKeywords = {
            character: ['人物', '角色', '性格', '背景'],
            plot: ['情节', '剧情', '故事', '发展'],
            setting: ['背景', '环境', '设定', '世界观'],
            historical: ['历史', '史实', '年代', '事件'],
            general: []
        };

        const keywords = typeKeywords[type] || [];
        
        // 为特定类型添加相关关键词
        if (keywords.length > 0) {
            return `${query} ${keywords[0]}`;
        }
        
        return query;
    }

    /**
     * 执行实际搜索
     * @param {string} query - 搜索查询
     * @param {string} type - 搜索类型
     * @returns {Promise<Object>} 搜索结果
     */
    async performSearch(query, type) {
        // 模拟搜索引擎API调用
        // 在实际应用中，这里应该调用真实的搜索API
        
        const mockResults = await this.getMockSearchResults(query, type);
        
        return {
            success: true,
            query,
            type,
            results: mockResults,
            timestamp: new Date(),
            source: 'mock_search_engine'
        };
    }

    /**
     * 获取模拟搜索结果
     * @param {string} query - 搜索查询
     * @param {string} type - 搜索类型
     * @returns {Promise<Array>} 模拟结果
     */
    async getMockSearchResults(query, type) {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

        const baseResults = [
            {
                title: `关于"${query}"的详细介绍`,
                snippet: `${query}是一个重要的概念，在文学创作中经常被使用。它具有丰富的内涵和多层次的含义...`,
                url: `https://example.com/search/${encodeURIComponent(query)}`,
                source: '百科全书',
                relevance: 0.95
            },
            {
                title: `${query}的历史发展`,
                snippet: `从历史角度来看，${query}经历了多个发展阶段。早期的形式与现代理解有所不同...`,
                url: `https://history.example.com/${encodeURIComponent(query)}`,
                source: '历史资料库',
                relevance: 0.88
            },
            {
                title: `${query}在文学作品中的应用`,
                snippet: `许多著名作家都在作品中运用了${query}这一元素。通过分析这些作品，我们可以看到...`,
                url: `https://literature.example.com/${encodeURIComponent(query)}`,
                source: '文学研究',
                relevance: 0.92
            }
        ];

        // 根据搜索类型调整结果
        switch (type) {
            case 'character':
                return this.generateCharacterResults(query);
            case 'plot':
                return this.generatePlotResults(query);
            case 'setting':
                return this.generateSettingResults(query);
            case 'historical':
                return this.generateHistoricalResults(query);
            default:
                return baseResults;
        }
    }

    /**
     * 生成角色相关搜索结果
     */
    generateCharacterResults(query) {
        return [
            {
                title: `${query}角色分析`,
                snippet: `${query}作为一个角色类型，通常具有以下特征：性格复杂、动机明确、成长轨迹清晰。在塑造此类角色时，需要注意...`,
                url: `https://character.example.com/${encodeURIComponent(query)}`,
                source: '角色创作指南',
                relevance: 0.96
            },
            {
                title: `经典${query}角色案例`,
                snippet: `文学史上有许多成功的${query}角色，如《红楼梦》中的林黛玉、《三国演义》中的诸葛亮等...`,
                url: `https://classics.example.com/characters/${encodeURIComponent(query)}`,
                source: '经典文学',
                relevance: 0.91
            },
            {
                title: `${query}角色的心理描写技巧`,
                snippet: `要成功塑造${query}这类角色，心理描写是关键。可以通过内心独白、行为细节、对话等方式...`,
                url: `https://writing.example.com/psychology/${encodeURIComponent(query)}`,
                source: '写作技巧',
                relevance: 0.89
            }
        ];
    }

    /**
     * 生成情节相关搜索结果
     */
    generatePlotResults(query) {
        return [
            {
                title: `${query}情节结构分析`,
                snippet: `${query}类型的情节通常遵循特定的结构模式：起因、发展、高潮、结局。每个阶段都有其独特的功能...`,
                url: `https://plot.example.com/structure/${encodeURIComponent(query)}`,
                source: '情节分析',
                relevance: 0.94
            },
            {
                title: `如何设计${query}情节`,
                snippet: `设计${query}情节时，需要考虑以下要素：冲突设置、节奏控制、转折点安排、伏笔铺设...`,
                url: `https://writing.example.com/plot-design/${encodeURIComponent(query)}`,
                source: '创作指导',
                relevance: 0.92
            },
            {
                title: `${query}情节的常见问题及解决方案`,
                snippet: `在创作${query}情节时，作者常遇到的问题包括：逻辑漏洞、节奏拖沓、高潮不够等...`,
                url: `https://problems.example.com/plot/${encodeURIComponent(query)}`,
                source: '创作问题解答',
                relevance: 0.87
            }
        ];
    }

    /**
     * 生成设定相关搜索结果
     */
    generateSettingResults(query) {
        return [
            {
                title: `${query}世界观设定`,
                snippet: `构建${query}类型的世界观时，需要考虑地理环境、社会制度、文化背景、科技水平等多个维度...`,
                url: `https://worldbuilding.example.com/${encodeURIComponent(query)}`,
                source: '世界观构建',
                relevance: 0.95
            },
            {
                title: `${query}背景的历史考证`,
                snippet: `为了让${query}背景更加真实可信，需要进行详细的历史考证，包括时代特征、社会风貌...`,
                url: `https://research.example.com/background/${encodeURIComponent(query)}`,
                source: '历史考证',
                relevance: 0.90
            },
            {
                title: `${query}环境描写技巧`,
                snippet: `描写${query}环境时，要注意调动读者的五感体验，通过视觉、听觉、嗅觉等细节...`,
                url: `https://description.example.com/${encodeURIComponent(query)}`,
                source: '描写技巧',
                relevance: 0.88
            }
        ];
    }

    /**
     * 生成历史相关搜索结果
     */
    generateHistoricalResults(query) {
        return [
            {
                title: `${query}的历史背景`,
                snippet: `${query}发生在特定的历史时期，当时的政治、经济、文化环境对事件的发展产生了重要影响...`,
                url: `https://history.example.com/background/${encodeURIComponent(query)}`,
                source: '史学研究',
                relevance: 0.97
            },
            {
                title: `${query}相关史料文献`,
                snippet: `关于${query}的史料记载主要见于《史记》、《资治通鉴》等史书，以及相关的碑刻、文物...`,
                url: `https://documents.example.com/${encodeURIComponent(query)}`,
                source: '史料文献',
                relevance: 0.93
            },
            {
                title: `${query}的历史影响`,
                snippet: `${query}对后世产生了深远影响，不仅改变了当时的政治格局，也影响了文化发展...`,
                url: `https://impact.example.com/${encodeURIComponent(query)}`,
                source: '历史影响研究',
                relevance: 0.89
            }
        ];
    }

    /**
     * 获取搜索建议
     * @param {string} partialQuery - 部分查询词
     * @param {string} type - 搜索类型
     * @returns {Array} 搜索建议
     */
    getSearchSuggestions(partialQuery, type = 'general') {
        const suggestions = {
            character: [
                '主角性格设定', '反派角色塑造', '配角作用', '角色关系网',
                '人物成长弧线', '角色对话风格', '人物背景故事'
            ],
            plot: [
                '三幕式结构', '冲突设计', '情节转折', '悬念设置',
                '伏笔铺设', '高潮设计', '结局安排'
            ],
            setting: [
                '世界观构建', '时代背景', '地理环境', '社会制度',
                '文化设定', '科技水平', '魔法体系'
            ],
            historical: [
                '古代社会', '历史事件', '文化传统', '服饰礼仪',
                '建筑风格', '生活习俗', '政治制度'
            ],
            general: [
                '小说创作技巧', '文学理论', '写作方法', '故事结构',
                '人物塑造', '环境描写', '对话技巧'
            ]
        };

        const typeSuggestions = suggestions[type] || suggestions.general;
        
        // 过滤匹配的建议
        return typeSuggestions.filter(suggestion => 
            suggestion.includes(partialQuery) || 
            partialQuery.length < 2
        ).slice(0, 5);
    }

    /**
     * 获取搜索历史
     * @param {string} agentId - Agent ID
     * @param {number} limit - 返回数量限制
     * @returns {Array} 搜索历史
     */
    getSearchHistory(agentId, limit = 10) {
        const history = this.searchHistory.get(agentId) || [];
        return history.slice(-limit).reverse();
    }

    /**
     * 清除搜索历史
     * @param {string} agentId - Agent ID
     */
    clearSearchHistory(agentId) {
        this.searchHistory.delete(agentId);
    }

    /**
     * 记录搜索
     * @private
     */
    recordSearch(agentId, query, type, status) {
        if (!this.searchHistory.has(agentId)) {
            this.searchHistory.set(agentId, []);
        }
        
        const history = this.searchHistory.get(agentId);
        history.push({
            query,
            type,
            status,
            timestamp: new Date(),
            id: Date.now() + Math.random()
        });
        
        // 限制历史记录数量
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }
    }

    /**
     * 缓存管理
     * @private
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        
        // 清理过期缓存
        if (this.cache.size > 1000) {
            this.cleanCache();
        }
    }

    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheExpiry) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * 获取搜索统计
     * @param {string} agentId - Agent ID
     * @returns {Object} 搜索统计
     */
    getSearchStats(agentId) {
        const history = this.searchHistory.get(agentId) || [];
        const today = new Date().toDateString();
        
        const todaySearches = history.filter(h => 
            new Date(h.timestamp).toDateString() === today
        );
        
        const typeStats = {};
        history.forEach(h => {
            typeStats[h.type] = (typeStats[h.type] || 0) + 1;
        });
        
        return {
            totalSearches: history.length,
            todaySearches: todaySearches.length,
            typeBreakdown: typeStats,
            successRate: history.length > 0 ? 
                history.filter(h => h.status === 'success').length / history.length : 0,
            lastSearch: history.length > 0 ? history[history.length - 1] : null
        };
    }
}

module.exports = SearchService;