// In-memory Redis client implementation - server-side only
type RedisValue = string | number | boolean | object | any[] | Set<any>;

class InMemoryRedis {
  private store: Map<string, RedisValue> = new Map();
  private listeners: Map<string, Set<(message: string) => void>> = new Map();

  // List operations
  async lpush(key: string, value: any): Promise<number> {
    if (!this.store.has(key)) {
      this.store.set(key, []);
    }
    const list = this.store.get(key);
    if (Array.isArray(list)) {
      list.unshift(value);
      return list.length;
    }
    // If key exists but is not an array, convert it
    this.store.set(key, [value]);
    return 1;
  }

  async setex(key: string, seconds: number, value: any): Promise<string> {
    this.store.set(key, value);

    // Hapus otomatis setelah 'seconds' detik
    setTimeout(() => {
      this.store.delete(key);
    }, seconds * 1000);

    return 'OK';
  }

  async keys(pattern: string): Promise<string[]> {
    const allKeys = Array.from(this.store.keys());

    // Jika pattern adalah '*', return semua key
    if (pattern === '*') {
      return allKeys;
    }

    // Ubah wildcard Redis (*) jadi regex
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');

    // Filter key sesuai pattern
    return allKeys.filter((key) => regex.test(key));
  }

  

  async lrange(key: string, start: number, end: number): Promise<any[]> {
    const value = this.store.get(key);
    if (!Array.isArray(value)) {
      return [];
    }
    
    // Handle negative indices
    const actualStart = start < 0 ? Math.max(0, value.length + start) : start;
    const actualEnd = end < 0 ? Math.max(0, value.length + end) : end;
    
    // If end is greater than list length, use list length
    const finalEnd = actualEnd >= value.length ? value.length - 1 : actualEnd;
    
    if (actualStart > finalEnd || actualStart >= value.length) {
      return [];
    }
    
    return value.slice(actualStart, finalEnd + 1);
  }

  async ltrim(key: string, start: number, end: number): Promise<string> {
    const value = this.store.get(key);
    if (!Array.isArray(value)) {
      return 'OK';
    }
    
    // Handle negative indices
    const actualStart = start < 0 ? Math.max(0, value.length + start) : start;
    const actualEnd = end < 0 ? Math.max(0, value.length + end) : end;
    
    // If end is greater than list length, use list length
    const finalEnd = actualEnd >= value.length ? value.length - 1 : actualEnd;
    
    if (actualStart > finalEnd || actualStart >= value.length) {
      this.store.set(key, []);
    } else {
      const trimmedList = value.slice(actualStart, finalEnd + 1);
      this.store.set(key, trimmedList);
    }
    
    return 'OK';
  }

  // Hash operations
  async hset(key: string, field: string, value: any): Promise<number> {
    if (!this.store.has(key)) {
      this.store.set(key, {});
    }
    const hash = this.store.get(key);
    if (hash && typeof hash === 'object' && !Array.isArray(hash)) {
      (hash as any)[field] = value;
      this.store.set(key, hash);
      return 1; // Always return 1 for simplicity
    }
    // If key exists but is not an object, convert it
    const newHash = { [field]: value };
    this.store.set(key, newHash);
    return 1;
  }

  async hget(key: string, field: string): Promise<any> {
    const hash = this.store.get(key);
    if (hash && typeof hash === 'object' && !Array.isArray(hash)) {
      return (hash as any)[field];
    }
    return null;
  }

  // Set operations
  async sadd(key: string, member: any): Promise<number> {
    if (!this.store.has(key)) {
      this.store.set(key, new Set());
    }
    const set = this.store.get(key);
    if (set instanceof Set) {
      const sizeBefore = set.size;
      set.add(member);
      return set.size - sizeBefore;
    }
    // If key exists but is not a set, convert it
    const newSet = new Set([member]);
    this.store.set(key, newSet);
    return 1;
  }

  async smembers(key: string): Promise<any[]> {
    const set = this.store.get(key);
    if (set instanceof Set) {
      return Array.from(set);
    }
    return [];
  }

  // String operations
  async set(key: string, value: any): Promise<string> {
    this.store.set(key, value);
    return 'OK';
  }

  async get(key: string): Promise<any> {
    return this.store.get(key);
  }

   async del(...keys: string[]): Promise<number> {
    let deletedCount = 0;

    for (const key of keys) {
      if (this.store.has(key)) {
        this.store.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Publish/Subscribe operations
  async publish(channel: string, message: string): Promise<number> {
    const listeners = this.listeners.get(channel);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('Error publishing to listener:', error);
        }
      });
      return listeners.size;
    }
    return 0;
  }

  async subscribe(channel: string, listener: (message: string) => void): Promise<void> {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    const listeners = this.listeners.get(channel)!;
    listeners.add(listener);
  }

  async unsubscribe(channel: string, listener: (message: string) => void): Promise<void> {
    const listeners = this.listeners.get(channel);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(channel);
      }
    }
  }

  // Pipeline operations (simplified)
  pipeline() {
    return {
      hset: (key: string, field: string, value: any) => {
        this.hset(key, field, value).catch(console.error);
        return this;
      },
      hget: (key: string, field: string) => {
        return this.hget(key, field);
      },
      exec: async () => {
        // For simplicity, just return an empty array
        return [];
      }
    };
  }

  // Quit operation (no-op for in-memory)
  async quit(): Promise<void> {
    // No-op for in-memory implementation
  }

  // Connect operation (no-op for in-memory)
  async connect(): Promise<void> {
    // No-op for in-memory implementation
  }
}

// Create singleton instance
const redis = new InMemoryRedis();

// Export functions for backward compatibility
export async function initializeRedis() {
  // Only initialize on server-side
  if (typeof window !== 'undefined') {
    return null;
  }
  
  try {
    // For in-memory implementation, initialization is just confirming the instance is available
    await redis.connect();
    console.log('In-memory Redis client initialized successfully');
    return redis;
  } catch (error) {
    console.error('Error creating in-memory Redis client:', error);
    return null;
  }
}

// Function to get Redis client (initialize if needed)
export async function getRedis() {
  // Only available on server-side
  if (typeof window !== 'undefined') {
    return null;
  }
  
  return redis;
}



// Export default for backward compatibility
export default redis;