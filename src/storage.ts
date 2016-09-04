
class MockStorage extends Storage {
  getItem(key: string): string {
    return null;
  }

  setItem(key: string, value: string) {}
  removeItem(key: string): void {}
  clear(): void {}
}

export class Properties {
  private static _storage: Storage = Properties.hasLocalStorage() ? window.localStorage : new MockStorage();

  constructor() {
  }

  static hasLocalStorage(): boolean {
    return 'localStorage' in window && window['localStorage'] !== null;
  }

  static set(key: string, value: string | number): void {
    Properties._storage.setItem(key, value.toString());
  }

  static get(key: string): string {
    return Properties._storage.getItem(key);
  }

  static getNumber(key: string, defaultValue: number = -1): number {
    let s = Properties.get(key);
    if (!s) return defaultValue;

    let n = Number(s);
    return isNaN(n) ? defaultValue : n;
  }

  static remove(key: string): string {
    let v = Properties.get(key);
    Properties._storage.removeItem(key);
    return v;
  }
}
