# Administration des images par couleur

## Objectif

Rendre le formulaire produit cohérent : l’administrateur définit d’abord les déclinaisons, puis rattache chaque image à l’une des couleurs réellement proposées à la vente.

## Ordre du formulaire

1. Informations
2. Déclinaisons — tailles et couleurs
3. Images

Les indices visuels des sections suivent cet ordre : `01`, `02`, `03`.

## Sélecteur de couleur d’une image

- L’option textuelle « Toutes les couleurs » est supprimée.
- Chaque carte image affiche les huit pastilles de la palette produit, avec le même langage visuel que le sélecteur de couleur des déclinaisons.
- Une couleur possédant au moins une déclinaison est sélectionnable.
- Une couleur sans déclinaison reste visible, mais elle est désactivée et clairement atténuée.
- Une image importée reçoit automatiquement la première couleur disponible dans les déclinaisons.
- Une ancienne image dont la couleur est vide reçoit également la première couleur disponible à l’ouverture du formulaire.
- Si aucune déclinaison n’existe, toutes les pastilles d’image sont désactivées et l’interface demande d’ajouter d’abord une déclinaison.

## Données et validation

- `ProductImage.color` reste techniquement nullable pour permettre une migration progressive des données déjà enregistrées.
- Le formulaire admin ne soumet plus de nouvelle image avec une couleur vide.
- La validation refuse une image sans couleur pour un produit enregistré depuis le formulaire, ainsi qu’une couleur absente des déclinaisons du produit.
- La galerie publique conserve un repli compatible avec les anciennes données jusqu’à leur prochaine sauvegarde.

## États d’interface

- Disponible : pastille normale, sélectionnable au clavier et au pointeur.
- Sélectionnée : contour sombre et anneau ambre.
- Désactivée : opacité réduite, curseur interdit, contrôle non sélectionnable.
- Focus clavier : contour visible conforme WCAG 2.2 AA.
- Sans déclinaison : message concis « Ajoutez d’abord une déclinaison pour associer les images. »

## Tests

- Vérifier l’ordre Informations → Déclinaisons → Images.
- Vérifier que toute la palette est visible dans chaque carte image.
- Vérifier que seules les couleurs présentes dans les déclinaisons sont activées.
- Vérifier la couleur choisie automatiquement lors d’un import.
- Vérifier la migration en mémoire d’une ancienne image générale.
- Vérifier que la sauvegarde refuse une image sans couleur ou avec une couleur inconnue.

## Hors périmètre

- Suppression automatique des fichiers Blob distants.
- Plusieurs couleurs associées à une même image.
- Création de couleurs personnalisées hors de la palette existante.
