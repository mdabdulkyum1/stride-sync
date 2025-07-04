import axios from 'axios';
import config from '../../config';
import admin from 'firebase-admin';

const { strava } = config;

export class AuthService {
  private static instance: AuthService;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;
  private userId: string | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public getAuthUrl(): string {
    const scope = 'activity:read';
    return `https://www.strava.com/oauth/authorize?client_id=${strava.clientId}&response_type=code&scope=${scope}&redirect_uri=${process.env.STRAVA_REDIRECT_URI}`;
  }

  public async getTokens(code: string): Promise<void> {
    console.log(code, 'code here');
    try {
      const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
        client_id: strava.clientId,
        client_secret: strava.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.STRAVA_REDIRECT_URI,
      });


      this.token = tokenResponse.data.access_token;
      this.refreshToken = tokenResponse.data.refresh_token;
      this.tokenExpiry = Date.now() + tokenResponse.data.expires_in * 1000;

      const userResponse = await axios.get('https://www.strava.com/api/v3/athlete', {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      const athlete = userResponse.data;
      this.userId = athlete.id.toString();

      const db = admin.firestore();
      const userRef = db.collection('users').doc(this.userId!);
      const userDoc = await userRef.get();

      
      if (!userDoc.exists) {
        await userRef.set({
          accessToken: this.token,
          refreshToken: this.refreshToken,
          tokenExpiry: this.tokenExpiry,
          email: athlete.email ?? null, 
          name: `${athlete.firstname} ${athlete.lastname}`,
          role: "user",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

      } else {
        console.log(`ℹ️ User already exists in Firestore: ${this.userId}`);
      }
    } catch (error: any) {
      console.error('❌ Token exchange failed:', error?.message || error);
      throw new Error('Authentication failed');
    }
  }

  public async refreshTokenIfNeeded(): Promise<void> {
    if (Date.now() >= this.tokenExpiry - 300000 && this.refreshToken && this.userId) {
      try {
        const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
          client_id: strava.clientId,
          client_secret: strava.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        });

        this.token = tokenResponse.data.access_token;
        this.refreshToken = tokenResponse.data.refresh_token || this.refreshToken;
        this.tokenExpiry = Date.now() + tokenResponse.data.expires_in * 1000;

        const db = admin.firestore();
        await db.collection('users').doc(this.userId).update({
          accessToken: this.token,
          refreshToken: this.refreshToken,
          tokenExpiry: this.tokenExpiry,
        });

      } catch (error: any) {
        console.error('❌ Token refresh failed:', error?.message || error);
        throw new Error('Token refresh failed');
      }
    }
  }

  public getAccessToken(): string | null {
    return this.token;
  }

  public getUserId(): string | null {
    return this.userId;
  }
}
