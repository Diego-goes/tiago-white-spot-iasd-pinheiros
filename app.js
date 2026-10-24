import {milestones, references} from './data.js';
import {encontroPhotos} from './encontro.js';

const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const chapters=[...new Set(milestones.map(m=>m.chapter))];
const gatheringIndex=milestones.length;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const nodes={scene:$('scene'),gathering:$('gathering-scene'),image:$('stamp-image'),figure:$('stamp-figure'),frame:$('stamp-frame'),
  title:$('story-title'),date:$('story-date'),lead:$('story-lead'),summary:$('story-summary'),
  chapter:$('chapter-label'),storyNumber:$('story-number'),visualNumber:$('visual-number'),
  location:$('location-label'),year:$('year-ghost'),body:$('story-body'),connection:$('connection-text'),
  count:$('current-count'),journey:$('journey-label'),previous:$('previous-button'),next:$('next-button'),
  nextText:$('next-text'),concealed:$('concealed'),mode:$('mode-button'),scan:$('scan-line')};
let current=0, dynamic=false, revealed=true, activeFilter='Todos', animationSet=[], wheelTotal=0, wheelLockedUntil=0;
let toastTimeout, pointerStart=null;
const dialogs=[...document.querySelectorAll('dialog')];
const indexButtons=[], markerButtons=[];
const images=new Map();
function announce(message){
  clearTimeout(toastTimeout);
  $('toast').textContent=message;$('toast').hidden=false;
  toastTimeout=setTimeout(()=>{$('toast').hidden=true;},3200);
}
function assetImage(index){
  if(index<0||index>=milestones.length)return;
  if(images.has(index))return images.get(index);
  const img=new Image();img.src=milestones[index].asset;images.set(index,img);return img;
}
function preloadAround(index){
  [index-1,index+1,index+2].forEach(assetImage);
}
function cancelAnimations(){animationSet.forEach(a=>a.cancel());animationSet=[];}
function animatedReveal(direction=1,initial=false){
  cancelAnimations();
  if(reducedMotion.matches)return;
  const duration=initial?1150:820;
  animationSet.push(nodes.figure.animate([
    {opacity:0,transform:`translate3d(${direction*70}px,28px,100px) rotateX(14deg) rotateY(${-direction*18}deg) rotate(${direction*7}deg) scale(.88)`,filter:'blur(4px)'},
    {opacity:1,offset:.6,transform:'translate3d(0,-3px,0) rotateX(0deg) rotateY(0deg) rotate(-3.3deg) scale(1.01)',filter:'blur(0)'},
    {opacity:1,transform:'translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotate(-3deg) scale(1)',filter:'blur(0)'}
  ],{duration,easing:'cubic-bezier(.19,1,.22,1)'}));
  animationSet.push(nodes.body.animate([
    {opacity:0,transform:`translate3d(${direction*26}px,12px,0)`,filter:'blur(3px)'},
    {opacity:1,transform:'translate3d(0,0,0)',filter:'blur(0)'}
  ],{duration:initial?950:600,delay:initial?160:60,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
  animationSet.push(nodes.year.animate([{opacity:0,transform:`translateX(${direction*40}px)`},{opacity:1,transform:'translateX(0)'}],{duration:1000,easing:'ease-out'}));
  if(!dynamic||revealed)scanStamp(duration);
}
function scanStamp(duration=800){
  if(reducedMotion.matches)return;
  animationSet.push(nodes.scan.animate([
    {top:'0%',opacity:0},{top:'8%',opacity:.8,offset:.14},{top:'92%',opacity:.6,offset:.86},{top:'100%',opacity:0}
  ],{duration:duration*.9,delay:100,easing:'ease-in-out'}));
}
function updateConcealment(){
  const hidden=dynamic&&!revealed;
  nodes.frame.classList.toggle('is-concealed',hidden);
  nodes.concealed.hidden=!hidden;
  nodes.figure.setAttribute('aria-hidden',String(hidden));
  $('keyboard-hint').innerHTML=current===gatheringIndex?'<kbd>←</kbd><span>VOLTAR À HISTÓRIA</span>':hidden?'<kbd>ESPAÇO</kbd><span>PARA REVELAR</span>':'<kbd>←</kbd><kbd>→</kbd><span>PARA EXPLORAR</span>';
}
function renderGathering({animate=true,updateURL=true}={}){
  cancelAnimations();current=gatheringIndex;revealed=true;
  nodes.scene.hidden=true;nodes.gathering.hidden=false;
  nodes.gathering.scrollTop=0;
  nodes.previous.disabled=false;
  nodes.nextText.textContent='Recomeçar';
  nodes.next.querySelector('[aria-hidden]').textContent='↺';
  nodes.count.textContent=pad(milestones.length);
  nodes.journey.textContent='NOSSO ENCONTRO';
  markerButtons.forEach(button=>{button.classList.add('visited');button.removeAttribute('aria-current');});
  indexButtons.forEach(button=>button.removeAttribute('aria-current'));
  $('gathering-button').setAttribute('aria-current','page');
  document.title='Nosso encontro · SPOT · 23.10.2026';
  if(updateURL)history.replaceState(null,'','#nosso-encontro');
  updateConcealment();
  if(animate&&!reducedMotion.matches){
    nodes.gathering.querySelectorAll('.gathering-visual,.gathering-copy').forEach((element,index)=>{
      animationSet.push(element.animate([
        {opacity:0,transform:'translateY(24px)'},
        {opacity:1,transform:'translateY(0)'}
      ],{duration:800,delay:index*120,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
    });
  }
}
function render(index,{animate=true,direction=1,initial=false,updateURL=true}={}){
  if(index===gatheringIndex){renderGathering({animate,updateURL});return;}
  nodes.gathering.hidden=true;nodes.scene.hidden=false;
  $('gathering-button').removeAttribute('aria-current');
  current=Math.max(0,Math.min(milestones.length-1,index));
  const m=milestones[current];
  revealed=!dynamic;
  nodes.image.src=m.asset;
  nodes.image.alt=`Selo ${pad(m.id)}: ${m.label}, ${m.year}`;
  nodes.title.textContent=m.title;
  nodes.date.textContent=m.date;
  nodes.lead.textContent=m.lead;
  nodes.summary.textContent=m.summary;
  nodes.chapter.textContent=`${pad(chapters.indexOf(m.chapter)+1)} — ${m.chapter.toLocaleUpperCase('pt-BR')}`;
  nodes.storyNumber.textContent=`MARCO ${pad(m.id)}`;
  nodes.visualNumber.textContent=`${String(m.id).padStart(3,'0')} / 025`;
  document.querySelector('.axis-top').textContent=`+ MEMÓRIA / ${pad(m.id)}`;
  nodes.location.textContent=m.location;
  nodes.year.textContent=m.year;
  nodes.connection.textContent=m.bridge;
  $('connection-label').textContent=current===24?'A HISTÓRIA CONTINUA':'O PRÓXIMO PASSO';
  nodes.count.textContent=pad(m.id);
  nodes.journey.textContent=m.chapter.toLocaleUpperCase('pt-BR');
  nodes.previous.disabled=current===0;
  nodes.nextText.textContent=current===24?'Nosso encontro':'Próximo marco';
  nodes.next.querySelector('[aria-hidden]').textContent='→';
  markerButtons.forEach((button,i)=>{
    button.classList.toggle('visited',i<current);
    if(i===current)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
  });
  indexButtons.forEach((button,i)=>{
    if(i===current)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
  });
  document.title=`${m.year} · ${m.label} — Tiago White · SPOT`;
  if(updateURL)history.replaceState(null,'',`#marco-${pad(m.id)}`);
  updateConcealment();
  $('story-column').scrollTop=0;
  nodes.scene.scrollTop=0;
  preloadAround(current);
  if(animate)animatedReveal(direction,initial);
}
function go(index){
  const target=Math.max(0,Math.min(gatheringIndex,index));
  if(target===current)return;
  render(target,{direction:target>current?1:-1});
}
function next(){if(current===gatheringIndex)render(0,{direction:-1});else go(current+1);}
function reveal(){
  if(!dynamic||revealed)return;
  revealed=true;updateConcealment();
  if(!reducedMotion.matches){
    animationSet.push(nodes.figure.animate([
      {opacity:0,transform:'translateY(24px) rotateX(14deg) rotateY(-15deg) rotate(3deg) scale(.9)'},
      {opacity:1,transform:'translateY(0) rotateX(0deg) rotateY(0deg) rotate(-3deg) scale(1)'}
    ],{duration:900,easing:'cubic-bezier(.16,1,.3,1)'}));scanStamp(900);
  }
  if(document.activeElement===$('reveal-button'))nodes.next.focus({preventScroll:true});
}
function toggleMode(){
  dynamic=!dynamic;revealed=!dynamic;
  nodes.mode.setAttribute('aria-pressed',String(dynamic));
  document.body.classList.toggle('dynamic-mode',dynamic);
  updateConcealment();
  announce(dynamic?'Dinâmica ativada. Identifique a cena com o grupo e revele o selo.':'Os selos estão visíveis. Explore a história no seu ritmo.');
}
function showDialog(dialog){
  dialogs.forEach(d=>{if(d.open)d.close();});
  dialog.showModal();
}
function openDetails(){
  const m=milestones[current];
  $('details-date').textContent=`${m.date} · ${m.chapter.toLocaleUpperCase('pt-BR')}`;
  $('details-title').textContent=m.label;
  const content=$('detail-content');content.replaceChildren();
  m.details.forEach(text=>{const p=document.createElement('p');p.textContent=text;content.append(p);});
  if(m.quote){
    const quote=document.createElement('blockquote');quote.textContent=m.quote;
    if(m.quoteCredit){const cite=document.createElement('cite');cite.textContent=m.quoteCredit;quote.append(cite);}
    content.append(quote);
  }
  showDialog($('details-dialog'));
  $('details-dialog').scrollTop=0;
}
function filterIndex(value){
  activeFilter=value;
  document.querySelectorAll('.chapter-filter').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chapter===value)));
  indexButtons.forEach((b,i)=>{b.hidden=value!=='Todos'&&milestones[i].chapter!==value;});
}
function buildNavigation(){
  milestones.forEach((m,i)=>{
    const marker=document.createElement('button');marker.type='button';marker.className='timeline-marker';
    marker.setAttribute('aria-label',`${pad(m.id)} · ${m.year} · ${m.label}`);
    marker.title=`${m.year} — ${m.label}`;
    marker.addEventListener('click',()=>go(i));
    $('timeline-markers').append(marker);markerButtons.push(marker);
    const b=document.createElement('button');b.type='button';b.className='index-stamp';
    b.setAttribute('aria-label',`${pad(m.id)} · ${m.year} · ${m.label}`);
    const number=document.createElement('span');number.className='index-number';number.textContent=pad(m.id);
    const img=document.createElement('img');img.src=m.asset;img.alt='';img.width=200;img.height=200;img.loading='lazy';
    const hiddenMark=document.createElement('span');hiddenMark.className='index-hiddenmark';hiddenMark.textContent=pad(m.id);hiddenMark.setAttribute('aria-hidden','true');
    const date=document.createElement('span');date.className='index-stamp-date';date.textContent=m.year;
    const label=document.createElement('span');label.className='index-stamp-label';label.textContent=m.label;
    b.append(number,img,hiddenMark,date,label);
    b.addEventListener('click',()=>{$('index-dialog').close();go(i);});
    $('stamp-index').append(b);indexButtons.push(b);
  });
  ['Todos',...chapters].forEach(chapter=>{
    const b=document.createElement('button');b.type='button';b.className='chapter-filter';b.dataset.chapter=chapter;
    b.textContent=chapter;b.setAttribute('aria-pressed',String(chapter==='Todos'));
    b.addEventListener('click',()=>filterIndex(chapter));$('chapter-filters').append(b);
  });
  references.forEach(ref=>{
    const wrap=document.createElement('div'),a=document.createElement('a'),p=document.createElement('p');
    a.href=ref.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=ref.title;
    p.textContent=ref.description;wrap.append(a,p);$('reference-list').append(wrap);
  });
}
async function fullscreen(){
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
    else announce('Use a opção de tela cheia do seu navegador.');
  }catch{announce('Use a opção de tela cheia do seu navegador.');}
}
function hashIndex(){if(location.hash==='#nosso-encontro')return gatheringIndex;const match=location.hash.match(/^#marco-(\d{1,2})$/);return match?Math.max(0,Math.min(24,Number(match[1])-1)):0;}

let gatheringActive=0;
function prepareGatheringPhotos(){
  const photos=encontroPhotos.filter(p=>p.src);
  if(!photos.length)return;
  const placeholder=$('gathering-placeholder');
  const dots=$('gathering-dots');
  const frame=document.querySelector('.gathering-photo-frame');
  const old=$('gathering-photo');if(old)old.remove();
  function setRatio(img){if(img.naturalWidth){document.documentElement.style.setProperty('--photo-ratio',(img.naturalWidth/img.naturalHeight).toString());}}
  const imgs=photos.map((p,i)=>{
    const img=document.createElement('img');
    img.alt=p.alt;img.hidden=true;img.loading='lazy';
    frame.insertBefore(img,placeholder);
    img.addEventListener('load',()=>{if(i===gatheringActive){placeholder.hidden=true;setRatio(img);}});
    img.addEventListener('error',()=>{img.remove();});
    img.src=p.src;return img;
  });
  function show(i){
    gatheringActive=i;
    imgs.forEach((im,j)=>{if(im.isConnected)im.hidden=j!==i;});
    const im=imgs[gatheringActive];
    if(im&&im.complete&&im.naturalWidth){placeholder.hidden=true;setRatio(im);}
    if(dots&&dots.children.length){[...dots.children].forEach((d,j)=>d.classList.toggle('active',j===i));}
  }
  if(photos.length>1&&dots){
    dots.hidden=false;
    photos.forEach((_,i)=>{
      const b=document.createElement('button');
      b.type='button';b.className='gathering-dot';
      b.setAttribute('aria-label','Foto '+(i+1)+' do encontro');
      b.addEventListener('click',()=>show(i));
      dots.appendChild(b);
    });
  }
  show(0);
}

buildNavigation();
prepareGatheringPhotos();
nodes.previous.addEventListener('click',()=>go(current-1));
nodes.next.addEventListener('click',next);
nodes.mode.addEventListener('click',toggleMode);
$('reveal-button').addEventListener('click',reveal);
$('fullscreen-button').addEventListener('click',fullscreen);
$('details-button').addEventListener('click',openDetails);
$('about-button').addEventListener('click',()=>showDialog($('about-dialog')));
$('gathering-button').addEventListener('click',()=>go(gatheringIndex));
$('index-button').addEventListener('click',()=>{filterIndex('Todos');showDialog($('index-dialog'));});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
dialogs.forEach(dialog=>dialog.addEventListener('click',event=>{
  const r=dialog.getBoundingClientRect();
  if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();
}));
document.addEventListener('fullscreenchange',()=>{
  $('fullscreen-button').setAttribute('aria-label',document.fullscreenElement?'Sair da tela cheia':'Entrar em tela cheia');
});
document.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||dialogs.some(d=>d.open))return;
  const el=event.target;
  if(el instanceof HTMLElement&&(el.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(el.tagName)))return;
  if(event.key==='ArrowRight'){event.preventDefault();go(current+1);}
  else if(event.key==='ArrowLeft'){event.preventDefault();go(current-1);}
  else if(event.key==='Home'){event.preventDefault();go(0);}
  else if(event.key==='End'){event.preventDefault();go(gatheringIndex);}
  else if(event.key===' '&&(!(el instanceof HTMLButtonElement||el instanceof HTMLAnchorElement)||(el instanceof HTMLElement&&el.closest('#next-button,#previous-button')))){
    event.preventDefault();if(current!==gatheringIndex&&dynamic&&!revealed)reveal();else next();
  }else if(event.key.toLowerCase()==='f'){event.preventDefault();fullscreen();}
});
document.addEventListener('wheel',event=>{
  if(dialogs.some(d=>d.open)||event.ctrlKey||matchMedia('(max-width:620px)').matches)return;
  if(current===gatheringIndex&&nodes.gathering.scrollHeight>nodes.gathering.clientHeight+4)return;
  const story=$('story-column');
  if(story.scrollHeight>story.clientHeight+4&&story.contains(event.target))return;
  if(Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
  event.preventDefault();
  const now=performance.now();if(now<wheelLockedUntil)return;
  wheelTotal+=event.deltaY;
  if(Math.abs(wheelTotal)>65){
    const direction=Math.sign(wheelTotal);wheelTotal=0;wheelLockedUntil=now+850;
    go(current+direction);
  }
},{passive:false});
[nodes.scene,nodes.gathering].forEach(surface=>{
surface.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch'||event.target.closest('button,a'))return;
  pointerStart={x:event.clientX,y:event.clientY};
});
surface.addEventListener('pointerup',event=>{
  if(!pointerStart)return;
  const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y;pointerStart=null;
  if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)go(current+(dx<0?1:-1));
});
surface.addEventListener('pointercancel',()=>{pointerStart=null;});
});
window.addEventListener('hashchange',()=>{if(/^#marco-\d{1,2}$/.test(location.hash)||location.hash==='#nosso-encontro')render(hashIndex(),{direction:hashIndex()>current?1:-1,updateURL:false});});
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();(current===gatheringIndex?$('gathering-title'):nodes.title).focus();});
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();if(current===0)render(0,{initial:true});else go(0);});
nodes.image.addEventListener('error',()=>announce('Não foi possível carregar este selo. Verifique sua conexão e recarregue a página.'));
render(hashIndex(),{initial:true});
if(new URLSearchParams(location.search).get('modo')==='dinamica')toggleMode();
const warmImages=()=>milestones.forEach((_,i)=>assetImage(i));
if('requestIdleCallback' in window)requestIdleCallback(warmImages,{timeout:2500});else setTimeout(warmImages,1700);
