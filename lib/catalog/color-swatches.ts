const swatches: Record<string, string> = {
  noir: "#24211f",
  cognac: "#965d35",
  marron: "#694a34",
  sable: "#c5a178",
  beige: "#d8c4a8",
  blanc: "#f6f3ed",
  gris: "#817b75",
  bleu: "#315b7d",
};

export function colorSwatch(color: string) {
  const background = swatches[color.trim().toLocaleLowerCase("fr")];
  return background
    ? { background, known: true }
    : { background: "#b8afa6", known: false };
}
