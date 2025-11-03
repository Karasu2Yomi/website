function getSlug(){ return new URL(location.href).searchParams.get('slug') || '' }

function parseFrontMatter(md){
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if(!m) return {data:{}, body:md};
  const yaml=m[1], body=md.slice(m[0].length), data={};
  yaml.split('\n').forEach(line=>{
    const i=line.indexOf(':'); if(i<0) return;
    const k=line.slice(0,i).trim(); let v=line.slice(i+1).trim();
    if(v.startsWith('[')){ try{ v=JSON.parse(v.replace(/'/g,'"')) }catch(e){} }
    else v=v.replace(/^['"]|['"]$/g,'');
    data[k]=v;
  });
  return {data, body};
}

function buildTOC(container, target){
  const heads=target.querySelectorAll('h1,h2,h3');
  if(!heads.length){ container.innerHTML=''; return; }
  const ul=document.createElement('ul');
  heads.forEach(h=>{
    const id=h.id||h.textContent.trim().toLowerCase().replace(/\s+/g,'-');
    h.id=id;
    const li=document.createElement('li');
    li.className='toc-'+h.tagName.toLowerCase();
    li.innerHTML=`<a href="#${id}">${h.textContent}</a>`;
    ul.appendChild(li);
  });
  container.innerHTML='<h3>目錄</h3>'; container.appendChild(ul);
}

/* Lightbox */
function openLightbox(src, alt){
  let mb=document.getElementById('lb');
  if(!mb){
    mb=document.createElement('div'); mb.id='lb'; mb.className='lightbox';
    mb.innerHTML=`<div class="lightbox-backdrop"></div>
                  <img class="lightbox-img" alt="">
                  <button class="lightbox-close" aria-label="Close">×</button>`;
    document.body.appendChild(mb);
    mb.addEventListener('click',e=>{
      if(e.target.classList.contains('lightbox-backdrop')||e.target.classList.contains('lightbox-close')){
        mb.classList.remove('show'); document.body.style.removeProperty('overflow');
      }
    });
  }
  mb.querySelector('.lightbox-img').src=src;
  mb.querySelector('.lightbox-img').alt=alt||'';
  mb.classList.add('show'); document.body.style.overflow='hidden';
}

/* 圖片增強：CSS 骨架 + 載入淡入 + 失敗樣式 */
function enhanceImages(scope){
  scope.querySelectorAll('img').forEach(img=>{
    img.loading='lazy'; img.decoding='async'; img.style.cursor='zoom-in';
    const show = ()=> img.classList.add('img-loaded');
    if (img.complete && img.naturalWidth>0) show(); else img.addEventListener('load', show, {once:true});
    img.addEventListener('error', ()=>{
      const box=img.parentElement; if(box) box.classList.add('is-error');
      img.style.display='none';
    }, {once:true});
    img.addEventListener('click', ()=> openLightbox(img.src, img.alt||''));
  });
}

async function init(){
  const slug=getSlug();
  if(!slug){ document.getElementById('post-content').textContent='缺少 slug 參數。'; return; }

  const res=await fetch(`/website/posts/${slug}.md?ts=${Date.now()}`);
  if(!res.ok){ document.getElementById('post-content').textContent='文章不存在或無法讀取。'; return; }
  const raw=await res.text();
  const {data, body}=parseFrontMatter(raw);

  const title=data.title||slug, date=data.date||'', tags=Array.isArray(data.tags)?data.tags:(data.tags?String(data.tags).split(','):[]);
  const hero=data.hero||'';

  // Markdown render
  marked.setOptions({
    mangle:false, headerIds:true,
    highlight:(code,lang)=>{ try{ return window.hljs.highlight(code,{language:lang}).value }catch{ return window.hljs.highlightAuto(code).value } }
  });
  const html=marked.parse(body);

  // 注入
  const $title=document.getElementById('post-title');
  const $date=document.getElementById('post-date');
  const $tags=document.getElementById('post-tags');
  const $content=document.getElementById('post-content');
  $title.textContent=title;
  if(date) $date.textContent=new Date(date).toLocaleDateString('ja-JP');
  if(tags.length) $tags.textContent=' · '+tags.join(' / ');
  $content.innerHTML=html;

  // 題圖：front-matter.hero 優先；否則抓正文第一張圖
  let heroSrc=hero;
  if(!heroSrc){ const first=$content.querySelector('img'); if(first) heroSrc=first.src; }
  if(heroSrc){
    const wrap=document.getElementById('post-hero'); const img=document.getElementById('post-hero-img');
    img.src=heroSrc; img.decoding='async';
    // 載入完成淡入
    const show=()=> img.classList.add('img-loaded');
    if(img.complete && img.naturalWidth>0) show(); else img.addEventListener('load', show, {once:true});
    // 失敗樣式（不載入任何佔位圖）
    img.addEventListener('error', ()=>{
      document.querySelector('.hero').classList.add('is-error'); img.style.display='none';
    }, {once:true});
    wrap.hidden=false;
  }

  // TOC + 圖片增強
  buildTOC(document.getElementById('toc'), $content);
  enhanceImages($content);

  // 內部連結 → 文章頁
  $content.querySelectorAll('a[href^="./"], a[href^="/website/posts/"]').forEach(a=>{
    const m=a.getAttribute('href').match(/\/website\/\/posts\/(.+?)\.md$/);
    if(m) a.href=`/website/article.html?slug=${m[1]}`;
  });
}

document.addEventListener('DOMContentLoaded', init);
