import { Injectable } from '@nestjs/common';
import { StoreService, StoredResult } from '../store/store.service';

@Injectable()
export class PersistenceService {
  constructor(private readonly store: StoreService) {}

  enqueue(sessionId: string, result: StoredResult) {
    const list = this.store.results.get(sessionId) ?? [];
    list.push(result);
    this.store.results.set(sessionId, list);
  }

  flush(): Promise<void> {
    return Promise.resolve();
  }
}
