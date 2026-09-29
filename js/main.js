/* Loads the HTML pieces into the page, then the scripts (in order). */
(function(){
  const parts=['html/landing.html','html/app.html','html/settings.html'];
  const scripts=['js/app.js','js/landing.js','js/settings.js'];
  Promise.all(parts.map(p=>fetch(p,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(p);return r.text()})))
  .then(t=>{
    document.body.insertAdjacentHTML('beforeend',t.join('\n'));
    scripts.reduce((chain,src)=>chain.then(()=>new Promise((ok,fail)=>{
      const s=document.createElement('script');s.src=src+'?v='+Date.now();s.onload=ok;s.onerror=()=>fail(new Error(src));
      document.body.appendChild(s);
    })),Promise.resolve());
  })
  .catch(()=>{
    document.body.insertAdjacentHTML('beforeend','<p style="position:fixed;inset:0;display:grid;place-items:center;padding:24px;text-align:center;font:14px sans-serif;color:#8a8a8a">This page loads its parts with fetch(), so it must be served over http(s) (e.g. GitHub Pages or a local server), not opened as a file.</p>');
  });
})();
