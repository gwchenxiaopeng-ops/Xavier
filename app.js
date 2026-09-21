(() => {
  'use strict';

  const state = { data: null, route: 'home', articleLimit: 20, vocabLimit: 24 };
  const $ = (id) => document.getElementById(id);
  const routes = new Set(['home', 'articles', 'vocab', 'about']);

  function text(tag, value, className = '') {
    const node = document.createElement(tag);
    node.textContent = String(value ?? '');
    if (className) node.className = className;
    return node;
  }

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function routeTo(next, updateHash = true) {
    const route = routes.has(next) ? next : 'home';
    state.route = route;
    document.querySelectorAll('[data-page]').forEach((page) => {
      const active = page.dataset.page === route;
      page.hidden = !active;
      page.classList.toggle('is-active', active);
    });
    document.querySelectorAll('[data-route]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.route === route);
    });
    if (updateHash) history.replaceState(null, '', `#${route}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function formatIssue(value) {
    return String(value || '').replaceAll('-', '.');
  }

  function renderStats() {
    const stats = state.data.stats || {};
    const values = [
      [stats.issues || 0, '期学习材料'],
      [stats.articles || 0, '篇文章索引'],
      [stats.vocab || 0, '张词汇卡'],
    ];
    $('stats').replaceChildren(...values.map(([value, label]) => {
      const row = document.createElement('div'); row.className = 'stat';
      row.append(text('strong', value), text('span', label)); return row;
    }));
  }

  function renderIssues() {
    const issues = state.data.issues || [];
    $('issueStrip').replaceChildren(...issues.slice(0, 4).map((item, index) => {
      const card = document.createElement('article');
      card.className = `issue-tile${index === 0 ? ' latest' : ''}`;
      card.append(
        text('small', index === 0 ? 'LATEST' : item.format || 'ISSUE'),
        text('strong', formatIssue(item.issue)),
        text('p', `${item.article_count || 0} 篇文章 · ${item.vocab_count || 0} 个表达`),
      );
      return card;
    }));
    const latest = issues[0] || {};
    $('heroIssue').textContent = formatIssue(latest.issue) || '—';
    $('heroArticles').textContent = String(latest.article_count || 0);
    $('heroVocab').textContent = String(latest.vocab_count || 0);
  }

  function renderFeatured() {
    const selected = (state.data.vocab || [])
      .filter((item) => item.meaning_zh || item.meaning_en)
      .slice(0, 4);
    $('featuredVocab').replaceChildren(...selected.map((item) => {
      const row = document.createElement('article'); row.className = 'feature-row';
      row.append(text('strong', item.term), text('p', item.meaning_zh || item.meaning_en));
      return row;
    }));
    $('latestReads').replaceChildren(...(state.data.latest_reads || []).slice(0, 4).map((item) => {
      const link = document.createElement('a'); link.className = 'read-row'; link.href = item.link; link.target = '_blank'; link.rel = 'noopener';
      link.append(text('strong', item.title), text('small', item.summary || item.published));
      return link;
    }));
  }

  function fillFilters() {
    const issues = [...new Set((state.data.issues || []).map((item) => item.issue).filter(Boolean))];
    [$('articleIssue'), $('vocabIssue')].forEach((select) => {
      issues.forEach((issue) => select.appendChild(new Option(formatIssue(issue), issue)));
    });
    const sections = [...new Set((state.data.articles || []).map((item) => item.section).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    sections.forEach((section) => $('articleSection').appendChild(new Option(section, section)));
  }

  function filteredArticles() {
    const query = $('articleSearch').value.trim().toLowerCase();
    const issue = $('articleIssue').value;
    const section = $('articleSection').value;
    return (state.data.articles || []).filter((item) => {
      if (issue && item.issue !== issue) return false;
      if (section && item.section !== section) return false;
      if (!query) return true;
      return [item.title, item.section, item.dek, item.issue].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }

  function renderArticles(reset = false) {
    if (reset) state.articleLimit = 20;
    const rows = filteredArticles();
    $('articleResultCount').textContent = String(rows.length);
    const fragment = document.createDocumentFragment();
    rows.slice(0, state.articleLimit).forEach((item) => {
      const link = document.createElement('a'); link.className = 'article-card'; link.href = item.official_url; link.target = '_blank'; link.rel = 'noopener';
      const meta = document.createElement('div'); meta.className = 'meta';
      meta.append(text('span', item.section || 'ARTICLE'), text('span', formatIssue(item.issue)));
      link.append(meta, text('h2', item.title), text('p', item.dek || '前往 The Economist 官方网站查找并阅读这篇文章。'), text('b', '在官方站点查看 →'));
      fragment.appendChild(link);
    });
    if (!rows.length) fragment.appendChild(text('div', '没有匹配的文章。', 'empty-state'));
    $('articleGrid').replaceChildren(fragment);
    $('moreArticles').hidden = rows.length <= state.articleLimit;
  }

  function filteredVocab() {
    const query = $('vocabSearch').value.trim().toLowerCase();
    const issue = $('vocabIssue').value;
    const category = $('vocabCategory').value;
    return (state.data.vocab || []).filter((item) => {
      if (issue && item.issue !== issue) return false;
      if (category && item.category !== category) return false;
      if (!query) return true;
      return [item.term, item.meaning_en, item.meaning_zh, item.sentence, item.mini_note, item.article_title]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
  }

  function renderVocab(reset = false) {
    if (reset) state.vocabLimit = 24;
    const rows = filteredVocab();
    $('vocabResultCount').textContent = String(rows.length);
    const fragment = document.createDocumentFragment();
    rows.slice(0, state.vocabLimit).forEach((item) => {
      const card = document.createElement('article'); card.className = 'vocab-card';
      card.append(text('h2', item.term), text('div', item.pronunciation || ' ', 'pronunciation'));
      if (item.meaning_en) card.appendChild(text('p', item.meaning_en, 'meaning-en'));
      if (item.meaning_zh) card.appendChild(text('p', item.meaning_zh, 'meaning-zh'));
      if (item.sentence) card.appendChild(text('blockquote', item.sentence));
      if (item.mini_note) card.appendChild(text('p', item.mini_note, 'note'));
      const foot = document.createElement('footer');
      foot.appendChild(text('span', `${formatIssue(item.issue)}${item.page ? ` · ${item.page.split('·').pop().trim()}` : ''}`));
      if (item.official_url) {
        const link = document.createElement('a'); link.href = item.official_url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = '所属文章 →'; foot.appendChild(link);
      }
      card.appendChild(foot); fragment.appendChild(card);
    });
    if (!rows.length) fragment.appendChild(text('div', '没有匹配的词汇卡。', 'empty-state'));
    $('vocabGrid').replaceChildren(fragment);
    $('moreVocab').hidden = rows.length <= state.vocabLimit;
  }

  async function shareSite() {
    const payload = { title: document.title, text: '一起看我的英文精读与词汇笔记', url: location.href.split('#')[0] };
    try {
      if (navigator.share) await navigator.share(payload);
      else { await navigator.clipboard.writeText(payload.url); showToast('链接已复制'); }
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('暂时无法分享，请复制浏览器地址');
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', (event) => {
      event.preventDefault(); routeTo(button.dataset.route);
    }));
    $('shareButton').addEventListener('click', shareSite);
    ['articleSearch', 'articleIssue', 'articleSection'].forEach((id) => $(id).addEventListener(id === 'articleSearch' ? 'input' : 'change', () => renderArticles(true)));
    ['vocabSearch', 'vocabIssue', 'vocabCategory'].forEach((id) => $(id).addEventListener(id === 'vocabSearch' ? 'input' : 'change', () => renderVocab(true)));
    $('moreArticles').addEventListener('click', () => { state.articleLimit += 20; renderArticles(); });
    $('moreVocab').addEventListener('click', () => { state.vocabLimit += 24; renderVocab(); });
    window.addEventListener('hashchange', () => routeTo(location.hash.slice(1), false));
  }

  async function init() {
    bindEvents();
    try {
      const response = await fetch('./data.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`数据读取失败 (${response.status})`);
      state.data = await response.json();
      renderStats(); renderIssues(); renderFeatured(); fillFilters(); renderArticles(true); renderVocab(true);
      $('publicNotice').textContent = state.data.notice || '公开版不包含杂志文件或完整文章。';
      $('updatedAt').textContent = `数据更新：${new Date(state.data.exported_at).toLocaleString('zh-CN')}`;
      routeTo(location.hash.slice(1) || 'home', false);
    } catch (error) {
      $('updatedAt').textContent = error.message;
      showToast(error.message);
    }
  }

  init();
})();
