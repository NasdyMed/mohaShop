# Design — Catalogue compact, filtres et ajout rapide

## Objectif

Faire évoluer le catalogue vers une présentation plus dense avec quatre produits par ligne sur ordinateur, une colonne de filtres à gauche et un ajout rapide au panier par couleur et pointure. Enrichir les données de démonstration avec vingt produits variés et confirmer le bon fonctionnement de la pagination et du filtre de statut des commandes administrateur.

## Structure du catalogue

Sous le titre « Nos modèles », le contenu est organisé en deux colonnes :

- une colonne latérale de 220 px intitulée « Filtrer par », volontairement vide à cette étape, avec un texte « Filtres à venir » ;
- une zone principale contenant la grille de produits.

La grille affiche quatre cartes par ligne sur les écrans d’au moins 1100 px, deux cartes sur tablette et une carte sur petit mobile. Lorsque la largeur ne permet plus une colonne latérale utilisable, le bloc « Filtrer par » passe au-dessus du catalogue. Aucun filtre public fonctionnel n’est ajouté dans cette évolution.

## Carte produit compacte

La carte conserve l’image principale au ratio 4:5, mais réduit les espacements et la taille du titre pour permettre quatre colonnes. Le prix devient un élément visuel fort, en couleur cuir et en graisse élevée. La disponibilité utilise un badge vert pour « Disponible » et un badge rouge pour « Rupture de stock ».

L’image et le nom ouvrent la fiche produit. Le panneau d’ajout rapide reste séparé du lien afin de ne jamais imbriquer des boutons interactifs dans un lien.

## Ajout rapide couleur et pointure

Un composant client `QuickVariantSelector` est intégré à chaque carte.

1. La carte affiche d’abord un bouton « Choisir une taille ».
2. Le bouton ouvre un panneau dans la carte.
3. Toutes les couleurs connues sont présentées sous forme de pastilles accessibles. Le nom de la couleur active reste toujours affiché en texte.
4. Le choix d’une couleur met à jour la liste des pointures de cette couleur.
5. Toutes les pointures connues pour la couleur sont visibles. Une pointure sans stock est barrée, désactivée et non sélectionnable.
6. Après sélection d’une pointure disponible, le bouton « Ajouter au panier » ajoute une unité de la variante exacte au panier existant.
7. Une confirmation courte est annoncée visuellement et aux technologies d’assistance.

Les pastilles utilisent une table de couleurs françaises connues (`Noir`, `Cognac`, `Marron`, `Sable`, `Beige`, `Blanc`, `Gris`, `Bleu`). Une couleur inconnue utilise une pastille neutre ; son nom textuel et son libellé accessible restent la source de vérité afin de ne pas afficher une teinte trompeuse.

Le stock présenté dans le catalogue est indicatif. La création de commande continue de recalculer le prix et de vérifier le stock côté serveur.

## Données du catalogue

La requête du catalogue retourne les variantes nécessaires au panneau rapide : identifiant, couleur, pointure et stock. Les variantes restent triées de façon déterministe par couleur puis pointure.

Le seed contient vingt produits de démonstration reproductibles et idempotents. Les données sont variées — noms, prix, images, couleurs, pointures et stocks — mais ne sont pas générées aléatoirement à chaque exécution. Certains produits possèdent plusieurs couleurs et certaines pointures sont volontairement à stock zéro pour vérifier les états désactivés.

## Administration des commandes

La pagination serveur existante est conservée à vingt commandes par page. Le filtre de statut existant est conservé pour tous les états de commande. Cette évolution ajoute ou renforce les tests garantissant que :

- le statut est transmis à la requête serveur ;
- les liens « Précédent » et « Suivant » conservent le statut et la recherche ;
- une valeur de statut invalide est ignorée sans erreur ;
- une page demandée hors limites est ramenée dans l’intervalle valide.

La présentation des contrôles peut être ajustée pour rester lisible, mais aucune nouvelle logique de commande n’est introduite.

## Accessibilité

- Les couleurs ne sont jamais communiquées uniquement par leur teinte : leur nom est disponible en texte et via `aria-label`.
- Les choix couleur et pointure utilisent des contrôles natifs ou des boutons avec états sélectionnés explicites.
- Les pointures épuisées utilisent l’attribut `disabled` en plus du style barré.
- Le panneau rapide est utilisable au clavier, au toucher et sans survol.
- Les cibles interactives, y compris les pastilles et les pointures, respectent une taille minimale de 44×44 px.
- La confirmation d’ajout utilise une région `aria-live="polite"`.

## Erreurs et cas limites

- Un produit sans variante disponible affiche « Rupture de stock » et ne propose pas l’ajout rapide.
- Une couleur qui possède au moins une pointure disponible reste sélectionnable ; seules ses pointures sans stock sont barrées et désactivées.
- Une couleur dont toutes les pointures sont épuisées reste visible, mais sa pastille est barrée, atténuée, désactivée et non sélectionnable.
- Si toutes les couleurs sont épuisées, la carte affiche « Rupture de stock » et ne propose aucun bouton d’ajout rapide.
- Une image absente conserve le fallback existant.
- Si le panier n’est pas encore hydraté, l’ajout attend l’état prêt existant plutôt que de perdre la sélection.
- Une variante devenue indisponible après affichage sera rejetée lors de la commande par la validation serveur existante.

## Tests et critères d’acceptation

- La requête publique retourne toutes les variantes nécessaires, y compris celles à stock zéro.
- Le catalogue affiche quatre colonnes sur ordinateur, deux sur tablette et une sur petit mobile.
- La colonne « Filtrer par » est à gauche sur ordinateur et au-dessus sur mobile.
- Le prix et les badges de disponibilité possèdent les styles dédiés.
- Le choix de couleur filtre les pointures de la carte.
- Une couleur totalement épuisée est visible, barrée, désactivée et impossible à sélectionner.
- Les pointures à stock zéro sont visibles, barrées, désactivées et impossibles à ajouter.
- La variante couleur/pointure sélectionnée est ajoutée au panier avec une quantité de 1.
- Les interactions n’introduisent aucun bouton imbriqué dans un lien.
- Le seed crée ou met à jour exactement vingt produits de démonstration sans dupliquer les données lors d’une seconde exécution.
- Les tests de pagination et de filtre administrateur couvrent la conservation des paramètres.
- Les tests unitaires, le lint et le build passent ; les tests PostgreSQL sont exécutés uniquement avec une `TEST_DATABASE_URL` isolée contenant `test`.

## Hors périmètre

- Implémentation réelle des filtres publics.
- Pagination du catalogue public.
- Modification du schéma de base de données pour stocker un code couleur hexadécimal.
- Changement du processus de paiement à la livraison.
