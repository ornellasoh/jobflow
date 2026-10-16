import copy
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import profiles

class ProfileTest(unittest.TestCase):
    def example(self):
        return json.loads((ROOT/'profile.example.json').read_text())

    def test_profile_is_saved_privately_with_backup(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ,{'JOBFLOW_PROFILE_PATH':str(Path(tmp)/'profile.json')}):
            value=self.example()
            value['candidate_name']='Profil de test'
            profiles.save_profile(value)
            changed=copy.deepcopy(value)
            changed['default_title']='PMO de test'
            changed['api_key']='must-not-be-saved'
            profiles.save_profile(changed)
            self.assertEqual(profiles.load_profile()['default_title'],'PMO de test')
            self.assertNotIn('api_key',profiles.load_profile())
            self.assertEqual(json.loads((Path(tmp)/'profile.previous.json').read_text())['default_title'],value['default_title'])

    def test_invalid_profile_does_not_replace_source(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ,{'JOBFLOW_PROFILE_PATH':str(Path(tmp)/'profile.json')}):
            profiles.save_profile(self.example())
            before=profiles.load_profile()
            invalid=self.example()
            invalid['experiences']='invalid'
            with self.assertRaises(ValueError):profiles.save_profile(invalid)
            self.assertEqual(profiles.load_profile(),before)

    def test_prompt_refreshes_and_letter_method_is_preserved(self):
        import engine
        previous=engine.MASTER_CV
        try:
            with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ,{'JOBFLOW_PROFILE_PATH':str(Path(tmp)/'profile.json')}):
                profile=self.example()
                profile['candidate_name']='Candidate de test'
                profiles.save_profile(profile)
                engine.refresh_profile()
                prompt=engine.build_system_prompt()
                self.assertIn('Candidate de test',prompt)
                self.assertIn('VOUS – MOI – NOUS',prompt)
                profile['candidate_name']='Nouveau nom de test'
                profiles.save_profile(profile)
                engine.refresh_profile()
                self.assertIn('Nouveau nom de test',engine.build_system_prompt())
                self.assertNotIn('Candidate de test',engine.build_system_prompt())
        finally:engine.MASTER_CV=previous

    def test_existing_document_keeps_its_profile_snapshot(self):
        import engine
        snapshot=self.example()
        snapshot['candidate_name']='Ancien nom de test'
        snapshot['contact']['email']='ancien@example.com'
        snapshot['cv_title']='PMO'
        cv,letter=engine.build_docx_documents(snapshot,['Texte de test'],'Test','Paris',engine.COLOR_PALETTE['Bleu Roi']['rgb'],source_profile=snapshot)
        text='\n'.join(p.text for p in letter.paragraphs)
        self.assertIn('Ancien nom de test',text)
        self.assertIn('ancien@example.com',text)

if __name__=='__main__':unittest.main()
