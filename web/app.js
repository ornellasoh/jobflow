import {columns,columnOf,isArchived,weekCount,addDays,transition} from './model.mjs';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  board:'M3 3h18v18H3z M9 3v18 M15 3v18', plus:'M12 5v14 M5 12h14',
  archive:'M3 3h18v4H3z M5 7v14h14V7 M10 11h4',
  user:'M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0',
  lock:'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4',
  file:'M14 2H5v20h14V7z M14 2v5h5 M8 12h8 M8 16h6',
  send:'M22 2L9 15 M22 2l-7 20-6-7-7-6z', calendar:'M3 5h18v16H3z M7 3v4 M17 3v4 M3 11h18',
  check:'M5 12l4 4L19 6', search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0a8 8 0 0 1 16 0',
  close:'M6 6l12 12 M6 18L18 6', download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  arrow:'M5 12h14 M13 6l6 6-6 6', move:'M9 5l3-3 3 3 M12 2v20 M9 19l3 3 3-3 M5 9l-3 3 3 3 M2 12h20 M19 9l3 3-3 3'
};
function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.file}"/></svg>`; }
const labels = {today:'Tableau',prepare:'Nouvelle candidature',archives:'Archives',profile:'Profil'};
let records=[], profile={}, profileDraft=null, draft={}, stage=1, activeColumn='todo', search='', toastTimer;
const dateISO = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris'}).format(new Date());
const fmt = day => day ? new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short'}).format(new Date(day+'T12:00:00')) : '';
function route() { const key=location.hash.slice(1); return key==='applications'?'today':key in labels?key:'today'; }
function goal() { try { return Math.min(30,Math.max(1,Number(localStorage.getItem('jobflow-goal'))||3)); } catch { return 3; } }
function notify(message) {
  clearTimeout(toastTimer); $('#notice').textContent=message; $('#notice').hidden=false;
  toastTimer=setTimeout(()=>{$('#notice').hidden=true;},4000);
}
async function request(path,data) {
  const response=await fetch(path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  if(!response.ok) { const body=await response.json(); throw new Error(body.error || 'Action impossible. Réessaie.'); }
  return response.json();
}
async function saveRecord(record) {
  const saved=await request('/api/applications',record);
  records=records.some(r=>r.id===saved.id)?records.map(r=>r.id===saved.id?saved:r):[saved,...records];
  updateGoal(); return saved;
}
function updateGoal() {
  const count=weekCount(records,dateISO()), target=goal(); $('#goal').value=target;
  $('#weekly').textContent=`${count}/${target} cette semaine${count>=target?' ✓':''}`;
  $('#weekly').classList.toggle('reached',count>=target);
}
function bind(id,callback) {
  const element=$('#'+id);
  if(element)element.onclick=async()=>{try{await callback();}catch(e){notify(e.message);}};
}
function field(label,id,value='',type='text') {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value)}"><p id="error-${id}" class="error" hidden></p></div>`;
}
function error(id,message) {
  const input=$('#'+id), text=$('#error-'+id);
  if(input)input.setAttribute('aria-invalid','true');
  if(text){text.textContent=message;text.hidden=false;input.setAttribute('aria-describedby',text.id);}
  input?.focus();
}
function collect() {
  for(const key of ['company','role','offer_url','offer_text','letter_text','follow_up_date','notes','company_context','recent_news'])if($('#'+key))draft[key]=$('#'+key).value;
  if(draft.cv){
    draft.cv.cv_title=$('#cv_title')?.value??draft.cv.cv_title;
    draft.cv.seo_title=draft.cv.cv_title;
    draft.cv.accroche_objective=$('#summary')?.value??draft.cv.accroche_objective;
  }
}
function badge(record) {
  const key=columnOf(record), label=key==='closed'?'Refus':columns.find(c=>c.key===key).label;
  return `<span class="badge ${key}">${key==='offer'?icon('check'):''}${label}</span>`;
}
function card(record) {
  return `<button class="candidate" draggable="true" data-open="${esc(record.id)}" aria-label="${esc(record.role)} chez ${esc(record.company)}"><h3>${esc(record.role)}</h3><p>${esc(record.company)}${record.applied_date?' · '+fmt(record.applied_date):''}</p><div class="card-footer">${badge(record)}${record.follow_up_date?`<time datetime="${esc(record.follow_up_date)}">Relance ${fmt(record.follow_up_date)}</time>`:''}</div></button>`;
}
function newApplication(){collect();draft={};stage=1;if(route()==='prepare')render();else location.hash='prepare';}
function render() {
  const view=route();
  document.querySelectorAll('[data-view]').forEach(a=>{a.classList.toggle('active',a.dataset.view===view);if(a.dataset.view===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  $('#breadcrumb').textContent=`Mon espace / ${labels[view]}`;
  $('#account').textContent=(profile.candidate_name||'Mon espace').split(' ').map(n=>n[0]).slice(0,2).join('');
  updateGoal();
  if(view==='today')board();if(view==='prepare')prepare();if(view==='archives')archives();if(view==='profile')renderProfile();
}
function board() {
  const active=records.filter(r=>!isArchived(r));
  $('#main').innerHTML=`<section class="intro"><div><h1>Mes candidatures</h1><p>Une candidature à la fois.</p></div><button class="primary" id="new">${icon('plus')}Ajouter une offre</button></section>
  <div class="toolbar"><div class="search">${icon('search')}<input id="search" type="search" value="${esc(search)}" aria-label="Rechercher une candidature" placeholder="Rechercher une candidature"></div><p class="small">${active.length} candidature${active.length>1?'s':''} en cours</p></div>
  ${!active.length?'<section class="empty"><h2>Le prochain pas commence ici.</h2><p>Aucune candidature cette semaine. Une seule suffit pour relancer la machine.</p></section>':''}
  <div class="mobile-statuses" role="tablist" aria-label="Statut des candidatures">${columns.map(c=>`<button role="tab" data-column="${c.key}" aria-selected="${activeColumn===c.key}" aria-controls="column-${c.key}">${c.label} (${active.filter(r=>columnOf(r)===c.key).length})</button>`).join('')}</div>
  <div class="board" id="board"></div><p class="board-note">${icon('move')}<span class="desktop-hint">Déplace une carte pour changer son statut, ou ouvre-la pour modifier les détails.</span><span class="mobile-hint">Ouvre une carte pour modifier son statut ou sa prochaine relance.</span></p>`;
  bind('new',newApplication);
  $('#search').oninput=()=>{search=$('#search').value;renderColumns();};
  document.querySelectorAll('[data-column]').forEach(b=>b.onclick=()=>{activeColumn=b.dataset.column;document.querySelectorAll('[data-column]').forEach(t=>t.setAttribute('aria-selected',String(t===b)));document.querySelectorAll('.column').forEach(c=>c.classList.toggle('is-visible',c.dataset.status===activeColumn));});
  const tabs=[...document.querySelectorAll('[data-column]')];
  tabs.forEach((t,i)=>t.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();});
  renderColumns();
}
function renderColumns() {
  const filtered=records.filter(r=>!isArchived(r)&&(r.company+' '+r.role).toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')));
  $('#board').innerHTML=columns.map(c=>{const list=filtered.filter(r=>columnOf(r)===c.key);return `<section id="column-${c.key}" class="column ${c.key} ${activeColumn===c.key?'is-visible':''}" data-status="${c.key}" aria-label="${c.label}"><div class="column-heading"><span class="dot"></span><h2 class="label">${c.label}</h2><span class="count">${list.length}</span></div><div class="cards">${list.map(card).join('')}${!list.length?`<div class="column-empty">${search?'Aucun résultat.':{'todo':'Les offres à préparer apparaîtront ici.','sent':'Tes candidatures envoyées apparaîtront ici.','interview':'Tes prochains échanges apparaîtront ici.','offer':'Les propositions reçues apparaîtront ici.'}[c.key]}</div>`:''}</div></section>`;}).join('');
  document.querySelectorAll('[data-open]').forEach(b=>{
    b.onclick=()=>openDetail(b.dataset.open);
    b.ondragstart=e=>{e.dataTransfer.setData('text/plain',b.dataset.open);e.dataTransfer.effectAllowed='move';b.classList.add('dragging');};
    b.ondragend=()=>{b.classList.remove('dragging');document.querySelectorAll('.drop-target').forEach(c=>c.classList.remove('drop-target'));};
  });
  document.querySelectorAll('.column').forEach(column=>{
    column.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';column.classList.add('drop-target');};
    column.ondragleave=e=>{if(!column.contains(e.relatedTarget))column.classList.remove('drop-target');};
    column.ondrop=async e=>{e.preventDefault();column.classList.remove('drop-target');const record=records.find(r=>r.id===e.dataTransfer.getData('text/plain'));if(!record)return;const status=columns.find(c=>c.key===column.dataset.status).status;if(columnOf(record)===column.dataset.status)return;try{await saveRecord(transition(record,status,dateISO()));render();notify('Statut mis à jour.');}catch(err){notify(err.message);}};
  });
}
function editorPreview(cv) {
  return `<div class="sheet"><h3>${esc(profile.candidate_name)}</h3><p>${esc(cv.cv_title)}</p><h3>Profil</h3><p>${esc(cv.accroche_objective)}</p><h3>Expériences</h3>${(cv.experiences||[]).map(e=>`<p><strong>${esc(e.role)}</strong><br>${esc(e.company)} · ${esc(e.period)}</p><ul>${(e.bullets||[]).map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`).join('')}<h3>Compétences</h3><p>${esc((cv.skills||[]).join(' · '))}</p></div>`;
}
function prepare() {
  $('#main').innerHTML=`<section class="intro"><div><h1>Nouvelle candidature</h1><p>De l’offre au prochain échange.</p></div>${draft.id?'<span class="small">Brouillon enregistré</span>':''}</section>
    <ol class="stepper" aria-label="Étapes">${['Offre','CV & lettre','Envoi & suivi'].map((label,i)=>`<li class="${stage===i+1?'current':''}" ${stage===i+1?'aria-current="step"':''}><b>${i+1}</b>${label}</li>`).join('')}</ol><div id="stage"></div>`;
  if(stage===1)offerStep();else if(stage===2)documentsStep();else sendStep();
}
function offerStep() {
  $('#stage').innerHTML=`<section class="panel offer-panel"><h2>Quelle offre t’intéresse ?</h2><p>Ajoute une offre pour préparer une candidature qui te ressemble.</p><div class="field"><label for="offer_text">Colle le lien ou le texte de l’offre</label><textarea id="offer_text" rows="8" placeholder="Intitulé du poste, missions, compétences recherchées…">${esc(draft.offer_text||draft.offer_url)}</textarea><p id="error-offer_text" class="error" hidden></p><p class="hint">Pour l’analyse IA, colle la description complète. Un lien seul sera conservé pour le suivi.</p></div>
  <details><summary>Informations de suivi</summary><div class="fields">${field('Entreprise','company',draft.company)}${field('Poste','role',draft.role)}</div>${field('Lien de l’offre','offer_url',draft.offer_url,'url')}</details>
  <details><summary>Contexte pour la lettre</summary><div class="field"><label for="company_context">Ce que tu sais de l’entreprise</label><textarea id="company_context" rows="3">${esc(draft.company_context)}</textarea></div><div class="field"><label for="recent_news">Actualité à mentionner, avec sa source si possible</label><textarea id="recent_news" rows="3">${esc(draft.recent_news)}</textarea></div><p class="hint">Ajoute seulement des faits vérifiés. L’IA ne recherche pas automatiquement l’actualité de l’entreprise.</p></details><details><summary>Réglages de génération</summary><div class="fields"><div class="field"><label for="provider">Moteur IA</label><select id="provider"><option>Gemini</option><option>DeepSeek</option></select></div>${field('Clé API · non enregistrée','api_key','','password')}</div><p class="hint"><a href="api-keys.html" target="_blank" rel="noopener noreferrer">Comment obtenir une clé Gemini ou DeepSeek ?</a></p><p class="hint">Ton parcours et l’offre sont transmis au fournisseur choisi lors de la génération.</p></details>
  <div class="action-footer"><button class="ghost" id="manual">Continuer sans IA</button><button class="primary" id="generate">Préparer ma candidature</button></div><p id="generation-error" class="error" role="alert" hidden></p></section>`;
  bind('manual',()=>{collect();if(!draft.offer_text?.trim()){error('offer_text','Ajoute une offre pour continuer.');return;}draft.cv ||= structuredClone(profile);draft.cv.cv_title ||= draft.role || profile.default_title;draft.cv.accroche_objective ||= '';draft.letter_text ||= '';stage=2;render();});
  bind('generate',async()=>{
    collect();if(!draft.offer_text?.trim()){error('offer_text','Colle le texte de l’offre.');return;}
    if(/^https?:\/\/\S+$/.test(draft.offer_text.trim())){draft.offer_url=draft.offer_text.trim();error('offer_text','Lien conservé. Colle aussi la description de l’offre pour l’analyse.');return;}
    if(!$('#api_key').value.trim()){$('#api_key').closest('details').open=true;error('api_key','Renseigne ta clé API, ou choisis « Continuer sans IA ».');return;}
    const button=$('#generate');button.disabled=true;button.innerHTML='<span class="spinner" aria-hidden="true"></span>Préparation…';
    try{
      const result=await request('/api/generate',{offer_text:draft.offer_text,provider:$('#provider').value,api_key:$('#api_key').value,company_context:draft.company_context,recent_news:draft.recent_news});
      draft={...draft,...result,company:draft.company||result.company,role:draft.role||result.role};stage=2;render();notify('Documents préparés. À toi de les relire.');
    }catch(e){$('#generation-error').textContent=e.message;$('#generation-error').hidden=false;}
    finally{if(button.isConnected){button.disabled=false;button.textContent='Préparer ma candidature';}}
  });
}
function documentsStep() {
  const cv=draft.cv;
  $('#stage').innerHTML=`<div class="summary-card"><p><strong>${esc(draft.role||'Candidature à préciser')}</strong>${draft.company?' · '+esc(draft.company):''}</p><button class="ghost" id="back-offer">Modifier l’offre</button></div>
  <div class="fields">${field('Entreprise *','company',draft.company)}${field('Poste *','role',draft.role)}</div>
  <div class="editor-grid"><section class="panel"><h2>Ton CV adapté</h2><p class="small">Le titre et l’accroche s’adaptent. Ton parcours reste intact.</p>${field('Titre du CV','cv_title',cv.cv_title||cv.seo_title||draft.role)}<div class="field"><label for="summary">Résumé professionnel</label><textarea id="summary" rows="5">${esc(cv.accroche_objective)}</textarea></div><button id="download-cv">${icon('download')}Télécharger le CV Word</button><details><summary>Aperçu du CV</summary>${editorPreview(cv)}</details></section>
  <section class="panel"><h2>Ta lettre de motivation</h2><p class="small">Méthode Vous – Moi – Nous : les enjeux de l’entreprise, tes preuves, puis votre collaboration.</p><div class="field"><label for="letter_text">Texte de la lettre</label><textarea id="letter_text" rows="13">${esc(draft.letter_text)}</textarea></div><button id="download-letter">${icon('download')}Télécharger la lettre Word</button></section></div>
  <div class="action-footer"><button class="ghost" id="save">Enregistrer le brouillon</button><button class="primary" id="validate">Valider les documents${icon('arrow')}</button></div>`;
  bind('back-offer',()=>{collect();stage=1;render();});
  bind('save',async()=>{if(!validateIdentity())return;draft=await saveRecord(draft);notify('Brouillon enregistré.');});
  bind('validate',async()=>{if(!validateIdentity())return;draft=await saveRecord({...draft,status:!draft.status||draft.status==='À préparer'?'Documents prêts':draft.status});stage=3;render();});
  bindDownloads();
}
function validateIdentity(){
  collect();if(!draft.company?.trim()){error('company','Renseigne l’entreprise.');return false;}if(!draft.role?.trim()){error('role','Renseigne le poste.');return false;}return true;
}
function sendStep() {
  $('#stage').innerHTML=`<section class="panel offer-panel"><h2>Prête pour le prochain pas ?</h2><p><strong>${esc(draft.role)}</strong> · ${esc(draft.company)}</p><p>Télécharge tes documents, puis dépose ta candidature sur le site de l’entreprise. JobFlow n’envoie pas de mail à ta place.</p><div class="actions"><button id="download-cv">${icon('download')}CV Word</button><button id="download-letter">${icon('download')}Lettre Word</button>${safeURL(draft.offer_url)?`<a class="button" href="${esc(draft.offer_url)}" target="_blank" rel="noopener noreferrer">Ouvrir l’offre</a>`:''}</div><details open><summary>Planifier le suivi</summary>${field('Date de relance suggérée','follow_up_date',draft.follow_up_date||addDays(dateISO(),10),'date')}<div class="field"><label for="notes">Notes</label><textarea id="notes" rows="3">${esc(draft.notes)}</textarea></div></details><div class="action-footer"><button class="ghost" id="back-docs">Revoir les documents</button><button class="primary" id="send">Envoyer la candidature${icon('send')}</button></div><p class="hint">Ce bouton ouvre la confirmation de ton envoi, sans transmission automatique.</p></section>`;
  bind('back-docs',()=>{collect();stage=2;render();});bind('send',()=>{collect();confirmSend();});bindDownloads();
}
function confirmSend(){
  const dialog=$('#send-dialog');dialog.innerHTML=`<div class="dialog-head"><h2 id="send-title">As-tu envoyé ta candidature ?</h2><button id="close-send" class="ghost icon-button" aria-label="Fermer">${icon('close')}</button></div><p>Confirme après avoir déposé tes documents auprès de ${esc(draft.company)}. La date d’envoi sera enregistrée à aujourd’hui.</p><label class="check"><input type="checkbox" id="sent-check">J’ai envoyé cette candidature.</label><div class="action-footer"><button class="ghost" id="cancel-send">Pas encore</button><button class="primary" id="confirm-send" disabled>Confirmer l’envoi</button></div>`;
  dialog.showModal();$('#sent-check').onchange=()=>{$('#confirm-send').disabled=!$('#sent-check').checked;};
  bind('close-send',()=>dialog.close());bind('cancel-send',()=>dialog.close());
  bind('confirm-send',async()=>{
    if(!$('#sent-check').checked)return;
    if(draft.follow_up_date && draft.follow_up_date<dateISO())throw new Error('Choisis une date de relance à partir d’aujourd’hui.');
    draft=await saveRecord(transition(draft,'Envoyée',dateISO()));dialog.close();const count=weekCount(records,dateISO());notify(count>=goal()?`${count}/${goal()} cette semaine. Beau travail.`:`Envoyée. ${count}/${goal()} cette semaine.`);location.hash='today';
  });
}
function safeURL(url){try{return ['https:','http:'].includes(new URL(url).protocol);}catch{return false;}}
function bindDownloads(){for(const kind of ['cv','letter'])bind('download-'+kind,async()=>{collect();const response=await fetch('/api/document',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,kind})});if(!response.ok)throw new Error('Export impossible. Réessaie après avoir vérifié le document.');download(await response.blob(),kind==='cv'?'CV.docx':'Lettre.docx');});}
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function openDetail(id){
  const record=records.find(r=>r.id===id);if(!record)return;
  const dialog=$('#detail');
  dialog.innerHTML=`<div class="dialog-head"><div><h2 id="detail-title">${esc(record.role)}</h2><p>${esc(record.company)}</p></div><button class="ghost icon-button" id="close-detail" aria-label="Fermer le détail">${icon('close')}</button></div>${badge(record)}${safeURL(record.offer_url)?`<p><a href="${esc(record.offer_url)}" target="_blank" rel="noopener noreferrer">Consulter l’offre</a></p>`:''}<div class="field" style="margin-top:24px"><label for="detail-status">Statut</label><select id="detail-status">${['À préparer','Documents prêts','Envoyée','Entretien','Offre','Refusée'].map(s=>`<option value="${esc(s)}" ${record.status===s?'selected':''}>${s==='À préparer'?'À postuler':s==='Refusée'?'Refus':s}</option>`).join('')}</select></div>${field('Date de relance','detail-follow',record.follow_up_date||addDays(record.applied_date||dateISO(),10),'date')}<div class="field"><label for="detail-notes">Notes</label><textarea id="detail-notes" rows="4">${esc(record.notes)}</textarea></div><div class="actions"><button class="primary" id="save-detail">Enregistrer</button><button class="ghost" id="edit-documents">Reprendre les documents</button></div><details><summary>Historique</summary>${record.history?.length?`<ul class="history">${record.history.map(h=>`<li>${esc(h.date)} · ${esc(h.action)}</li>`).join('')}</ul>`:'<p class="small">Les prochains changements de statut apparaîtront ici.</p>'}</details>`;
  dialog.showModal();bind('close-detail',()=>dialog.close());
  bind('edit-documents',()=>{dialog.close();collect();draft=structuredClone(record);stage=draft.cv?2:1;location.hash='prepare';if(route()==='prepare')render();});
  bind('save-detail',async()=>{let next=transition(record,$('#detail-status').value,dateISO());next.follow_up_date=$('#detail-follow').value;next.notes=$('#detail-notes').value;await saveRecord(next);dialog.close();render();notify(next.status==='Refusée'?'Archivée. Chaque refus rapproche du bon poste.':'Candidature mise à jour.');});
}
function archives(){
  const archived=records.filter(isArchived);
  $('#main').innerHTML=`<section class="intro"><div><h1>Archives</h1><p>Une étape se termine. La suite reste à écrire.</p></div><button id="export" class="ghost">${icon('download')}Exporter mes données</button></section>${archived.length?`<div class="archives">${archived.map(card).join('')}</div>`:'<section class="empty"><h2>Aucune candidature archivée</h2><p>Les candidatures clôturées resteront ici, sans encombrer ton tableau.</p></section>'}`;
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDetail(b.dataset.open));
  bind('export',()=>download(new Blob([JSON.stringify(records,null,2)],{type:'application/json'}),'jobflow.json'));
}
function listField(label,id,values=[]) {
  return `<div class="field"><label for="${id}">${label}</label><textarea id="${id}" rows="3">${esc(values.join('\n'))}</textarea><p class="hint">Un élément par ligne.</p></div>`;
}
function collectProfile(){
  if(!$('#profile-form') || !profileDraft)return;
  for(const key of ['candidate_name','default_title','gender'])profileDraft[key]=$('#profile-'+key).value;
  profileDraft.seo_default_title=profileDraft.default_title;
  profileDraft.contact ||= {};
  for(const key of ['email','phone','linkedin','location','github'])profileDraft.contact[key]=$('#contact-'+key).value;
  for(const key of ['skills','tools','languages','interests'])profileDraft[key]=$('#profile-'+key).value.split('\n').map(x=>x.trim()).filter(Boolean);
  for(const [section,fields] of Object.entries({experiences:['role','company','period'],volunteering:['role','organization','period'],education:['title','institution','year']})){
    (profileDraft[section]||[]).forEach((item,index)=>{
      for(const key of fields)item[key]=$(`#${section}-${index}-${key}`).value;
      if(section!=='education')item.bullets=$(`#${section}-${index}-bullets`).value.split('\n').map(x=>x.trim()).filter(Boolean);
    });
  }
}
function renderProfile(){
  profileDraft ||= structuredClone(profile);
  const p=profileDraft;
  const sections={experiences:{title:'Expériences',add:'Ajouter une expérience',fields:{role:'Rôle',company:'Entreprise',period:'Période'}},volunteering:{title:'Engagements bénévoles',add:'Ajouter un engagement',fields:{role:'Rôle',organization:'Association',period:'Période'}},education:{title:'Formations',add:'Ajouter une formation',fields:{title:'Diplôme ou formation',institution:'Établissement',year:'Année ou période'}}};
  $('#main').innerHTML=`<section class="intro"><div><h1>Profil</h1><p>Ton parcours est la source de tes prochaines candidatures.</p></div></section><form id="profile-form" class="stack profile-details"><section class="panel"><h2>Informations personnelles</h2><p class="small">Ces informations restent sur cet appareil. Elles ne sont pas publiées sur GitHub.</p><div class="fields">${field('Nom complet *','profile-candidate_name',p.candidate_name)}${field('Titre professionnel *','profile-default_title',p.default_title)}</div><div class="field"><label for="profile-gender">Accords de rédaction</label><select id="profile-gender"><option ${p.gender==='Féminin'?'selected':''}>Féminin</option><option ${p.gender==='Masculin'?'selected':''}>Masculin</option><option ${p.gender==='Neutre'?'selected':''}>Neutre</option></select></div><div class="fields">${[['email','Email','email'],['phone','Téléphone','tel'],['location','Ville ou région','text'],['linkedin','Profil LinkedIn','text'],['github','Profil GitHub','text']].map(([key,label,type])=>field(label,'contact-'+key,p.contact?.[key],type)).join('')}</div></section>
  ${Object.entries(sections).map(([section,config])=>`<section class="panel"><h2>${config.title}</h2>${(p[section]||[]).map((item,index)=>`<fieldset class="profile-item"><legend>${config.title==='Formations'?'Formation':config.title==='Expériences'?'Expérience':'Engagement'} ${index+1}</legend><div class="fields">${Object.entries(config.fields).map(([key,label])=>field(label,`${section}-${index}-${key}`,item[key])).join('')}</div>${section!=='education'?listField('Réalisations et résultats vérifiés',`${section}-${index}-bullets`,item.bullets):''}<button type="button" class="ghost" data-remove="${section}" data-index="${index}">Retirer cet élément</button></fieldset>`).join('')}<button type="button" class="ghost" data-add="${section}">${icon('plus')}${config.add}</button></section>`).join('')}
  <section class="panel"><h2>Compétences et centres d’intérêt</h2>${listField('Compétences','profile-skills',p.skills)}${listField('Outils','profile-tools',p.tools)}${listField('Langues et niveaux','profile-languages',p.languages)}${listField('Centres d’intérêt','profile-interests',p.interests)}</section><div class="action-footer"><p class="small">Les prochaines générations utiliseront ce profil. Les candidatures existantes sont conservées.</p><button type="submit" class="primary" id="save-profile">Enregistrer mon profil</button></div><p class="error" id="profile-error" role="alert" hidden></p></form>`;
  document.querySelectorAll('#profile-form button:not([type])').forEach(b=>b.type='button');
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{collectProfile();const section=b.dataset.add;profileDraft[section] ||= [];profileDraft[section].push(section==='education'?{title:'',institution:'',year:''}:{role:'',company:'',organization:'',period:'',bullets:[]});renderProfile();});
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{collectProfile();profileDraft[b.dataset.remove].splice(Number(b.dataset.index),1);renderProfile();});
  $('#profile-form').onsubmit=async event=>{
    event.preventDefault();collectProfile();
    if(!p.candidate_name.trim()){error('profile-candidate_name','Renseigne ton nom.');return;}
    if(!p.default_title.trim()){error('profile-default_title','Renseigne ton titre professionnel.');return;}
    const button=$('#save-profile');button.disabled=true;
    try{profile=await request('/api/profile',profileDraft);profileDraft=null;notify('Profil enregistré. Tes prochaines candidatures utiliseront ces informations.');render();}
    catch(e){$('#profile-error').textContent=e.message;$('#profile-error').hidden=false;}
    finally{if(button.isConnected)button.disabled=false;}
  };
}

for(const element of document.querySelectorAll('[data-icon]'))element.insertAdjacentHTML('afterbegin',icon(element.dataset.icon));
$('#goal').onchange=()=>{try{localStorage.setItem('jobflow-goal',String(Math.min(30,Math.max(1,Number($('#goal').value)||3))));}catch{}updateGoal();};
window.addEventListener('hashchange',()=>{collect();collectProfile();render();});
window.addEventListener('beforeunload',e=>{if(route()==='prepare' && $('#offer_text')?.value && !draft.id){e.preventDefault();e.returnValue='';}});
Promise.all([request('/api/applications'),request('/api/profile')]).then(([a,p])=>{records=a;profile=p;render();}).catch(e=>{$('#main').innerHTML='<h1>Connexion indisponible</h1><p>Recharge la page une fois le serveur JobFlow disponible.</p>';notify(e.message);});
