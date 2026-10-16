"""Profil personnel local, validé et enregistré hors du dépôt public."""
import json
import os
import tempfile
from pathlib import Path

ROOT = Path(__file__).parent

def profile_path():
    return Path(os.getenv('JOBFLOW_PROFILE_PATH', str(ROOT/'data'/'profile.json')))

def load_profile():
    path = profile_path()
    if not path.is_file():
        path = ROOT/'profile.example.json'
    return json.loads(path.read_text(encoding='utf-8'))

def validate_profile(value):
    if not isinstance(value, dict):
        raise ValueError('Profil invalide.')
    result = {}
    def text(item):
        if not isinstance(item, str) or len(item) > 10000:
            raise ValueError('Texte de profil invalide.')
        return item.strip()
    for key in ['candidate_name', 'gender', 'default_title', 'seo_default_title']:
        result[key] = text(value.get(key, ''))
    if not result['candidate_name'] or not result['default_title']:
        raise ValueError('Renseigne ton nom et ton titre professionnel.')
    result['seo_default_title'] = result['seo_default_title'] or result['default_title']
    contact = value.get('contact', {})
    if not isinstance(contact, dict):
        raise ValueError('Coordonnées invalides.')
    result['contact'] = {key:text(contact.get(key, '')) for key in ['email','phone','linkedin','location','github']}
    for key in ['skills','tools','languages','interests']:
        items = value.get(key, [])
        if not isinstance(items, list) or len(items)>200:
            raise ValueError('Liste de profil invalide.')
        result[key] = [text(item) for item in items if text(item)]
    for key,fields in {'experiences':['role','company','period'], 'volunteering':['role','organization','period'], 'education':['title','institution','year']}.items():
        items = value.get(key, [])
        if not isinstance(items, list) or len(items)>100:
            raise ValueError('Parcours invalide.')
        rows = []
        for item in items:
            if not isinstance(item, dict):
                raise ValueError('Élément de parcours invalide.')
            row = {field:text(item.get(field,'')) for field in fields}
            if key != 'education':
                bullets=item.get('bullets', [])
                if not isinstance(bullets,list) or len(bullets)>100:
                    raise ValueError('Réalisations invalides.')
                row['bullets']=[text(b) for b in bullets if text(b)]
            if any(row[field] for field in fields):
                rows.append(row)
        result[key]=rows
    return result

def save_profile(value):
    result=validate_profile(value)
    path=profile_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload=json.dumps(result,ensure_ascii=False,indent=2)
    # Conserver une sauvegarde privée avant le remplacement atomique.
    if path.is_file():
        backup=path.with_suffix('.previous.json')
        backup.write_text(path.read_text(encoding='utf-8'),encoding='utf-8')
        os.chmod(backup,0o600)
    temporary=None
    try:
        with tempfile.NamedTemporaryFile(mode='w',encoding='utf-8',dir=path.parent,delete=False) as out:
            temporary=Path(out.name)
            os.chmod(temporary,0o600)
            out.write(payload)
        temporary.replace(path)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()
    return result
