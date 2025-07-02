import axios from "axios";
import config from "../../config";
import admin from "../../config/firebase"

const { strava } = config;


export class AuthService {
    private static instance: AuthService;
    private token: string | null = null;
    private refreshToken: string | null = null;
    private tokenExpiry: number = 0;


    private constructor() { }

    public static getInstance(): AuthService {
        if(!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    public getAuthUrl(): string {
        const scope = 'activity:read';
        return `https://www.strava.com/oauth/authorize?client_id=${strava.clientId}&response_type=code&scope=${scope}&redirect_uri=${strava.redirectUri}`
    }


    public async getTokens(code: string): Promise<void>{
        const tokenResponse = await axios.post('https//www.strava.com/oauth/token', {
            client_id: strava.clientId,
            client_secret: strava.clientSecret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: strava.redirectUri
        });

        this.token = tokenResponse.data.access_token;
        this.refreshToken = tokenResponse.data.refresh_token;
        this.tokenExpiry = Date.now() + (tokenResponse.data.expires_in * 1000);



    }







}

