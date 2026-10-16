# Obtenir une clé Gemini ou DeepSeek pour JobFlow

Tutoriel vérifié le 16 octobre 2026. Les intitulés des boutons peuvent évoluer.
Une seule clé suffit : choisis le fournisseur que tu veux utiliser.

## 1. Gemini — Google

1. Ouvre [la page des clés Google AI Studio](https://aistudio.google.com/apikey).
2. Connecte-toi à ton compte Google et accepte les conditions si tu souhaites utiliser le service.
3. Une clé peut déjà avoir été créée pour ton premier projet. Sinon, clique sur **Create API key / Créer une clé API**.
4. Sélectionne ou crée un projet proposé par AI Studio. Si ton projet Google Cloud existe déjà mais n’apparaît pas, importe-le depuis **Dashboard → Projects → Import projects**.
5. Copie la clé et garde-la dans un gestionnaire de mots de passe.

Certains modèles disposent d’un quota gratuit, sous conditions de disponibilité et de limites. La création d’une clé ne garantit pas des générations gratuites et illimitées. Vérifie le plan du projet et les quotas avant d’activer la facturation.

Sources : [clés Gemini](https://ai.google.dev/gemini-api/docs/api-key) · [facturation](https://ai.google.dev/gemini-api/docs/billing).

## 2. DeepSeek

1. Ouvre [DeepSeek Platform](https://platform.deepseek.com/), puis connecte-toi ou crée ton compte.
2. Ouvre [API keys](https://platform.deepseek.com/api_keys).
3. Clique sur **Create new API key** ou le bouton de création équivalent.
4. Donne-lui un nom facile à reconnaître, par exemple **JobFlow**, si ce champ est proposé.
5. Copie la clé dès qu’elle est affichée et conserve-la dans ton gestionnaire de mots de passe.
6. Vérifie ton [solde API](https://platform.deepseek.com/balance) et les [tarifs en vigueur](https://api-docs.deepseek.com/quick_start/pricing). Si ton compte n’a pas de crédit utilisable, il faut le recharger pour lancer des requêtes payantes.

Utiliser le site de discussion DeepSeek ne signifie pas que ton compte API dispose de crédit.

Source : [documentation officielle DeepSeek](https://api-docs.deepseek.com/).

## 3. Utiliser la clé dans JobFlow

1. Ouvre **Préparer une candidature**.
2. Ajoute l’entreprise, le poste et le texte de l’offre.
3. Déplie **Réglages de génération**.
4. Sélectionne **Gemini** ou **DeepSeek**, selon la clé créée.
5. Colle la clé dans **Clé API · non enregistrée**.
6. Clique sur **Préparer mon CV et ma lettre**.
7. Relis le résultat avant de télécharger les documents et de postuler.

Dans la web app actuelle, la clé est transmise au serveur local pour appeler le fournisseur choisi, puis n’est pas enregistrée dans la base de candidatures. Elle peut être à ressaisir quand l’écran est reconstruit. Le CV source et le texte de l’offre sont également envoyés au fournisseur lors de la génération.

## 4. Si ça ne fonctionne pas

- **Clé refusée / authentification** : vérifie le fournisseur sélectionné, copie à nouveau la clé complète sans espace et assure-toi qu’elle est active.
- **Quota dépassé / trop de requêtes** : attends ou consulte les quotas et la consommation du projet.
- **Solde insuffisant** : consulte la facturation du fournisseur ; évite de relancer plusieurs générations payantes sans vérifier le résultat.
- **Modèle introuvable ou indisponible** : le modèle configuré dans JobFlow doit être mis à jour côté serveur. Ce n’est pas forcément un problème de clé.

## 5. Garder la clé privée

Ne colle jamais une vraie clé dans GitHub, le code HTML/JavaScript public, une capture d’écran ou une conversation d’assistance. Si elle a été divulguée, remplace-la et révoque l’ancienne depuis le compte fournisseur.

Pour une future version publique où JobFlow finance la génération, la clé commune devra rester dans les secrets du serveur, avec contrôle des accès et limites d’utilisation. Elle ne devra pas être intégrée à l’interface envoyée aux visiteurs.
