import Image from "next/image";

import type { CatalogImage } from "@/lib/catalog/queries";

export function selectProductImages(images: CatalogImage[], selectedColor: string | null) {
  if (!selectedColor) return images;
  const matching = images.filter((image) => image.color === selectedColor);
  const general = images.filter((image) => image.color === null);
  return matching.length || general.length ? [...matching, ...general] : images;
}

export function ProductGallery({ images, productName, selectedColor = null }: { images: CatalogImage[]; productName: string; selectedColor?: string | null }) {
  const visibleImages = selectProductImages(images, selectedColor);
  if (visibleImages.length === 0) {
    return <div className="gallery-fallback" role="img" aria-label={`Aperçu indisponible pour ${productName}`}>BB</div>;
  }

  return (
    <section className="product-gallery" aria-label="Galerie du produit">
      {visibleImages.map((image, index) => (
        <figure className={index === 0 ? "gallery-main" : "gallery-secondary"} key={image.id}>
          <Image src={image.url} alt={image.alt} fill priority={index === 0} sizes="(max-width: 900px) 100vw, 55vw" />
        </figure>
      ))}
    </section>
  );
}
