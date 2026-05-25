// === BLOCO FUMAÇA - REMOVER COM "Tire essa parte das fumaças" ===
(function () {
  'use strict';

  const FUMACA_EMAILS = [
    'estagioadmin@granmarquise.com.br',
    'suporte.ti@granmarquise.com.br',
  ];

  // ── CSS ────────────────────────────────────────────────────────────────────
  const styleEl = document.createElement('style');
  styleEl.id = 'fumaca-css';
  styleEl.textContent = `
    @keyframes _fpulse {
      0%,100% { transform:scale(1); box-shadow:0 0 0 0 rgba(255,80,0,.8); }
      50%      { transform:scale(1.04); box-shadow:0 0 0 20px rgba(255,80,0,0); }
    }
    @keyframes _fshake {
      0%,100% { transform:translate(0,0) rotate(0deg); }
      10%  { transform:translate(-9px,5px) rotate(-1.5deg); }
      20%  { transform:translate(9px,-5px) rotate(1.5deg); }
      30%  { transform:translate(-7px,7px) rotate(0deg); }
      40%  { transform:translate(7px,-3px) rotate(1deg); }
      50%  { transform:translate(-5px,5px) rotate(-1deg); }
      60%  { transform:translate(5px,-5px) rotate(0deg); }
      70%  { transform:translate(-3px,3px) rotate(1deg); }
      80%  { transform:translate(3px,-3px) rotate(-1deg); }
      90%  { transform:translate(-1px,1px) rotate(0deg); }
    }
    @keyframes _fflash {
      0%,100% { background:rgba(255,0,0,0); }
      50%      { background:rgba(255,0,0,.4); }
    }
    @keyframes _fspin   { to { transform:rotate(360deg); } }
    @keyframes _fbounce {
      0%,100% { transform:translateY(0) scale(1); }
      35%     { transform:translateY(-22px) scale(1.12); }
      65%     { transform:translateY(10px) scale(.94); }
    }
    @keyframes _fbeep {
      0%,100% { transform:scale(1); opacity:1; }
      50%      { transform:scale(1.18); opacity:.65; }
    }
    @keyframes _frain {
      0%   { transform:translateY(-90px) rotate(0deg); opacity:1; }
      100% { transform:translateY(115vh) rotate(400deg); opacity:.7; }
    }
    @keyframes _fbig {
      0%   { opacity:0; transform:translate(-50%,-50%) scale(.2) rotate(-8deg); }
      15%  { opacity:1; transform:translate(-50%,-50%) scale(1.1) rotate(2deg); }
      80%  { opacity:1; transform:translate(-50%,-50%) scale(1) rotate(0deg); }
      100% { opacity:0; transform:translate(-50%,-50%) scale(.85) rotate(4deg); }
    }
    @keyframes _fcountdown {
      0%   { opacity:0; transform:translate(-50%,-50%) scale(3); }
      20%  { opacity:1; transform:translate(-50%,-50%) scale(1); }
      80%  { opacity:1; transform:translate(-50%,-50%) scale(1); }
      100% { opacity:0; transform:translate(-50%,-50%) scale(.5); }
    }
    @keyframes _fflame {
      0%,100% { transform:scaleX(1) scaleY(1) translateY(0); filter:hue-rotate(0deg); }
      25%     { transform:scaleX(1.12) scaleY(.93) translateY(-4px); filter:hue-rotate(15deg); }
      50%     { transform:scaleX(.88) scaleY(1.1) translateY(-7px); filter:hue-rotate(-10deg); }
      75%     { transform:scaleX(1.06) scaleY(.96) translateY(-2px); filter:hue-rotate(5deg); }
    }
    @keyframes _fcandle {
      0%,100% { transform:scaleX(1) scaleY(1) rotate(0deg); filter:brightness(1); }
      20%     { transform:scaleX(.8) scaleY(1.15) rotate(-4deg); filter:brightness(1.4); }
      40%     { transform:scaleX(1.15) scaleY(.88) rotate(3deg); filter:brightness(.8); }
      60%     { transform:scaleX(.9) scaleY(1.08) rotate(-2deg); filter:brightness(1.1); }
      80%     { transform:scaleX(1.08) scaleY(.93) rotate(2deg); filter:brightness(.92); }
    }
    @keyframes _fstar {
      0%   { opacity:0; transform:translateY(0) scale(0) rotate(0deg); }
      50%  { opacity:1; transform:translateY(-45px) scale(1.6) rotate(180deg); }
      100% { opacity:0; transform:translateY(-90px) scale(0) rotate(360deg); }
    }
    @keyframes _fbus {
      0%   { transform:translateX(-130vw); }
      35%  { transform:translateX(0); }
      65%  { transform:translateX(0); }
      100% { transform:translateX(130vw); }
    }
    @keyframes _fvento {
      0%   { transform:translateX(-100vw); opacity:1; }
      80%  { transform:translateX(55vw); opacity:1; }
      100% { transform:translateX(65vw); opacity:0; }
    }
    @keyframes _fthermo {
      0%   { height:8%;  background:#44bb44; }
      50%  { height:70%; background:#ff8800; }
      85%  { height:98%; background:#ff1100; }
      100% { height:100%; background:#ff0000; transform:scaleY(1.4); }
    }
    @keyframes _fnojo {
      0%,100% { transform:scale(1) rotate(-6deg); }
      50%      { transform:scale(1.35) rotate(6deg); }
    }
    @keyframes _fgreen {
      0%   { opacity:.9; transform:scale(1); }
      100% { opacity:.7; transform:scale(1.6); }
    }
    @keyframes _fglitch {
      0%  { clip-path:inset(38% 0 62% 0); transform:translateX(-5px); }
      25% { clip-path:inset(90% 0 2% 0);  transform:translateX(5px); }
      50% { clip-path:inset(20% 0 50% 0); transform:translateX(-5px); }
      75% { clip-path:inset(55% 0 10% 0); transform:translateX(5px); }
      100%{ clip-path:inset(60% 0 40% 0); transform:translateX(-5px); }
    }

    /* Botão principal */
    #fumaca-btn-principal {
      display:flex; align-items:center; justify-content:center; gap:.6rem;
      width:100%; padding:1.1rem 2rem; margin-bottom:1.25rem;
      font-size:1.55rem; font-weight:900; letter-spacing:.06em; text-transform:uppercase;
      cursor:pointer; border:none; border-radius:16px; color:#fff;
      background:linear-gradient(135deg,#ff6b00 0%,#ff0080 50%,#7c00ff 100%);
      box-shadow:0 0 0 0 rgba(255,80,0,.8), 0 8px 30px rgba(0,0,0,.4);
      animation:_fpulse 1.8s ease-in-out infinite;
      position:relative; overflow:hidden;
    }
    #fumaca-btn-principal:hover { filter:brightness(1.15); }

    /* Modal de seleção */
    #fumaca-overlay-sel {
      position:fixed; inset:0; z-index:9990;
      background:rgba(0,0,0,.8);
      display:flex; align-items:center; justify-content:center;
      backdrop-filter:blur(5px);
    }
    #fumaca-modal-sel {
      background:linear-gradient(135deg,#12001f 0%,#0a1a3a 100%);
      border:2px solid rgba(255,255,255,.15); border-radius:22px;
      padding:2rem; max-width:640px; width:95%;
      box-shadow:0 24px 80px rgba(0,0,0,.75);
    }
    #fumaca-modal-sel h2 {
      text-align:center; color:#fff; font-size:1.7rem; margin:0 0 1.5rem;
      text-shadow:0 0 25px rgba(255,100,0,.9);
    }
    #fumaca-grid {
      display:grid; grid-template-columns:1fr 1fr; gap:.75rem;
    }
    .fumaca-opt {
      background:rgba(255,255,255,.07);
      border:1px solid rgba(255,255,255,.15); border-radius:12px;
      color:#fff; padding:.8rem 1rem; font-size:.95rem; font-weight:600;
      cursor:pointer; transition:all .2s; text-align:left;
    }
    .fumaca-opt:hover {
      background:rgba(255,255,255,.18); transform:scale(1.04);
      box-shadow:0 4px 18px rgba(0,0,0,.3);
    }
    #fumaca-fechar-sel {
      display:block; margin:1.25rem auto 0;
      background:none; border:1px solid rgba(255,255,255,.25);
      color:rgba(255,255,255,.55); border-radius:8px;
      padding:.4rem 1.4rem; cursor:pointer; font-size:.85rem;
    }

    /* Overlay de animação */
    #fumaca-anim {
      position:fixed; inset:0; z-index:99999;
      overflow:hidden; pointer-events:none;
    }
  `;
  document.head.appendChild(styleEl);

  // ── Dados das fumaças ──────────────────────────────────────────────────────
  const FUMACAS = [
    { nome:'Arroz Queimado',                emoji:'🍳' },
    { nome:'Incenso',                        emoji:'🧘' },
    { nome:'Fogos da Virada em Copacabana',  emoji:'🎆' },
    { nome:'Escapamento do Ônibus',          emoji:'🚌' },
    { nome:'Churrasco do Vizinho',           emoji:'🥩' },
    { nome:'Vela de Aniversário Apagada',    emoji:'🕯️' },
    { nome:'Café Passando',                  emoji:'☕' },
    { nome:'Pipoca Estourando',              emoji:'🍿' },
    { nome:'Pum Alheio',                     emoji:'💨' },
    { nome:'Notebook Superaquecido',         emoji:'💻🔥' },
  ];

  // ── Helpers ────────────────────────────────────────────────────────────────
  function criarOv() {
    const el = document.createElement('div');
    el.id = 'fumaca-anim';
    document.body.appendChild(el);
    return el;
  }
  function remOv(ov) { if (ov && ov.parentNode) ov.remove(); }

  function sacudir(ms) {
    document.documentElement.style.animation = `_fshake ${ms}ms ease-in-out`;
    setTimeout(() => { document.documentElement.style.animation = ''; }, ms);
  }

  function chuva(container, emoji, n, dur) {
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.textContent = emoji;
      el.style.cssText = `position:absolute;font-size:${2.2+Math.random()*3}rem;
        left:${Math.random()*100}%;top:-80px;z-index:3;pointer-events:none;
        animation:_frain ${dur*(.5+Math.random()*.5)}ms ${Math.random()*dur*.5}ms linear both;`;
      container.appendChild(el);
    }
  }

  function textoC(container, html, cor, sz, delay, dur, extra) {
    const el = document.createElement('div');
    el.innerHTML = html;
    el.style.cssText = `position:absolute;top:50%;left:50%;z-index:10;pointer-events:none;
      font-size:${sz||'5rem'};font-weight:900;color:${cor||'#fff'};text-align:center;
      text-shadow:0 0 32px currentColor,0 4px 10px rgba(0,0,0,.85);white-space:nowrap;
      animation:_fbig ${dur}ms ${delay||0}ms ease-in-out both;${extra||''}`;
    container.appendChild(el);
    return el;
  }

  function mkCanvas(ov) {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:absolute;inset:0;z-index:2;width:100%;height:100%;pointer-events:none;';
    c.width = window.innerWidth; c.height = window.innerHeight;
    ov.appendChild(c);
    return c;
  }

  function smokePuffs(n, cx, cy, colorFn) {
    return Array.from({length:n}, () => ({
      x: cx+(Math.random()-.5)*120,
      y: cy+(Math.random()-.5)*60,
      r: 22+Math.random()*35,
      vx: (Math.random()-.5)*2.5,
      vy: -(1.8+Math.random()*3.5),
      life:0, maxLife:70+Math.random()*60,
      delay:Math.floor(Math.random()*55),
      colorFn,
    }));
  }
  function drawPuffs(ctx, puffs, frame) {
    puffs.forEach(p => {
      if (frame < p.delay) return;
      p.life++;
      if (p.life > p.maxLife) { p.x = p.x+(Math.random()-.5)*40; p.y += 20; p.life = 0; }
      p.x += p.vx; p.y += p.vy;
      const t = p.life/p.maxLife;
      const rad = p.r*(1+t*2.2);
      const a = (1-t)*.75;
      const grd = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,rad);
      const [r,g,b] = p.colorFn();
      grd.addColorStop(0,`rgba(${r},${g},${b},${a})`);
      grd.addColorStop(1,`rgba(${r*.5|0},${g*.5|0},${b*.5|0},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(p.x,p.y,rad,0,Math.PI*2); ctx.fill();
    });
  }

  // ── 1. ARROZ QUEIMADO 🍳 ────────────────────────────────────────────────
  function anim1(cb) {
    const ov = criarOv();
    ov.style.background = 'rgba(0,0,0,.1)';

    const flash = document.createElement('div');
    flash.style.cssText = 'position:absolute;inset:0;z-index:1;animation:_fflash .35s ease-in-out infinite;';
    ov.appendChild(flash);

    const c = mkCanvas(ov);
    const ctx = c.getContext('2d');
    const puffs = smokePuffs(70, c.width*.5, c.height*.75, ()=>[20,20,20]);

    const sirene = document.createElement('div');
    sirene.textContent = '🚨';
    sirene.style.cssText = 'position:absolute;top:7%;left:50%;transform:translateX(-50%);font-size:7rem;z-index:5;animation:_fspin .9s linear infinite;';
    ov.appendChild(sirene);

    const panela = document.createElement('div');
    panela.textContent = '🍳';
    panela.style.cssText = 'position:absolute;bottom:8%;left:50%;transform:translateX(-50%);font-size:9rem;z-index:5;animation:_fbounce .9s ease-in-out infinite;';
    ov.appendChild(panela);

    const beep = document.createElement('div');
    beep.innerHTML = '🔴 BEEP BEEP BEEP 🔴';
    beep.style.cssText = 'position:absolute;top:28%;left:50%;transform:translateX(-50%);font-size:3.8rem;font-weight:900;color:#ff0000;text-shadow:0 0 30px #ff0000;z-index:6;white-space:nowrap;animation:_fbeep .28s ease-in-out infinite;';
    ov.appendChild(beep);

    textoC(ov,'🔥 ARROZ QUEIMANDO! 🔥','#ff4400','3rem',600,3200,'top:65%;');
    sacudir(4200);

    let fr=0; const raf={v:null};
    (function loop(){ ctx.clearRect(0,0,c.width,c.height); fr++; drawPuffs(ctx,puffs,fr); raf.v=requestAnimationFrame(loop); })();
    setTimeout(()=>{ cancelAnimationFrame(raf.v); remOv(ov); cb(); }, 4500);
  }

  // ── 2. INCENSO 🧘 ───────────────────────────────────────────────────────
  function anim2(cb) {
    const ov = criarOv();
    ov.style.background = 'rgba(5,0,18,.97)';

    const c = mkCanvas(ov);
    const ctx = c.getContext('2d');

    const ico = document.createElement('div');
    ico.textContent = '🪔';
    ico.style.cssText = 'position:absolute;bottom:14%;left:50%;transform:translateX(-50%);font-size:6rem;z-index:5;';
    ov.appendChild(ico);

    const mantras = ['OM...','PAZ...','CALMA...','HARMONIA...','NAMASTÊ...'];
    mantras.forEach((m,i) => {
      const el = document.createElement('div');
      el.textContent = m;
      el.style.cssText = `position:absolute;left:${12+Math.random()*70}%;top:${18+Math.random()*58}%;
        font-size:${1.4+Math.random()*.8}rem;color:rgba(190,130,255,0);font-style:italic;font-weight:700;z-index:4;
        text-shadow:0 0 12px rgba(200,150,255,.6);transition:color .9s;`;
      ov.appendChild(el);
      setTimeout(()=>{ el.style.color=`rgba(190,130,255,${.5+Math.random()*.4})`; }, 250+i*550);
      setTimeout(()=>{ el.style.color='rgba(190,130,255,0)'; }, 1700+i*350);
    });

    const sparkles = Array.from({length:90},()=>({
      x:c.width*.5+(Math.random()-.5)*260,
      y:c.height*.74,
      vx:(Math.random()-.5)*1.8,
      vy:-(1+Math.random()*3.2),
      sz:1+Math.random()*3,
      life:0,maxLife:65+Math.random()*80,
      delay:Math.floor(Math.random()*65),
    }));

    const wisps = Array.from({length:6},(_,i)=>({
      x:c.width*.5+(i-2.5)*28,
      y:c.height*.74,
      t:i*.28,
      hue:265+i*18,
    }));

    let fr=0; const raf={v:null};
    (function loop(){
      fr++;
      ctx.clearRect(0,0,c.width,c.height);
      wisps.forEach(w=>{
        w.t+=.016;
        ctx.beginPath(); ctx.moveTo(w.x,w.y);
        for(let i=1;i<=28;i++){
          const py=w.y-i*(c.height*.62/28);
          const px=w.x+Math.sin(w.t+i*.22)*(18+i*1.1);
          ctx.lineTo(px,py);
        }
        const alpha=Math.max(0,.55-fr/900);
        ctx.strokeStyle=`hsla(${w.hue},65%,65%,${alpha})`;
        ctx.lineWidth=2.5; ctx.stroke();
      });
      sparkles.forEach(s=>{
        if(fr<s.delay) return;
        s.life++;
        if(s.life>s.maxLife){s.x=c.width*.5+(Math.random()-.5)*200;s.y=c.height*.74;s.life=0;}
        s.x+=s.vx; s.y+=s.vy;
        ctx.fillStyle=`rgba(255,215,60,${(1-s.life/s.maxLife)*.9})`;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.sz,0,Math.PI*2); ctx.fill();
      });
      raf.v=requestAnimationFrame(loop);
    })();

    setTimeout(()=>{
      const el = document.createElement('div');
      el.innerHTML='🧘 "ai meu olho..." 😭💨';
      el.style.cssText='position:absolute;top:50%;left:50%;font-size:3rem;font-weight:900;color:#fff;z-index:10;text-align:center;text-shadow:0 0 20px rgba(200,150,255,.9);animation:_fbig 2s ease-in-out both;';
      ov.appendChild(el);
    },2200);

    setTimeout(()=>{ cancelAnimationFrame(raf.v); remOv(ov); cb(); },4600);
  }

  // ── 3. FOGOS DA VIRADA 🎆 ─────────────────────────────────────────────
  function anim3(cb) {
    const ov = criarOv();
    ov.style.background = '#000';

    const c = mkCanvas(ov);
    const ctx = c.getContext('2d');

    const cnt = document.createElement('div');
    cnt.textContent='3';
    cnt.style.cssText='position:absolute;top:40%;left:50%;font-size:13rem;font-weight:900;color:#fff;text-shadow:0 0 60px #fff;z-index:10;animation:_fcountdown 1s ease-in-out both;';
    ov.appendChild(cnt);

    let n=3;
    const iv=setInterval(()=>{
      n--;
      if(n>0){ cnt.textContent=n; cnt.style.animation='none'; void cnt.offsetWidth; cnt.style.animation='_fcountdown 1s ease-in-out both'; }
      else {
        clearInterval(iv); cnt.remove();
        const feliz=document.createElement('div');
        feliz.innerHTML='🎆 FELIZ ANO NOVO! 🎇<br>✨🥂🎉🍾🎊✨';
        feliz.style.cssText='position:absolute;top:35%;left:50%;font-size:3.2rem;font-weight:900;color:#fff;text-shadow:0 0 40px #fff;z-index:10;text-align:center;animation:_fbig 2.2s ease-in-out both;';
        ov.appendChild(feliz);
        let h=0;
        const ci=setInterval(()=>{ ov.style.background=`hsl(${h},75%,12%)`; h=(h+35)%360; },140);
        setTimeout(()=>clearInterval(ci),2200);
      }
    },1000);

    const particles=[];
    function launch(){
      const x=(.1+Math.random()*.8)*c.width;
      const y=(.08+Math.random()*.55)*c.height;
      const hue=Math.random()*360;
      const n=90+Math.floor(Math.random()*60);
      for(let i=0;i<n;i++){
        const a=(i/n)*Math.PI*2;
        const spd=3+Math.random()*8;
        particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
          life:0,maxLife:40+Math.random()*45,
          color:`hsl(${hue+Math.random()*40-20},100%,65%)`,sz:1.8+Math.random()*2.8});
      }
    }

    const confetti=Array.from({length:70},()=>({
      x:Math.random()*c.width,y:-20,vy:2+Math.random()*4,vx:(Math.random()-.5)*3,
      rot:Math.random()*360,rotV:(Math.random()-.5)*10,
      color:`hsl(${Math.random()*360},90%,60%)`,w:8+Math.random()*9,h:4+Math.random()*4,
    }));

    let fr=0; const raf={v:null};
    (function loop(){
      fr++;
      ctx.fillStyle='rgba(0,0,0,.18)'; ctx.fillRect(0,0,c.width,c.height);
      if(fr%16===0) launch();
      if(fr%7===0&&fr<200) launch();
      particles.forEach(p=>{
        p.life++; p.x+=p.vx; p.y+=p.vy; p.vy+=.09;
        ctx.globalAlpha=Math.max(0,1-p.life/p.maxLife);
        ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.sz,0,Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha=1;
      confetti.forEach(c2=>{
        c2.y+=c2.vy; c2.x+=c2.vx; c2.rot+=c2.rotV;
        if(c2.y>c.height){c2.y=-20;c2.x=Math.random()*c.width;}
        ctx.save(); ctx.translate(c2.x,c2.y); ctx.rotate(c2.rot*Math.PI/180);
        ctx.fillStyle=c2.color; ctx.fillRect(-c2.w/2,-c2.h/2,c2.w,c2.h); ctx.restore();
      });
      raf.v=requestAnimationFrame(loop);
    })();

    setTimeout(()=>{ clearInterval(iv); cancelAnimationFrame(raf.v); remOv(ov); cb(); },5000);
  }

  // ── 4. ESCAPAMENTO DO ÔNIBUS 🚌 ─────────────────────────────────────
  function anim4(cb) {
    const ov = criarOv();
    ov.style.background = 'rgba(0,0,0,.25)';

    const c = mkCanvas(ov);
    const ctx = c.getContext('2d');

    const bus = document.createElement('div');
    bus.textContent='🚌';
    bus.style.cssText='position:absolute;top:38%;left:35%;font-size:11rem;z-index:6;animation:_fbus 2.6s ease-in-out both;';
    ov.appendChild(bus);

    const cof = document.createElement('div');
    cof.innerHTML='😷<br>COF COF COF';
    cof.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:4rem;font-weight:900;color:#aaa;text-shadow:0 0 18px rgba(150,150,150,.8);z-index:10;text-align:center;opacity:0;transition:opacity .5s;';
    ov.appendChild(cof);
    setTimeout(()=>{ cof.style.opacity='1'; cof.style.animation='_fbeep .35s ease-in-out infinite'; },1600);

    const puffs=[];
    function addPuff(x,y){
      for(let i=0;i<4;i++) puffs.push({x:x+(Math.random()-.5)*25,y:y+(Math.random()-.5)*35,
        r:28+Math.random()*22,vx:-(3+Math.random()*2.5),vy:-(1+Math.random()*1.5),
        life:0,maxLife:55+Math.random()*35});
    }

    let fr=0; const raf={v:null};
    (function loop(){
      fr++; ctx.clearRect(0,0,c.width,c.height);
      if(fr>12&&fr<80){ const br=bus.getBoundingClientRect(); addPuff(br.left+25,br.top+br.height*.5); }
      puffs.forEach(p=>{
        p.life++; p.x+=p.vx; p.y+=p.vy;
        const t=p.life/p.maxLife; const rad=p.r*(1+t*2.8); const a=.65*(1-t);
        const grd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,rad);
        grd.addColorStop(0,`rgba(70,70,70,${a})`); grd.addColorStop(1,'rgba(50,50,50,0)');
        ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(p.x,p.y,rad,0,Math.PI*2); ctx.fill();
      });
      raf.v=requestAnimationFrame(loop);
    })();

    sacudir(700); setTimeout(()=>sacudir(550),1300);
    setTimeout(()=>{ cancelAnimationFrame(raf.v); remOv(ov); cb(); },4500);
  }

  // ── 5. CHURRASCO DO VIZINHO 🥩 ──────────────────────────────────────
  function anim5(cb) {
    const ov = criarOv();
    ov.style.background = 'linear-gradient(180deg,#150700 0%,#3a1500 60%,#732c00 100%)';

    const c = mkCanvas(ov);
    const ctx = c.getContext('2d');
    const puffs=smokePuffs(45,c.width*.5,c.height*.78,()=>[200,110,30]);

    const grelha=document.createElement('div');
    grelha.textContent='♨️';
    grelha.style.cssText='position:absolute;bottom:4%;left:50%;transform:translateX(-50%);font-size:7rem;z-index:5;';
    ov.appendChild(grelha);

    const chama=document.createElement('div');
    chama.innerHTML='🔥🔥🔥🔥🔥';
    chama.style.cssText='position:absolute;bottom:17%;left:50%;transform:translateX(-50%);font-size:3.8rem;z-index:5;white-space:nowrap;animation:_fflame .28s ease-in-out infinite;';
    ov.appendChild(chama);

    chuva(ov,'🥩',8,4000); chuva(ov,'🍖',6,4000);
    setTimeout(()=>chuva(ov,'🌭',5,3200),450);
    setTimeout(()=>chuva(ov,'🍗',5,3200),900);

    textoC(ov,'😤 QUE INVEJA! 😤','#ffaa00','4.8rem',800,3500);
    setTimeout(()=>textoC(ov,'🤤 To sentindo o cheiro... 🤤','#ff8800','2.4rem',0,2500,'top:68%;'),1600);

    let fr=0; const raf={v:null};
    (function loop(){ fr++; ctx.clearRect(0,0,c.width,c.height); drawPuffs(ctx,puffs,fr); raf.v=requestAnimationFrame(loop); })();
    setTimeout(()=>{ cancelAnimationFrame(raf.v); remOv(ov); cb(); },4600);
  }

  // ── 6. VELA DE ANIVERSÁRIO 🕯️ ──────────────────────────────────────
  function anim6(cb) {
    const ov = criarOv();
    ov.style.background = '#000';

    const wrap=document.createElement('div');
    wrap.style.cssText='position:absolute;top:45%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:5;';
    wrap.innerHTML='<div id="_fchama" style="font-size:2.2rem;animation:_fcandle .35s ease-in-out infinite;">🔥</div><div style="font-size:7rem;">🕯️</div>';
    ov.appendChild(wrap);

    const pedido=document.createElement('div');
    pedido.innerHTML='🌟 Faz um pedido... 🌟';
    pedido.style.cssText='position:absolute;top:24%;left:50%;transform:translate(-50%,-50%);font-size:2.6rem;color:rgba(255,215,80,0);font-style:italic;font-weight:700;text-shadow:0 0 22px rgba(255,200,50,.8);z-index:6;white-space:nowrap;transition:color 1s;';
    ov.appendChild(pedido);
    setTimeout(()=>{ pedido.style.color='rgba(255,215,80,.95)'; },500);

    setTimeout(()=>{
      const vento=document.createElement('div');
      vento.innerHTML='💨💨💨';
      vento.style.cssText='position:absolute;top:43%;left:0;font-size:3.2rem;z-index:7;animation:_fvento .75s ease-in forwards;';
      ov.appendChild(vento);
    },1900);

    setTimeout(()=>{
      pedido.style.color='rgba(255,215,80,0)';
      const chama=document.getElementById('_fchama');
      if(chama){ chama.style.transition='opacity .45s'; chama.style.opacity='0'; chama.style.animation='none'; }

      const c=mkCanvas(ov); const ctx=c.getContext('2d');
      let t=0; const raf={v:null};
      const wx=c.width/2, wy=c.height/2-50;
      (function wispLoop(){
        t+=.038;
        ctx.fillStyle='rgba(0,0,0,.12)'; ctx.fillRect(0,0,c.width,c.height);
        ctx.beginPath(); ctx.moveTo(wx,wy);
        for(let i=1;i<=18;i++) ctx.lineTo(wx+Math.sin(t+i*.38)*13,wy-i*13);
        ctx.strokeStyle=`rgba(220,220,220,${Math.max(0,.6-t*.1)})`; ctx.lineWidth=1.8; ctx.stroke();
        if(t<5) raf.v=requestAnimationFrame(wispLoop); else cancelAnimationFrame(raf.v);
      })();

      for(let i=0;i<14;i++){
        const s=document.createElement('div');
        s.textContent='⭐';
        s.style.cssText=`position:absolute;left:${28+Math.random()*44}%;top:${28+Math.random()*44}%;
          font-size:${1+Math.random()*2.2}rem;z-index:8;
          animation:_fstar ${.9+Math.random()*.8}s ${Math.random()*.6}s ease-out both;`;
        ov.appendChild(s);
      }
    },2600);

    setTimeout(()=>{ remOv(ov); cb(); },4900);
  }

  // ── 7. CAFÉ PASSANDO ☕ ───────────────────────────────────────────────
  function anim7(cb) {
    const ov = criarOv();
    ov.style.background = 'linear-gradient(135deg,#18032d 0%,#6a1a05 40%,#bf4d00 70%,#f77f00 100%)';

    const c = mkCanvas(ov);
    const ctx = c.getContext('2d');
    const puffs=smokePuffs(35,c.width*.5,c.height*.44,()=>[225,170,95]);

    const xicara=document.createElement('div');
    xicara.textContent='☕';
    xicara.style.cssText='position:absolute;top:42%;left:50%;transform:translate(-50%,-50%);font-size:13rem;z-index:5;';
    ov.appendChild(xicara);

    textoC(ov,'☀️ BOM DIAAAA! ☀️','#fff9e0','4.2rem',200,4000,'top:16%;');
    setTimeout(()=>textoC(ov,'🤩 Hoje vai ser incrível! 🤩','#ffe8a0','2.2rem',0,2800,'top:76%;'),1100);

    chuva(ov,'☕',10,4000); setTimeout(()=>chuva(ov,'🫘',8,3200),700);

    let fr=0; const raf={v:null};
    (function loop(){ fr++; ctx.clearRect(0,0,c.width,c.height); drawPuffs(ctx,puffs,fr); raf.v=requestAnimationFrame(loop); })();
    setTimeout(()=>{ cancelAnimationFrame(raf.v); remOv(ov); cb(); },4600);
  }

  // ── 8. PIPOCA ESTOURANDO 🍿 ──────────────────────────────────────────
  function anim8(cb) {
    const ov = criarOv();
    ov.style.background = '#1a1a00';

    const c = mkCanvas(ov);
    const ctx = c.getContext('2d');

    const maq=document.createElement('div');
    maq.textContent='🍿';
    maq.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:10rem;z-index:5;animation:_fbounce .28s ease-in-out infinite;';
    ov.appendChild(maq);

    let popN=0;
    const popIv=setInterval(()=>{
      sacudir(130);
      const p=document.createElement('div');
      p.textContent='POP!';
      p.style.cssText=`position:absolute;left:${8+Math.random()*84}%;top:${8+Math.random()*84}%;
        font-size:${2+Math.random()*3.5}rem;font-weight:900;z-index:8;pointer-events:none;
        color:hsl(${Math.random()*60+30},100%,65%);animation:_fbig .75s ease-out both;`;
      ov.appendChild(p);
      setTimeout(()=>p.remove(),750);
      if(++popN>22) clearInterval(popIv);
    },140);

    chuva(ov,'🍿',22,4000);
    setTimeout(()=>chuva(ov,'🍿',18,3200),500);
    setTimeout(()=>chuva(ov,'🍿',22,3000),950);

    const blasts=Array.from({length:30},()=>({
      x:c.width*.5+(Math.random()-.5)*90,
      y:c.height*.5+(Math.random()-.5)*90,
      r:14+Math.random()*22,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,
      life:0,maxLife:38+Math.random()*28,delay:Math.floor(Math.random()*55),colorFn:()=>[255,255,220],
    }));

    let fr=0; const raf={v:null};
    (function loop(){ fr++; ctx.clearRect(0,0,c.width,c.height); drawPuffs(ctx,blasts,fr); raf.v=requestAnimationFrame(loop); })();
    setTimeout(()=>{ clearInterval(popIv); cancelAnimationFrame(raf.v); remOv(ov); cb(); },4600);
  }

  // ── 9. PUM ALHEIO 💨 ⭐ A MAIS ENGRAÇADA ─────────────────────────────
  function anim9(cb) {
    const ov = criarOv();
    ov.style.background = 'rgba(0,0,0,0)';

    const c = mkCanvas(ov);
    const ctx = c.getContext('2d');

    // Nuvem verde cartoon crescendo do canto inferior esquerdo
    let spread=0;
    const ox=0, oy=c.height;

    // Bolhas esporádicas de gás
    const bolhas=[];
    function addBolha(){
      bolhas.push({
        x:ox+(Math.random()-.15)*c.width*.8*spread,
        y:oy-Math.random()*c.height*.8*spread,
        r:15+Math.random()*25,
        life:0,maxLife:40+Math.random()*30,
      });
    }

    let fr=0; const raf={v:null};
    (function loop(){
      fr++;
      spread=Math.min(1,spread+.007);
      ctx.clearRect(0,0,c.width,c.height);

      // Fundo verde radial
      const maxR=Math.sqrt(c.width**2+c.height**2)*1.15*spread;
      const grd=ctx.createRadialGradient(ox,oy,0,ox,oy,maxR);
      grd.addColorStop(0,`rgba(70,180,15,${.72*spread})`);
      grd.addColorStop(.55,`rgba(95,200,40,${.5*spread})`);
      grd.addColorStop(.85,`rgba(50,150,5,${.28*spread})`);
      grd.addColorStop(1,'rgba(0,90,0,0)');
      ctx.fillStyle=grd; ctx.fillRect(0,0,c.width,c.height);

      // Bolhas cartoon
      if(fr%12===0&&spread>.15) addBolha();
      bolhas.forEach(b=>{
        b.life++;
        const t=b.life/b.maxLife;
        const a=.6*(1-t);
        ctx.strokeStyle=`rgba(120,220,50,${a})`;
        ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(b.x,b.y,b.r*(1+t*.5),0,Math.PI*2); ctx.stroke();
      });

      raf.v=requestAnimationFrame(loop);
    })();

    // Emojis de nojo nos cantos (aparecem depois da fumaça)
    const nojos=['🤢','🤮','😷','🤧'];
    const pos=[{top:'5%',left:'5%'},{top:'5%',right:'5%'},{bottom:'5%',left:'5%'},{bottom:'5%',right:'5%'}];
    nojos.forEach((e,i)=>{
      const el=document.createElement('div');
      el.textContent=e;
      el.style.cssText=`position:absolute;font-size:5.5rem;z-index:6;opacity:0;transition:opacity .5s;
        ${Object.entries(pos[i]).map(([k,v])=>`${k}:${v}`).join(';')};
        animation:_fnojo .45s ${i*.12}s ease-in-out infinite;`;
      ov.appendChild(el);
      setTimeout(()=>{ el.style.opacity='1'; },1100+i*150);
    });

    // 💨 saindo do canto
    const fumEl=document.createElement('div');
    fumEl.innerHTML='💨<br>💨&nbsp;&nbsp;💨<br>💨&nbsp;&nbsp;&nbsp;&nbsp;💨';
    fumEl.style.cssText='position:absolute;bottom:6%;left:2%;font-size:3rem;z-index:7;line-height:1.2;animation:_fgreen 3.5s ease-out both;';
    ov.appendChild(fumEl);

    // QUEM FOI?!
    textoC(ov,'👃 QUEM FOI?! 👃','#aaff44','5.5rem',1600,2600);
    setTimeout(()=>{
      const eu=document.createElement('div');
      eu.innerHTML='🤨 EU NÃO FUI';
      eu.style.cssText='position:absolute;top:68%;left:50%;font-size:3.2rem;font-weight:900;color:#fff;z-index:10;text-shadow:0 0 20px rgba(150,255,50,.7);animation:_fbig 2s ease-in-out both;letter-spacing:.08em;';
      ov.appendChild(eu);
    },3000);

    setTimeout(()=>{ cancelAnimationFrame(raf.v); remOv(ov); cb(); },5000);
  }

  // ── 10. NOTEBOOK SUPERAQUECIDO 💻🔥 ───────────────────────────────────
  function anim10(cb) {
    const ov = criarOv();
    ov.style.background = 'rgba(0,0,0,.85)';

    const c = mkCanvas(ov);
    const ctx = c.getContext('2d');

    const nb=document.createElement('div');
    nb.innerHTML='💻🔥';
    nb.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:10rem;z-index:5;animation:_fshake .12s ease-in-out infinite;';
    ov.appendChild(nb);

    textoC(ov,'❌ NÃO NÃO NÃO ❌','#ff0000','4.8rem',350,1700,'top:18%;');

    // Termômetro
    const termWrap=document.createElement('div');
    termWrap.style.cssText='position:absolute;right:7%;top:18%;width:28px;height:190px;border:3px solid #fff;border-radius:14px;overflow:hidden;z-index:6;background:rgba(0,0,0,.5);';
    const termFill=document.createElement('div');
    termFill.style.cssText='position:absolute;bottom:0;left:0;right:0;animation:_fthermo 2.2s ease-in forwards;';
    termWrap.appendChild(termFill); ov.appendChild(termWrap);
    const termLbl=document.createElement('div');
    termLbl.innerHTML='🌡️<br>CRÍTICO!';
    termLbl.style.cssText='position:absolute;right:4%;top:20%;font-size:1.1rem;font-weight:900;color:#ff3300;z-index:6;text-align:center;';
    ov.appendChild(termLbl);

    // BSOD
    setTimeout(()=>{
      const bsod=document.createElement('div');
      bsod.innerHTML=`<div style="font-size:4.5rem;margin-bottom:.8rem">😭</div>
        <div style="font-size:1.9rem;font-weight:900;margin-bottom:.4rem">Seu PC encontrou um problema</div>
        <div style="font-size:.95rem;opacity:.85;">THERMAL_RUNAWAY_EXCEPTION<br>Stop code: 0x000000🔥<br><br>Tentando reiniciar em 3s...</div>`;
      bsod.style.cssText='position:absolute;inset:0;z-index:9;background:#0040d0;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;font-family:monospace;animation:_fbig 1.8s ease-in-out both;';
      ov.appendChild(bsod);
      setTimeout(()=>bsod.remove(),1800);
    },1900);

    sacudir(500); setTimeout(()=>sacudir(900),1100); setTimeout(()=>sacudir(1400),2700);

    const glitchLines=[];
    for(let i=0;i<20;i++) glitchLines.push({y:Math.random()*c.height,h:2+Math.random()*9,hue:Math.random()>.5?0:180});

    let fr=0; const raf={v:null};
    (function loop(){
      fr++; ctx.clearRect(0,0,c.width,c.height);
      // Glitch bars
      if(fr%3===0) glitchLines.forEach(l=>{
        l.y=Math.random()*c.height;
        ctx.fillStyle=`rgba(${l.hue?0:255},${l.hue?180:0},${l.hue?255:50},.5)`;
        ctx.fillRect(Math.random()*30-15,l.y,c.width,l.h);
      });
      // Fumaça dos cantos
      [[0,0],[c.width,0],[0,c.height],[c.width,c.height]].forEach(([cx,cy])=>{
        const gr=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.min(250,fr*1.1));
        gr.addColorStop(0,`rgba(70,70,70,${Math.min(.85,fr*.006)})`);
        gr.addColorStop(1,'rgba(35,35,35,0)');
        ctx.fillStyle=gr; ctx.fillRect(0,0,c.width,c.height);
      });
      raf.v=requestAnimationFrame(loop);
    })();

    setTimeout(()=>{ cancelAnimationFrame(raf.v); remOv(ov); cb(); },4600);
  }

  const ANIMS=[anim1,anim2,anim3,anim4,anim5,anim6,anim7,anim8,anim9,anim10];

  // ── Modal de seleção ───────────────────────────────────────────────────────
  function abrirModal() {
    const ov=document.createElement('div');
    ov.id='fumaca-overlay-sel';
    ov.innerHTML=`
      <div id="fumaca-modal-sel">
        <h2>💨 Escolha sua fumaça 💨</h2>
        <div id="fumaca-grid">
          ${FUMACAS.map((f,i)=>`<button class="fumaca-opt" data-i="${i}">
            ${f.emoji} Fumaça de ${f.nome}
          </button>`).join('')}
        </div>
        <button id="fumaca-fechar-sel">fechar</button>
      </div>
    `;
    document.body.appendChild(ov);
    ov.querySelectorAll('.fumaca-opt').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const i=parseInt(btn.dataset.i,10);
        ov.remove();
        ANIMS[i](()=>{});
      });
    });
    document.getElementById('fumaca-fechar-sel').addEventListener('click',()=>ov.remove());
    ov.addEventListener('click',e=>{ if(e.target===ov) ov.remove(); });
  }

  // ── Botão principal ────────────────────────────────────────────────────────
  function renderBotao() {
    const btn=document.createElement('button');
    btn.id='fumaca-btn-principal';
    btn.innerHTML='💨 SAIR FUMAÇA 💨';
    btn.addEventListener('click',abrirModal);
    const main=document.querySelector('main');
    if(main) main.insertBefore(btn,main.firstChild);
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  async function init() {
    try {
      const r=await fetch('/api/admin/me',{credentials:'include'});
      if(!r.ok) return;
      const a=await r.json();
      if(!FUMACA_EMAILS.includes((a.email||'').toLowerCase())) return;
      renderBotao();
    } catch {}
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

})();
// === FIM BLOCO FUMAÇA ===
