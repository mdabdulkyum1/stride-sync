import request from 'supertest';
import app from '../app';
import { AuthService } from '../app/modules/auth/authService';
import axios from 'axios';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.STRAVA_CLIENT_ID = 'test_client_id';
process.env.STRAVA_CLIENT_SECRET = 'test_client_secret';
process.env.STRAVA_REDIRECT_URI = 'http://localhost:3000/auth/strava/callback';
process.env.JWT_ACCESS_SECRET = 'test_jwt_secret';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret';

// Mock external dependencies
jest.mock('axios');
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => ({
          exists: false,
          data: () => null,
        })),
        set: jest.fn(),
        update: jest.fn(),
      })),
    })),
  })),
  credential: {
    cert: jest.fn(),
  },
  FieldValue: {
    serverTimestamp: jest.fn(() => new Date()),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Auth Routes', () => {
  let authService: AuthService;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    authService = AuthService.getInstance();
  });

  describe('GET /api/v1/auth/strava', () => {
    it('should redirect to Strava authorization URL', async () => {
      const res = await request(app)
        .get('/api/v1/auth/strava')
        .expect(302); // Redirect status

      // Should redirect to Strava OAuth URL
      expect(res.header.location).toContain('strava.com/oauth/authorize');
      expect(res.header.location).toContain('client_id=');
      expect(res.header.location).toContain('scope=activity:read_all');
    });
  });

  describe('GET /api/v1/auth/strava/callback', () => {
    it('should handle successful OAuth callback', async () => {
      // Mock successful token exchange
      const mockTokenResponse = {
        data: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 21600,
        },
      };

      const mockUserResponse = {
        data: {
          id: 12345,
          email: 'test@example.com',
          firstname: 'John',
          lastname: 'Doe',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockUserResponse);

      const res = await request(app)
        .get('/api/v1/auth/strava/callback?code=valid_auth_code')
        .expect(302); // Should redirect to dashboard

      expect(res.header.location).toBe('/dashboard');
    });

    it('should handle missing authorization code', async () => {
      const res = await request(app)
        .get('/api/v1/auth/strava/callback')
        .expect(400);

      expect(res.body.message).toBe('Authorization code missing');
    });

    it('should handle invalid authorization code', async () => {
      // Mock failed token exchange
      mockedAxios.post.mockRejectedValueOnce(new Error('Invalid authorization code'));

      const res = await request(app)
        .get('/api/v1/auth/strava/callback?code=invalid_code')
        .expect(500);

      expect(res.body.message).toBe('Something went wrong!');
    });

    it('should handle Strava API errors', async () => {
      // Mock Strava API error
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Invalid client' },
        },
      });

      const res = await request(app)
        .get('/api/v1/auth/strava/callback?code=valid_code')
        .expect(500);

      expect(res.body.message).toBe('Something went wrong!');
    });
  });

  describe('AuthService', () => {
    describe('getAuthUrl', () => {
      it('should return valid Strava authorization URL', () => {
        const authUrl = authService.getAuthUrl();
        
        expect(authUrl).toContain('https://www.strava.com/oauth/authorize');
        expect(authUrl).toContain('client_id=');
        expect(authUrl).toContain('scope=activity:read_all');
        expect(authUrl).toContain('redirect_uri=');
      });
    });

    describe('getTokens', () => {
      it('should exchange code for tokens and save user data', async () => {
        const mockTokenResponse = {
          data: {
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            expires_in: 21600,
          },
        };

        const mockUserResponse = {
          data: {
            id: 12345,
            email: 'test@example.com',
            firstname: 'John',
            lastname: 'Doe',
          },
        };

        mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
        mockedAxios.get.mockResolvedValueOnce(mockUserResponse);

        await authService.getTokens('valid_code');

        expect(mockedAxios.post).toHaveBeenCalledWith(
          'https://www.strava.com/oauth/token',
          expect.objectContaining({
            client_id: expect.any(String),
            client_secret: expect.any(String),
            code: 'valid_code',
            grant_type: 'authorization_code',
          })
        );

        expect(mockedAxios.get).toHaveBeenCalledWith(
          'https://www.strava.com/api/v3/athlete',
          expect.objectContaining({
            headers: { Authorization: 'Bearer mock_access_token' },
          })
        );
      });

      it('should handle token exchange errors', async () => {
        mockedAxios.post.mockRejectedValueOnce(new Error('Token exchange failed'));

        await expect(authService.getTokens('invalid_code')).rejects.toThrow('Authentication failed');
      });
    });

    describe('refreshTokenIfNeeded', () => {
      it('should refresh token when expired', async () => {
        // Set up expired token
        (authService as any).tokenExpiry = Date.now() - 1000;
        (authService as any).refreshToken = 'mock_refresh_token';
        (authService as any).userId = '12345';

        const mockRefreshResponse = {
          data: {
            access_token: 'new_access_token',
            refresh_token: 'new_refresh_token',
            expires_in: 21600,
          },
        };

        mockedAxios.post.mockResolvedValueOnce(mockRefreshResponse);

        await authService.refreshTokenIfNeeded();

        expect(mockedAxios.post).toHaveBeenCalledWith(
          'https://www.strava.com/oauth/token',
          expect.objectContaining({
            client_id: expect.any(String),
            client_secret: expect.any(String),
            refresh_token: 'mock_refresh_token',
            grant_type: 'refresh_token',
          })
        );
      });

      it('should not refresh token when not expired', async () => {
        // Set up valid token
        (authService as any).tokenExpiry = Date.now() + 1000000;
        (authService as any).refreshToken = 'mock_refresh_token';
        (authService as any).userId = '12345';

        await authService.refreshTokenIfNeeded();

        expect(mockedAxios.post).not.toHaveBeenCalled();
      });
    });
  });
})