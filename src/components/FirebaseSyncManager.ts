import { initializeApp, getApps, deleteApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User, Auth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export interface SyncData {
  timers: any[];
  categories?: string[];
  syncedAt: number;
}

const STORAGE_KEY_CONFIG = 'nexus-firebase-config';

class FirebaseSyncManager {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;

  constructor() {
    this.initializeFromStorage();
  }

  /**
   * Initialize Firebase dynamically using configuration from LocalStorage
   */
  private initializeFromStorage() {
    const configStr = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!configStr) return;

    try {
      const config = JSON.parse(configStr);
      this.initFirebase(config);
    } catch (e) {
      console.error('Failed to initialize Firebase from storage:', e);
    }
  }

  /**
   * Initialize or re-initialize Firebase with a specific configuration object
   */
  public initFirebase(config: any): void {
    try {
      // If there are existing apps, clean them up first
      const apps = getApps();
      if (apps.length > 0) {
        for (const app of apps) {
          deleteApp(app);
        }
      }

      this.app = initializeApp(config);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
    } catch (e) {
      this.app = null;
      this.auth = null;
      this.db = null;
      throw e;
    }
  }

  /**
   * Parses loose JSON or JavaScript object format into a clean config object.
   */
  private parseConfig(configText: string): any {
    try {
      return JSON.parse(configText);
    } catch (e) {
      try {
        let cleaned = configText.trim();
        // Remove variable declaration if present (e.g. const firebaseConfig = )
        cleaned = cleaned.replace(/^(const|let|var)?\s*[a-zA-Z0-9_]+\s*=\s*/, '');
        // Remove trailing semicolon
        cleaned = cleaned.replace(/;\s*$/, '');
        // Remove comments
        cleaned = cleaned.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
        // Add quotes to unquoted keys
        cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        // Replace single quotes with double quotes for string values
        cleaned = cleaned.replace(/:\s*'([^']*)'/g, ':"$1"');
        // Remove trailing commas before closing braces/brackets
        cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
        
        return JSON.parse(cleaned);
      } catch (innerError) {
        throw new Error('올바른 JSON 또는 JavaScript 객체 형식이 아닙니다.');
      }
    }
  }

  /**
   * Save configuration to local storage and initialize
   */
  public saveConfig(configText: string): void {
    try {
      const config = this.parseConfig(configText);
      // Validate basic config fields
      if (!config.apiKey || !config.projectId) {
        throw new Error('Invalid config. apiKey and projectId are required.');
      }
      this.initFirebase(config);
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config, null, 2));
    } catch (e) {
      throw new Error('Firebase configuration parsing failed: ' + (e as Error).message);
    }
  }

  /**
   * Get the current configuration string
   */
  public getConfig(): string {
    return localStorage.getItem(STORAGE_KEY_CONFIG) || '';
  }

  /**
   * Clear configuration and clean up app
   */
  public clearConfig(): void {
    localStorage.removeItem(STORAGE_KEY_CONFIG);
    const apps = getApps();
    for (const app of apps) {
      deleteApp(app);
    }
    this.app = null;
    this.auth = null;
    this.db = null;
  }

  /**
   * Check if Firebase is configured
   */
  public isConfigured(): boolean {
    return !!this.app && !!this.auth && !!this.db;
  }

  /**
   * Sign up with email and password
   */
  public async signUp(email: string, password: string): Promise<User> {
    if (!this.auth) throw new Error('Firebase is not configured.');
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    return userCredential.user;
  }

  /**
   * Sign in with email and password
   */
  public async signIn(email: string, password: string): Promise<User> {
    if (!this.auth) throw new Error('Firebase is not configured.');
    const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
    return userCredential.user;
  }

  /**
   * Sign out
   */
  public async logout(): Promise<void> {
    if (!this.auth) return;
    await signOut(this.auth);
  }

  /**
   * Register a callback for authentication state changes
   */
  public onAuthChange(callback: (user: User | null) => void): () => void {
    if (!this.auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(this.auth, callback);
  }

  /**
   * Get the current user
   */
  public getCurrentUser(): User | null {
    return this.auth ? this.auth.currentUser : null;
  }

  /**
   * Download sync data from Firestore
   */
  public async downloadData(uid: string): Promise<SyncData | null> {
    if (!this.db) throw new Error('Firebase Firestore is not configured.');
    
    const docRef = doc(this.db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as SyncData;
    }
    return null;
  }

  /**
   * Upload sync data to Firestore
   */
  public async uploadData(uid: string, data: SyncData): Promise<void> {
    if (!this.db) throw new Error('Firebase Firestore is not configured.');
    
    const docRef = doc(this.db, 'users', uid);
    await setDoc(docRef, data);
  }
}

export const firebaseSyncManager = new FirebaseSyncManager();
export default firebaseSyncManager;
