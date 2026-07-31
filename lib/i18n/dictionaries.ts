import type { Locale } from "./config";

export type StorefrontDictionary = {
  navigation: { collection: string; cart: string; order: string };
  home: { eyebrow: string; title: string; intro: string; allProducts: string; filters: string; filtersSoon: string; empty: string; model: string; models: string };
  promises: { payment: string; paymentCopy: string; delivery: string; deliveryCopy: string; guest: string; guestCopy: string };
  product: { addToCart: string; orderNow: string; redirecting: string; selectVariant: string; selectSize: string; selectColor: string; size: string; color: string; category: string; vatIncluded: string; gallery: string; soldOut: string; unavailablePreview: string; savings: string };
  cart: { title: string; empty: string; remove: string; quantity: string; summary: string; unitPrice: string; continueShopping: string; checkout: string; added: string; viewCart: string };
  checkout: { title: string; submit: string; payment: string; paymentNote: string; summary: string; total: string };
  confirmation: { eyebrow: string; title: string; number: string; status: string; back: string };
  stock: { available: string; outOfStock: string; lowStock: string };
  colors: Record<string, string>;
  common: { loading: string; close: string; products: string; product: string; currency: string };
};

const fr: StorefrontDictionary = {
  navigation: { collection: "Collection", cart: "Panier", order: "Commander" },
  home: { eyebrow: "Collection permanente · 2026", title: "Des bottes de caractère, pensées pour durer.", intro: "Des lignes franches, des tons profonds et le confort d’une paire que l’on garde longtemps.", allProducts: "Nos modèles", filters: "Filtrer par", filtersSoon: "Filtres à venir", empty: "De nouvelles bottes arrivent bientôt.", model: "modèle", models: "modèles" },
  promises: { payment: "Paiement à la livraison", paymentCopy: "Réglez uniquement à la réception.", delivery: "Livraison partout au Maroc", deliveryCopy: "Votre paire arrive directement chez vous.", guest: "Commande sans compte", guestCopy: "Quelques informations suffisent." },
  product: { addToCart: "Ajouter au panier", orderNow: "Commander maintenant", redirecting: "Redirection…", selectVariant: "Sélectionnez une variante", selectSize: "Sélectionner la pointure", selectColor: "Sélectionner la couleur", size: "Pointure", color: "Couleur", category: "Botte", vatIncluded: "TVA incluse", gallery: "Galerie produit", soldOut: "Rupture de stock", unavailablePreview: "Aperçu indisponible pour", savings: "Économisez {amount}" },
  cart: { title: "Votre panier", empty: "Votre panier est vide.", remove: "Retirer", quantity: "Quantité", summary: "Récapitulatif", unitPrice: "l’unité", continueShopping: "Retour à la collection", checkout: "Continuer vers la commande", added: "Ajouté au panier", viewCart: "Voir le panier" },
  checkout: { title: "Informations de livraison", submit: "Confirmer la commande", payment: "Paiement à la livraison", paymentNote: "Le règlement s’effectue à la réception.", summary: "Votre commande", total: "Total" },
  confirmation: { eyebrow: "Commande enregistrée", title: "Merci pour votre commande.", number: "Numéro de commande", status: "Statut", back: "Retour à la collection" },
  stock: { available: "En stock", outOfStock: "Épuisé", lowStock: "Stock limité" },
  colors: { Noir: "Noir", Beige: "Beige", Blanc: "Blanc", Marron: "Marron", Cognac: "Cognac", Gris: "Gris", Rouge: "Rouge", Bleu: "Bleu", Vert: "Vert" },
  common: { loading: "Chargement…", close: "Fermer", products: "articles", product: "article", currency: "DH" },
};

const ar: StorefrontDictionary = {
  navigation: { collection: "المجموعة", cart: "السلة", order: "إتمام الطلب" },
  home: { eyebrow: "المجموعة الدائمة · 2026", title: "أحذية بطابع مميز، صممت لتدوم.", intro: "خطوط واضحة وألوان عميقة وراحة تدوم طويلاً.", allProducts: "موديلاتنا", filters: "تصفية حسب", filtersSoon: "الفلاتر قريباً", empty: "موديلات جديدة ستتوفر قريباً.", model: "موديل", models: "موديلات" },
  promises: { payment: "الدفع عند الاستلام", paymentCopy: "ادفع فقط عند استلام طلبك.", delivery: "التوصيل في جميع أنحاء المغرب", deliveryCopy: "يصلك طلبك مباشرة إلى منزلك.", guest: "الطلب بدون حساب", guestCopy: "بضع معلومات تكفي." },
  product: { addToCart: "أضف إلى السلة", orderNow: "اطلب الآن", redirecting: "جارٍ الانتقال…", selectVariant: "اختر اللون والمقاس", selectSize: "اختر المقاس", selectColor: "اختر اللون", size: "المقاس", color: "اللون", category: "حذاء", vatIncluded: "شامل الضريبة", gallery: "صور المنتج", soldOut: "نفد المخزون", unavailablePreview: "لا توجد صورة لـ", savings: "وفّر {amount}" },
  cart: { title: "سلة التسوق", empty: "سلة التسوق فارغة.", remove: "حذف", quantity: "الكمية", summary: "ملخص الطلب", unitPrice: "للوحدة", continueShopping: "العودة إلى المجموعة", checkout: "متابعة الطلب", added: "تمت الإضافة إلى السلة", viewCart: "عرض السلة" },
  checkout: { title: "معلومات التوصيل", submit: "تأكيد الطلب", payment: "الدفع عند الاستلام", paymentNote: "يتم الدفع عند استلام الطلب.", summary: "طلبك", total: "المجموع" },
  confirmation: { eyebrow: "تم تسجيل الطلب", title: "شكراً على طلبك.", number: "رقم الطلب", status: "الحالة", back: "العودة إلى المجموعة" },
  stock: { available: "متوفر", outOfStock: "نفد المخزون", lowStock: "كمية محدودة" },
  colors: { Noir: "أسود", Beige: "بيج", Blanc: "أبيض", Marron: "بني", Cognac: "كونياك", Gris: "رمادي", Rouge: "أحمر", Bleu: "أزرق", Vert: "أخضر" },
  common: { loading: "جارٍ التحميل…", close: "إغلاق", products: "منتجات", product: "منتج", currency: "DH" },
};

const dictionaries: Record<Locale, StorefrontDictionary> = { fr, ar };

export function getDictionary(locale: Locale): StorefrontDictionary {
  return dictionaries[locale];
}
