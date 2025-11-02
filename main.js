// 工具：去抖
function debounce(fn, wait = 120) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
}

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.grid');
  const filterButtons = document.querySelectorAll('.filters .btn');
  const searchInput = document.getElementById('search');
  const sortSelect = document.getElementById('sort');

  // 先等圖片 ready，避免版面抖動
  imagesLoaded(grid, function () {
    const iso = new Isotope(grid, {
      itemSelector: '.grid-item',
      layoutMode: 'masonry',
      // 提供排序用的取值；日期轉時間戳、標題轉小寫字串
      getSortData: {
        date: el => new Date(el.getAttribute('data-date')).getTime() || 0,
        title: el => (el.getAttribute('data-title') || '').toLowerCase()
      },
      sortBy: 'date',
      sortAscending: { date: false, title: true } // 預設最新在前
    });

    // 狀態
    let currentFilter = '*';
    let currentQuery = '';

    // 組合過濾：Isotope 的 filter 支援 function
    const compositeFilter = (itemElem) => {
      // 1) 類別／標籤等按鈕條件
      const btnPass = (currentFilter === '*') ? true : itemElem.matches(currentFilter);
      if (!btnPass) return false;

      // 2) 關鍵字搜尋：比對標題／摘要／標籤
      if (!currentQuery) return true;
      const title = (itemElem.getAttribute('data-title') || '').toLowerCase();
      const tags = (itemElem.getAttribute('data-tags') || '').toLowerCase();
      const desc = (itemElem.querySelector('.desc')?.textContent || '').toLowerCase();
      return (title + ' ' + tags + ' ' + desc).includes(currentQuery);
    };

    // 按鈕過濾
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('is-checked'));
        btn.classList.add('is-checked');
        currentFilter = btn.getAttribute('data-filter') || '*';
        iso.arrange({ filter: compositeFilter });
      });
    });

    // 搜尋（去抖）
    const onSearch = debounce(() => {
      currentQuery = searchInput.value.trim().toLowerCase();
      iso.arrange({ filter: compositeFilter });
    }, 150);
    searchInput.addEventListener('input', onSearch);

    // 排序
    sortSelect.addEventListener('change', () => {
      const v = sortSelect.value;
      if (v === 'date-desc') iso.arrange({ sortBy: 'date', sortAscending: false });
      if (v === 'date-asc')  iso.arrange({ sortBy: 'date', sortAscending: true });
      if (v === 'title-asc') iso.arrange({ sortBy: 'title', sortAscending: true });
      if (v === 'title-desc')iso.arrange({ sortBy: 'title', sortAscending: false });
    });
  });
});

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
    el.setAttribute('data-tags', it.tags.join(','));
    el.innerHTML = `
      <a class="card" href="${it.href}" ${it.href.startsWith('http')?'target="_blank" rel="noreferrer"':''}>
        <div class="thumb"><img src="${it.thumb}" alt="${it.title}" loading="lazy"></div>
        <div class="card-body">
          <h3>${it.title}</h3>
          <p class="desc">${it.desc || ''}</p>
          <ul class="meta-list">
            <li>Tags: ${it.tags.join(', ')}</li>
            <li>${it.type === 'project' ? 'Updated' : 'Published'}: ${it.date}</li>
          </ul>
        </div>
      </a>`;
    frag.appendChild(el);
  });
  grid.appendChild(frag);
}
document.addEventListener('DOMContentLoaded', loadData);

