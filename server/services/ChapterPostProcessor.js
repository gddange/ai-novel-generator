class ChapterPostProcessor {
  static COMMON_SURNAMES = new Set(
    '赵钱孙李周吴郑王冯陈蒋沈韩杨朱秦许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘范彭鲁韦马苗方俞任袁柳唐罗薛顾丁阮贾陆叶史温詹童关包诸孟白毛邱项祝董梁杜夏傅曾程林'.split('')
  );

  static STOPWORDS = new Set([
    '终于','立即','无数','忽然','于是','但是','因为','所以','如果','或者','以及','并且','却','然而','虽然','还是',
    '我们','你们','他们','她们','它们','他','她','它','这','那','这里','那里','这个','那个','然后','之后','之前'
  ]);

  static cleanTitleSuffix(name) {
    const titles = ['教授','先生','小姐','女士','队长','警官','博士','医生','老师','主任','总监','顾问','局长','部长','校长','理事'];
    for (const t of titles) {
      if (name.endsWith(t)) return name.slice(0, -t.length);
    }
    return name;
  }

  static isLikelyName(name) {
    const s = String(name || '').trim();
    if (!/^[\u4e00-\u9fa5]{2,3}$/.test(s)) return false; // 2-3个中文字符
    if ([...this.STOPWORDS].some(w => s.includes(w))) return false;
    const first = s[0];
    return this.COMMON_SURNAMES.has(first);
  }

  static countOccurrences(text, token) {
    const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    return (String(text || '').match(re) || []).length;
  }

  static extractNames(text, chapterOutline = {}) {
    const s = String(text || '');
    const speechVerbs = '(?:说道|说|问|答|喊|笑|低声道|回道|叫道|冷笑道|沉声道|叹道)';
    const nameRegex = new RegExp(`([\\u4e00-\\u9fa5]{2,4})(?:[，,：: ]?)${speechVerbs}`, 'g');
    const titleRegex = /([\u4e00-\u9fa5]{2,3})(教授|先生|小姐|女士|队长|警官|博士|医生|老师|主任|总监|顾问|局长|部长|校长|理事)/g;

    const candidates = new Set();
    let m;
    while ((m = nameRegex.exec(s)) !== null) {
      let cand = (m[1] || '').trim();
      cand = this.cleanTitleSuffix(cand);
      if (this.isLikelyName(cand)) candidates.add(cand);
    }
    while ((m = titleRegex.exec(s)) !== null) {
      let cand = (m[1] || '').trim();
      cand = this.cleanTitleSuffix(cand);
      if (this.isLikelyName(cand)) candidates.add(cand);
    }

    // 结合章节大纲的角色提示
    const seeds = new Set([
      ...((chapterOutline?.characters || []).filter(Boolean)),
      ...Object.keys(chapterOutline?.characterProfiles || {})
    ]);
    for (const seed of seeds) {
      const cleaned = this.cleanTitleSuffix(seed);
      if (this.isLikelyName(cleaned)) candidates.add(cleaned);
    }

    // 频次过滤：文本中出现 ≥2 次，或来自种子
    const final = Array.from(candidates).filter(name => {
      const count = this.countOccurrences(s, name);
      return count >= 2 || seeds.has(name);
    });
    return final;
  }

  static summarize(text, maxLen = 300) {
    const s = String(text || '').replace(/\s+/g, ' ');
    const sentences = s.split(/[。！？!?；;\n]/).map(x => x.trim()).filter(Boolean);
    const take = sentences.slice(0, 3).join('。');
    const out = take.length > maxLen ? take.slice(0, maxLen) + '…' : take;
    return out;
  }

  static extractKeyEvents(text) {
    const s = String(text || '');
    const sentences = s.split(/[。！？!?\n]/).map(x => x.trim()).filter(Boolean);
    const keywords = ['决定','发现','遇到','阻止','揭露','接受','拒绝','危机','线索','转折','冲突','救援','失踪','追踪','会面','谈判'];
    const events = sentences.filter(sent => keywords.some(k => sent.includes(k)));
    return events.slice(0, 6);
  }

  static extractStateChanges(text) {
    const s = String(text || '');
    const patterns = {
      injured: ['受伤','流血','跌倒','昏迷'],
      join: ['加入','结盟','合作'],
      leave: ['离开','分开','离去'],
      confess: ['坦白','告白','承认'],
      reconcile: ['和解','原谅','重归于好'],
      breakup: ['分手','决裂','反目'],
      arrested: ['被捕','抓住','拘留']
    };
    const changes = {};
    for (const [key, kws] of Object.entries(patterns)) {
      const hit = kws.some(k => s.includes(k));
      if (hit) changes[key] = true;
    }
    return changes;
  }

  static processChapter(chapter, chapterOutline = {}) {
    const text = String(chapter?.content || '');
    const names = this.extractNames(text, chapterOutline);
    const summary = this.summarize(text, 320);
    const keyEvents = this.extractKeyEvents(text);
    const stateChanges = this.extractStateChanges(text);

    return {
      title: chapter?.title || '',
      summary,
      keyEvents,
      characters: names,
      stateChanges,
      outlineHints: Array.isArray(chapterOutline?.plotPoints) ? chapterOutline.plotPoints.slice(0, 4) : []
    };
  }
}

module.exports = ChapterPostProcessor;