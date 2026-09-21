(() => {
  'use strict';

  const state = { data: null, page: 0, pageSize: 50, articleRows: [], timer: null };
  const $ = (id) => document.getElementById(id);
  const els = {
    latestIssue: $('latestIssue'), lastChecked: $('lastChecked'), issuePage: $('issuePage'),
    queueCount: $('queueCount'), queueItems: $('queueItems'), importedCount: $('importedCount'), importedIssues: $('importedIssues'),
    articleCount: $('articleCount'), articleSearch: $('articleSearch'), articleIssueFilter: $('articleIssueFilter'),
    refreshArticles: $('refreshArticles'), articleItems: $('articleItems'), articleDialog: $('articleDialog'),
    articleSection: $('articleSection'), articleTitle: $('articleTitle'), articleDek: $('articleDek'), articleDate: $('articleDate'),
    articlePages: $('articlePages'), articlePdf: $('articlePdf'), articleTerms: $('articleTerms'), articleTermList: $('articleTermList'), articleBody: $('articleBody'), closeArticle: $('closeArticle'),
    cards: $('cards'), empty: $('emptyState'), resultCount: $('resultCount'),
    search: $('searchInput'), issue: $('statusFilter'), tag: $('tagFilter'), batch: $('batchFilter'), category: $('categoryFilter'), sort: $('sortFilter'), linkedOnly: $('dueOnly'),
    pagination: $('pagination'), prev: $('prevPage'), next: $('nextPage'), pageLabel: $('pageLabel'), toast: $('toast'),
  };

  function formatIssue(value) { return String(value || '').replaceAll('-', '.'); }
  function showToast(message, isError = false) {
    els.toast.textContent = message;
    els.toast.className = `toast show${isError ? ' error' : ''}`;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { els.toast.className = 'toast'; }, 2400);
  }
  function optionValues(select, values, allLabel) {
    const selected = select.value;
    select.replaceChildren(new Option(allLabel, ''));
    values.forEach((value) => select.appendChild(new Option(value, value)));
    if (values.includes(selected)) select.value = selected;
  }
  function labelCategory(value) {
    return { common: '常用表达', interesting: '陌生 / 感兴趣', usage: '熟词新用法', other: '其他' }[value] || '';
  }

  function renderDesk() {
    const data = state.data;
    const issues = data.issues || [];
    const latest = issues[0] || {};
    els.latestIssue.textContent = formatIssue(latest.issue) || '—';
    els.lastChecked.textContent = data.exported_at ? `数据更新：${new Date(data.exported_at).toLocaleString('zh-CN')}` : '—';
    els.issuePage.hidden = true;
    els.queueCount.textContent = String((data.latest_reads || []).length);
    els.queueItems.replaceChildren();
    (data.latest_reads || []).slice(0, 8).forEach((item) => {
      const li = document.createElement('li');
      const link = document.createElement('a'); link.href = item.link; link.target = '_blank'; link.rel = 'noopener'; link.textContent = item.title;
      const date = document.createElement('small'); date.textContent = item.published || '';
      li.append(link, date); els.queueItems.appendChild(li);
    });
    els.importedCount.textContent = String(issues.length);
    els.importedIssues.replaceChildren();
    issues.forEach((item) => {
      const li = document.createElement('li');
      const label = document.createElement('span'); label.textContent = `${formatIssue(item.issue)} · ${item.article_count || 0} 篇文章 · ${item.vocab_count || 0} 个表达 · ${item.format || ''}`;
      const action = document.createElement('button'); action.type = 'button'; action.className = 'article-link'; action.textContent = '查看文章目录 ↗';
      action.addEventListener('click', () => { els.articleIssueFilter.value = item.issue; renderArticleList(); $('articleBrowser').scrollIntoView({ behavior: 'smooth' }); });
      li.append(label, action); els.importedIssues.appendChild(li);
    });
  }

  function renderArticleList() {
    const query = els.articleSearch.value.trim().toLowerCase();
    const issue = els.articleIssueFilter.value;
    const rows = state.articleRows.filter((item) => {
      if (issue && item.issue !== issue) return false;
      return !query || [item.title, item.section, item.dek, item.issue].some((value) => String(value || '').toLowerCase().includes(query));
    });
    els.articleCount.textContent = String(rows.length);
    els.articleItems.replaceChildren();
    rows.slice(0, 120).forEach((item) => {
      const li = document.createElement('li'); li.className = 'article-item';
      const button = document.createElement('button'); button.type = 'button'; button.className = 'article-open';
      const section = document.createElement('span'); section.className = 'article-item-section'; section.textContent = item.section || 'ARTICLE';
      const title = document.createElement('strong'); title.textContent = item.title || '未命名文章';
      const detail = document.createElement('small'); detail.textContent = item.dek || formatIssue(item.issue);
      button.append(section, title, detail); button.addEventListener('click', () => openArticle(item));
      li.appendChild(button); els.articleItems.appendChild(li);
    });
    if (!rows.length) { const li = document.createElement('li'); li.className = 'queue-empty'; li.textContent = '没有匹配的文章'; els.articleItems.appendChild(li); }
  }

  function openArticle(item) {
    els.articleSection.textContent = item.section || 'ARTICLE';
    els.articleTitle.textContent = item.title || '文章信息';
    els.articleDek.textContent = item.dek || '公开版不复制完整正文，请前往 The Economist 官方网站阅读。';
    els.articleDate.textContent = item.date || formatIssue(item.issue);
    els.articlePages.textContent = formatIssue(item.issue);
    els.articlePdf.href = item.official_url; els.articlePdf.hidden = !item.official_url;
    const related = (state.data.vocab || []).filter((vocab) => vocab.article_title === item.title).slice(0, 30);
    els.articleTermList.replaceChildren(); els.articleTerms.hidden = related.length === 0;
    related.forEach((vocab) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'article-term-chip'; button.textContent = vocab.term;
      button.addEventListener('click', () => { els.articleDialog.close(); els.search.value = vocab.term; refresh(true); $('vocabSection').scrollIntoView({ behavior: 'smooth' }); });
      els.articleTermList.appendChild(button);
    });
    els.articleBody.replaceChildren();
    const notice = document.createElement('div'); notice.className = 'public-notice';
    notice.textContent = '为保持公开分享合规，这里保留原版文章弹窗和词汇关联，但不展示完整文章正文。点击上方“前往官方文章”继续阅读。';
    els.articleBody.appendChild(notice);
    if (typeof els.articleDialog.showModal === 'function') els.articleDialog.showModal(); else els.articleDialog.setAttribute('open', '');
  }

  function filteredVocab() {
    const query = els.search.value.trim().toLowerCase();
    let rows = (state.data.vocab || []).filter((item) => {
      if (els.issue.value && item.issue !== els.issue.value) return false;
      if (els.tag.value && !(item.tags || []).includes(els.tag.value)) return false;
      if (els.batch.value && item.issue !== els.batch.value) return false;
      if (els.category.value && item.category !== els.category.value) return false;
      if (els.linkedOnly.checked && !item.official_url) return false;
      return !query || [item.term, item.meaning_en, item.meaning_zh, item.sentence, item.mini_note, item.article_title, item.source]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    if (els.sort.value === 'term_asc') rows.sort((a, b) => a.term.localeCompare(b.term));
    else rows.sort((a, b) => String(b.issue).localeCompare(String(a.issue)) || a.term.localeCompare(b.term));
    return rows;
  }

  function renderCard(item) {
    const fragment = $('cardTemplate').content.cloneNode(true);
    fragment.querySelector('.term').textContent = item.term || '';
    fragment.querySelector('.pronunciation').textContent = item.pronunciation || '';
    fragment.querySelector('.meaning-en').textContent = item.meaning_en || '';
    fragment.querySelector('.meaning').textContent = item.meaning_zh || '—';
    fragment.querySelector('.sentence').textContent = item.sentence || '';
    fragment.querySelector('.sentence-zh').textContent = '';
    fragment.querySelector('.context').textContent = '';
    fragment.querySelector('.mini-note').textContent = item.mini_note ? `Mini note · ${item.mini_note}` : '';
    fragment.querySelector('.source').textContent = item.source || (item.issue ? `The Economist · ${item.issue}` : '');
    fragment.querySelector('.page').textContent = item.page || '';
    const sourceLink = fragment.querySelector('.source-link');
    if (item.official_url) { sourceLink.href = item.official_url; sourceLink.hidden = false; } else sourceLink.hidden = true;
    const articleLink = fragment.querySelector('.article-link');
    if (item.article_title && item.official_url) {
      articleLink.hidden = false; articleLink.textContent = '↗ 所属文章';
      articleLink.addEventListener('click', () => { const article = state.articleRows.find((row) => row.title === item.article_title); if (article) openArticle(article); });
    }
    const articleRef = fragment.querySelector('.article-ref'); articleRef.hidden = !item.article_title; articleRef.textContent = item.article_title ? `ARTICLE · ${item.article_title}` : '';
    fragment.querySelector('.category').textContent = labelCategory(item.category);
    fragment.querySelector('.batch').textContent = item.issue ? `${item.issue}-auto-01` : '';
    const tags = fragment.querySelector('.tag-list');
    (item.tags || []).forEach((tag) => { const span = document.createElement('span'); span.className = 'tag'; span.textContent = tag; tags.appendChild(span); });
    const status = fragment.querySelector('.status-pill'); status.className = 'status-pill status-public'; status.textContent = '公开词卡';
    return fragment;
  }

  function loadVocab() {
    const rows = filteredVocab();
    const start = state.page * state.pageSize;
    els.resultCount.textContent = String(rows.length);
    els.cards.replaceChildren(...rows.slice(start, start + state.pageSize).map(renderCard));
    els.empty.hidden = rows.length > 0; els.cards.hidden = rows.length === 0;
    const pageCount = Math.max(1, Math.ceil(rows.length / state.pageSize));
    els.pagination.hidden = rows.length <= state.pageSize; els.pageLabel.textContent = `第 ${state.page + 1} / ${pageCount} 页`;
    els.prev.disabled = state.page <= 0; els.next.disabled = state.page + 1 >= pageCount;
  }

  function renderStatsAndFilters() {
    const vocab = state.data.vocab || [];
    $('statTotal').textContent = String(vocab.length);
    $('statDue').textContent = String(vocab.filter((item) => item.issue === state.data.issues?.[0]?.issue).length);
    $('statMastered').textContent = String(vocab.filter((item) => item.meaning_en || item.meaning_zh).length);
    $('statLearning').textContent = String(vocab.filter((item) => item.article_title).length);
    const issues = [...new Set((state.data.issues || []).map((item) => item.issue).filter(Boolean))];
    optionValues(els.issue, issues, '全部期号'); optionValues(els.batch, issues, '全部批次'); optionValues(els.articleIssueFilter, issues, '全部期号');
    optionValues(els.tag, [...new Set(vocab.flatMap((item) => item.tags || []))].sort(), '全部标签');
  }

  function refresh(reset = false) { if (reset) state.page = 0; loadVocab(); }
  function bindEvents() {
    $('jumpArticles').addEventListener('click', () => $('articleBrowser').scrollIntoView({ behavior: 'smooth' }));
    $('jumpVocab').addEventListener('click', () => $('vocabSection').scrollIntoView({ behavior: 'smooth' }));
    $('shareBtn').addEventListener('click', async () => {
      try { if (navigator.share) await navigator.share({ title: document.title, url: location.href }); else { await navigator.clipboard.writeText(location.href); showToast('网页链接已复制'); } }
      catch (error) { if (error?.name !== 'AbortError') showToast('请复制浏览器地址分享', true); }
    });
    $('refreshDesk').addEventListener('click', () => { renderDesk(); showToast('已读取最新公开数据'); });
    els.refreshArticles.addEventListener('click', renderArticleList); els.articleSearch.addEventListener('input', renderArticleList); els.articleIssueFilter.addEventListener('change', renderArticleList);
    els.closeArticle.addEventListener('click', () => els.articleDialog.close());
    els.search.addEventListener('input', () => { clearTimeout(state.timer); state.timer = setTimeout(() => refresh(true), 180); });
    [els.issue, els.tag, els.batch, els.category, els.sort, els.linkedOnly].forEach((element) => element.addEventListener('change', () => refresh(true)));
    $('clearFilters').addEventListener('click', () => { els.search.value = ''; els.issue.value = ''; els.tag.value = ''; els.batch.value = ''; els.category.value = ''; els.sort.value = 'updated_desc'; els.linkedOnly.checked = false; refresh(true); });
    els.prev.addEventListener('click', () => { if (state.page > 0) { state.page -= 1; loadVocab(); $('vocabSection').scrollIntoView({ behavior: 'smooth' }); } });
    els.next.addEventListener('click', () => { state.page += 1; loadVocab(); $('vocabSection').scrollIntoView({ behavior: 'smooth' }); });
  }

  async function setup() {
    bindEvents();
    try {
      const response = await fetch('./data.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`数据读取失败（${response.status}）`);
      state.data = await response.json(); state.articleRows = state.data.articles || [];
      renderDesk(); renderStatsAndFilters(); renderArticleList(); loadVocab();
    } catch (error) { showToast(error.message, true); }
  }
  document.addEventListener('DOMContentLoaded', setup);
})();
