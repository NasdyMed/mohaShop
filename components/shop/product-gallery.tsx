import Image from "next/image";

import type { CatalogImage } from "@/lib/catalog/queries";

export function ProductGallery({ images, productName }: { images: CatalogImage[]; productName: string }) {
  if (images.length === 0) {
    return <div className="gallery-fallback" role="img" aria-label={`Aperçu indisponible pour ${productName}`}>BB</div>;
  }

  return (
    <section className="product-gallery" aria-label="Galerie du produit">
      {images.map((image, index) => (
        <figure className={index === 0 ? "gallery-main" : "gallery-secondary"} key={image.id}>
          <Image src={image.url} alt={image.alt} fill priority={index === 0} sizes="(max-width: 900px) 100vw, 55vw" />
        </figure>
      ))}
    </section>
  );
}
