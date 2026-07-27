# Hero vidéo et éditeur matriciel de produits

## Contexte et objectifs

La boutique doit permettre à l’administrateur de piloter un hero composé de vidéos promotionnelles indépendantes des produits, de créer rapidement plusieurs déclinaisons couleur-pointure, et d’associer plusieurs images à chaque couleur.

Le design conserve les modèles métier existants lorsque cela protège la compatibilité avec les produits, le panier et les commandes. L’expérience d’administration adopte le système Impeccable : surfaces crème, accents orange brûlé et ambre, hiérarchie graphique forte, interactions explicites et accessibilité WCAG 2.2 AA.

## Architecture

### Vidéos du hero

Un modèle Prisma `HeroVideo` indépendant contient :

- `id: String`
- `url: String`
- `title: String`
- `position: Int`
- `isVisible: Boolean`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Les fichiers sont stockés dans Vercel Blob. Une page dédiée du panel admin permet de les importer, prévisualiser, ordonner, publier, masquer et supprimer. Le nombre de vidéos enregistrées et publiées n’est pas limité par l’application.

Le catalogue récupère uniquement les vidéos visibles, triées par `position`. L’absence de vidéo publiée conserve le hero actuel basé sur une image produit.

### Déclinaisons produit

`ProductVariant` reste la source de vérité. Chaque combinaison couleur-pointure continue d’avoir :

- son identifiant ;
- son SKU unique ;
- son stock ;
- sa relation avec le produit et les commandes.

L’éditeur matriciel est une nouvelle représentation de ces lignes, sans champ JSON ni duplication de modèle. Les pointures proposées sont les valeurs entières de 35 à 46. Les couleurs proviennent uniquement de la palette existante.

### Images produit

`ProductImage` reste associé à un produit, une couleur et une position. L’administration regroupe visuellement les images par couleur. Chaque couleur accepte au maximum six images.

## Design tokens et fondations

- Surface principale : crème existant de la boutique.
- Surface secondaire : blanc.
- Accent principal : ambre `#CC8800`.
- Accent secondaire : orange brûlé `#C55221`.
- Succès : `#16A34A`.
- Avertissement : `#D97706`.
- Danger : `#DC2626`.
- Texte principal : `#111827`.
- Espacement : multiples de 4, avec paliers 4/8/12/16/24/32 px.
- Cibles interactives : 44 × 44 px minimum.
- Focus : contour visible à contraste AA, jamais supprimé sans remplacement.

Les styles doivent réutiliser les tokens et composants existants avant d’introduire une valeur locale.

## Composants et comportements

### Hero vidéo public

Le hero conserve son texte et son appel à l’action. La zone `.hero-visual` devient un carrousel média.

- La vidéo active utilise `muted`, `playsInline` et démarre automatiquement.
- Elle n’utilise pas `loop` : son événement de fin active la vidéo suivante.
- La transition entre deux médias est un fondu court.
- Seules la vidéo active et la suivante sont chargées ou préchargées.
- Des indicateurs accessibles permettent une navigation manuelle.
- Après une navigation manuelle, la lecture automatique continue depuis le média sélectionné.
- Une erreur de chargement ou de lecture passe au média suivant.
- Si aucune vidéo ne peut être lue, le hero actuel avec image produit est affiché.
- Avec `prefers-reduced-motion: reduce`, la lecture automatique et les transitions sont désactivées ; le fallback statique est affiché.

Le carrousel ne diffuse jamais de son automatiquement.

### Administration du hero

La navigation admin contient une entrée « Hero ». La page comprend :

- un titre et une aide concise ;
- un bouton d’import explicite ;
- une liste ordonnée de cartes vidéo ;
- une prévisualisation ;
- le titre éditable ;
- un état publié/masqué ;
- des actions monter, descendre et supprimer ;
- les états vide, import, sauvegarde, succès, erreur et fichier refusé.

Formats autorisés : MP4 et WebM, avec une taille maximale de 50 Mio par fichier. Le serveur vérifie la taille, le MIME déclaré et la signature du fichier. L’upload utilise Vercel Blob. La suppression d’un enregistrement retire immédiatement la vidéo de la boutique et demande également la suppression du Blob distant.

### Sélection des couleurs et pointures

L’éditeur de déclinaisons présente :

1. une palette de pictogrammes couleur multisélection ;
2. une grille de carreaux de pointures 35 à 46 multisélection ;
3. une matrice de stock couleur × pointure.

Chaque cellule de la matrice représente une `ProductVariant`. Elle permet de saisir un stock entier positif ou nul. Les combinaisons sont créées et retirées en fonction des sélections.

Les SKU sont générés automatiquement à partir du produit, de la couleur et de la pointure. Une section avancée permet de les modifier. Le SKU reste unique et validé côté serveur.

Désélectionner une couleur ou une pointure demande confirmation si une combinaison concernée possède un stock positif ou a déjà été enregistrée. Une déclinaison référencée par une commande n’est pas supprimée physiquement : elle est conservée avec un stock à zéro. Une déclinaison jamais commandée peut être supprimée.

### Galeries par couleur

La section Images vient après les déclinaisons. Elle affiche un onglet ou bloc pour chaque couleur sélectionnée.

- Import multiple dans la couleur active.
- Six images maximum par couleur.
- Aperçu de chaque image.
- Badge clair sur l’image principale.
- Actions iconiques accessibles pour monter, descendre et supprimer.
- Texte alternatif éditable.
- États vide, import en cours, erreur, succès et limite atteinte.
- L’ordre des groupes suit l’ordre des couleurs sélectionnées.

Une couleur contenant des images ne peut pas être désélectionnée silencieusement. Une confirmation explique que les images ne seront plus associées au produit.

## Flux de données

### Hero

1. L’administrateur sélectionne une vidéo.
2. Le client demande une autorisation d’upload authentifiée.
3. Le fichier est envoyé vers Vercel Blob avec progression.
4. Le serveur valide et enregistre `HeroVideo`.
5. La page catalogue est invalidée.
6. Le hero public récupère les vidéos visibles triées.

### Produit

1. L’administrateur sélectionne plusieurs couleurs et pointures.
2. Le client calcule le produit cartésien.
3. Les variantes existantes conservent identifiant, SKU et stock.
4. Les nouvelles variantes reçoivent un SKU proposé et un stock initial à zéro.
5. La matrice permet la saisie du stock par combinaison.
6. Les images sont importées dans le groupe de leur couleur.
7. La sauvegarde valide puis applique les créations, modifications et suppressions autorisées dans une transaction.

## Validation et erreurs

- Une position de hero doit être unique après normalisation de l’ordre.
- Une vidéo masquée n’apparaît jamais dans le catalogue.
- Une vidéo vide ou supérieure à 50 Mio est refusée avant son enregistrement.
- Une combinaison couleur-pointure ne peut apparaître qu’une fois par produit.
- Les stocks sont des entiers compris dans les limites déjà définies par la validation produit.
- Les SKU sont uniques.
- Une image doit correspondre à une couleur sélectionnée.
- Une couleur accepte zéro à six images.
- Un produit visible conserve au moins une image et une déclinaison.
- Les erreurs serveur apparaissent près du composant concerné et dans un résumé accessible lorsque nécessaire.
- Les opérations longues bloquent les doubles soumissions et affichent un état de progression.

## Accessibilité

- Toutes les commandes sont utilisables au clavier.
- Les couleurs possèdent un nom accessible ; l’information ne dépend jamais uniquement de la couleur visuelle.
- Les sélections utilisent des contrôles natifs ou exposent correctement `aria-pressed`/`aria-selected`.
- Les messages de succès et d’erreur utilisent des régions live adaptées.
- Les indicateurs du carrousel indiquent leur position et l’état actif.
- Les vidéos automatiques restent muettes.
- `prefers-reduced-motion` désactive lecture automatique et fondu.
- Les cibles tactiles mesurent au minimum 44 × 44 px.
- Les contrastes respectent WCAG 2.2 AA.

## Contenu et ton

Les libellés sont courts et directs :

- « Ajouter des vidéos »
- « Vidéo publiée »
- « Sélectionner les couleurs »
- « Sélectionner les pointures »
- « Stock par déclinaison »
- « 4 images sur 6 »

Les erreurs indiquent l’action à effectuer : « Cette couleur possède déjà des images. Supprimez-les ou confirmez leur retrait. »

## Anti-patterns interdits

- Ne pas charger toutes les vidéos simultanément.
- Ne pas utiliser une vidéo avec son automatique.
- Ne pas stocker les déclinaisons dans un JSON parallèle.
- Ne pas créer une variante sans validation serveur.
- Ne pas supprimer une variante utilisée dans une commande.
- Ne pas représenter une couleur sans libellé accessible.
- Ne pas masquer une opération d’import sans progression.
- Ne pas dépasser six images par couleur côté client ou serveur.

## Migration

Une migration Prisma ajoute uniquement `HeroVideo`. Les tables produit existantes ne changent pas de structure. La limite d’images devient une règle de validation par couleur ; les produits existants restent valides tant qu’aucune couleur ne dépasse six images.

## Tests et critères d’acceptation

- Import, validation de signature, publication, ordre et suppression d’une vidéo.
- Requête publique limitée aux vidéos visibles et triées.
- Passage automatique à la vidéo suivante.
- Navigation manuelle et reprise du flux.
- Fallback après erreur et sans vidéo.
- Mode mouvement réduit sans autoplay.
- Sélection multiple des couleurs et pointures.
- Génération correcte de la matrice.
- Conservation des données des variantes existantes.
- Protection des variantes référencées par une commande.
- Validation des SKU, doublons et stocks.
- Import et ordre de plusieurs images pour une couleur.
- Rejet de la septième image d’une couleur.
- Confirmation avant retrait destructif.
- Navigation clavier, focus, libellés accessibles et cibles de 44 px.
- Tests unitaires complets, lint et build de production réussis avant livraison.

## Checklist QA

- [ ] Le hero n’affiche que les vidéos publiées dans le bon ordre.
- [ ] Une seule vidéo joue à la fois et aucune ne produit de son.
- [ ] Le chargement réseau reste limité au média courant et au suivant.
- [ ] Le fallback produit fonctionne sans vidéo et après erreur.
- [ ] Le mode mouvement réduit reste statique.
- [ ] Les sélections couleur et pointure sont claires au clavier et au toucher.
- [ ] Chaque cellule de stock correspond à une variante unique.
- [ ] Les variantes commandées ne sont pas supprimées.
- [ ] Chaque groupe couleur accepte au maximum six images.
- [ ] Tous les états de chargement, succès, erreur, vide et limite sont visibles.
- [ ] La boutique française et arabe reste fonctionnelle.
- [ ] Les commandes existantes restent consultables.
