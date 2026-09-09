const gallerySeed = {
  charlas: [
    {src:'assets/comodoro-charla.jpg',title:'IA y automatización',place:'Comodoro Conocimiento',description:'Charla sobre aplicaciones de la inteligencia artificial al trabajo.',alt:'Leandro exponiendo con micrófono en Comodoro Conocimiento'},
    {src:'assets/universidad-1.jpeg',title:'Práctica Profesional Judicial',place:'Facultad de Ciencias Económicas · 2026',description:'Encuentro presencial con estudiantes en la universidad.',alt:'Leandro junto a estudiantes de la universidad'},
    {src:'assets/universidad-2.jpeg',title:'Práctica Profesional Judicial',place:'Facultad de Ciencias Económicas · 2026',description:'Otra mirada del encuentro con los estudiantes.',alt:'Estudiantes reunidos en el aula'},
    {src:'assets/universidad-placa.jpg',title:'Los nuevos desafíos éticos de la IA',place:'Facultad de Ciencias Económicas · Mayo de 2026',description:'Panel sobre los desafíos éticos para el profesional de Ciencias Económicas.',alt:'Placa original de la charla sobre desafíos éticos de la IA',contain:true}
  ],
  talleres: [{src:'assets/cpce-taller.jpeg',title:'Taller de IA aplicada',place:'Consejo Profesional de Ciencias Económicas',description:'Práctica e intercambio entre profesionales para aplicar herramientas al trabajo.',alt:'Profesionales trabajando en grupo con computadoras en el CPCE'}],
  incompany: [
    {src:'assets/jubilarse-formacion.jpeg',title:'ChatGPT Work · Consultora Jubilarse',place:'Formación con el equipo',description:'Herramientas de IA aplicadas al trabajo de la consultora.',alt:'Leandro con el equipo de Consultora Jubilarse durante la capacitación'},
    {src:'assets/gmp-formacion.jpeg',title:'ChatGPT Work · GMP Obras',place:'Formación con Gustavo',description:'Capacitación adaptada al contexto de la empresa.',alt:'Encuentro de Leandro con Gustavo de GMP Obras'}
  ]
};
const galleryLabels={charlas:'Charlas',talleres:'Talleres de trabajo',incompany:'Formación in-company'};
function openGalleryDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('leandro-maqueta-galerias',1);req.onupgradeneeded=()=>req.result.createObjectStore('photos',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function getGalleryPhotos(){const db=await openGalleryDB();try{return await new Promise((resolve,reject)=>{const req=db.transaction('photos').objectStore('photos').getAll();req.onsuccess=()=>resolve(req.result.sort((a,b)=>a.created-b.created));req.onerror=()=>reject(req.error)})}finally{db.close()}}
async function saveGalleryPhotos(photos){const db=await openGalleryDB();try{await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');for(const photo of photos)tx.objectStore('photos').put(photo);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
function textElement(tag,text,className){const element=document.createElement(tag);element.textContent=text;if(className)element.className=className;return element}
const photoUrls=[];
async function renderGalleries(){
  const cards=[...document.querySelectorAll('[data-gallery]')];if(!cards.length)return;
  let extras=[];try{extras=await getGalleryPhotos()}catch{document.querySelector('.gallery-grid').before(textElement('p','No se pudieron leer las fotos agregadas en este navegador. Se muestran las fotos originales.','gallery-notice'))}
  for(const card of cards){
    const key=card.dataset.gallery;const slides=[...gallerySeed[key],...extras.filter(p=>p.group===key).map(p=>{const src=URL.createObjectURL(p.blob);photoUrls.push(src);return {...p,src}})];let current=0;
    const content=card.querySelector('.gallery-content');const figure=document.createElement('figure'),img=document.createElement('img');img.loading='lazy';img.width=1280;img.height=800;figure.append(img);
    const controls=document.createElement('div');controls.className='gallery-controls';const prev=textElement('button','←'),next=textElement('button','→'),counter=textElement('span','');prev.type=next.type='button';prev.setAttribute('aria-label','Foto anterior de '+galleryLabels[key]);next.setAttribute('aria-label','Foto siguiente de '+galleryLabels[key]);counter.setAttribute('aria-live','polite');controls.append(prev,counter,next);
    const copy=document.createElement('div');copy.className='gallery-copy';const place=textElement('p','','gallery-place'),title=textElement('h4',''),desc=textElement('p','');copy.append(place,title,desc);content.append(figure,controls,copy);
    function paint(){const s=slides[current];img.src=s.src;img.alt=s.alt||s.title;img.style.objectFit=s.contain?'contain':'cover';place.textContent=s.place;title.textContent=s.title;desc.textContent=s.description;counter.textContent=(current+1)+' / '+slides.length;prev.disabled=next.disabled=slides.length<2}
    prev.addEventListener('click',()=>{current=(current+slides.length-1)%slides.length;paint()});next.addEventListener('click',()=>{current=(current+1)%slides.length;paint()});paint();
  }
}
async function setupPhotoEditor(){
  const form=document.querySelector('#photo-form');if(!form)return;const status=document.querySelector('#photo-status'),list=document.querySelector('#photo-list');
  async function refresh(){list.replaceChildren();const photos=await getGalleryPhotos();for(const key of Object.keys(gallerySeed)){const group=document.createElement('article');group.append(textElement('h3',galleryLabels[key]));group.append(textElement('p',gallerySeed[key].length+' fotos originales · '+photos.filter(x=>x.group===key).length+' fotos agregadas'));for(const item of photos.filter(x=>x.group===key))group.append(textElement('p',item.title+' — '+item.place));list.append(group)}}
  form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Guardando fotos…';try{const files=[...form.elements.photos.files];if(!files.length)throw Error('Seleccioná al menos una foto.');const records=[];for(const file of files){if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Usá fotos JPG, PNG o WebP.');if(file.size>40*1024*1024)throw Error('Cada foto debe pesar menos de 40 MB.');const bitmap=await createImageBitmap(file);bitmap.close();records.push({id:crypto.randomUUID(),created:Date.now()+records.length,group:form.elements.group.value,title:form.elements.title.value.trim(),place:form.elements.place.value.trim(),description:form.elements.description.value.trim(),alt:form.elements.title.value.trim(),blob:file,contain:form.elements.contain.checked})}if(!records[0].title)throw Error('Escribí un título.');await saveGalleryPhotos(records);form.reset();await refresh();status.textContent='Fotos guardadas. Recargá la maqueta para verlas en su galería.'}catch(error){status.textContent='No se guardaron las fotos. '+(error.message||'Intentá nuevamente.')}finally{button.disabled=false}});
  try{await refresh()}catch{status.textContent='Este navegador no permite guardar fotos localmente.'}
}
renderGalleries();setupPhotoEditor();
window.addEventListener('pagehide',()=>photoUrls.forEach(url=>URL.revokeObjectURL(url)));
