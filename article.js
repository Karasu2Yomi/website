// 讀取 slug
function getSlug() {
  const u = new URL(location.href);
  return u.searchParams.get('slug') || '';
}

// 簡單 front-matter 解析（僅支援 YAML 置頂區塊）
function parseFrontMatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: md };
  const yaml = m[1];
  const body = md.slice(m[0].length);
  const data = {};
  yaml.split('\n').forEach(line => {
    const k = line.split(':')[0]?.trim();
    const raw = line.slice(line.indexOf(':') + 1).trim();
    if (!k) return;
    // 支援 tags: [a, b]
    if (raw.startsWith('[')) {
      try { data[k] = JSON.parse(raw.replace(/'/g, '"')); }
      catch { data[k] = raw; }
    } else {
      data[k] = raw.replace(/^"|"$|^'|'$/g, '');
    }
  });
  return { data, body };
}

// 生成目錄
function buildTOC(container, target) {
  const heads = target.querySelectorAll('h1, h2, h3');
  if (!heads.length) return (container.innerHTML = '');
  const ul = document.createElement('ul');
  heads.forEach(h => {
    const id = h.id || h.textContent.trim().toLowerCase().replace(/\s+/g, '-');
    h.id = id;
    const li = document.createElement('li');
    li.className = 'toc-' + h.tagName.toLowerCase();
    li.innerHTML = `<a href="#${id}">${h.textContent}</a>`;
    ul.appendChild(li);
  });
  container.innerHTML = '<h3>目錄</h3>';
  container.appendChild(ul);
}

// 圖片 lazy + 可放大（lightbox）
function enhanceImages(scope) {
  const imgs = scope.querySelectorAll('img');
  imgs.forEach(img => {
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('click', () => openLightbox(img.src, img.alt || ''));
    img.style.cursor = 'zoom-in';
  });
}

function openLightbox(src, alt) {
  let mb = document.getElementById('lb');
  if (!mb) {
    mb = document.createElement('div');
    mb.id = 'lb';
    mb.className = 'lightbox';
    mb.innerHTML = `<div class="lightbox-backdrop"></div>
                    <img class="lightbox-img" alt="">
                    <button class="lightbox-close" aria-label="Close">×</button>`;
    document.body.appendChild(mb);
    mb.addEventListener('click', (e) => {
      if (e.target.classList.contains('lightbox-backdrop') || e.target.classList.contains('lightbox-close')) {
        mb.classList.remove('show');
        document.body.style.removeProperty('overflow');
      }
    });
  }
  mb.querySelector('.lightbox-img').src = src;
  mb.querySelector('.lightbox-img').alt = alt;
  mb.classList.add('show');
  document.body.style.overflow = 'hidden';
}

async function init() {
  const slug = getSlug();
  if (!slug) {
    document.getElementById('post-content').textContent = '缺少 slug 參數。';
    return;
  }

  // 1) 讀取 markdown
  const res = await fetch(`/website/posts/${slug}.md?ts=${Date.now()}`);
  if (!res.ok) {
    document.getElementById('post-content').textContent = '文章不存在或無法讀取。';
    return;
  }
  const raw = await res.text();

  // 2) 解析 front-matter
  const { data, body } = parseFrontMatter(raw);
  const title = data.title || slug;
  const date = data.date || '';
  const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? String(data.tags).split(',') : []);
  const hero = data.hero || '';

  // 3) 渲染 markdown -> HTML
  marked.setOptions({
    mangle: false, headerIds: true,
    highlight: (code, lang) => {
      try { return window.hljs.highlight(code, { language: lang }).value; }
      catch { return window.hljs.highlightAuto(code).value; }
    }
  });
  const html = marked.parse(body);

  // 4) 注入內容
  const $title = document.getElementById('post-title');
  const $date = document.getElementById('post-date');
  const $tags = document.getElementById('post-tags');
  const $content = document.getElementById('post-content');

  $title.textContent = title;
  if (date) $date.textContent = new Date(date).toLocaleDateString('ja-JP');
  if (tags.length) $tags.textContent = ' · ' + tags.join(' / ');

  $content.innerHTML = html;

  // 5) 題圖策略：front-matter.hero 優先；否則抓正文第一張圖
  let heroSrc = hero;
  if (!heroSrc) {
    const firstImg = $content.querySelector('img');
    if (firstImg) heroSrc = firstImg.src;
  }
  if (heroSrc) {
    const heroWrap = document.getElementById('post-hero');
    const heroImg = document.getElementById('post-hero-img');
    heroImg.src = heroSrc;
    heroImg.loading = 'eager';
    heroImg.decoding = 'async';
    heroWrap.hidden = false;
  }

  // 6) 目錄
  buildTOC(document.getElementById('toc'), $content);

  // 7) 圖片增強（lazy + lightbox）
  enhanceImages($content);

  // 8) 內部連結（連到其他文章）轉成 article.html?slug=...
  $content.querySelectorAll('a[href^="./"], a[href^="/posts/"]').forEach(a => {
    const href = a.getAttribute('href');
    const m = href.match(/\/posts\/(.+?)\.md$/);
    if (m) {
      a.href = `/website/article.html?slug=${m[1]}`;
    }
  });

  // 9) 可選：設定 OG meta（若要社群分享漂亮卡片，可在 article.html 用 JS 注入）
}
document.addEventListener('DOMContentLoaded', init);
