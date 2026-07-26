"use client";

import Image from "next/image";
import { useState } from "react";

import type { CatalogImage } from "@/lib/catalog/queries";
import { useStorefrontI18n } from "./locale-provider";

export function selectProductImages(images: CatalogImage[], selectedColor: string | null) {
  if (!selectedColor) return images;
  const matching = images.filter((image) => image.color === selectedColor);
  const general = images.filter((image) => image.color === null);
  return matching.length || general.length ? [...matching, ...general] : images;
}

export function ProductGallery({ images, productName, selectedColor = null }: { images: CatalogImage[]; productName: string; selectedColor?: string | null }) {
  const { dictionary } = useStorefrontI18n();
  const visibleImages = selectProductImages(images, selectedColor);
  const [activeId, setActiveId] = useState<string | null>(() => visibleImages[0]?.id ?? null);
  const activeImage = visibleImages.find((image) => image.id === activeId) ?? visibleImages[0];

  if (visibleImages.length === 0) {
    return <div className="gallery-fallback" role="img" aria-label={`${dictionary.product.unavailablePreview} ${productName}`}>BB</div>;
  }

  return (
    <section className={`product-gallery${visibleImages.length > 1 ? " has-thumbnails" : ""}`} aria-label={dictionary.product.gallery}>
      {visibleImages.length > 1 && <div className="gallery-thumbnails" aria-label={dictionary.product.gallery}>
        {visibleImages.map((image) => <button type="button" className="gallery-thumbnail" aria-label={`Afficher ${image.alt}`} aria-pressed={image.id === activeImage?.id} onClick={() => setActiveId(image.id)} key={image.id}>
          <Image src={image.url} alt="" fill sizes="80px"/>
        </button>)}
      </div>}
      <figure className="gallery-stage">
        {activeImage && <Image key={activeImage.id} src={activeImage.url} alt={activeImage.alt} fill priority sizes="(max-width: 900px) 100vw, 55vw" />}
      </figure>
    </section>
  );
}
