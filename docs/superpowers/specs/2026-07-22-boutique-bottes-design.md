# Conception du MVP de la boutique de bottes

## Objectif

Créer une boutique en ligne française destinée principalement au marché marocain. Le MVP expose une seule catégorie, les bottes, permet aux visiteurs de commander plusieurs articles sans compte et fournit à un administrateur les outils nécessaires pour gérer le catalogue, les stocks et les commandes.

Les prix sont affichés en dirhams marocains (DH) et le seul moyen de paiement est le paiement à la livraison.

## Périmètre fonctionnel

### Boutique publique

- Afficher les produits visibles sous forme de catalogue.
- Présenter une fiche par produit avec galerie d'images, description, prix et disponibilité.
- Permettre le choix d'une couleur, d'une pointure et d'une quantité.
- Ajouter plusieurs variantes, y compris de produits différents, dans un panier.
- Modifier les quantités ou retirer des lignes du panier.
- Afficher un récapitulatif et le montant total en DH.
- Passer une commande comme invité en saisissant obligatoirement le nom, le prénom, le téléphone et l'adresse.
- Afficher une confirmation et un numéro de commande après l'enregistrement.

### Administration

- Authentifier un administrateur unique par identifiant et mot de passe.
- Afficher toutes les commandes avec recherche et filtres par état.
- Consulter les coordonnées du client et le détail des articles d'une commande.
- Faire évoluer une commande entre les états Nouvelle, Confirmée, Expédiée, Livrée et Annulée.
- Créer et modifier les produits, leurs descriptions, prix, images et visibilité.
- Créer et modifier les variantes, pointures, couleurs, références et stocks.
- Masquer un produit sans supprimer les données nécessaires à l'historique.

## Hors périmètre du MVP

- Paiement en ligne.
- Comptes clients et historique client.
- Notifications par e-mail, SMS ou messagerie.
- Suivi public d'une commande.
- Autres catégories de produits.
- Gestion de plusieurs administrateurs ou de rôles distincts.

## Architecture

L'application utilise Next.js pour la boutique, le panneau d'administration et les opérations serveur. Elle est déployée sur Vercel. PostgreSQL, fourni par Neon ou un service compatible, conserve les données structurées. Un stockage d'objets compatible avec Vercel conserve les images du catalogue.

Les composants sont séparés par responsabilité :

- l'interface publique affiche le catalogue, les fiches produits, le panier et le tunnel de commande ;
- l'interface administrative gère les commandes et le catalogue ;
- la couche serveur authentifie l'administrateur, valide les entrées et applique les règles métier ;
- la couche d'accès aux données exécute les transactions et masque les détails PostgreSQL ;
- le service de stockage gère les téléversements et les URL d'images.

## Modèle de données

### Produit

Un produit possède un nom, une description, un prix courant en DH, une visibilité, une ou plusieurs images et des dates de création et de modification.

### Variante

Une variante appartient à un produit et définit une pointure, une couleur, une référence unique et une quantité disponible. La combinaison pertinente au sein d'un produit doit être unique.

### Commande

Une commande possède un numéro public non prévisible, le nom, le prénom, le téléphone et l'adresse du client, un montant total, un état et des dates de création et de modification. L'état initial est Nouvelle.

### Ligne de commande

Une ligne appartient à une commande. Elle conserve l'identifiant de la variante ainsi qu'un instantané du nom du produit, de la pointure, de la couleur, du prix unitaire et de la quantité au moment de la vente. Les modifications ultérieures du catalogue ne changent jamais l'historique.

### Administrateur

Le MVP contient un administrateur unique avec un identifiant unique et un mot de passe haché. Le mot de passe en clair n'est jamais stocké.

## Parcours de commande et règles métier

1. Le client sélectionne une variante en stock et l'ajoute au panier.
2. Le panier est conservé dans le navigateur pour survivre à un rafraîchissement.
3. Au passage de commande, le client saisit ses coordonnées et voit le récapitulatif.
4. Le serveur valide les coordonnées, recharge les variantes depuis PostgreSQL et recalcule tous les prix et le total.
5. Dans une transaction, le serveur verrouille ou met à jour conditionnellement les stocks, refuse toute quantité indisponible, crée la commande et ses lignes, puis décrémente les stocks.
6. Après validation de la transaction, l'application affiche le numéro de commande et vide le panier.

Le navigateur n'est jamais la source de vérité pour le prix, le total ou le stock. Une commande ne peut pas produire de stock négatif.

Lorsqu'une commande est annulée pour la première fois, ses quantités sont remises en stock dans la même transaction que le changement d'état. Les transitions répétées vers Annulée ne doivent pas restaurer le stock plusieurs fois. Une commande Livrée ne peut pas être annulée directement ; l'administrateur doit confirmer une action exceptionnelle hors du flux normal si ce besoin apparaît ultérieurement.

## Validation des coordonnées

Le nom, le prénom, le téléphone et l'adresse sont obligatoires. Les espaces superflus sont normalisés. Le téléphone accepte les formats marocains commençant par 06 ou 07, ainsi que leurs formes internationales en +212. Les messages d'erreur sont affichés en français à proximité des champs concernés.

## États de commande

Le flux normal est :

`Nouvelle → Confirmée → Expédiée → Livrée`

L'état Annulée est terminal. Une commande Nouvelle, Confirmée ou Expédiée peut être annulée. L'interface demande confirmation avant une annulation et indique explicitement que le stock sera restauré.

## Expérience utilisateur et identité visuelle

L'identité est élégante et chaleureuse, inspirée du cuir : tons crème, brun cuir et noir, grandes photographies et typographie éditoriale. L'interface reste épurée et donne la priorité aux produits et à l'action d'achat.

Les écrans publics sont l'accueil/catalogue, la fiche produit, le panier, le formulaire de commande et la confirmation. Les écrans administratifs sont la connexion, la liste des commandes, le détail d'une commande, la liste des produits et l'édition d'un produit avec ses variantes.

Tous les écrans sont conçus en priorité pour le mobile, puis adaptés aux tablettes et ordinateurs. Les formulaires restent utilisables au clavier et les éléments interactifs possèdent des libellés accessibles.

## Gestion des erreurs

- Une variante devenue indisponible est signalée dans le panier et bloque la validation jusqu'à correction.
- Une quantité supérieure au stock est ramenée à une valeur valide uniquement après accord explicite du client.
- Une erreur serveur générique ne révèle aucun détail interne et invite le client à réessayer.
- Une transaction échouée ne crée aucune commande partielle et ne modifie aucun stock.
- Un téléversement d'image invalide est refusé selon son type et sa taille ; un échec ne remplace pas l'image existante.
- Les actions administratives non autorisées renvoient vers la connexion ou produisent une réponse interdite selon le contexte.

## Sécurité

- Les sessions administratives utilisent des cookies sécurisés, HTTP-only et avec une politique SameSite adaptée.
- Les mots de passe sont hachés avec un algorithme moderne et un coût approprié.
- Chaque opération administrative vérifie la session côté serveur.
- Toutes les entrées sont validées côté serveur, même si une validation côté navigateur existe.
- Les secrets, URL de base, clés de session et identifiants du stockage restent dans les variables d'environnement.
- Les téléversements sont limités aux formats d'images autorisés et à une taille maximale définie.
- Les opérations sensibles, notamment la connexion et la création de commande, sont protégées contre les abus par une limitation de débit adaptée au déploiement.

## Tests et critères d'acceptation

Les tests automatisés couvrent :

- les calculs et les mutations du panier ;
- la validation du téléphone et des coordonnées ;
- le recalcul serveur des prix ;
- la création atomique d'une commande ;
- le refus d'une quantité indisponible et la prévention du stock négatif ;
- la restauration unique du stock lors d'une annulation ;
- les transitions autorisées entre états ;
- l'authentification et la protection des opérations administratives ;
- la création et la modification des produits et variantes.

Un test de parcours vérifie le scénario catalogue, sélection d'une variante, panier, saisie des coordonnées, commande et confirmation. Des tests ciblés vérifient les parcours principaux de l'administration. Une vérification responsive couvre au minimum un petit écran mobile et un écran d'ordinateur.

Le MVP est accepté lorsque le catalogue peut être administré, qu'un visiteur peut commander plusieurs variantes disponibles sans compte, que le stock reste cohérent et que l'administrateur peut consulter et faire évoluer toutes les commandes.

## Déploiement et exploitation

Le projet est déployé sur Vercel avec une base PostgreSQL Neon ou compatible située près de la région d'exécution. Les connexions à la base utilisent un mode adapté aux fonctions sans serveur. Les images sont stockées hors du système de fichiers éphémère de Vercel.

Le déploiement comprend les migrations de base de données, les variables d'environnement, la création sécurisée du premier administrateur et une vérification fonctionnelle après mise en ligne. Le plan Vercel Hobby peut servir aux essais personnels ; l'exploitation commerciale doit utiliser une offre conforme aux conditions de Vercel.

