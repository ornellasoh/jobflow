"""JobFlow : atelier de candidature et suivi dans une seule application locale."""
import copy
import csv
import io
import json
import os
from datetime import date, timedelta
from pathlib import Path

import streamlit as st
from store import STATUSES, all_records, due_records, factual_cv, save, today

st.set_page_config(page_title='JobFlow · CV & candidatures', page_icon='📄', layout='wide')
st.markdown('''<style>
html,body,.stApp{font-family:system-ui,-apple-system,sans-serif;color:#1d1d1f}
.stApp{background:#f5f5f7} h1{font-size:2rem!important;letter-spacing:-.025em}
h2,h3{letter-spacing:-.015em} [data-testid="stSidebar"]{background:#ebedf2}
.stButton button,.stDownloadButton button{min-height:44px;border-radius:10px;touch-action:manipulation}
.stButton button:active{transform:scale(.98)} textarea,input{font-size:16px!important}
button:focus-visible,a:focus-visible{outline:3px solid #3155d9!important;outline-offset:3px}
@media(max-width:760px){
 [data-testid="stHorizontalBlock"]{flex-direction:column!important}
 [data-testid="stColumn"]{width:100%!important;flex:1 1 100%!important;min-width:0!important}
 .block-container{padding:1.25rem 1rem 3rem!important}
 h1{font-size:1.6rem!important}
 .stButton button,.stDownloadButton button{width:100%;min-height:48px}
}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;transform:none!important}}
</style>''', unsafe_allow_html=True)

records = all_records()
with st.sidebar:
    st.title('JobFlow')
    st.caption('CV & candidatures')
    view = st.radio('Ton espace', ['Aujourd’hui', 'Préparer une candidature', 'Mes candidatures', 'Mon parcours'], key='view')
    st.divider()
    target = st.number_input('Objectif par semaine', min_value=1, max_value=30, value=3)
    monday = today() - timedelta(days=today().weekday())
    sent = sum(bool(r.get('applied_date')) and monday.isoformat() <= r['applied_date'] <= today().isoformat() for r in records)
    st.caption(f'{sent} / {target} candidatures envoyées cette semaine')
    st.progress(min(sent / target, 1.0))
    st.caption('Stockage sur cet appareil · Notion non connecté')

def resume(record):
    st.session_state['active_record'] = copy.deepcopy(record)
    st.session_state['view'] = 'Préparer une candidature'
    for key in ['company', 'role', 'offer_url', 'offer_text', 'summary', 'title', 'letter_text']:
        st.session_state.pop(key, None)

def load_engine():
    try:
        import engine
        return engine
    except ImportError as exc:
        st.error(f'Dépendance du générateur manquante : {exc.name}. Installe les dépendances du projet pour continuer.')
        st.stop()

if view == 'Aujourd’hui':
    st.title('Une action à la fois.')
    st.write('Prépare une candidature ou reprends une relance arrivée à échéance.')
    a, b, c = st.columns(3)
    a.metric('À préparer', sum(r['status'] in ['À préparer', 'Documents prêts'] for r in records))
    b.metric('Relances dues', len(due_records(records)))
    c.metric('Entretiens', sum(r['status'] == 'Entretien' for r in records))
    st.button('Préparer une candidature', type='primary', on_click=resume, args=({},))
    st.subheader('À faire aujourd’hui')
    if not due_records(records):
        st.info('Aucune relance due. Tu peux avancer sur ta prochaine candidature.')
    for r in due_records(records):
        with st.container(border=True):
            st.write(f"**Relancer {r['company']}** · {r['role']}")
            st.caption(f"Échéance : {r['follow_up_date']}")
            st.button('Ouvrir la candidature', key='due-'+r['id'], on_click=resume, args=(r,))
    st.subheader('Reprendre un brouillon')
    drafts = [r for r in records if r['status'] in ['À préparer', 'Documents prêts']]
    if not drafts:
        st.caption('Tes candidatures enregistrées apparaîtront ici.')
    for r in drafts:
        st.button(f"{r['company']} — {r['role']}", key=r['id'], on_click=resume, args=(r,))

elif view == 'Préparer une candidature':
    engine = load_engine()
    record = st.session_state.setdefault('active_record', {})
    st.title('Préparer une candidature')
    st.caption('Offre → CV & lettre → Envoi & suivi')
    left, right = st.columns([1.5, 1], gap='large')
    with left:
        with st.container(border=True):
            st.subheader('L’offre')
            company = st.text_input('Entreprise', value=record.get('company', ''), key='company')
            role = st.text_input('Poste', value=record.get('role', ''), key='role')
            url = st.text_input('Lien de l’offre', value=record.get('offer_url', ''), key='offer_url')
            offer = st.text_area('Texte de l’offre', value=record.get('offer_text', ''), height=160, key='offer_text', help='Colle le texte : le lien est conservé pour le suivi, il n’est pas analysé automatiquement.')
        with st.expander('Réglages de génération'):
            provider = st.selectbox('Moteur IA', ['Gemini', 'DeepSeek'])
            api_key = st.text_input('Clé API', type='password', value=os.getenv('GEMINI_API_KEY' if provider == 'Gemini' else 'DEEPSEEK_API_KEY', ''))
            st.caption('La génération transmet le texte de l’offre et le CV source au moteur choisi. La clé n’est pas enregistrée dans le suivi.')
        if st.button('Préparer mon CV et ma lettre', type='primary'):
            if not company.strip() or not role.strip() or not offer.strip():
                st.warning('Ajoute l’entreprise, le poste et le texte de l’offre.')
            elif not api_key:
                st.warning('Renseigne ta clé dans les réglages de génération.')
            else:
                try:
                    with st.spinner('Préparation des documents…'):
                        result = engine.generate_complete_application(offer, provider, api_key)
                    record['cv'] = factual_cv(result['cv'], engine.MASTER_CV)
                    record['letter'] = result['cover_letter']
                    for key in ['title', 'summary', 'letter_text']:
                        st.session_state.pop(key, None)
                    record.update(company=company, role=role, offer_url=url, offer_text=offer)
                    st.rerun()
                except Exception:
                    st.error('La génération a échoué. Vérifie la clé, la connexion et le modèle configuré, puis réessaie. Ton brouillon reste disponible.')
        cv = record.get('cv')
        if cv:
            st.subheader('Documents à relire')
            cv['cv_title'] = st.text_input('Titre du CV', value=cv.get('cv_title') or cv.get('seo_title', role), key='title')
            cv['seo_title'] = cv['cv_title']
            cv['accroche_objective'] = st.text_area('Résumé professionnel', value=cv.get('accroche_objective', ''), key='summary')
            paragraphs = engine.cover_letter_to_paragraphs(record.get('letter', {}))
            letter_text = st.text_area('Lettre de motivation', value=record.get('letter_text', '\n\n'.join(paragraphs)), height=280, key='letter_text')
            record['letter_text'] = letter_text
            st.caption('Expériences, dates, formations et compétences reprises du CV source. Le titre, le résumé et la lettre restent à vérifier.')
        if st.button('Enregistrer le brouillon'):
            try:
                record.update(company=company.strip(), role=role.strip(), offer_url=url, offer_text=offer)
                st.session_state['active_record'] = save(record)
                st.success('Brouillon et documents enregistrés sur cet appareil.')
            except ValueError as exc:
                st.warning(str(exc))
    with right:
        st.subheader('Aperçu du contenu')
        if cv:
            with st.container(border=True):
                st.subheader(engine.MASTER_CV['candidate_name'])
                st.write(cv.get('cv_title', ''))
                st.write(cv.get('accroche_objective', ''))
                for exp in cv['experiences']:
                    st.write(f"**{exp['role']}**")
                    st.caption(f"{exp['company']} · {exp['period']}")
                    for bullet in exp['bullets']:
                        st.write('• '+bullet)
            st.session_state['cover_letter_struct'] = None
            st.session_state['cv_style'] = 'Chronologique (classique)'
            paragraphs = [p.strip() for p in record['letter_text'].split('\n\n') if p.strip()]
            try:
                docs = engine.build_docx_documents(cv, paragraphs, company, '', engine.COLOR_PALETTE['Bleu Roi']['rgb'])
                for label, doc, filename in zip(['CV Word', 'Lettre Word'], docs, ['CV_Ornella_SOH.docx', 'Lettre_Ornella_SOH.docx']):
                    output = io.BytesIO()
                    doc.save(output)
                    st.download_button(label, output.getvalue(), file_name=filename, mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            except Exception:
                st.error('Export Word indisponible pour ces données. Le brouillon peut être enregistré pour reprendre la correction.')
            if st.button('Documents relus et validés'):
                try:
                    record.update(company=company.strip(), role=role.strip(), offer_url=url, offer_text=offer)
                    if record.get('status', 'À préparer') == 'À préparer':
                        record['status'] = 'Documents prêts'
                    st.session_state['active_record'] = save(record)
                    st.success('Documents validés. Confirme l’envoi ci-dessous après avoir postulé.')
                except ValueError as exc:
                    st.warning(str(exc))
        else:
            st.info('Ajoute une offre pour préparer tes documents. Ton parcours reste la source de référence.')
        st.divider()
        st.subheader('Envoi & suivi')
        with st.form('sent'):
            applied = st.date_input('Date d’envoi', value=today(), max_value=today())
            follow = st.date_input('Date de relance', value=today()+timedelta(days=7))
            confirmed = st.checkbox('J’ai envoyé cette candidature')
            if st.form_submit_button('Enregistrer l’envoi'):
                if not confirmed:
                    st.warning('Confirme l’envoi après avoir postulé.')
                elif follow < applied:
                    st.warning('La relance doit être prévue à partir de la date d’envoi.')
                else:
                    try:
                        record.update(company=company.strip(), role=role.strip(), offer_url=url, offer_text=offer, status='Envoyée', applied_date=applied.isoformat(), follow_up_date=follow.isoformat())
                        st.session_state['active_record'] = save(record)
                        st.success('Envoi et relance enregistrés.')
                    except ValueError as exc:
                        st.warning(str(exc))

elif view == 'Mes candidatures':
    st.title('Mes candidatures')
    query = st.text_input('Rechercher une entreprise ou un poste')
    status = st.selectbox('Statut', ['Tous']+STATUSES)
    selected = [r for r in records if query.casefold() in (r['company']+' '+r['role']).casefold() and status in ['Tous', r['status']]]
    for r in selected:
        with st.expander(f"{r['company']} — {r['role']} · {r['status']}"):
            st.caption('Relance : '+r.get('follow_up_date', 'Non prévue'))
            with st.form('update-'+r['id']):
                next_status = st.selectbox('Étape', STATUSES, index=STATUSES.index(r['status']))
                new_follow = st.date_input('Relance', value=date.fromisoformat(r['follow_up_date']) if r.get('follow_up_date') else None)
                notes = st.text_area('Notes', value=r.get('notes', ''))
                if st.form_submit_button('Mettre à jour'):
                    r.update(status=next_status, follow_up_date=new_follow.isoformat() if new_follow else None, notes=notes)
                    if next_status == 'Envoyée' and not r.get('applied_date'):
                        r['applied_date'] = today().isoformat()
                    save(r)
                    st.rerun()
            st.button('Reprendre les documents', key='resume-'+r['id'], on_click=resume, args=(r,))
    if not selected:
        st.info('Aucune candidature à afficher. Commence par enregistrer un brouillon.')
    keys = ['company', 'role', 'status', 'applied_date', 'follow_up_date', 'offer_url', 'notes']
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=keys, extrasaction='ignore')
    writer.writeheader()
    writer.writerows(records)
    st.download_button('Exporter le suivi CSV', '\ufeff'+output.getvalue(), 'jobflow.csv', 'text/csv')
    st.download_button('Sauvegarder toutes les données JSON', json.dumps(records, ensure_ascii=False, indent=2), 'jobflow.json', 'application/json')
    st.caption('Import des données de l’ancien JobFlow et synchronisation Notion : étapes suivantes.')

else:
    engine = load_engine()
    st.title('Mon parcours')
    st.write('Le CV source de ton générateur sert de référence aux candidatures.')
    st.info('Vérifie les dates et les réalisations de ton CV source avant de générer tes documents.')
    for exp in engine.MASTER_CV['experiences']:
        with st.expander(exp['role']+' — '+exp['company']):
            st.caption(exp['period'])
            for bullet in exp['bullets']:
                st.write('• '+bullet)
    st.download_button('Exporter mon parcours JSON', json.dumps(engine.MASTER_CV, ensure_ascii=False, indent=2), 'mon_parcours.json', 'application/json')
