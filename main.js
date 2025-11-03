// ===== Utils =====
function debounce(fn, wait = 120){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }

function lockGridHeight(gridEl){
  const h = gridEl.getBoundingClientRect().height;
  gridEl.style.height = h + 'px';
}
function unlockGridHeight(gridEl){
  gridEl.style.height = '';
}

// 圖片事件：成功→淡入並關骨架；失敗→顯示錯誤層
function attachImgHandlers(img){
  const parent = img.closest('.thumb, .hero');
  const show = () => {
    img.classList.add('img-loaded');
    if (parent) { parent.classList.add('is-loaded'); parent.classList.remove('is-error'); }
    img.style.removeProperty('display');
    img.style.removeProperty('visibility');
    img.style.removeProperty('opacity');
  };
  const fail = () => {
    if (parent) parent.classList.add('is-error');
    img.style.display = 'none';
  };

  img.addEventListener('load', show, { once:true });
  img.addEventListener('error', fail, { once:true });

  if (img.complete){
    if (img.naturalWidth > 0){
      (img.decode ? img.decode().then(show).catch(show) : show());
    } else {
      (img.decode ? img.decode().then(show).catch(fail) : fail());
    }
  }
}

// ===== Data → DOM (示例；若你已自行渲染可不用) =====
async function loadDataAndRender(){
  const res = await fetch('data.json?ts=' + Date.now());
  if (!res.ok) throw new Error('data.json load failed');
  const items = await res.json();

  const grid = document.querySelector('.grid');
  const frag = document.createDocumentFragment();

  items.forEach(it => {
    const el = document.createElement('article');
    el.className = 'grid-item';
    el.dataset.type  = it.type || '';
    el.dataset.title = it.title || '';
    el.dataset.date  = it.date  || '';
    el.dataset.tags  = (it.tags || []).join(',');

    if (it.size === 'w2') el.classList.add('grid-item--w2');
    if (it.size === 'w3') el.classList.add('grid-item--w3');
    if (it.tall === true || it.size === 'h2') el.classList.add('grid-item--h2');
    if (it.size === 'h3') el.classList.add('grid-item--h3');

    const href = it.type === 'blog' ? `/website/article.html?slug=${it.slug}` : (it.href || '#');

    el.innerHTML = `
      <a class="card" href="${href}" ${/^https?:/.test(href) ? 'target="_blank" rel="noreferrer"' : ''}>
        <div class="thumb">
          <img src="${it.thumb || ''}" alt="${(it.title || '').replace(/"/g,'&quot;')}">
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

// ===== Isotope =====
let iso = null;

function initIsotope(){
  const grid = document.querySelector('.grid');
  if (!grid) return;

  iso = new Isotope(grid, {
    itemSelector: '.grid-item',
    percentPosition: true,
    masonry: { columnWidth: '.grid-sizer', gutter: '.gutter-sizer' },
    transitionDuration: '160ms',        // 稍短，利落不拖泥
    hiddenStyle:  { opacity: 0 },       // 移除 scale 避免視覺「縮回去」的跳感
    visibleStyle: { opacity: 1 },
    stagger: 0,    
    //stagger: 12,
    getSortData: {
      date: el => new Date(el.dataset.date || 0).getTime() || 0,
      title: el => (el.dataset.title || '').toLowerCase()
    },
    sortBy: 'date',
    sortAscending: { date:false, title:true }
  });

  /* Controls */
  let currentFilter = '*';
  let currentQuery  = '';

  const compositeFilter = (el) => {
    const passFilter = currentFilter === '*' ? true : el.matches(currentFilter);
    if (!passFilter) return false;
    if (!currentQuery) return true;
    const hay = ((el.dataset.title || '') + ' ' + (el.dataset.tags || '') + ' ' + (el.querySelector('.desc')?.textContent || '')).toLowerCase();
    return hay.includes(currentQuery);
  };

  document.querySelectorAll('.filters .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filters .btn').forEach(b => b.classList.remove('is-checked'));
      btn.classList.add('is-checked');
      currentFilter = btn.getAttribute('data-filter') || '*';
      iso.arrange({ filter: compositeFilter });
    });
  });

  const searchInput = document.getElementById('search');
  if (searchInput){
    searchInput.addEventListener('input', debounce(()=>{
      currentQuery = (searchInput.value || '').trim().toLowerCase();
      iso.arrange({ filter: compositeFilter });
    }, 150));
  }

  const sortSelect = document.getElementById('sort');
  if (sortSelect){
    sortSelect.addEventListener('change', ()=>{
      const v = sortSelect.value;
      if (v === 'date-desc') iso.arrange({ sortBy:'date',  sortAscending:false });
      if (v === 'date-asc')  iso.arrange({ sortBy:'date',  sortAscending:true  });
      if (v === 'title-asc') iso.arrange({ sortBy:'title', sortAscending:true  });
      if (v === 'title-desc')iso.arrange({ sortBy:'title', sortAscending:false });
    });
  }

  const relayout = debounce(()=> iso.layout(), 100);
  window.addEventListener('resize', relayout, { passive:true });
  window.addEventListener('orientationchange', ()=> setTimeout(()=> iso.layout(), 50), { passive:true });
}

// 動態追加（可選）
function appendItems(newItems){
  const grid = document.querySelector('.grid');
  const frag = document.createDocumentFragment();
  const elems = [];

  newItems.forEach(it => {
    const el = document.createElement('article');
    el.className = 'grid-item';
    el.dataset.type  = it.type || '';
    el.dataset.title = it.title || '';
    el.dataset.date  = it.date  || '';
    el.dataset.tags  = (it.tags || []).join(',');
    if (it.size === 'w2') el.classList.add('grid-item--w2');
    if (it.size === 'w3') el.classList.add('grid-item--w3');
    if (it.tall === true || it.size === 'h2') el.classList.add('grid-item--h2');
    if (it.size === 'h3') el.classList.add('grid-item--h3');

    const href = it.type === 'blog' ? `/website/article.html?slug=${it.slug}` : (it.href || '#');

    el.innerHTML = `
      <a class="card" href="${href}">
        <div class="thumb"><img src="${it.thumb || ''}" alt="${(it.title || '').replace(/"/g,'&quot;')}"></div>
        <div class="card-body">
          <h3>${it.title || ''}</h3>
          <p class="desc">${it.excerpt || ''}</p>
          <ul class="meta-list"><li>Tags: ${(it.tags || []).join(', ')}</li><li>${it.date || ''}</li></ul>
        </div>
      </a>`;
    el.querySelectorAll('img').forEach(attachImgHandlers);
    frag.appendChild(el);
    elems.push(el);
  });

  grid.appendChild(frag);
  imagesLoaded(elems, () => { iso.appended(elems); iso.arrange(); });
}

// ===== Bootstrap =====
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.querySelector('.grid');
  const hasPreRendered = grid && grid.querySelector('.grid-item');

  if (!hasPreRendered) await loadDataAndRender();
  imagesLoaded(grid, () => initIsotope());
});

// 可在其他腳本使用
window.appendItems = appendItems;
