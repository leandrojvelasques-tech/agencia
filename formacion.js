(()=>{
if(location.protocol==='file:')document.querySelectorAll('a[href]').forEach(a=>{const href=a.getAttribute('href');if(href.startsWith('../#'))a.setAttribute('href',href.replace('../#','../index.html#'));else if(!/^(https?:|#)/.test(href)&&href.endsWith('/'))a.setAttribute('href',href+'index.html');});
document.querySelectorAll('.training-gallery').forEach(gallery=>{
  const track=gallery.querySelector('.training-track'),controls=gallery.querySelector('.training-controls');
  const buttons=[...controls.querySelectorAll('button')];controls.hidden=false;
  const update=()=>{buttons[0].disabled=track.scrollLeft<=2;buttons[1].disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-3;};
  buttons.forEach(button=>button.addEventListener('click',()=>{const card=track.querySelector('.training-slide');const gap=parseFloat(getComputedStyle(track).gap)||0;track.scrollBy({left:Number(button.dataset.direction)*(card.getBoundingClientRect().width+gap),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}));
  track.addEventListener('scroll',update,{passive:true});new ResizeObserver(update).observe(track);update();
});
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#nav');
if(menu&&nav&&document.body.matches('.training-page,.training-preview')){
  const close=()=>{menu.setAttribute('aria-expanded','false');nav.classList.remove('open');};
  menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);});
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
}
})();
