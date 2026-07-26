import type { Locale } from "./config";

export type StorefrontDictionary = {
  navigation: { collection: string; cart: string; order: string };
  home: { eyebrow: string; title: string; intro: string; allProducts: string; filters: string; empty: string };
  product: { addToCart: string; selectSize: string; selectColor: string; size: string; color: string; vatIncluded: string; gallery: string };
  cart: { title: string; empty: string; remove: string; quantity: string; summary: string; unitPrice: string; continueShopping: string; checkout: string; added: string; viewCart: string };
  checkout: { title: string; submit: string; payment: string; paymentNote: string; summary: string; total: string };
  confirmation: { eyebrow: string; title: string; number: string; status: string; back: string };
  stock: { available: string; outOfStock: string; lowStock: string };
  colors: Record<string, string>;
  common: { loading: string; close: string; products: string; product: string; currency: string };
};

const fr: StorefrontDictionary = {
  navigation: { collection: "Collection", cart: "Panier", order: "Commander" },
  home: { eyebrow: "Collection de bottes", title: "Des lignes justes. Une allure durable.", intro: "Découvrez notre sélection pensée pour le quotidien au Maroc.", allProducts: "Toute la collection", filters: "Filtrer", empty: "Aucun produit disponible." },
  product: { addToCart: "Ajouter au panier", selectSize: "Sélectionner la pointure", selectColor: "Sélectionner la couleur", size: "Pointure", color: "Couleur", vatIncluded: "TVA incluse", gallery: "Galerie produit" },
  cart: { title: "Votre panier", empty: "Votre panier est vide.", remove: "Retirer", quantity: "Quantité", summary: "Récapitulatif", unitPrice: "l’unité", continueShopping: "Retour à la collection", checkout: "Continuer vers la commande", added: "Ajouté au panier", viewCart: "Voir le panier" },
  checkout: { title: "Informations de livraison", submit: "Confirmer la commande", payment: "Paiement à la livraison", paymentNote: "Le règlement s’effectue à la réception.", summary: "Votre commande", total: "Total" },
  confirmation: { eyebrow: "Commande enregistrée", title: "Merci pour votre commande.", number: "Numéro de commande", status: "Statut", back: "Retour à la collection" },
  stock: { available: "En stock", outOfStock: "Épuisé", lowStock: "Stock limité" },
  colors: { Noir: "Noir", Beige: "Beige", Blanc: "Blanc", Marron: "Marron", Cognac: "Cognac", Gris: "Gris", Rouge: "Rouge", Bleu: "Bleu", Vert: "Vert" },
  common: { loading: "Chargement…", close: "Fermer", products: "articles", product: "article", currency: "DH" },
};

const ar: StorefrontDictionary = {
  navigation: { collection: "المجموعة", cart: "السلة", order: "إتمام الطلب" },
  home: { eyebrow: "مجموعة الأحذية", title: "أناقة يومية بخطوط خالدة.", intro: "اكتشف تشكيلتنا المختارة بعناية للحياة اليومية في المغرب.", allProducts: "كل المنتجات", filters: "تصفية", empty: "لا توجد منتجات متاحة." },
  product: { addToCart: "أضف إلى السلة", selectSize: "اختر المقاس", selectColor: "اختر اللون", size: "المقاس", color: "اللون", vatIncluded: "شامل الضريبة", gallery: "صور المنتج" },
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
