# Design — Typographie responsive et retours de chargement

## Objectif

Corriger le débordement du titre de connexion administrateur et rendre visibles les opérations qui peuvent figer l’interface pendant quelques secondes.

## Périmètre

Les retours de chargement couvrent les actions lentes principales :

- connexion administrateur ;
- validation d’une commande invitée ;
- changement d’état d’une commande ;
- création ou modification d’un produit ;
- téléversement d’une image produit ;
- navigation entre les pages boutique et administration lorsqu’elle attend le serveur.

## Typographie responsive

Le titre « Administration » doit rester entièrement contenu dans la carte de connexion à toutes les largeurs prises en charge. Sa taille sera calculée avec une valeur `clamp()` adaptée à la largeur utile de la carte, une hauteur de ligne serrée et une règle de rupture sûre. La typographie des autres titres ne sera pas réduite globalement.

## États de chargement

Chaque formulaire conserve son état local existant et expose un retour cohérent :

- bouton désactivé pendant l’opération ;
- spinner visuel intégré au bouton ou au contrôle actif ;
- libellé précis : « Connexion en cours… », « Commande en cours… », « Mise à jour… », « Enregistrement… » ou « Téléversement… » ;
- `aria-busy` sur la zone concernée et annonce accessible du statut ;
- verrou contre les doubles soumissions ;
- restauration des contrôles et affichage du message existant en cas d’échec.

Un composant de chargement réutilisable fournit le spinner et le texte accessible. L’animation respecte `prefers-reduced-motion`.

## Navigation

Des fichiers `loading.tsx` légers seront placés aux frontières de navigation pertinentes de Next.js. Ils afficheront une zone de progression non bloquante, en français, sans overlay plein écran. Les formulaires continuent d’afficher leur propre état jusqu’à ce que la navigation prenne le relais.

## Accessibilité

- Le texte d’état reste lisible sans dépendre uniquement du spinner.
- Les zones en cours utilisent `aria-busy="true"`.
- Les annonces utilisent un statut poli et n’interrompent pas inutilement les lecteurs d’écran.
- Les contrôles désactivés conservent un contraste suffisant.
- Le spinner devient statique lorsque l’utilisateur réduit les animations.

## Tests et critères d’acceptation

- Un test reproduit le débordement potentiel et vérifie la règle responsive dédiée au titre.
- Les tests de chaque action vérifient le libellé en attente, la désactivation et `aria-busy`.
- Les tests vérifient le retour à l’état normal après une erreur.
- Les frontières de navigation possèdent un test de rendu accessible.
- Les tests unitaires, le lint et le build passent.
- Une vérification visuelle est réalisée sur une largeur proche de la capture ainsi que sur mobile.

## Hors périmètre

- Aucun overlay bloquant global.
- Aucun changement de logique métier, de base de données ou d’authentification.
- Aucun redesign général de la boutique.
