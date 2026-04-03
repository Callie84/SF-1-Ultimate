export interface Grow {
  id: string;
  userId: string;
  title: string;
  description?: string;
  strain: {
    name: string;
    breeder?: string;
    type?: 'SATIVA' | 'INDICA' | 'HYBRID' | 'RUDERALIS';
  };
  growType: 'INDOOR' | 'OUTDOOR' | 'GREENHOUSE';
  medium: 'SOIL' | 'COCO' | 'HYDRO' | 'AERO' | 'OTHER';
  status: 'PLANNING' | 'GERMINATION' | 'SEEDLING' | 'VEGETATIVE' | 'FLOWERING' | 'DRYING' | 'CURING' | 'HARVESTED' | 'ABANDONED';
  isPublic: boolean;
  startDate?: string;
  harvestDate?: string;
  stats: {
    totalEntries: number;
    totalPhotos: number;
    totalComments: number;
    totalReactions: number;
    followers: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Entry {
  id: string;
  growId: string;
  userId: string;
  title: string;
  content: string;
  day: number;
  week: number;
  stage: string;
  measurements?: {
    height?: number;
    ph?: number;
    ec?: number;
    temperature?: number;
    humidity?: number;
  };
  photos: string[];
  tags: string[];
  stats: {
    comments: number;
    reactions: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GrowComment {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowReaction {
  type: 'LIKE' | 'LOVE' | 'FIRE' | 'CURIOUS';
  count: number;
  hasReacted: boolean;
}

// API-Typen: was das Backend tatsächlich zurückgibt (Mongoose-Dokumente)
export interface ApiGrow {
  _id: string;
  id?: string;
  userId: string;
  strainName: string;
  breeder?: string;
  type?: string;
  environment: 'indoor' | 'outdoor' | 'greenhouse';
  medium?: string;
  status: string;
  description?: string;
  isPublic: boolean;
  startDate?: string;
  harvestDate?: string;
  yieldWet?: number;
  yieldDry?: number;
  quality?: number;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  motherGrowId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiEntry {
  _id: string;
  id?: string;
  growId: string;
  userId: string;
  title?: string;
  notes?: string;
  content?: string;
  day?: number;
  week: number;
  stage?: string;
  growStage?: string;
  height?: number;
  ph?: number;
  ec?: number;
  ppm?: number;
  temperature?: number;
  humidity?: number;
  watered?: boolean;
  fed?: boolean;
  defoliated?: boolean;
  trained?: boolean;
  photos?: Array<{ _id?: string; url?: string; thumbnailUrl?: string } | string>;
  stats?: { reactions?: number; comments?: number };
  reactionCount?: number;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntryData {
  week?: number;
  day?: number;
  title?: string;
  notes?: string;
  height?: number;
  ph?: number;
  ec?: number;
  ppm?: number;
  temperature?: number;
  humidity?: number;
  watered?: boolean;
  fed?: boolean;
  defoliated?: boolean;
  trained?: boolean;
}

export interface ThreadFilters {
  sort?: 'latest' | 'popular' | 'unanswered';
  limit?: number;
  skip?: number;
  tag?: string;
}
