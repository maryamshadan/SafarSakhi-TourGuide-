import { db } from './database';
import { firestoreDB } from './firebaseConfig';
import { collection, addDoc } from "firebase/firestore"; 

class SyncService {
    private isSyncing = false;

    async syncSafetyReports(): Promise<number> {
        if (this.isSyncing || !navigator.onLine) return 0;
        
        this.isSyncing = true;
        let syncedCount = 0;

        try {
            const pending = await db.getUnsyncedSafetyReports();
            
            if (pending.length === 0) {
                this.isSyncing = false;
                return 0;
            }

            console.log(`[CloudSync] Found ${pending.length} unsynced safety reports...`);

            for (const item of pending) {
                let success = false;

                if (firestoreDB) {
                    try {
                        const { id, synced, ...dataPayload } = item;
                        await addDoc(collection(firestoreDB, "safety_reports"), {
                            ...dataPayload,
                            syncedAt: new Date().toISOString()
                        });
                        success = true;
                        console.log(`[CloudSync] Safety report uploaded to Firestore.`);
                    } catch (err) {
                        console.error("[CloudSync] Safety report upload failed:", err);
                    }
                } else {
                    // Simulation mode for hackathon offline demo
                    await new Promise(resolve => setTimeout(resolve, 600));
                    success = true;
                    console.log(`[CloudSync] (Simulated) Safety report synced.`);
                }
                
                if (success && item.id) {
                    await db.markSafetyReportSynced(item.id);
                    syncedCount++;
                }
            }
        } catch (error) {
            console.error("[CloudSync] General Report Sync Error:", error);
        } finally {
            this.isSyncing = false;
        }

        return syncedCount;
    }

    async syncContributions(): Promise<number> {
        if (this.isSyncing || !navigator.onLine) return 0;
        
        this.isSyncing = true;
        let syncedCount = 0;

        try {
            const pending = await db.getUnsyncedContributions();
            if (pending.length === 0) {
                this.isSyncing = false;
                return 0;
            }

            for (const item of pending) {
                let success = false;

                if (firestoreDB) {
                    try {
                        const { id, synced, ...dataPayload } = item;
                        await addDoc(collection(firestoreDB, "contributions"), {
                            ...dataPayload,
                            syncedAt: new Date().toISOString()
                        });
                        success = true;
                    } catch (err) {
                        console.error("[CloudSync] Upload Failed:", err);
                    }
                } else {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    success = true;
                }
                
                if (success && item.id) {
                    await db.markContributionSynced(item.id);
                    syncedCount++;
                }
            }
        } catch (error) {
            console.error("[CloudSync] General Error:", error);
        } finally {
            this.isSyncing = false;
        }

        return syncedCount;
    }

    async syncAll(): Promise<{ reports: number; contributions: number }> {
        const reports = await this.syncSafetyReports();
        const contributions = await this.syncContributions();
        return { reports, contributions };
    }
}

export const syncService = new SyncService();
