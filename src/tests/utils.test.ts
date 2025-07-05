import { Request, Response } from 'express';
import sendResponse from '../app/utils/sendResponse';
import catchAsync from '../app/utils/catchAsync';
import { exportToCSV } from '../app/utils/csvExport';
import { convertToMiles } from '../app/utils/distanceConverter';

describe('Utility Functions Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('sendResponse', () => {
    it('should send success response with data', () => {
      const responseData = {
        statusCode: 200,
        message: 'Success',
        data: { id: 1, name: 'Test' },
      };

      sendResponse<any>(mockRes as Response, responseData);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: { id: 1, name: 'Test' },
      });
    });

    it('should send response without data', () => {
      const responseData = {
        statusCode: 400,
        message: 'Bad Request',
      };

      sendResponse<any>(mockRes as Response, responseData);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Bad Request',
        data: null,
      });
    });

    it('should send response with meta information', () => {
      const responseData = {
        statusCode: 200,
        message: 'Success',
        data: { id: 1, name: 'Test' },
        meta: {
          limit: 10,
          page: 1,
          total: 100,
          totalPage: 10,
        },
      };

      sendResponse<any>(mockRes as Response, responseData);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: { id: 1, name: 'Test' },
        meta: {
          limit: 10,
          page: 1,
          total: 100,
          totalPage: 10,
        },
      });
    });
  });

  describe('catchAsync', () => {
    it('should handle successful async function', async () => {
      const asyncFunction = jest.fn().mockResolvedValue('success');
      const wrappedFunction = catchAsync(asyncFunction);

      await wrappedFunction(mockReq as Request, mockRes as Response, jest.fn());

      expect(asyncFunction).toHaveBeenCalledWith(mockReq, mockRes, expect.any(Function));
    });

    it('should handle async function errors', async () => {
      const error = new Error('Test error');
      const asyncFunction = jest.fn().mockRejectedValue(error);
      const wrappedFunction = catchAsync(asyncFunction);
      const mockNext = jest.fn();

      await wrappedFunction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors', async () => {
      const error = new Error('Sync error');
      const asyncFunction = jest.fn().mockImplementation(() => {
        throw error;
      });
      const wrappedFunction = catchAsync(asyncFunction);
      const mockNext = jest.fn();

      await wrappedFunction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('exportToCSV', () => {
    it('should export data to CSV format', () => {
      const data = [
        { name: 'John Doe', email: 'john@example.com', age: 30 },
        { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
      ];

      const csv = exportToCSV(data);

      expect(csv).toContain('name,email,age');
      expect(csv).toContain('John Doe,john@example.com,30');
      expect(csv).toContain('Jane Smith,jane@example.com,25');
    });

    it('should handle empty data array', () => {
      const data: any[] = [];
      const csv = exportToCSV(data);

      expect(csv).toBe('');
    });

    it('should handle data with special characters', () => {
      const data = [
        { name: 'John "Doe"', email: 'john@example.com', description: 'Contains, comma' },
      ];

      const csv = exportToCSV(data);

      expect(csv).toContain('name,email,description');
      expect(csv).toContain('"John ""Doe""",john@example.com,"Contains, comma"');
    });

    it('should handle nested objects', () => {
      const data = [
        { 
          name: 'John Doe', 
          profile: { age: 30, city: 'New York' },
          tags: ['developer', 'runner']
        },
      ];

      const csv = exportToCSV(data);

      expect(csv).toContain('name,profile,tags');
      expect(csv).toContain('John Doe,"{""age"":30,""city"":""New York""}","[""developer"",""runner""]"');
    });
  });

  describe('convertToMiles', () => {
    it('should convert meters to miles', () => {
      const result = convertToMiles(5000);
      expect(result).toBeCloseTo(3.10686, 5);
    });

    it('should convert 1000 meters to miles', () => {
      const result = convertToMiles(1000);
      expect(result).toBeCloseTo(0.621371, 6);
    });

    it('should handle zero meters', () => {
      const result = convertToMiles(0);
      expect(result).toBe(0);
    });

    it('should handle large distances', () => {
      const result = convertToMiles(42195); // Marathon distance
      expect(result).toBeCloseTo(26.2188, 4);
    });
  });
}); 