const fs = require('fs-extra');
const path = require('path');

class KnowledgeStore {
  constructor(projectsDir = path.join(__dirname, '../../data/projects')) {
    this.projectsDir = projectsDir;
  }

  static COMMON_SURNAMES = new Set(
    '赵钱孙李周吴郑王冯陈蒋沈韩杨朱秦许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘范彭鲁韦马苗方俞任袁柳唐罗薛顾丁阮贾陆叶史温詹童关包诸孟白毛邱项祝董梁杜夏傅曾程林'.split('')
  );

  static STOPWORDS = new Set([
    '终于','立即','无数','忽然','于是','但是','因为','所以','如果','或者','以及','并且','却','然而','虽然','还是',
    '我们','你们','他们','她们','它们','他','她','它','这','那','这里','那里','这个','那个','然后','之后','之前'
  ]);

  static isLikelyName(name) {
    const s = String(name || '').trim();
    if (!/^[\u4e00-\u9fa5]{2,3}$/.test(s)) return false;
    if ([...KnowledgeStore.STOPWORDS].some(w => s.includes(w))) return false;
    const first = s[0];
    return KnowledgeStore.COMMON_SURNAMES.has(first);
  }

  getProjectDir(projectId) {
    return path.join(this.projectsDir, projectId);
  }

  async ensureProjectDirs(projectId) {
    const base = this.getProjectDir(projectId);
    await fs.ensureDir(base);
    await fs.ensureDir(path.join(base, 'summaries'));
  }

  async readIndexes(projectId) {
    const idxPath = path.join(this.getProjectDir(projectId), 'indexes.json');
    try {
      if (await fs.pathExists(idxPath)) {
        return await fs.readJson(idxPath);
      }
    } catch (e) {
      console.warn('读取索引失败，使用默认结构:', e.message);
    }
    return {
      character_to_chapters: {},
      chapter_events: {},
      glossary: {},
      lastUpdated: null
    };
  }

  async writeIndexes(projectId, indexes) {
    const idxPath = path.join(this.getProjectDir(projectId), 'indexes.json');
    indexes.lastUpdated = new Date().toISOString();
    await fs.writeJson(idxPath, indexes, { spaces: 2 });
  }

  async getKnownCharacterSet(projectId) {
    try {
      const projJsonPath = path.join(this.projectsDir, `${projectId}.json`);
      if (!(await fs.pathExists(projJsonPath))) return new Set();
      const data = await fs.readJson(projJsonPath);
      const extras = data?.agents?.outlineEditor?.currentOutlineExtras || {};
      const seeds = new Set([
        ...Object.keys(extras.characterProfiles || {}),
        ...((extras.characterLexicon || []).filter(Boolean)),
        ...((data?.currentProject?.characters || []).filter(Boolean))
      ]);
      return new Set(Array.from(seeds).filter(n => KnowledgeStore.isLikelyName(n)));
    } catch (e) {
      return new Set();
    }
  }

  async writeChapterSummary(projectId, chapterNumber, summaryData) {
    await this.ensureProjectDirs(projectId);
    const summaryDir = path.join(this.getProjectDir(projectId), 'summaries');
    const file = path.join(summaryDir, `chapter_${chapterNumber}.json`);
    const knownSet = await this.getKnownCharacterSet(projectId);
    let characters = summaryData.characters || [];
    characters = characters.filter(n => KnowledgeStore.isLikelyName(n) || knownSet.has(n));

    const payload = {
      chapterNumber,
      title: summaryData.title || '',
      summary: summaryData.summary || '',
      keyEvents: summaryData.keyEvents || [],
      characters,
      stateChanges: summaryData.stateChanges || {},
      createdAt: new Date().toISOString()
    };
    await fs.writeJson(file, payload, { spaces: 2 });
    // 更新全局索引
    const indexes = await this.readIndexes(projectId);
    // 角色索引
    (payload.characters || []).forEach(name => {
      if (!indexes.character_to_chapters[name]) indexes.character_to_chapters[name] = [];
      if (!indexes.character_to_chapters[name].includes(chapterNumber)) {
        indexes.character_to_chapters[name].push(chapterNumber);
        indexes.character_to_chapters[name].sort((a, b) => a - b);
      }
    });
    // 章节事件索引
    indexes.chapter_events[chapterNumber] = payload.keyEvents || [];
    await this.writeIndexes(projectId, indexes);
  }

  async readRecentSummaries(projectId, count = 3) {
    const summaryDir = path.join(this.getProjectDir(projectId), 'summaries');
    try {
      const files = (await fs.readdir(summaryDir)).filter(f => f.startsWith('chapter_') && f.endsWith('.json'));
      const nums = files.map(f => {
        const m = f.match(/chapter_(\d+)\.json/);
        return m ? parseInt(m[1], 10) : null;
      }).filter(n => n !== null).sort((a, b) => b - a);
      const take = nums.slice(0, count).sort((a, b) => a - b);
      const results = [];
      for (const n of take) {
        const fp = path.join(summaryDir, `chapter_${n}.json`);
        try {
          const data = await fs.readJson(fp);
          results.push(data);
        } catch (e) {
          console.warn('读取章节摘要失败:', fp, e.message);
        }
      }
      return results;
    } catch (e) {
      return [];
    }
  }
}

module.exports = KnowledgeStore;