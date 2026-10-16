# Direction artistique JobFlow

Référence : charte « JobFlow · Direction artistique & spécifications UI », version 1, octobre 2026, fournie par la propriétaire du projet.

## Identité

Une candidature à la fois. Interface calme et nette, sans dégradés, illustrations ou emojis.
Titres Archivo 800/700, interface Inter 400/600/700. Polices chargées depuis Google Fonts ; alternatives système si indisponibles.
Palette et tokens exacts de la charte dans `web/styles.css`, y compris les variantes sombres.
Grille de 4 px, espaces de 4 à 48 px, arrondis de 6/12/20 px, badges en pilule.
Logo original conservé dans `web/assets/jobflow-logo.png`, monogramme cadré en CSS à 32 × 32 px en navigation.

## Écrans

- Tableau : quatre colonnes À postuler, Envoyée, Entretien, Offre ; recherche ; cartes déplaçables.
- Navigation : Tableau, Nouvelle candidature, Archives, Profil. Sidebar de 240 px ; barre basse mobile.
- Mobile : une seule colonne visible, sélection par onglets et navigation clavier entre les statuts.
- Détail : panneau latéral avec statut, relance, notes et historique des changements enregistrés par JobFlow.
- Candidature : offre → documents modifiables → confirmation d’envoi et relance J+10.
- Archives : refus conservés avec couleur sourde et libellé explicite.
- Compteur hebdomadaire en haut à droite ; accent spark seulement si l’objectif est atteint.
- Un seul bouton principal par étape active. Actions secondaires neutres ; icônes SVG au trait 1,5 px.
- Notifications centrées, contraste clair/sombre, durée 4 secondes.

## Conservation des données

Les anciens statuts À préparer et Documents prêts restent stockés tels quels et sont regroupés visuellement dans À postuler.
Les changements de statut passent par le même stockage local. Aucun import, aucune suppression et aucune synchronisation distante automatique.

## Limites fonctionnelles conservées

Les téléchargements sont au format Word. L’export PDF n’est pas encore implémenté.
Un lien d’offre seul est enregistré mais son contenu n’est pas extrait automatiquement.
« Envoyer la candidature » ouvre une confirmation après dépôt des documents par la personne : aucun mail ni formulaire externe n’est envoyé automatiquement.
L’historique comprend les changements de statut dans JobFlow, pas les mails reçus.
Le mode sombre suit la préférence du système ; les mouvements réduits sont respectés.
Validation tactile sur téléphone réel et appels IA réels restent à faire.

## Vérifications

Tests des anciens statuts, calcul de semaine, relance J+10, conservation des dates et de l’historique.
Scénario navigateur sur base temporaire isolée : édition de statut, archives, préparation manuelle, validation, confirmation d’envoi, persistance.
Contrôle ordinateur à 1440 px et mobile à 390 px : pas de débordement horizontal, une seule colonne mobile et un seul bouton principal dans le contenu actif.
Références HIG consultées : accessibilité, layout, couleur, typographie et glisser-déposer.
