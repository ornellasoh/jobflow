# Direction de conception

JobFlow regroupe l’atelier de CV/lettre et le suivi personnel de candidatures.
Références : Apple Design et Mobile Native fournies par la propriétaire du projet.
Références HIG consultées : accessibilité, couleur, layout, typographie et saisie de données.

Palette : fond #F5F5F7, surfaces #FFFFFF, texte #1D1D1F, accent #3155D9,
sidebar #EBEDF2. Typographie système, titres resserrés et corps lisible.
Texte aligné à gauche ; parcours en deux colonnes sur ordinateur, une sur mobile.
L’élément central est la prochaine action de candidature, avec un objectif hebdomadaire discret.
Réduire les contours imbriqués de la première proposition, réserver le bleu à l’action principale.

Les images sont des propositions générées avec l’outil intégré ImageGen.
Brief des prompts : interface française JobFlow + CV Generator, palette ci-dessus,
offre d’exemple PMO Énergie, CV fondé sur le parcours source, documents à relire,
validation des documents distincte de l’envoi, stockage local et Notion non connecté.
Desktop : atelier à deux colonnes avec aperçu. Mobile : accueil et atelier côte à côte,
grandes cibles tactiles, aperçu repliable et navigation inférieure.

Ces images ne sont pas des captures du prototype. L’interface Streamlit est une première
base de fonctionnement ; les onglets mobiles, la navigation inférieure et l’aperçu paginé
dessinés dans la maquette restent à réaliser dans l’interface web finale.

Contrôles effectués : navigation et exports Word, scénario d’envoi avec IA simulée,
colonnes empilées à 390 pixels et absence de débordement horizontal dans le navigateur.
Les comportements sur téléphone réel et les appels IA réels restent à tester.

## Interface HTML

Palette de la version JobFlow existante : bleu #2453e6, nuit #13213c, fond #f6f7fb, surfaces blanches.
Navigation latérale ordinateur, navigation inférieure mobile. Formulaires à libellés explicites,
aperçu séparé, états vides utiles et validation explicite de l’envoi.
