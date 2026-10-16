# JobFlow

Web app personnelle pour préparer CV et lettres, suivre les candidatures et retrouver les relances du jour. Interface française, ordinateur et mobile.

## Démarrer

```sh
python3 -m pip install -r requirements.txt
python3 server.py
```

Ouvrir http://127.0.0.1:8502. Le serveur est limité à cet ordinateur.
Copier `profile.example.json` vers `data/profile.json` et y renseigner son parcours.
Le dossier `data/` est ignoré par Git : profil privé, documents et base SQLite y restent locaux.
Sans profil local, l’application charge le modèle anonyme fourni.

Les clés Gemini ou DeepSeek se saisissent dans les réglages et ne sont pas enregistrées dans le suivi.
La génération transmet le CV source et le texte de l’offre au fournisseur choisi, uniquement après action de l’utilisateur.

## Fonctionnalités

- Tableau Kanban à quatre colonnes, recherche et compteur hebdomadaire.
- Cartes déplaçables et panneau de détail avec statut, relance, notes et historique.
- Archives séparées pour les refus, sans suppression des candidatures.
- Parcours offre → CV & lettre → envoi & suivi.
- Génération Gemini ou DeepSeek ; titre, résumé et lettre éditables.
- Profil modifiable : coordonnées, expériences, formations, engagements, compétences et langues.
- Faits du parcours conservés depuis le profil source ; mise à jour utilisée dès la prochaine génération.
- Lettre préparée selon la méthode Vous – Moi – Nous, avec contexte d’entreprise facultatif.
- Aperçu du contenu et exports Word.
- Documents liés à la candidature et sauvegarde locale SQLite.
- Confirmation d’envoi, date de relance, recherche et export JSON.
- Sidebar ordinateur et navigation basse mobile ; une colonne à la fois sur téléphone.

## Structure

- `web/` : interface HTML, CSS et JavaScript.
- `server.py` : API locale et serveur statique.
- `engine.py` : moteur issu de CV Generator.
- `store.py` : stockage et conservation des faits.
- `profiles.py` : validation, sauvegarde locale privée et relecture du profil.
- `profile.example.json` : profil anonyme à personnaliser localement.
- `app.py` : premier prototype Streamlit conservé.
- `tests/` : vérifications du parcours.
- `design/` : direction artistique.

Le prototype Streamlit partage la même base : `python3 -m streamlit run app.py`.

## Vérifier

```sh
python3 -m unittest discover -s tests -v
node --check web/app.js
node --test tests/board.test.mjs
```

Les scénarios de génération testés utilisent une IA simulée. Les appels réels nécessitent une clé valide.

## Direction artistique

Charte JobFlow : bleu #0025CC, texte #0B1033, fond #F6F7FB et surfaces #FFFFFF.
Titres Archivo, interface Inter, tokens clair/sombre, boutons de 48 px, focus visible et mouvement réduit respecté.
Voir [la direction artistique implémentée](design/DIRECTION.md).

## Suite

Synchronisation JobFlow en ligne et Notion, import des anciennes candidatures, export PDF et installation PWA restent à réaliser. Validation sur téléphone réel à faire.

Le serveur local ne doit pas être exposé sur Internet : ajouter authentification, isolation des comptes,
protection des secrets et HTTPS avant hébergement.

## Obtenir une clé API

[Tutoriel Gemini et DeepSeek](docs/CLES_API.md), également accessible depuis les réglages de génération de la web app.
