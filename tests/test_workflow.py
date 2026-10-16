import copy
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import store

class WorkflowTest(unittest.TestCase):
    def test_draft_documents_sent_and_resume(self):
        with tempfile.TemporaryDirectory() as folder:
            db = Path(folder)/'test.sqlite3'
            draft = store.save({'company':'Entreprise test', 'role':'PMO', 'cv':{'cv_title':'PMO'}, 'letter_text':'Brouillon'}, db)
            draft.update(status='Documents prêts')
            store.save(draft, db)
            self.assertNotIn('applied_date', store.all_records(db)[0])
            draft.update(status='Envoyée', applied_date=store.today().isoformat(), follow_up_date=store.today().isoformat())
            store.save(draft, db)
            restored = store.all_records(db)
            self.assertEqual(len(restored), 1)
            self.assertEqual(restored[0]['cv']['cv_title'], 'PMO')
            self.assertEqual(len(store.due_records(restored)), 1)
            restored[0]['status'] = 'Refusée'
            self.assertEqual(store.due_records(restored), [])

    def test_generated_facts_cannot_replace_source(self):
        master = {'experiences':[{'company':'Réelle', 'period':'2022', 'bullets':['Preuve']}], 'skills':['Power BI']}
        snapshot = copy.deepcopy(master)
        generated = {'cv_title':'PMO', 'experiences':[{'company':'Inventée'}], 'skills':['Inventée']}
        result = store.factual_cv(generated, master)
        self.assertEqual(result['experiences'], master['experiences'])
        self.assertEqual(result['skills'], master['skills'])
        self.assertEqual(master, snapshot)

    def test_required_fields(self):
        with self.assertRaises(ValueError):
            store.save({'company':'', 'role':'PMO'})

    def test_streamlit_navigation_and_document_export(self):
        from streamlit.testing.v1 import AppTest
        import engine
        with tempfile.TemporaryDirectory() as folder:
            old_path = store.DB_PATH
            store.DB_PATH = Path(folder)/'test.sqlite3'
            try:
                app = AppTest.from_file(str(ROOT/'app.py')).run()
                self.assertEqual(len(app.exception), 0)
                app.sidebar.radio[0].set_value('Préparer une candidature').run()
                self.assertEqual(len(app.exception), 0)
                app.text_input(key='company').set_value('Entreprise test')
                app.text_input(key='role').set_value('PMO')
                next(b for b in app.button if b.label == 'Enregistrer le brouillon').click().run()
                self.assertEqual(len(store.all_records()), 1)
                app.sidebar.radio[0].set_value('Mes candidatures').run()
                self.assertEqual(len(app.exception), 0)
                app.sidebar.radio[0].set_value('Mon parcours').run()
                self.assertEqual(len(app.exception), 0)
                app.session_state['cover_letter_struct'] = None
                cv = store.factual_cv({'cv_title':'PMO','accroche_objective':'Résumé vérifié'}, engine.MASTER_CV)
                docs = engine.build_docx_documents(cv, ['Madame, Monsieur,', 'Texte de test.'], 'Entreprise test', 'Paris', engine.COLOR_PALETTE['Bleu Roi']['rgb'])
                from io import BytesIO
                for doc in docs:
                    output = BytesIO()
                    doc.save(output)
                    self.assertTrue(output.getvalue().startswith(b'PK'))
            finally:
                store.DB_PATH = old_path

if __name__ == '__main__':
    unittest.main()
