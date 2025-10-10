const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const projectsDir = path.join(__dirname, '../../data/projects');

// 确保项目目录存在
fs.ensureDirSync(projectsDir);

/**
 * 创建新小说项目
 */
router.post('/', async (req, res) => {
  try {
    const { title, genre, description, targetLength, style } = req.body;
    
    if (!title || !genre || !description) {
      return res.status(400).json({
        success: false,
        message: '标题、类型和描述是必填项'
      });
    }
    
    const projectId = uuidv4();
    const projectData = {
      id: projectId,
      title,
      genre,
      description,
      targetLength: targetLength || 50000,
      style: style || '现代风格',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'planning',
      outline: null,
      chapters: [],
      metadata: {
        wordCount: 0,
        chapterCount: 0,
        completionRate: 0
      }
    };
    
    const projectPath = path.join(projectsDir, `${projectId}.json`);
    await fs.writeJson(projectPath, projectData, { spaces: 2 });
    
    res.json({
      success: true,
      message: '小说项目创建成功',
      data: projectData
    });
  } catch (error) {
    console.error('创建项目失败:', error);
    res.status(500).json({
      success: false,
      message: '创建项目失败',
      error: error.message
    });
  }
});

/**
 * 获取所有小说项目
 */
router.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(projectsDir);
    const projects = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const projectPath = path.join(projectsDir, file);
        const projectData = await fs.readJson(projectPath);
        projects.push({
          id: projectData.id,
          title: projectData.title,
          genre: projectData.genre,
          description: projectData.description,
          status: projectData.status,
          createdAt: projectData.createdAt,
          updatedAt: projectData.updatedAt,
          metadata: projectData.metadata
        });
      }
    }
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目列表失败',
      error: error.message
    });
  }
});

/**
 * 获取单个小说项目详情
 */
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectPath = path.join(projectsDir, `${projectId}.json`);
    
    if (!await fs.pathExists(projectPath)) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }
    
    const projectData = await fs.readJson(projectPath);
    
    res.json({
      success: true,
      data: projectData
    });
  } catch (error) {
    console.error('获取项目详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目详情失败',
      error: error.message
    });
  }
});

/**
 * 生成小说大纲
 */
router.post('/:projectId/outline', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { chapters = 10, detailLevel = 'basic' } = req.body;
    
    const projectPath = path.join(projectsDir, `${projectId}.json`);
    
    if (!await fs.pathExists(projectPath)) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }
    
    const projectData = await fs.readJson(projectPath);
    
    // 模拟大纲生成
    const outline = {
      totalChapters: chapters,
      detailLevel,
      chapters: []
    };
    
    for (let i = 1; i <= chapters; i++) {
      outline.chapters.push({
        number: i,
        title: `第${i}章`,
        summary: `第${i}章的情节概要，根据${projectData.description}展开`,
        keyEvents: [`事件${i}-1`, `事件${i}-2`],
        characters: ['主角', '配角'],
        estimatedWordCount: Math.floor(projectData.targetLength / chapters)
      });
    }
    
    projectData.outline = outline;
    projectData.status = 'outlined';
    projectData.updatedAt = new Date().toISOString();
    
    await fs.writeJson(projectPath, projectData, { spaces: 2 });
    
    res.json({
      success: true,
      message: '大纲生成成功',
      data: outline
    });
  } catch (error) {
    console.error('生成大纲失败:', error);
    res.status(500).json({
      success: false,
      message: '生成大纲失败',
      error: error.message
    });
  }
});

/**
 * 生成章节内容
 */
router.post('/:projectId/chapters/:chapterNumber/generate', async (req, res) => {
  try {
    const { projectId, chapterNumber } = req.params;
    const { wordCount = 2000, style } = req.body;
    
    const projectPath = path.join(projectsDir, `${projectId}.json`);
    
    if (!await fs.pathExists(projectPath)) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }
    
    const projectData = await fs.readJson(projectPath);
    const chapterNum = parseInt(chapterNumber);
    
    // 模拟章节内容生成
    const chapterContent = {
      number: chapterNum,
      title: `第${chapterNum}章`,
      content: `这是第${chapterNum}章的内容。根据项目描述"${projectData.description}"，本章将展开相关情节。\n\n本章采用${style || projectData.style}的写作风格，字数约${wordCount}字。\n\n[这里是章节的具体内容...]`,
      wordCount: wordCount,
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 更新项目数据
    if (!projectData.chapters) {
      projectData.chapters = [];
    }
    
    const existingChapterIndex = projectData.chapters.findIndex(ch => ch.number === chapterNum);
    if (existingChapterIndex >= 0) {
      projectData.chapters[existingChapterIndex] = chapterContent;
    } else {
      projectData.chapters.push(chapterContent);
    }
    
    // 更新元数据
    projectData.metadata.chapterCount = projectData.chapters.length;
    projectData.metadata.wordCount = projectData.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
    projectData.status = 'writing';
    projectData.updatedAt = new Date().toISOString();
    
    await fs.writeJson(projectPath, projectData, { spaces: 2 });
    
    res.json({
      success: true,
      message: '章节生成成功',
      data: chapterContent
    });
  } catch (error) {
    console.error('生成章节失败:', error);
    res.status(500).json({
      success: false,
      message: '生成章节失败',
      error: error.message
    });
  }
});

/**
 * 编辑章节内容
 */
router.post('/:projectId/chapters/:chapterNumber/edit', async (req, res) => {
  try {
    const { projectId, chapterNumber } = req.params;
    const { editType, instructions } = req.body;
    
    const projectPath = path.join(projectsDir, `${projectId}.json`);
    
    if (!await fs.pathExists(projectPath)) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }
    
    const projectData = await fs.readJson(projectPath);
    const chapterNum = parseInt(chapterNumber);
    
    const chapterIndex = projectData.chapters.findIndex(ch => ch.number === chapterNum);
    if (chapterIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '章节不存在'
      });
    }
    
    // 模拟编辑处理
    const chapter = projectData.chapters[chapterIndex];
    chapter.content += `\n\n[经过${editType}编辑：${instructions}]`;
    chapter.updatedAt = new Date().toISOString();
    
    projectData.updatedAt = new Date().toISOString();
    
    await fs.writeJson(projectPath, projectData, { spaces: 2 });
    
    res.json({
      success: true,
      message: '章节编辑成功',
      data: chapter
    });
  } catch (error) {
    console.error('编辑章节失败:', error);
    res.status(500).json({
      success: false,
      message: '编辑章节失败',
      error: error.message
    });
  }
});

/**
 * 获取小说章节列表
 */
router.get('/:projectId/chapters', async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectPath = path.join(projectsDir, `${projectId}.json`);
    
    if (!await fs.pathExists(projectPath)) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    const projectData = await fs.readJson(projectPath);
    const chapters = projectData.chapters || [];

    res.json({
      success: true,
      data: {
        projectId,
        title: projectData.title,
        chapters: chapters.map(ch => ({
          number: ch.number,
          title: ch.title,
          wordCount: ch.wordCount || ch.content?.length || 0,
          createdAt: ch.createdAt,
          polishedAt: ch.polishedAt,
          status: ch.polishedAt ? 'polished' : 'draft'
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取特定章节内容
 */
router.get('/:projectId/chapters/:chapterNumber', async (req, res) => {
  try {
    const { projectId, chapterNumber } = req.params;
    const chapterPath = path.join(projectsDir, projectId, 'chapters', `chapter_${chapterNumber}.md`);
    
    if (!await fs.pathExists(chapterPath)) {
      return res.status(404).json({
        success: false,
        error: '章节不存在'
      });
    }

    const chapterContent = await fs.readFile(chapterPath, 'utf8');
    
    // 解析章节内容
    const lines = chapterContent.split('\n');
    const title = lines[0].replace('# ', '');
    const content = lines.slice(1, -6).join('\n').trim(); // 移除标题和元数据
    
    // 提取元数据
    const metadataLines = lines.slice(-6);
    const metadata = {};
    metadataLines.forEach(line => {
      if (line.includes('创作时间:')) {
        metadata.createdAt = line.split('创作时间: ')[1];
      }
      if (line.includes('润色时间:')) {
        metadata.polishedAt = line.split('润色时间: ')[1];
      }
      if (line.includes('字数:')) {
        metadata.wordCount = parseInt(line.split('字数: ')[1]);
      }
    });

    res.json({
      success: true,
      data: {
        number: parseInt(chapterNumber),
        title,
        content,
        metadata
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取小说完整内容
 */
router.get('/:projectId/full', async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectPath = path.join(projectsDir, `${projectId}.json`);
    
    if (!await fs.pathExists(projectPath)) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    const projectData = await fs.readJson(projectPath);
    const chaptersDir = path.join(projectsDir, projectId, 'chapters');
    
    if (!await fs.pathExists(chaptersDir)) {
      return res.json({
        success: true,
        data: {
          projectInfo: {
            id: projectData.id,
            title: projectData.title,
            genre: projectData.genre,
            theme: projectData.theme,
            description: projectData.description
          },
          chapters: [],
          totalWords: 0
        }
      });
    }

    const chapterFiles = await fs.readdir(chaptersDir);
    const chapters = [];
    let totalWords = 0;

    // 按章节号排序
    const sortedFiles = chapterFiles
      .filter(file => file.startsWith('chapter_') && file.endsWith('.md'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/chapter_(\d+)\.md/)[1]);
        const numB = parseInt(b.match(/chapter_(\d+)\.md/)[1]);
        return numA - numB;
      });

    for (const file of sortedFiles) {
      const chapterPath = path.join(chaptersDir, file);
      const chapterContent = await fs.readFile(chapterPath, 'utf8');
      
      const lines = chapterContent.split('\n');
      const title = lines[0].replace('# ', '');
      const content = lines.slice(1, -6).join('\n').trim();
      const chapterNumber = parseInt(file.match(/chapter_(\d+)\.md/)[1]);
      
      chapters.push({
        number: chapterNumber,
        title,
        content,
        wordCount: content.length
      });
      
      totalWords += content.length;
    }

    res.json({
      success: true,
      data: {
        projectInfo: {
          id: projectData.id,
          title: projectData.title,
          genre: projectData.genre,
          theme: projectData.theme,
          description: projectData.description,
          createdAt: projectData.createdAt,
          status: projectData.status
        },
        chapters,
        totalWords,
        totalChapters: chapters.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 导出小说为不同格式
 */
router.get('/:projectId/export/:format', async (req, res) => {
  try {
    const { projectId, format } = req.params;
    const projectPath = path.join(projectsDir, `${projectId}.json`);
    
    if (!await fs.pathExists(projectPath)) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    const projectData = await fs.readJson(projectPath);
    const chaptersDir = path.join(projectsDir, projectId, 'chapters');
    
    if (!await fs.pathExists(chaptersDir)) {
      return res.status(404).json({
        success: false,
        error: '没有找到章节内容'
      });
    }

    const chapterFiles = await fs.readdir(chaptersDir);
    const sortedFiles = chapterFiles
      .filter(file => file.startsWith('chapter_') && file.endsWith('.md'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/chapter_(\d+)\.md/)[1]);
        const numB = parseInt(b.match(/chapter_(\d+)\.md/)[1]);
        return numA - numB;
      });

    let exportContent = '';
    let filename = '';

    switch (format.toLowerCase()) {
      case 'txt':
        // 纯文本格式
        exportContent = `${projectData.title}\n`;
        exportContent += `作者：AI小说生成器\n`;
        exportContent += `类型：${projectData.genre}\n`;
        exportContent += `主题：${projectData.theme}\n\n`;
        
        for (const file of sortedFiles) {
          const chapterPath = path.join(chaptersDir, file);
          const chapterContent = await fs.readFile(chapterPath, 'utf8');
          const lines = chapterContent.split('\n');
          const title = lines[0].replace('# ', '');
          const content = lines.slice(1, -6).join('\n').trim();
          
          exportContent += `${title}\n\n${content}\n\n`;
        }
        
        filename = `${projectData.title}.txt`;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        break;

      case 'md':
      case 'markdown':
        // Markdown格式
        exportContent = `# ${projectData.title}\n\n`;
        exportContent += `**作者：** AI小说生成器  \n`;
        exportContent += `**类型：** ${projectData.genre}  \n`;
        exportContent += `**主题：** ${projectData.theme}  \n\n`;
        
        if (projectData.description) {
          exportContent += `**简介：** ${projectData.description}\n\n`;
        }
        
        exportContent += `---\n\n`;
        
        for (const file of sortedFiles) {
          const chapterPath = path.join(chaptersDir, file);
          const chapterContent = await fs.readFile(chapterPath, 'utf8');
          const lines = chapterContent.split('\n');
          const title = lines[0];
          const content = lines.slice(1, -6).join('\n').trim();
          
          exportContent += `${title}\n\n${content}\n\n---\n\n`;
        }
        
        filename = `${projectData.title}.md`;
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        break;

      case 'json':
        // JSON格式
        const chapters = [];
        for (const file of sortedFiles) {
          const chapterPath = path.join(chaptersDir, file);
          const chapterContent = await fs.readFile(chapterPath, 'utf8');
          const lines = chapterContent.split('\n');
          const title = lines[0].replace('# ', '');
          const content = lines.slice(1, -6).join('\n').trim();
          const chapterNumber = parseInt(file.match(/chapter_(\d+)\.md/)[1]);
          
          chapters.push({
            number: chapterNumber,
            title,
            content,
            wordCount: content.length
          });
        }
        
        exportContent = JSON.stringify({
          projectInfo: {
            id: projectData.id,
            title: projectData.title,
            genre: projectData.genre,
            theme: projectData.theme,
            description: projectData.description,
            createdAt: projectData.createdAt,
            exportedAt: new Date()
          },
          chapters,
          stats: {
            totalChapters: chapters.length,
            totalWords: chapters.reduce((sum, ch) => sum + ch.wordCount, 0)
          }
        }, null, 2);
        
        filename = `${projectData.title}.json`;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        break;

      default:
        return res.status(400).json({
          success: false,
          error: '不支持的导出格式。支持的格式：txt, md, json'
        });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(exportContent);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取小说统计信息
 */
router.get('/:projectId/statistics', async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectPath = path.join(projectsDir, `${projectId}.json`);
    
    if (!await fs.pathExists(projectPath)) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    const projectData = await fs.readJson(projectPath);
    const chaptersDir = path.join(projectsDir, projectId, 'chapters');
    
    const stats = {
      projectInfo: {
        id: projectData.id,
        title: projectData.title,
        genre: projectData.genre,
        theme: projectData.theme,
        status: projectData.status,
        createdAt: projectData.createdAt
      },
      chapters: {
        total: 0,
        completed: 0,
        pending: projectData.pendingChapters?.length || 0
      },
      words: {
        total: 0,
        average: 0,
        longest: 0,
        shortest: Infinity
      },
      timeline: []
    };

    if (await fs.pathExists(chaptersDir)) {
      const chapterFiles = await fs.readdir(chaptersDir);
      const sortedFiles = chapterFiles
        .filter(file => file.startsWith('chapter_') && file.endsWith('.md'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/chapter_(\d+)\.md/)[1]);
          const numB = parseInt(b.match(/chapter_(\d+)\.md/)[1]);
          return numA - numB;
        });

      stats.chapters.total = sortedFiles.length;
      stats.chapters.completed = sortedFiles.length;

      const wordCounts = [];
      
      for (const file of sortedFiles) {
        const chapterPath = path.join(chaptersDir, file);
        const chapterContent = await fs.readFile(chapterPath, 'utf8');
        const lines = chapterContent.split('\n');
        const content = lines.slice(1, -6).join('\n').trim();
        const wordCount = content.length;
        const chapterNumber = parseInt(file.match(/chapter_(\d+)\.md/)[1]);
        
        wordCounts.push(wordCount);
        stats.words.total += wordCount;
        stats.words.longest = Math.max(stats.words.longest, wordCount);
        stats.words.shortest = Math.min(stats.words.shortest, wordCount);
        
        // 获取文件创建时间作为时间线
        const fileStat = await fs.stat(chapterPath);
        stats.timeline.push({
          chapter: chapterNumber,
          date: fileStat.birthtime,
          wordCount
        });
      }

      stats.words.average = Math.round(stats.words.total / stats.chapters.total);
      if (stats.words.shortest === Infinity) {
        stats.words.shortest = 0;
      }
    }

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
 * 搜索小说内容
 */
router.get('/:projectId/search', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { q: query, type = 'content' } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: '搜索关键词不能为空'
      });
    }

    const projectPath = path.join(projectsDir, `${projectId}.json`);
    
    if (!await fs.pathExists(projectPath)) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    const projectData = await fs.readJson(projectPath);
    const chaptersDir = path.join(projectsDir, projectId, 'chapters');
    const results = [];

    if (await fs.pathExists(chaptersDir)) {
      const chapterFiles = await fs.readdir(chaptersDir);
      const sortedFiles = chapterFiles
        .filter(file => file.startsWith('chapter_') && file.endsWith('.md'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/chapter_(\d+)\.md/)[1]);
          const numB = parseInt(b.match(/chapter_(\d+)\.md/)[1]);
          return numA - numB;
        });

      for (const file of sortedFiles) {
        const chapterPath = path.join(chaptersDir, file);
        const chapterContent = await fs.readFile(chapterPath, 'utf8');
        const lines = chapterContent.split('\n');
        const title = lines[0].replace('# ', '');
        const content = lines.slice(1, -6).join('\n').trim();
        const chapterNumber = parseInt(file.match(/chapter_(\d+)\.md/)[1]);

        const searchText = type === 'title' ? title : content;
        const regex = new RegExp(query, 'gi');
        const matches = searchText.match(regex);

        if (matches) {
          // 找到匹配的上下文
          const contexts = [];
          const sentences = content.split(/[。！？]/);
          
          sentences.forEach((sentence, index) => {
            if (sentence.includes(query)) {
              const start = Math.max(0, index - 1);
              const end = Math.min(sentences.length, index + 2);
              const context = sentences.slice(start, end).join('。');
              contexts.push(context);
            }
          });

          results.push({
            chapter: chapterNumber,
            title,
            matches: matches.length,
            contexts: contexts.slice(0, 3) // 最多返回3个上下文
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        query,
        type,
        totalResults: results.length,
        results
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;