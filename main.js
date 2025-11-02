// ===== 可選：從 data.json 動態建立卡片 =====
async function loadData() {
  const res = await fetch('data.json');
  const items = await res.json();
  const grid = document.querySelector('.grid');
  const frag = document.createDocumentFragment();

  items.forEach(it => {
    const el = document.createElement('article');
    el.className = 'grid-item';
    el.setAttribute('data-type', it.type);
    el.setAttribute('data-title', it.title);
    el.setAttribute('data-date', it.date);
    el.setAttribute('data-tags', (it.tags || []).join(','));

    el.innerHTML = `
      <a class="card" href="${it.href}" ${/^https?:/.test(it.href)?'target="_blank" rel="noreferrer"':''}>
        <div class="thumb"><img src="${it.thumb}" alt="${it.title}" loading="lazy"></div>
        <div class="card-body">
          <h3>${it.title}</h3>
          <p class="desc">${it.desc || ''}</p>
          <ul class="meta-list">
            <li>Tags: ${(it.tags || []).join(', ')}</li>
            <li>${it.type === 'project' ? 'Updated' : 'Published'}: ${it.date}</li>
          </ul>
        </div>
      </a>`;
    frag.appendChild(el);
  });

  grid.appendChild(frag);
}

function debounce(fn, wait=120){ let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a),wait);} }

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.querySelector('.grid');
  const filterButtons = document.querySelectorAll('.filters .btn');
  const searchInput = document.getElementById('search');
  const sortSelect = document.getElementById('sort');

  // 1) 先把資料渲染進 DOM（若你不用 data.json，可移除此步）
  await loadData();

  // 2) 等圖片都 ready 再初始化 Isotope（避免容器高度不更新）
  imagesLoaded(grid, () => {
    const iso = new Isotope(grid, {
      itemSelector: '.grid-item',
      // 百分比定位 + 欄寬跟 .grid-sizer 對齊
      percentPosition: true,
      masonry: { columnWidth: '.grid-sizer' },
      getSortData: {
        date: el => new Date(el.getAttribute('data-date')).getTime() || 0,
        title: el => (el.getAttribute('data-title') || '').toLowerCase()
      },
      sortBy: 'date',
      sortAscending: { date: false, title: true }
    });

    // ====== 過濾 + 搜尋（與你原先相同邏輯）======
    let currentFilter = '*';
    let currentQuery = '';

    const compositeFilter = (el) => {
      const passBtn = currentFilter === '*' ? true : el.matches(currentFilter);
      if (!passBtn) return false;
      if (!currentQuery) return true;
      const t = (el.getAttribute('data-title') || '').toLowerCase();
      const g = (el.getAttribute('data-tags') || '').toLowerCase();
      const d = (el.querySelector('.desc')?.textContent || '').toLowerCase();
      return (t + ' ' + g + ' ' + d).includes(currentQuery);
    };

    filterButtons.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        filterButtons.forEach(b=>b.classList.remove('is-checked'));
        btn.classList.add('is-checked');
        currentFilter = btn.getAttribute('data-filter') || '*';
        iso.arrange({ filter: compositeFilter });
      });
    });

    searchInput?.addEventListener('input', debounce(()=>{
      currentQuery = searchInput.value.trim().toLowerCase();
      iso.arrange({ filter: compositeFilter });
    }, 150));

    sortSelect?.addEventListener('change', ()=>{
      const v = sortSelect.value;
      if (v === 'date-desc') iso.arrange({ sortBy: 'date',  sortAscending: false });
      if (v === 'date-asc')  iso.arrange({ sortBy: 'date',  sortAscending: true  });
      if (v === 'title-asc') iso.arrange({ sortBy: 'title', sortAscending: true  });
      if (v === 'title-desc')iso.arrange({ sortBy: 'title', sortAscending: false });
    });

    // ====== 若之後「再」動態新增卡片，請用這段 ======
    async function appendItems(newDataArray){
      const frag = document.createDocumentFragment();
      const temp = document.createElement('div');
      newDataArray.forEach(it=>{
        const el = document.createElement('article');
        el.className = 'grid-item';
        el.setAttribute('data-type', it.type);
        el.setAttribute('data-title', it.title);
        el.setAttribute('data-date', it.date);
        el.setAttribute('data-tags', (it.tags || []).join(','));
        el.innerHTML = `
          <a class="card" href="${it.href}">
            <div class="thumb"><img src="${it.thumb}" alt="${it.title}" loading="lazy"></div>
            <div class="card-body">
              <h3>${it.title}</h3>
              <p class="desc">${it.desc || ''}</p>
              <ul class="meta-list">
                <li>Tags: ${(it.tags || []).join(', ')}</li>
                <li>${it.type === 'project' ? 'Updated' : 'Published'}: ${it.date}</li>
              </ul>
            </div>
          </a>`;
        frag.appendChild(el);
      });
      grid.appendChild(frag);

      // 關鍵：等「新插入元素的圖片」載入完成，再通知 Isotope
      const newElems = Array.from(grid.querySelectorAll('.grid-item')).slice(-newDataArray.length);
      imagesLoaded(newElems, () => {
        iso.appended(newElems);   // 讓 Isotope 接管新元素
        iso.arrange({ filter: compositeFilter }); // 重新套用過濾/排序
      });
    }

    // 需要時：appendItems([{...}, {...}])
    window.appendPortfolioItems = appendItems; // 方便你在 console 測試
  });
});
