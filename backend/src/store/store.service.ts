import { Injectable } from '@nestjs/common';

export interface StoredTier {
  id: string;
  label: string;
  color: string;
  position: number;
}

export interface StoredItem {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface StoredTierList {
  id: string;
  title: string;
  tiers: StoredTier[];
  items: StoredItem[];
}

export interface StoredSession {
  id: string;
  code: string;
  tierListId: string;
  tierList: StoredTierList;
  status: 'LOBBY' | 'LIVE' | 'FINISHED';
  streamerToken: string;
}

export interface StoredResult {
  itemId: string;
  streamerTierId: string;
  votesBreakdown: Record<string, number>;
  totalVotes: number;
}

@Injectable()
export class StoreService {
  readonly tierLists = new Map<string, StoredTierList>();
  readonly sessionsByCode = new Map<string, StoredSession>();
  readonly sessionsById = new Map<string, StoredSession>();
  readonly results = new Map<string, StoredResult[]>();
  readonly images = new Map<string, Buffer>();
}
