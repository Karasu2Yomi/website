const PLACEHOLDER_CSS_ONLY = true; // 僅用 CSS 骨架，不使用佔位圖

function debounce(fn, wait=120){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }
const relayout = debounce(()=> iso.layout(), 100);
window.addEventListener('resize', relayout, { passive: true });
window.addEventListener('orientationchange', ()=> setTimeout(()=> iso.layout(), 50), { passive: true });

function attachImgHandlers(img){
  // 載入完成 → 淡入（不需要任何佔位圖）
  const show = ()=> img.classList.add('img-loaded');
  if (img.complete && img.naturalWidth>0) show();
  else img.addEventListener('load', show, {once:true});

  // 失敗 → 套 CSS 樣式（不載入任何圖）
  img.addEventListener('error', ()=>{
    const box = img.parentElement; // .thumb
    box.classList.add('is-error');
    img.style.display='none'; // 避免瀏覽器破圖圖示
  }, {once:true});
}

async function loadData(){
  const res = await fetch('data.json?ts=' + Date.now());
  const items = await res.json();
  const grid = document.querySelector('.grid');
  const frag = document.createDocumentFragment();

  items.forEach(it=>{
    const el=document.createElement('article');
    el.className='grid-item';
    el.setAttribute('data-type', it.type);
    el.setAttribute('data-title', it.title);
    el.setAttribute('data-date', it.date);
    el.setAttribute('data-tags', (it.tags||[]).join(','));
    
    if (it.size === 'w2') el.classList.add('grid-item--w2');
    if (it.size === 'w3') el.classList.add('grid-item--w3');
    if (it.tall === true) el.classList.add('grid-item--h2');

    const href = it.type==='blog' ? `/website/article.html?slug=${it.slug}` : it.href;

    el.innerHTML = `
      <a class="card" href="${href}" ${/^https?:/.test(href)?'target="_blank" rel="noreferrer"':''}>
        <div class="thumb">
          <img src="${it.thumb||''}" alt="${it.title}">
        </div>
        <div class="card-body">
          <h3>${it.title}</h3>
          <p class="desc">${it.excerpt || ''}</p>
          <ul class="meta-list">
            <li>Tags: ${(it.tags||[]).join(', ')}</li>
            <li>${it.type==='project'?'Updated':'Published'}: ${it.date}</li>
          </ul>
        </div>
      </a>`;
    // 圖片事件
    el.querySelectorAll('img').forEach(attachImgHandlers);
    frag.appendChild(el);
  });

  grid.appendChild(frag);
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const grid = document.querySelector('.grid');
  const filterButtons = document.querySelectorAll('.filters .btn');
  const searchInput = document.getElementById('search');
  const sortSelect = document.getElementById('sort');

  await loadData(); // 先渲染

  imagesLoaded(grid, ()=>{ // 再初始化 Isotope
    const iso = new Isotope(grid, {
      itemSelector: '.grid-item',
      percentPosition: true,
      masonry: {
        columnWidth: '.grid-sizer',
        gutter: '.gutter-sizer'   
      },
      transitionDuration: '180ms',         // 短一點順眼
      hiddenStyle:  { opacity: 0, transform: 'scale(0.98)' },
      visibleStyle: { opacity: 1, transform: 'scale(1)'    },
      stagger: 12,                          // 交錯顯示（毫秒）

      getSortData: {
        date: el => new Date(el.getAttribute('data-date')).getTime() || 0,
        title: el => (el.getAttribute('data-title')||'').toLowerCase()
      },
      sortBy: 'date',
      sortAscending: { date:false, title:true }
    });

    let currentFilter='*', currentQuery='';

    const compositeFilter = (el)=>{
      const passBtn = currentFilter==='*' ? true : el.matches(currentFilter);
      if(!passBtn) return false;
      if(!currentQuery) return true;
      const t=(el.getAttribute('data-title')||'').toLowerCase();
      const g=(el.getAttribute('data-tags')||'').toLowerCase();
      const d=(el.querySelector('.desc')?.textContent||'').toLowerCase();
      return (t+' '+g+' '+d).includes(currentQuery);
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
      const v=sortSelect.value;
      if (v==='date-desc') iso.arrange({sortBy:'date',sortAscending:false});
      if (v==='date-asc')  iso.arrange({sortBy:'date',sortAscending:true});
      if (v==='title-asc') iso.arrange({sortBy:'title',sortAscending:true});
      if (v==='title-desc')iso.arrange({sortBy:'title',sortAscending:false});
    });

    // 若日後需要動態追加：請先 append 到 DOM → 對新元素 imagesLoaded → iso.appended(newElems) → iso.arrange()
  });
});
