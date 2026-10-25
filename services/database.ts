import { Monument, User, Contribution, POI, Badge, SafetyReport } from '../types';
import { MONUMENTS, POIS, BADGES } from '../constants';
import { INITIAL_SAFETY_REPORTS } from './safetyScoring';

// DB Config
const DB_NAME = 'SafePathDB';
const DB_VERSION = 4;
const STORES = {
  USERS: 'users',
  MONUMENTS: 'monuments',
  POIS: 'pois',
  CONTRIBUTIONS: 'contributions',
  BADGES: 'badges',
  SAFETY_REPORTS: 'safety_reports',
};

class DatabaseService {
  private db: IDBDatabase | null = null;

  // Initialize the Database
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("Database error: ", event);
        reject("Database failed to open");
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.seedData();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        
        // User Store
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          db.createObjectStore(STORES.USERS, { keyPath: 'email' });
        }

        // Monuments Store
        if (!db.objectStoreNames.contains(STORES.MONUMENTS)) {
          db.createObjectStore(STORES.MONUMENTS, { keyPath: 'id' });
        }

        // POIs Store
        if (!db.objectStoreNames.contains(STORES.POIS)) {
          db.createObjectStore(STORES.POIS, { keyPath: 'id' });
        }
        
        // Badges Store
        if (!db.objectStoreNames.contains(STORES.BADGES)) {
          db.createObjectStore(STORES.BADGES, { keyPath: 'id' });
        }

        // Contributions Store
        if (!db.objectStoreNames.contains(STORES.CONTRIBUTIONS)) {
          const contribStore = db.createObjectStore(STORES.CONTRIBUTIONS, { keyPath: 'id', autoIncrement: true });
          contribStore.createIndex('monumentId', 'monumentId', { unique: false });
          contribStore.createIndex('synced', 'synced', { unique: false });
        }

        // Safety Reports Store (recHERSion 26 Women's Safety)
        if (!db.objectStoreNames.contains(STORES.SAFETY_REPORTS)) {
          const reportStore = db.createObjectStore(STORES.SAFETY_REPORTS, { keyPath: 'id' });
          reportStore.createIndex('category', 'category', { unique: false });
          reportStore.createIndex('status', 'status', { unique: false });
          reportStore.createIndex('synced', 'synced', { unique: false });
          reportStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Seed initial data
  private async seedData() {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(
        [STORES.MONUMENTS, STORES.POIS, STORES.SAFETY_REPORTS], 
        'readwrite'
      );
      
      const monumentStore = transaction.objectStore(STORES.MONUMENTS);
      MONUMENTS.forEach(m => monumentStore.put(m));

      const poiStore = transaction.objectStore(STORES.POIS);
      POIS.forEach(p => poiStore.put(p));

      // Check if safety reports are seeded
      const reportStore = transaction.objectStore(STORES.SAFETY_REPORTS);
      const countReq = reportStore.count();
      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          INITIAL_SAFETY_REPORTS.forEach(r => reportStore.put(r));
          console.log("[SafePathDB] Seeded initial safety reports for demonstration corridors.");
        }
      };
    } catch (e) {
      console.warn("[SafePathDB] Seed error (non-fatal):", e);
    }
  }

  // --- USER METHODS ---
  async saveUser(user: User): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction([STORES.USERS], 'readwrite');
      const store = transaction?.objectStore(STORES.USERS);
      const request = store?.put(user);
      
      if (request) {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } else {
        resolve();
      }
    });
  }

  async getUser(email: string): Promise<User | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction([STORES.USERS], 'readonly');
      const store = transaction?.objectStore(STORES.USERS);
      const request = store?.get(email);
      
      if (request) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        resolve(undefined);
      }
    });
  }

  // --- SAFETY REPORTS METHODS ---
  async getAllSafetyReports(): Promise<SafetyReport[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(INITIAL_SAFETY_REPORTS);
        return;
      }
      try {
        const transaction = this.db.transaction([STORES.SAFETY_REPORTS], 'readonly');
        const store = transaction.objectStore(STORES.SAFETY_REPORTS);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const results = request.result || [];
          if (results.length === 0) {
            resolve(INITIAL_SAFETY_REPORTS);
          } else {
            resolve(results);
          }
        };
        request.onerror = () => resolve(INITIAL_SAFETY_REPORTS);
      } catch (err) {
        resolve(INITIAL_SAFETY_REPORTS);
      }
    });
  }

  async addSafetyReport(report: SafetyReport): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) { resolve(); return; }
      try {
        const transaction = this.db.transaction([STORES.SAFETY_REPORTS], 'readwrite');
        const store = transaction.objectStore(STORES.SAFETY_REPORTS);
        const request = store.put(report);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        resolve();
      }
    });
  }

  async updateSafetyReport(report: SafetyReport): Promise<void> {
    return this.addSafetyReport(report);
  }

  async getUnsyncedSafetyReports(): Promise<SafetyReport[]> {
    return new Promise((resolve) => {
      if (!this.db) { resolve([]); return; }
      try {
        const transaction = this.db.transaction([STORES.SAFETY_REPORTS], 'readonly');
        const store = transaction.objectStore(STORES.SAFETY_REPORTS);
        const index = store.index('synced');
        const request = index.getAll(0);
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      } catch (err) {
        resolve([]);
      }
    });
  }

  async markSafetyReportSynced(id: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) { resolve(); return; }
      try {
        const transaction = this.db.transaction([STORES.SAFETY_REPORTS], 'readwrite');
        const store = transaction.objectStore(STORES.SAFETY_REPORTS);
        const getReq = store.get(id);
        
        getReq.onsuccess = () => {
          const record = getReq.result;
          if (record) {
            record.synced = 1;
            store.put(record);
          }
          resolve();
        };
        getReq.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  }

  async resetSafetyReports(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) { resolve(); return; }
      try {
        const transaction = this.db.transaction([STORES.SAFETY_REPORTS], 'readwrite');
        const store = transaction.objectStore(STORES.SAFETY_REPORTS);
        store.clear();
        INITIAL_SAFETY_REPORTS.forEach(r => store.put(r));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  }

  // --- MONUMENT & POI METHODS (PRESERVED) ---
  async getAllMonuments(): Promise<Monument[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) { resolve([]); return; }
      const transaction = this.db.transaction([STORES.MONUMENTS], 'readonly');
      const store = transaction.objectStore(STORES.MONUMENTS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPOIs(): Promise<POI[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) { resolve([]); return; }
      const transaction = this.db.transaction([STORES.POIS], 'readonly');
      const store = transaction.objectStore(STORES.POIS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- CONTRIBUTION METHODS (PRESERVED) ---
  async getContributions(monumentId: string): Promise<Contribution[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) { resolve([]); return; }
      const transaction = this.db.transaction([STORES.CONTRIBUTIONS], 'readonly');
      const store = transaction.objectStore(STORES.CONTRIBUTIONS);
      const index = store.index('monumentId');
      const request = index.getAll(monumentId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async addContribution(contribution: Omit<Contribution, 'id'>): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction([STORES.CONTRIBUTIONS], 'readwrite');
      const store = transaction?.objectStore(STORES.CONTRIBUTIONS);
      const request = store?.add(contribution);
      if (request) {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }
    });
  }

  async getUnsyncedContributions(): Promise<Contribution[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) { resolve([]); return; }
      const transaction = this.db.transaction([STORES.CONTRIBUTIONS], 'readonly');
      const store = transaction.objectStore(STORES.CONTRIBUTIONS);
      const index = store.index('synced');
      const request = index.getAll(0);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async markContributionSynced(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) { resolve(); return; }
      const transaction = this.db.transaction([STORES.CONTRIBUTIONS], 'readwrite');
      const store = transaction.objectStore(STORES.CONTRIBUTIONS);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.synced = 1;
          store.put(record);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }
}

export const db = new DatabaseService();
