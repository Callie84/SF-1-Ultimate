export interface Thread {
  id: string;
  categoryId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    level?: number;
  };
  title: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  tags: string[];
  stats: {
    views: number;
    replies: number;
    votes: number;
    score: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Reply {
  id: string;
  threadId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    level?: number;
  };
  parentReplyId?: string;
  content: string;
  isAccepted: boolean;
  stats: {
    votes: number;
    score: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  color?: string;
  order: number;
  stats: {
    threads: number;
    replies: number;
  };
}

export interface Vote {
  type: 'UPVOTE' | 'DOWNVOTE';
  hasVoted: boolean;
}

// API-Typen: was das Backend tatsächlich zurückgibt (Mongoose-Dokumente)
export interface ApiThread {
  _id: string;
  id?: string;
  categoryId?: string;
  category?: { _id: string; name: string; slug: string };
  userId: string;
  user?: { id?: string; _id?: string; username: string; avatar?: string };
  title: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  tags: string[];
  upvoteCount: number;
  downvoteCount: number;
  replyCount: number;
  viewCount: number;
  isEdited?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiReply {
  _id: string;
  id?: string;
  threadId: string;
  userId: string;
  user?: { id?: string; _id?: string; username: string; avatar?: string };
  parentId?: string;
  content: string;
  isBestAnswer?: boolean;
  isEdited?: boolean;
  upvoteCount: number;
  downvoteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadListResponse {
  threads: ApiThread[];
  total: number;
}

export interface ThreadDetailResponse {
  thread: ApiThread;
}

export interface ReplyListResponse {
  replies: ApiReply[];
  total: number;
}
