import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class RequestContextService {
  private readonly als = new AsyncLocalStorage<Map<string, any>>();

  run(callback: () => any) {
    const store = new Map<string, any>();
    return this.als.run(store, callback);
  }

  set<T = any>(key: string, value: T) {
    const store = this.als.getStore();
    if (!store) return;
    store.set(key, value);
  }

  get<T = any>(key: string): T | undefined {
    const store = this.als.getStore();
    return store ? (store.get(key) as T) : undefined;
  }
}
