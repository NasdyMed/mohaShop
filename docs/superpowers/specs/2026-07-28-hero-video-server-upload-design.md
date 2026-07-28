# Téléversement serveur des vidéos Hero

## Objectif

Permettre l’import des vidéos Hero avec la même authentification serveur que les
images produit, sans échange de jeton Blob côté navigateur.

## Architecture retenue

- Remplacer `@vercel/blob/client` et la route de génération de jeton par une
  Server Action authentifiée.
- Envoyer chaque fichier à cette action avec `FormData`.
- Valider le type MP4 ou WebM, une taille comprise entre 1 octet et 4 Mio, ainsi
  que la signature binaire du fichier avant l’appel à Vercel Blob.
- Enregistrer le fichier sous `hero/<uuid>.<extension>` avec un accès public.
- Créer la ligne `HeroVideo` seulement après la réussite du téléversement.
- Nettoyer le Blob si la création de la ligne échoue explicitement.

## Interface

- Conserver la sélection multiple et le traitement séquentiel.
- Remplacer la limite affichée de 50 Mio par 4 Mio.
- Conserver l’état de chargement et le nom du fichier en cours.
- Afficher une erreur exploitable sans révéler de secret fournisseur.
- La progression chiffrée disparaît, car une Server Action ne fournit pas de
  progression de transfert fiable.

## Erreurs et sécurité

- L’action exige une session administrateur avant de lire le fichier.
- Les noms originaux ne sont jamais utilisés comme chemins Blob.
- Les erreurs fournisseur sont journalisées côté serveur sans exposer de token
  dans l’interface.
- Un fichier invalide n’est jamais envoyé à Blob.

## Tests

- Acceptation d’un MP4 et d’un WebM valides inférieurs ou égaux à 4 Mio.
- Refus d’un type, d’une signature, d’un fichier vide ou d’une taille supérieure
  à 4 Mio.
- Vérification du chemin UUID et des options Blob.
- Vérification du flux de l’interface, des lots partiels et du nettoyage des
  fichiers orphelins.
