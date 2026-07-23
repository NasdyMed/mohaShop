# Storefront Impeccable Redesign

## Context and goals

Faire évoluer l’accueil, les cartes catalogue et la fiche produit vers une expérience e-commerce éditoriale, chaude et immédiatement achetable, cohérente avec le panneau admin Impeccable.

## Foundations

- Conserver la base crème et encre de Maison Botte.
- Employer les tokens Impeccable ambre `#CC8800`, orange brûlé `#C55221`, succès `#16A34A`, danger `#DC2626`.
- Respecter l’échelle d’espacement 4/8/12/16/24/32 et des cibles tactiles de 44 px minimum.
- Préserver les quatre colonnes catalogue sur desktop, deux sur tablette et une sur mobile.

## Accueil

- Hero asymétrique : contenu éditorial à gauche, grande photo du premier produit possédant une image à droite.
- Appel à l’action vers `#collection`.
- Bandeau de réassurance : paiement à la livraison, livraison au Maroc, commande sans compte.
- En l’absence d’image, afficher une composition graphique sans casser la mise en page.

## Cartes catalogue

- Image dominante, numéro éditorial, nom, prix, disponibilité et action rapide clairement séparés.
- Conserver le choix rapide existant mais l’aligner visuellement sur les tokens Impeccable.
- Les couleurs sont des pastilles ; les états épuisés restent visibles, barrés et désactivés.

## Fiche produit

- Galerie à gauche et panneau d’achat sticky à droite.
- Afficher les couleurs uniquement sous forme de pastilles accessibles.
- Sélectionner automatiquement la première couleur qui possède du stock.
- Sélectionner automatiquement la première pointure disponible de cette couleur.
- Mettre à jour automatiquement la variante sélectionnée et rendre le bouton d’ajout disponible.
- Les couleurs ou pointures épuisées restent visibles mais désactivées.

## Accessibility and behavior

- Radios accessibles par leur nom de couleur ou leur pointure.
- Focus visible sur liens, boutons et options.
- Aucun bouton imbriqué dans un lien.
- Les sélections par défaut sont annoncées au composant d’achat dès le montage.
- Le changement de couleur choisit automatiquement la première pointure disponible pour cette couleur.

## QA checklist

- Hero lisible avec ou sans image.
- Quatre cartes par ligne à 1440 px, deux à 900 px, une à 640 px.
- Première variante disponible sélectionnée sans interaction.
- Pastilles couleur visibles sur catalogue et fiche produit.
- Ruptures désactivées et non ajoutables.
- Tests unitaires, lint et build réussis.
