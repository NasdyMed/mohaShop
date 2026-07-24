# Storefront Color Gallery Design

## Objectif

Rendre les couleurs et images produit interactives et cohérentes sur les cartes catalogue et les fiches produit.

## Carte catalogue

- Afficher en permanence toutes les couleurs définies dans les déclinaisons du produit.
- Une couleur avec au moins une pointure en stock est sélectionnable.
- Une couleur dont toutes les pointures sont épuisées est visible, grisée, barrée et désactivée.
- La première couleur disponible est sélectionnée par défaut.
- Choisir une couleur remplace immédiatement l’image principale par la première image associée à cette couleur.
- Si une couleur ne possède aucune image, utiliser une image générale, puis la première image du produit.
- L’image placée dans le panier correspond à la couleur choisie.
- Le panneau de pointures conserve son ouverture via « Choisir une taille ».

## Fiche produit

- Afficher toutes les couleurs définies pour le produit ; celles en rupture sont grisées, barrées et désactivées.
- La couleur et la pointure disponibles initiales restent sélectionnées automatiquement.
- La galerie affiche une grande image principale.
- Les autres images de la couleur sélectionnée apparaissent dans une colonne de miniatures à gauche.
- Cliquer une miniature change la grande image sans navigation.
- Un changement de couleur réinitialise la grande image sur le premier visuel correspondant.
- Sur mobile, les miniatures deviennent une rangée horizontale sous ou au-dessus de l’image principale.

## Accessibilité

- Chaque pastille annonce son nom et son état de rupture.
- Chaque miniature est un bouton avec un nom accessible et un état sélectionné.
- Le focus clavier reste fortement visible.
- Les cibles tactiles mesurent au moins 44 × 44 px.

## Replis

- Les images historiques avec `color: null` sont considérées comme générales.
- Sans image correspondante, la galerie utilise les visuels généraux puis toutes les images.
- Sans image du tout, le monogramme de secours existant reste affiché.

## Tests

- Couleurs disponibles et épuisées sur la carte et la fiche.
- Changement d’image de carte après sélection d’une couleur.
- Image correcte transmise au panier.
- Filtrage des images de galerie par couleur.
- Changement de grande image par miniature.
- Réinitialisation lors du changement de couleur.
