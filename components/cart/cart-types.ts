export type CartItemInput = {
  variantId: string;
  productSlug: string;
  productName: string;
  imageUrl: string | null;
  size: string;
  color: string;
  unitPriceDh: number;
  availableStock: number;
};

export type CartItem = CartItemInput & {
  quantity: number;
};

export type CartAction =
  | { type: "hydrate"; items: CartItem[] }
  | { type: "add"; item: CartItemInput; quantity: number }
  | { type: "setQuantity"; variantId: string; quantity: number }
  | { type: "remove"; variantId: string }
  | { type: "clear" };
