// main.js
// ===============================
// Utilities
// ===============================
function debounce(fn, wait = 120) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
}

// 圖片事件：載入 → 淡入；失敗 → 父容器標記 .is-error 並隱藏破圖
function attachImgHandlers(img) {
  const parent = img.closest('.thumb, .hero');
  const show = () => {
    img.classList.add('img-loaded');        // 加在 <img> 本體上
    if (parent) parent.classList.add('is-loaded');
    parent?.classList.remove('is-error');
    img.style.removeProperty('display');
  };
  if (img.complete && img.naturalWidth > 0) show();
  else img.addEventListener('load', show, { once: true });

  img.addEventListener('error', () => {
    parent?.classList.add('is-error');
    img.style.display = 'none';
  }, { once: true });
}


// ===============================
// Data -> DOM
// ===============================
async function loadDataAndRender() {
  // 若你已自行渲染，可移除整個函式，直接呼叫 initIsotope()
  const res = await fetch('data.json?ts=' + Date.now());
  if (!res.ok) throw new Error('data.json 無法讀取');
  const items = await res.json();

  const grid = document.querySelector('.grid');
  const frag = document.createDocumentFragment();

  items.forEach(it => {
    const el = document.createElement('article');
    el.className = 'grid-item';
    el.setAttribute('data-type', it.type || '');
    el.setAttribute('data-title', it.title || '');
    el.setAttribute('data-date', it.date || '');
    el.setAttribute('data-tags', (it.tags || []).join(','));

    // 寬/高倍數（可在 data.json 設 size: 'w2' | 'w3'；tall: true|'h3'）
    if (it.size === 'w2') el.classList.add('grid-item--w2');
    if (it.size === 'w3') el.classList.add('grid-item--w3');
    if (it.tall === true || it.size === 'h2') el.classList.add('grid-item--h2');
    if (it.size === 'h3') el.classList.add('grid-item--h3');

    const href = it.type === 'blog'
      ? `/website/article.html?slug=${it.slug}`
      : (it.href || '#');

    el.innerHTML = `
      <a class="card" href="${href}" ${/^https?:/.test(href) ? 'target="_blank" rel="noreferrer"' : ''}>
        <div class="thumb">
          <img src="${it.thumb || ''}" alt="${(it.title || '').replace(/"/g, '&quot;')}">
        </div>
        <div class="card-body">
          <h3>${it.title || ''}</h3>
          <p class="desc">${it.excerpt || ''}</p>
          <ul class="meta-list">
            <li>Tags: ${(it.tags || []).join(', ')}</li>
            <li>${it.type === 'project' ? 'Updated' : 'Published'}: ${it.date || ''}</li>
          </ul>
        </div>
      </a>
    `;

    el.querySelectorAll('img').forEach(attachImgHandlers);
    frag.appendChild(el);
  });

  grid.appendChild(frag);
}

// ===============================
// Isotope Init + Controls
// ===============================
let iso = null;
function initIsotope() {
  const grid = document.querySelector('.grid');
  if (!grid) return;

  iso = new Isotope(grid, {
    itemSelector: '.grid-item',
    percentPosition: true,
    masonry: {
      columnWidth: '.grid-sizer',
      gutter: '.gutter-sizer'
    },
    transitionDuration: '180ms',
    hiddenStyle:  { opacity: 0, transform: 'scale(0.98)' },
    visibleStyle: { opacity: 1, transform: 'scale(1)' },
    stagger: 12,
    getSortData: {
      date: el => new Date(el.getAttribute('data-date') || 0).getTime() || 0,
      title: el => (el.getAttribute('data-title') || '').toLowerCase()
    },
    sortBy: 'date',
    sortAscending: { date: false, title: true }
  });

  // Controls: filter + search + sort
  let currentFilter = '*';
  let currentQuery = '';

  const compositeFilter = (el) => {
    const passFilter = currentFilter === '*' ? true : el.matches(currentFilter);
    if (!passFilter) return false;
    if (!currentQuery) return true;
    const hay = (
      (el.getAttribute('data-title') || '') + ' ' +
      (el.getAttribute('data-tags') || '') + ' ' +
      (el.querySelector('.desc')?.textContent || '')
    ).toLowerCase();
    return hay.includes(currentQuery);
  };

  const filterButtons = document.querySelectorAll('.filters .btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('is-checked'));
      btn.classList.add('is-checked');
      currentFilter = btn.getAttribute('data-filter') || '*';
      iso.arrange({ filter: compositeFilter });
    });
  });

  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      currentQuery = (searchInput.value || '').trim().toLowerCase();
      iso.arrange({ filter: compositeFilter });
    }, 150));
  }

  const sortSelect = document.getElementById('sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const v = sortSelect.value;
      if (v === 'date-desc') iso.arrange({ sortBy: 'date', sortAscending: false });
      if (v === 'date-asc')  iso.arrange({ sortBy: 'date', sortAscending: true });
      if (v === 'title-asc') iso.arrange({ sortBy: 'title', sortAscending: true });
      if (v === 'title-desc')iso.arrange({ sortBy: 'title', sortAscending: false });
    });
  }

  // Relayout on resize/orientation changes
  const relayout = debounce(() => iso.layout(), 100);
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(() => iso.layout(), 50), { passive: true });
}

// 當你需要動態追加卡片時可使用本函式
function appendItems(newItems) {
  const grid = document.querySelector('.grid');
  const frag = document.createDocumentFragment();
  const tempElems = [];

  newItems.forEach(it => {
    const el = document.createElement('article');
    el.className = 'grid-item';
    el.setAttribute('data-type', it.type || '');
    el.setAttribute('data-title', it.title || '');
    el.setAttribute('data-date', it.date || '');
    el.setAttribute('data-tags', (it.tags || []).join(','));
    if (it.size === 'w2') el.classList.add('grid-item--w2');
    if (it.size === 'w3') el.classList.add('grid-item--w3');
    if (it.tall === true || it.size === 'h2') el.classList.add('grid-item--h2');
    if (it.size === 'h3') el.classList.add('grid-item--h3');

    const href = it.type === 'blog'
      ? `/article.html?slug=${it.slug}`
      : (it.href || '#');

    el.innerHTML = `
      <a class="card" href="${href}" ${/^https?:/.test(href) ? 'target="_blank" rel="noreferrer"' : ''}>
        <div class="thumb">
          <img src="${it.thumb || ''}" alt="${(it.title || '').replace(/"/g, '&quot;')}">
        </div>
        <div class="card-body">
          <h3>${it.title || ''}</h3>
          <p class="desc">${it.excerpt || ''}</p>
          <ul class="meta-list">
            <li>Tags: ${(it.tags || []).join(', ')}</li>
            <li>${it.type === 'project' ? 'Updated' : 'Published'}: ${it.date || ''}</li>
          </ul>
        </div>
      </a>
    `;
    el.querySelectorAll('img').forEach(attachImgHandlers);
    frag.appendChild(el);
    tempElems.push(el);
  });

  grid.appendChild(frag);

  // 重要：對新增元素做 imagesLoaded 再交給 Isotope
  imagesLoaded(tempElems, () => {
    iso.appended(tempElems);
    iso.arrange();
  });
}

// ===============================
// Bootstrap
// ===============================
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.querySelector('.grid');

  // 若頁面已經有卡片（非 data.json 流程），直接初始化即可
  const hasPreRendered = grid && grid.querySelector('.grid-item');

  if (!hasPreRendered) {
    await loadDataAndRender();
  }

  // 使用 padding-top 佔位，圖片是否載入不影響高度計算，但仍等一輪 imagesLoaded 可避免閃爍
  imagesLoaded(grid, () => {
    initIsotope();
  });
});

// 導出 appendItems 供未來載入更多資料使用（可選）
window.appendItems = appendItems;
