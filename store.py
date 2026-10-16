"""Stockage local du parcours commun ; aucune écriture dans les projets source."""
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

STATUSES = ['À préparer', 'Documents prêts', 'Envoyée', 'Entretien', 'Offre', 'Refusée']
DB_PATH = Path(__file__).parent / 'data' / 'jobflow.sqlite3'

def today():
    return datetime.now(ZoneInfo('Europe/Paris')).date()

def connect(path=None):
    target = Path(path or DB_PATH)
    target.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(target)
    conn.execute('CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, payload TEXT NOT NULL)')
    return conn

def save(record, path=None):
    record = dict(record)
    if not str(record.get('company', '')).strip() or not str(record.get('role', '')).strip():
        raise ValueError('Renseigne une entreprise et un poste.')
    if record.get('status', 'À préparer') not in STATUSES:
        raise ValueError('Statut inconnu.')
    record.setdefault('id', str(uuid4()))
    record.setdefault('status', 'À préparer')
    record['updated_at'] = datetime.now(ZoneInfo('Europe/Paris')).isoformat()
    with connect(path) as conn:
        conn.execute('INSERT INTO applications VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',
                     (record['id'], json.dumps(record, ensure_ascii=False)))
    return record

def all_records(path=None):
    with connect(path) as conn:
        return [json.loads(row[0]) for row in conn.execute('SELECT payload FROM applications ORDER BY rowid DESC')]

def due_records(records):
    return sorted([r for r in records if r.get('follow_up_date') and r['follow_up_date'] <= today().isoformat()
                   and r.get('status') not in ['Offre', 'Refusée']], key=lambda r: r['follow_up_date'])

def factual_cv(generated, master):
    """L'IA adapte le titre et le résumé ; les éléments de parcours restent ceux de la source."""
    from copy import deepcopy
    result = deepcopy(master)
    for key in ['cv_title', 'seo_title', 'accroche_objective', 'tailored_summary']:
        if key in generated:
            result[key] = generated[key]
    return result
