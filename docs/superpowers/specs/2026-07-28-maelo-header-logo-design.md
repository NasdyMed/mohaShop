# Logo Maelo dans les en-têtes

## Objectif

Remplacer le libellé visuel « Maison Botte » par le logo Maelo fourni dans
l’en-tête de la boutique et celui du panel administrateur.

## Solution

- Copier l’image source sans la redessiner dans `public/brand/maelo-logo.png`.
- Utiliser `next/image` avec les dimensions intrinsèques de l’image afin
  d’éviter tout décalage de mise en page.
- Conserver chaque logo dans le lien existant vers l’accueil de son espace.
- Afficher le logo avec une largeur responsive et `height: auto`.
- Fournir le texte alternatif `Maelo`.
- Conserver les métadonnées et textes SEO « Maison Botte » hors de ce changement.

## Présentation

- Le fond du logo reste celui de l’image fournie.
- Le logo doit tenir dans les hauteurs actuelles de 82 px sur ordinateur et
  68 px sur mobile.
- Le lien doit garder un état `focus-visible` clairement perceptible.
- Aucun étirement ni recadrage de l’image n’est autorisé.

## Validation

- Le logo est visible dans les deux en-têtes.
- Les deux liens conservent leurs destinations actuelles.
- L’image garde son ratio sur ordinateur et mobile.
- Le texte « Maison Botte » n’est plus rendu dans ces deux liens.
