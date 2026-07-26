# Design i18n français/arabe de la boutique

## Objectif

Rendre la boutique accessible en français et en arabe pour le marché marocain, tout en conservant le panel administrateur en français. L’interface arabe doit être réellement adaptée au sens de lecture RTL, et pas seulement traduire les chaînes.

## Périmètre

- Boutique client en français et en arabe.
- Français comme langue par défaut, sans préfixe d’URL.
- Arabe sous le préfixe `/ar`.
- Panel administrateur uniquement en français.
- Nom et description de chaque produit traduisibles en arabe depuis l’administration.
- Chiffres occidentaux `0–9`, pointures inchangées et prix en `DH` dans les deux langues.

## Architecture

L’application utilisera les fonctionnalités App Router de Next.js et des dictionnaires locaux typés, sans dépendance i18n supplémentaire. Les textes fixes seront centralisés dans des dictionnaires français et arabe partageant le même contrat TypeScript.

Les URLs françaises existantes restent inchangées :

- `/`
- `/produits/[slug]`
- `/panier`
- `/commander`
- `/commande/[number]`

Leurs équivalents arabes utilisent `/ar` :

- `/ar`
- `/ar/produits/[slug]`
- `/ar/panier`
- `/ar/commander`
- `/ar/commande/[number]`

Les routes `/admin` et `/api` ne sont jamais localisées.

Une couche de navigation localisée construit les liens internes et permet au sélecteur de langue de conserver la page équivalente. Le choix est mémorisé dans un cookie fonctionnel. La première visite reste en français : aucune redirection automatique fondée sur `Accept-Language` n’est prévue.

## Données produit

Le modèle Prisma `Product` reçoit deux colonnes facultatives :

- `nameAr`
- `descriptionAr`

La migration est additive et ne modifie pas les produits existants. Dans la boutique arabe, une valeur arabe absente ou vide utilise la valeur française correspondante.

Les valeurs métier partagées, notamment les couleurs, restent enregistrées sous leur forme canonique actuelle. Leur traduction est appliquée uniquement à l’affichage. Les données saisies par le client, comme le nom, l’adresse et la ville, ne sont jamais traduites.

## Interface administrateur

Le formulaire produit reste en français et ajoute :

- `Nom en arabe`
- `Description en arabe`

Ces champs sont facultatifs. Une aide indique clairement que le contenu français sera utilisé dans la boutique arabe lorsqu’une traduction manque. La validation accepte l’écriture arabe et applique des limites de longueur cohérentes avec les champs français.

## Direction et présentation

Les pages françaises utilisent `lang="fr"` et `dir="ltr"`. Les pages arabes utilisent `lang="ar"` et `dir="rtl"`.

Le RTL s’applique à la navigation, aux textes, aux formulaires, au panier, à la confirmation et à la fiche produit. Les composants qui ne doivent pas être inversés sémantiquement — images produit, montants, pointures et numéros de commande — conservent une présentation naturelle.

Le sélecteur de langue utilise :

- le drapeau français pour `Français`;
- le drapeau marocain pour `العربية`.

Les libellés textuels restent disponibles pour les lecteurs d’écran et les infobulles. La langue active est visuellement identifiable.

## Traductions

Les dictionnaires couvrent au minimum :

- header, navigation et footer;
- catalogue, disponibilité, couleurs et pointures;
- fiche produit et ajout au panier;
- panier et récapitulatif;
- formulaire de livraison et validation;
- confirmation et statuts de commande visibles par le client;
- messages d’erreur, états de chargement et notifications.

La structure typée empêche l’ajout d’une clé dans une seule langue. Une traduction fixe manquante doit être détectée par TypeScript ou les tests avant la production.

## Flux

1. La route détermine la locale active.
2. Le layout configure `lang`, `dir` et le dictionnaire.
3. Les composants reçoivent les textes localisés et génèrent des liens dans la même locale.
4. Les requêtes catalogue sélectionnent le contenu produit correspondant, avec fallback français.
5. Le sélecteur calcule la route équivalente et enregistre le choix dans le cookie.
6. Les Server Actions conservent leur logique métier indépendante de la langue; l’interface traduit les messages destinés au client.

## SEO

Chaque page publique expose :

- un titre et une description dans la langue active;
- une URL canonique;
- les alternatives `hreflang` françaises et arabes;
- une valeur `lang` correcte dans le document.

Les slugs restent communs aux deux langues pour ce MVP. L’ajout de slugs arabes est explicitement hors périmètre.

## Erreurs et fallbacks

- Une locale inconnue retourne une page introuvable.
- Une traduction produit arabe absente utilise le français.
- Une clé fixe absente échoue lors des contrôles de développement.
- Une préférence de langue invalide dans le cookie est ignorée et retombe sur le français.
- Les erreurs métier conservent un code stable et sont converties en texte localisé par l’interface.

## Tests et validation

Les contrôles couvriront :

- la parité des dictionnaires;
- `lang` et `dir` sur les deux variantes;
- la génération des liens localisés;
- le changement de langue et le cookie;
- la conservation de la locale entre catalogue, produit, panier et commande;
- le fallback français des produits non traduits;
- la sélection des champs arabes lorsqu’ils existent;
- la validation du formulaire admin;
- les métadonnées et alternatives de langue.

Avant livraison : migration Prisma validée, tests unitaires, lint et build Next.js. Une vérification visuelle desktop/mobile contrôlera spécialement le header, les cartes produit, la fiche produit, le panier et le formulaire en RTL.

## Hors périmètre

- Traduction du panel administrateur.
- Darija distincte de l’arabe standard.
- Slugs arabes.
- Traduction automatique ou service externe.
- Redirection automatique selon la langue du navigateur.
- Autres langues.
