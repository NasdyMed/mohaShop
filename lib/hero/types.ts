export type HeroVideoItem = {
  id: string;
  url: string;
  title: string;
  position: number;
};

export type AdminHeroVideoItem = HeroVideoItem & {
  isVisible: boolean;
  deletingAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Public storefront queries must always exclude rows pending remote deletion.
export const publicHeroVideoWhere = {
  isVisible: true,
  deletingAt: null,
} as const;
