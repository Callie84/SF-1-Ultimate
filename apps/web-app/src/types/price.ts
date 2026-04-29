export interface Strain {
  id: string;
  name: string;
  breeder?: string;
  type: 'SATIVA' | 'INDICA' | 'HYBRID' | 'RUDERALIS';
  seedType?: string;
  genetics?: string;
  thc?: { min: number; max: number };
  cbd?: { min: number; max: number };
  flowering?: { min: number; max: number };
  description?: string;
  effects?: string[];
  flavors?: string[];
  imageUrl?: string;
}

export interface Seedbank {
  id: string;
  name: string;
  slug: string;
  url: string;
  country?: string;
  rating?: number;
  verified: boolean;
  logoUrl?: string;
}

export interface Price {
  id: string;
  strainId: string;
  strain: Strain;
  seedbankId: string;
  seedbank: Seedbank;
  price: number;
  currency: string;
  quantity: number;
  inStock: boolean;
  url: string;
  lastChecked: string;
  createdAt: string;
  updatedAt: string;
}

export interface PriceAlert {
  id: string;
  userId: string;
  strainId: string;
  strain: Strain;
  targetPrice: number;
  isActive: boolean;
  createdAt: string;
}

export interface PriceComparison {
  strain: Strain;
  prices: Price[];
  lowestPrice?: Price;
  averagePrice: number;
  priceRange: { min: number; max: number };
}
