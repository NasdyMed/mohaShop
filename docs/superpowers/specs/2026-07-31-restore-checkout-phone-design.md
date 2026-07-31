# Rétablissement du téléphone de livraison

Le formulaire de commande demande obligatoirement un numéro de téléphone après le nom et le prénom. Le champ utilise le clavier téléphonique, accepte les mobiles marocains commençant par 06, 07 ou +212, affiche les erreurs dans la langue de la boutique et transmet la valeur au serveur.

Le schéma partagé normalise le numéro au format international `+212XXXXXXXXX`. La création de commande enregistre cette valeur dans `customerPhone`, ce qui la rend disponible dans les vues administrateur existantes. Les autres champs et le fonctionnement du panier ne changent pas.

Les tests couvrent le rendu FR/AR, la soumission, la validation, la normalisation et la persistance.
