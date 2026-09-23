import catalog from '../data/parts.json';

export type PartCategory = 'hair' | 'faces' | 'shirts' | 'pants' | 'shoes' | 'accessories';

export interface PartDef {
  id: string;
  name: string;
  category: PartCategory;
  /** Path relative to public/assets/parts/. */
  file: string;
  /** Recolorable parts are light grayscale art that gets multiplied by the chosen color. */
  recolorable: boolean;
  defaultColor?: string;
}

export const CATEGORIES: { id: PartCategory; label: string }[] = [
  { id: 'hair', label: 'Hair' },
  { id: 'faces', label: 'Face' },
  { id: 'shirts', label: 'Shirt' },
  { id: 'pants', label: 'Pants' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'accessories', label: 'Extras' },
];

export const PARTS = catalog as PartDef[];

export function partsIn(category: PartCategory): PartDef[] {
  return PARTS.filter((p) => p.category === category);
}

export function partUrl(part: PartDef): string {
  return `${import.meta.env.BASE_URL}assets/parts/${part.file}`;
}
