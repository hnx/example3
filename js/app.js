/* Workspace types come from the folder layout: workspaces/<Category>/<Type>/. The shell hardcodes none. */
let TYPES=[];
const SAFE_DIR=/^[A-Za-z0-9][\w. -]*$/, SAFE_FILE=/^(?!.*\.\.)(?!\/)[\w./ -]+$/;
const enc=p=>p.split('/').map(encodeURIComponent).join('/');
const getJSON=u=>fetch(u,{cache:'no-store'}).then(r=>{if(!r.ok)throw 0;return r.json()});
const okDir=n=>typeof n==='string'&&SAFE_DIR.test(n)&&n[0]!=='_'&&n[0]!=='.';
const listDirs=u=>fetch(u,{cache:'no-store'}).then(r=>r.ok?r.text():'').then(t=>{
  const out=[],re=/href="([^"?#\/]+)\/"/g;let m;while((m=re.exec(t)))out.push(decodeURIComponent(m[1]));return out;
}).catch(()=>[]);
function discover(){
  const pairs=new Set();
  const add=(c,t)=>{if(okDir(c)&&okDir(t))pairs.add(c+'/'+t)};
  const listed=getJSON('workspaces/index.json').then(j=>{
    const c=j&&j.categories;if(c&&typeof c==='object')Object.keys(c).forEach(k=>{if(Array.isArray(c[k]))c[k].forEach(t=>add(k,t))});
  }).catch(()=>{});
  /* Servers that expose folder listings (local dev) get auto-detection; GitHub Pages ignores this. */
  const auto=listDirs('workspaces/').then(cs=>Promise.all(cs.filter(okDir).map(c=>listDirs('workspaces/'+enc(c)+'/').then(ts=>ts.forEach(t=>add(c,t))))));
  return Promise.all([listed,auto]).then(()=>[...pairs]);
}
function loadType(path){
  const [cat,name]=path.split('/');
  return getJSON('workspaces/'+enc(path)+'/workspace.json').catch(()=>({})).then(m=>{
    m=m&&typeof m==='object'?m:{};
    const entry=typeof m.entry==='string'&&SAFE_FILE.test(m.entry)?m.entry:'index.html';
    const src='workspaces/'+enc(path)+'/'+enc(entry);
    return fetch(src,{method:'HEAD',cache:'no-store'}).then(r=>{
      if(!r.ok)return null;
      return {id:path,name:String(m.name||name),desc:cat,src,aliases:Array.isArray(m.aliases)?m.aliases.map(String):[]};
    });
  }).catch(()=>null);
}
const findType=id=>TYPES.find(t=>t.id===id||t.aliases.includes(id));
function loadRegistry(){
  return discover().then(ps=>Promise.all(ps.map(loadType)))
    .then(a=>{TYPES=a.filter(Boolean)}).catch(()=>{TYPES=[]}).then(()=>renderList());
}
const $=id=>document.getElementById(id);
let spaces=[];
try{spaces=JSON.parse(localStorage.getItem('instrumentorum:workspaces')||'[]')}catch(e){}
const save=()=>{try{localStorage.setItem('instrumentorum:workspaces',JSON.stringify(spaces))}catch(e){}};

const DOTS='<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>';
const closeRowMenus=()=>document.querySelectorAll('.item .menu').forEach(m=>m.hidden=true);
function renderList(){
  const list=$('list');list.textContent='';
  spaces.forEach(w=>{
    const item=document.createElement('div');item.className='item';
    const b=document.createElement('button');b.className='row';
    const n=document.createElement('div');n.textContent=w.name;
    const t=document.createElement('span');t.textContent=(findType(w.type)||{}).name||'Missing type';
    b.append(n,t);b.onclick=()=>openSession(w);
    const d=document.createElement('button');d.className='icon-btn';d.setAttribute('aria-label','Workspace options');d.innerHTML=DOTS;
    const m=document.createElement('div');m.className='menu';m.hidden=true;m.setAttribute('role','menu');
    const rn=document.createElement('button');rn.textContent='Rename Workspace';
    const dl=document.createElement('button');dl.textContent='Delete Workspace';
    m.append(rn,dl);
    d.onclick=e=>{e.stopPropagation();const o=m.hidden;closeRowMenus();toggleMenu(false);m.hidden=!o};
    rn.onclick=()=>startRename(w,item,b);
    dl.onclick=()=>askDelete(w);
    item.append(b,d,m);list.append(item);
  });
}
function startRename(w,item,row){
  closeRowMenus();
  const i=document.createElement('input');i.className='field rename';i.value=w.name;i.maxLength=60;i.setAttribute('aria-label','Workspace name');
  row.replaceWith(i);i.focus();i.select();
  let done=false;
  const finish=ok=>{if(done)return;done=true;const v=i.value.trim();if(ok&&v){w.name=v;save()}renderList()};
  i.onkeydown=e=>{if(e.key==='Enter')finish(true);else if(e.key==='Escape'){e.stopPropagation();finish(false)}};
  i.onblur=()=>finish(false);
}
let pendingDel=null;
function askDelete(w){closeRowMenus();pendingDel=w;$('delText').textContent='Delete \u201c'+w.name+'\u201d?';open('delModal')}
$('delOk').onclick=()=>{
  if(pendingDel){
    try{localStorage.removeItem('ws:'+pendingDel.id)}catch(e){}
    spaces=spaces.filter(x=>x!==pendingDel);save();renderList();
  }
  pendingDel=null;shut('delModal');
};

/* Slider */
const drawer=$('drawer'),scrim=$('scrim'),menuBtn=$('menuBtn');
function nav(o){drawer.classList.toggle('on',o);scrim.classList.toggle('on',o);menuBtn.setAttribute('aria-expanded',o)}
menuBtn.onclick=()=>nav(!drawer.classList.contains('on'));
scrim.onclick=()=>nav(false);
function show(page){$('home').hidden=page!=='home';$('wsPage').hidden=page!=='ws';toggleMenu(false)}
$('navWs').onclick=()=>{nav(false);closeSession();show('ws')};
$('toHome').onclick=()=>show('home');

/* Three-dot menu */
const menu=$('menu'),dots=$('dots');
function toggleMenu(o){menu.hidden=!o;dots.setAttribute('aria-expanded',o)}
dots.onclick=e=>{e.stopPropagation();closeRowMenus();toggleMenu(menu.hidden)};
document.addEventListener('click',()=>{toggleMenu(false);closeRowMenus()});

/* Modals */
const open=id=>$(id).classList.add('on'),shut=id=>$(id).classList.remove('on');
document.querySelectorAll('.modal').forEach(m=>{
  m.onclick=e=>{if(e.target===m||e.target.closest('[data-close]'))m.classList.remove('on')};
});
/* Create workspace */
let pickedType=null;
$('createBtn').onclick=()=>{
  toggleMenu(false);pickedType=null;
  const step=$('typeStep');step.textContent='';step.hidden=false;$('nameStep').hidden=true;
  const acc=document.createElement('div');acc.className='acc acc-1';
  const head=document.createElement('button');head.className='acc-head';head.setAttribute('aria-expanded','false');head.textContent='Choose Type of Workspace';
  const panel=document.createElement('div');panel.className='acc-panel';
  const inner=document.createElement('div');inner.className='acc-inner';
  panel.append(inner);acc.append(head,panel);step.append(acc);
  head.onclick=()=>{const o=!acc.classList.contains('open');acc.classList.toggle('open',o);head.setAttribute('aria-expanded',o)};
  const groups={};
  TYPES.forEach(t=>{
    if(!groups[t.desc]){
      const g=document.createElement('div');g.className='acc acc-2';
      const gh=document.createElement('button');gh.className='acc-head';gh.setAttribute('aria-expanded','false');gh.textContent=t.desc;
      const gp=document.createElement('div');gp.className='acc-panel';
      const gi=document.createElement('div');gi.className='acc-inner';
      gp.append(gi);g.append(gh,gp);inner.append(g);
      gh.onclick=()=>{const o=!g.classList.contains('open');g.classList.toggle('open',o);gh.setAttribute('aria-expanded',o)};
      groups[t.desc]=gi;
    }
    const b=document.createElement('button');b.className='row';b.textContent=t.name;
    b.onclick=()=>{pickedType=t;step.hidden=true;$('nameStep').hidden=false;$('createTitle').textContent=t.name;
      const i=$('nameInput');i.value='';i.placeholder='Workspace name';i.focus()};
    groups[t.desc].append(b);
  });
  $('createTitle').textContent='Create Workspace';open('createModal');
};
$('nameInput').addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  const name=e.target.value.trim();if(!name||!pickedType)return;
  const w={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,type:pickedType.id};
  spaces.push(w);save();renderList();shut('createModal');openSession(w);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal').forEach(m=>m.classList.remove('on'));nav(false);toggleMenu(false)}});

/* Session: the workspace runs inside this file */
const missingDoc=m=>'<body style="margin:0;display:grid;place-items:center;height:100vh;padding:24px;text-align:center;font:14px sans-serif;color:#8a8a8a;background:transparent">'+m.replace(/</g,'&lt;')+'</body>';
let clearT;
function openSession(w){
  clearTimeout(clearT);
  $('sessionName').textContent=w.name;
  const t=findType(w.type);
  $('session').hidden=false;document.body.classList.add('in-session');
  const f=$('frame');
  if(!t){f.srcdoc=missingDoc('This workspace type is missing. Restore its folder in workspaces/.');return}
  fetch(t.src,{method:'HEAD',cache:'no-store'}).then(r=>{
    if(!r.ok)throw 0;f.removeAttribute('srcdoc');f.src=t.src+'?ws='+encodeURIComponent(w.id);
  }).catch(()=>{f.srcdoc=missingDoc('Could not load '+t.src+'. Check its folder and workspace.json.')});
}
function closeSession(){
  $('session').hidden=true;document.body.classList.remove('in-session');
  clearTimeout(clearT);clearT=setTimeout(()=>{if($('session').hidden){$('frame').removeAttribute('srcdoc');$('frame').src='about:blank'}},700);
}
$('back').onclick=closeSession;
loadRegistry();

/* Home chat */
const chatLog=$('chatLog'),chatInput=$('chatInput');
function addBubble(text,who){
  const b=document.createElement('div');b.className='bubble '+who;b.textContent=text;
  chatLog.append(b);chatLog.scrollTop=chatLog.scrollHeight;return b;
}
function sendChat(){
  const text=chatInput.value.trim();if(!text)return;
  addBubble(text,'user');chatInput.value='';chatInput.focus();
  const t=document.createElement('div');t.className='bubble bot typing';t.innerHTML='<i></i><i></i><i></i>';
  chatLog.append(t);chatLog.scrollTop=chatLog.scrollHeight;
  setTimeout(()=>{t.remove();addBubble('How can I help you?','bot')},800);
}
$('chatSend').onclick=sendChat;
chatInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendChat()}});
