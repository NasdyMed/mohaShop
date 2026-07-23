type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  priceDh: number;
  color: string;
  image: string;
  secondColor?: string;
};

const products: SeedProduct[] = ([
  ["bottine-atlas-cognac", "Bottine Atlas", "Une bottine en cuir cognac aux lignes sobres, pensée pour le quotidien.", 1290, "Cognac", "photo-1608256246200-53e635b5b65f", "Noir"],
  ["chelsea-nocturne-noir", "Chelsea Nocturne", "Une Chelsea noire élégante, avec une silhouette nette et intemporelle.", 1450, "Noir", "photo-1638247025967-b4e38f787b76", "Marron"],
  ["bottine-sahara-sable", "Bottine Sahara", "Une teinte sable lumineuse et une semelle souple pour les journées actives.", 1190, "Sable", "photo-1605733160314-4fc7dac4bb16", "Beige"],
  ["bottine-rif-marron", "Bottine Rif", "Un modèle marron robuste inspiré des reliefs du Rif et conçu pour durer.", 1350, "Marron", "photo-1520639888713-7851133b1ed0"],
  ["bottine-medina-beige", "Bottine Médina", "Une bottine beige raffinée qui accompagne facilement les tenues de ville.", 1240, "Beige", "photo-1603808033192-082d6919d3e1"],
  ["bottine-toubkal-gris", "Bottine Toubkal", "Une construction solide et un gris minéral pour affronter la saison fraîche.", 1490, "Gris", "photo-1621996659490-3275b4d0d951"],
  ["bottine-dune-cognac", "Bottine Dune", "Un cuir cognac chaleureux associé à une forme légère et contemporaine.", 1320, "Cognac", "photo-1542840410-3092f99611a3"],
  ["chelsea-kasbah-noir", "Chelsea Kasbah", "Une Chelsea noire minimaliste avec élastiques latéraux et maintien confortable.", 1390, "Noir", "photo-1608629601270-a0007becead3"],
  ["bottine-cedre-marron", "Bottine Cèdre", "Une finition marron profonde et une semelle crantée adaptée au quotidien.", 1280, "Marron", "photo-1610398752800-146f269dfcc8"],
  ["bottine-ocean-bleu", "Bottine Océan", "Un bleu profond original sur une bottine urbaine aux détails discrets.", 1370, "Bleu", "photo-1542291026-7eec264c27ff"],
  ["bottine-aube-beige", "Bottine Aube", "Une nuance beige douce, une ligne élancée et un confort pensé pour la marche.", 1220, "Beige", "photo-1595341888016-a392ef81b7de"],
  ["bottine-argana-cognac", "Bottine Argana", "Une bottine cognac souple avec des finitions artisanales et chaleureuses.", 1420, "Cognac", "photo-1560769629-975ec94e6a86"],
  ["bottine-zellige-noir", "Bottine Zellige", "Un modèle noir graphique souligné par des coutures précises et modernes.", 1510, "Noir", "photo-1605812860427-4024433a70fd"],
  ["bottine-nomade-sable", "Bottine Nomade", "Une bottine sable polyvalente avec une semelle légère pour bouger librement.", 1260, "Sable", "photo-1549298916-b41d501d3772"],
  ["bottine-ourika-marron", "Bottine Ourika", "Un cuir marron texturé et une silhouette équilibrée pour une allure naturelle.", 1340, "Marron", "photo-1539185441755-769473a23570"],
  ["bottine-essaouira-beige", "Bottine Essaouira", "Une bottine beige décontractée inspirée par la lumière douce de la côte.", 1210, "Beige", "photo-1600185365483-26d7a4cc7519"],
  ["bottine-volubilis-noir", "Bottine Volubilis", "Une ligne noire classique relevée par une semelle affirmée et durable.", 1470, "Noir", "photo-1607522370275-f14206abe5d3"],
  ["bottine-akchour-gris", "Bottine Akchour", "Un gris polyvalent et une construction robuste pour les parcours urbains.", 1360, "Gris", "photo-1600185365926-3a2ce3cdb9eb"],
  ["bottine-majorelle-bleu", "Bottine Majorelle", "Une bottine bleu Majorelle audacieuse pour donner du caractère à la tenue.", 1540, "Bleu", "photo-1608231387042-66d1773070a5", "Noir"],
  ["bottine-agafay-cognac", "Bottine Agafay", "Un cognac patiné et une semelle confortable inspirés des paysages d'Agafay.", 1440, "Cognac", "photo-1491553895911-0055eca6402d"],
 ] as Array<[string, string, string, number, string, string, string?]>).map(
  ([slug, name, description, priceDh, color, image, secondColor]) => ({
  slug,
  name,
  description,
  priceDh,
  color,
  image,
  secondColor,
}));

export const seedProducts = products.map((product, productIndex) => {
  const colors = product.secondColor ? [product.color, product.secondColor] : [product.color];
  const sizes = product.secondColor ? ["39", "40", "41"] : ["38", "39", "40", "41", "42", "43"];

  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    priceDh: product.priceDh,
    imageId: `demo-image-${product.slug}`,
    image: `https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=900&q=80`,
    variants: colors.flatMap((color, colorIndex) =>
      sizes.map((size, sizeIndex) => ({
        sku: `${product.slug.toUpperCase()}-${color.toUpperCase()}-${size}`,
        size,
        color,
        stock: (productIndex + colorIndex + sizeIndex) % 4 === 0 ? 0 : 3 + ((productIndex + sizeIndex) % 8),
      })),
    ),
  };
});
