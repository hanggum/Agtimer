export interface SyncData {
  timers: any[];
  categories?: string[];
  syncedAt: number;
}

class GoogleSyncManager {
  private scriptsLoaded = false;
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Load the Google Identity Services script dynamically
   */
  public loadScripts(): Promise<void> {
    if (this.scriptsLoaded) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.scriptsLoaded = true;
        resolve();
      };
      script.onerror = (err) => reject(new Error('Failed to load Google Identity Services script: ' + err));
      document.head.appendChild(script);
    });
  }

  /**
   * Request access token using Google Identity Services Token Client
   */
  public signIn(clientId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!clientId) {
        return reject(new Error('Google Client ID is missing. Please configure it in settings.'));
      }
      try {
        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
            } else if (response.access_token) {
              this.accessToken = response.access_token;
              // Token is usually valid for 3600 seconds. Let's set expiry with a safety margin (55 mins)
              this.tokenExpiry = Date.now() + 3300 * 1000;
              resolve(response.access_token);
            } else {
              reject(new Error('Authorization failed. No access token received.'));
            }
          },
        });

        // Request token
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get valid access token (or request a new one if expired)
   */
  public async getValidToken(clientId: string): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
    // Token is expired or not set, trigger sign in
    return this.signIn(clientId);
  }

  /**
   * Check if user is connected (has token in memory)
   */
  public isConnected(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiry;
  }

  /**
   * Disconnect and clear tokens
   */
  public disconnect() {
    if (this.accessToken && (window as any).google?.accounts?.oauth2) {
      try {
        (window as any).google.accounts.oauth2.revoke(this.accessToken, () => {});
      } catch (e) {
        console.warn('Failed to revoke token:', e);
      }
    }
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  /**
   * Find the file ID of nexustimer_data.json in Google Drive
   */
  private async findFileId(token: string): Promise<string | null> {
    const query = encodeURIComponent("name = 'nexustimer_data.json' and trashed = false");
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Google Drive API Search error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  }

  /**
   * Read file content from Google Drive by file ID
   */
  public async downloadData(token: string): Promise<SyncData | null> {
    const fileId = await this.findFileId(token);
    if (!fileId) return null;

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 444 || response.status === 404) return null;
      const err = await response.text();
      throw new Error(`Google Drive API download error: ${err}`);
    }

    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Upload (Create/Update) file content to Google Drive
   */
  public async uploadData(token: string, data: SyncData): Promise<void> {
    const fileId = await this.findFileId(token);

    if (fileId) {
      // File exists: Update content
      const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(`Google Drive API update error: ${err.error?.message || response.statusText}`);
      }
    } else {
      // File does not exist: Step 1: Create file metadata
      const createMetaResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'nexustimer_data.json',
          mimeType: 'application/json',
        }),
      });

      if (!createMetaResponse.ok) {
        const err = await createMetaResponse.json();
        throw new Error(`Google Drive API file creation error: ${err.error?.message || createMetaResponse.statusText}`);
      }

      const fileMeta = await createMetaResponse.json();
      const newFileId = fileMeta.id;

      // Step 2: Upload content using media upload
      const uploadResponse = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${newFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!uploadResponse.ok) {
        const err = await uploadResponse.json();
        throw new Error(`Google Drive API media upload error: ${err.error?.message || uploadResponse.statusText}`);
      }
    }
  }
}

export const googleSyncManager = new GoogleSyncManager();
export default googleSyncManager;
