# Promotions manuelles au niveau produit

## Contexte et objectifs

Permettre à l’administrateur d’afficher une promotion manuelle sur un produit
entier. Le prix de vente reste la source de vérité pour le panier et les
commandes ; l’ancien prix sert uniquement à présenter l’économie au client.

## Données et fondations

- Conserver `priceDh` comme prix final facturé.
- Ajouter `compareAtPriceDh Int?` au produit.
- Une promotion existe uniquement lorsque `compareAtPriceDh > priceDh`.
- Une valeur vide désactive la promotion.
- Les produits existants migrent avec `compareAtPriceDh = null`.
- Tous les montants restent des entiers en dirhams.

## Administration

- Renommer le champ actuel en « Prix de vente (DH) ».
- Ajouter « Prix avant promotion (DH) — facultatif ».
- Afficher le pourcentage calculé lorsque la promotion est valide.
- Rejeter un ancien prix inférieur ou égal au prix de vente.
- La sauvegarde et les états de chargement existants restent inchangés.

## Boutique

### Carte produit

- Afficher un badge `PROMO −N %` sur le visuel.
- Afficher le prix final en accent secondaire `#C55221`, avec une graisse forte.
- Afficher l’ancien prix à côté, plus petit, en couleur neutre et barré.
- Ne rendre ni badge ni emplacement vide sans promotion.

### Fiche produit

- Afficher le prix final, puis l’ancien prix barré.
- Ajouter « Économisez N DH » en français et son équivalent arabe.
- Conserver les états de disponibilité, couleurs et pointures actuels.

## Panier et commandes

- Le panier reçoit uniquement `priceDh`.
- Le serveur recalcule toujours les lignes depuis `priceDh` en base.
- `OrderItem.unitPriceDh` conserve le prix final au moment de la commande.
- Une modification ultérieure de la promotion ne modifie aucune commande passée.

## Accessibilité et contenu

- Le prix final doit rester lisible sans dépendre uniquement de la couleur.
- Le prix barré utilise l’élément sémantique `del`.
- Le badge conserve un contraste WCAG AA.
- Les libellés français et arabes doivent annoncer clairement l’économie.

## Validation et tests

- Migration nullable sans impact sur les produits existants.
- Validation des prix normaux, promotionnels et invalides.
- Sauvegarde et lecture de `compareAtPriceDh`.
- Affichage conditionnel sur carte et fiche produit.
- Vérification que panier et commandes utilisent toujours `priceDh`.
- Vérification des deux locales et des styles responsive.
