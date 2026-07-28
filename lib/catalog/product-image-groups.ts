export const MAX_IMAGES_PER_COLOR = 6;

export type EditableImage = {
  id?: string;
  url: string;
  alt: string;
  color: string | null;
  position: number;
};

export function normalizeImagePositions<T extends EditableImage>(images: readonly T[]): T[] {
  return images.map((image, position) => ({ ...image, position }));
}

export function groupImagesByColor<T extends EditableImage>(images: readonly T[], colors: readonly string[]) {
  return colors.map((color) => ({
    color,
    images: images
      .map((image, originalIndex) => ({ image, originalIndex }))
      .filter(({ image }) => image.color === color)
      .sort((a, b) => a.image.position - b.image.position || a.originalIndex - b.originalIndex)
      .map(({ image }) => image),
  }));
}

export function orderImagesByColor<T extends EditableImage>(images: readonly T[], colors: readonly string[]): T[] {
  const grouped = groupImagesByColor(images, colors).flatMap((group) => group.images);
  const known = new Set<string | null>(colors);
  return normalizeImagePositions([...grouped, ...images.filter((image) => !known.has(image.color))]);
}

export function moveImageWithinColor<T extends EditableImage>(
  images: readonly T[],
  colors: readonly string[],
  color: string,
  index: number,
  delta: number,
): T[] {
  const groups = groupImagesByColor(images, colors);
  const group = groups.find((item) => item.color === color);
  const target = index + delta;
  if (!group || index < 0 || index >= group.images.length || target < 0 || target >= group.images.length) return [...images];
  [group.images[index], group.images[target]] = [group.images[target], group.images[index]];
  const known = new Set<string | null>(colors);
  return normalizeImagePositions([
    ...groups.flatMap((item) => item.images),
    ...images.filter((image) => !known.has(image.color)),
  ]);
}
