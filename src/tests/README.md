# Test Suite Documentation

This directory contains comprehensive unit tests for the StrideSync application.

## Test Structure

### Test Files

- **`auth.test.ts`** - Authentication module tests
  - AuthService functionality
  - JWT token generation and validation
  - OAuth flow testing
  - Authentication middleware
  - Auth routes testing

- **`user.test.ts`** - User module tests
  - UserService CRUD operations
  - User dashboard functionality
  - User profile management
  - Role-based access control
  - User routes testing

- **`admin.test.ts`** - Admin module tests
  - AdminService dashboard statistics
  - User management for admins
  - Analytics and reporting
  - Admin configuration
  - Admin routes testing

- **`activities.test.ts`** - Activities module tests
  - ActivityService CRUD operations
  - Strava activity synchronization
  - Activity filtering and pagination
  - Activity routes testing

- **`middleware.test.ts`** - Middleware tests
  - Authentication middleware
  - Role-based authorization
  - Token refresh functionality
  - Error handling middleware

- **`utils.test.ts`** - Utility function tests
  - Response formatting
  - Error handling utilities
  - CSV export functionality
  - Distance conversion utilities

### Test Setup

- **`setup.ts`** - Global test configuration
  - Environment variables setup
  - Mock configurations
  - Global test utilities

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suites
```bash
# Authentication tests
npm run test:auth

# User module tests
npm run test:user

# Admin module tests
npm run test:admin

# Activities tests
npm run test:activities

# Middleware tests
npm run test:middleware

# Utility tests
npm run test:utils
```

### Test Options
```bash
# Watch mode (re-runs tests on file changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Verbose output
npm run test:verbose
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- TypeScript support with `ts-jest`
- Coverage reporting
- Test timeout settings
- Module mapping
- Mock restoration

### Environment Variables
Tests use dedicated test environment variables:
- `NODE_ENV=test`
- Test Strava credentials
- Test JWT secrets
- Test database configuration

## Mocking Strategy

### External Dependencies
- **Firebase Admin**: Mocked for database operations
- **Axios**: Mocked for HTTP requests
- **Node-cron**: Mocked for scheduled jobs
- **JWT**: Real token generation for testing

### Database Operations
All Firebase operations are mocked to avoid external dependencies:
- Collection queries
- Document operations
- Real-time listeners

## Test Coverage

The test suite covers:
- ✅ Service layer functionality
- ✅ Controller logic
- ✅ Route handling
- ✅ Middleware functions
- ✅ Utility functions
- ✅ Error handling
- ✅ Authentication flows
- ✅ Authorization checks
- ✅ Data validation
- ✅ API responses

## Writing New Tests

### Test Structure
```typescript
describe('Module Name', () => {
  let service: ServiceClass;
  let mockData: any;

  beforeEach(() => {
    // Setup test data and mocks
    service = ServiceClass.getInstance();
    mockData = { /* test data */ };
    jest.clearAllMocks();
  });

  describe('Function Name', () => {
    it('should do something specific', async () => {
      // Arrange
      const expected = 'expected result';
      
      // Act
      const result = await service.functionName();
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Best Practices
1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies
3. **Clear naming**: Use descriptive test names
4. **Setup/Teardown**: Use beforeEach/afterEach
5. **Assertions**: Test both success and error cases
6. **Coverage**: Aim for high test coverage

## Debugging Tests

### Running Single Test
```bash
npm test -- --testNamePattern="should authenticate valid token"
```

### Debug Mode
```bash
npm test -- --detectOpenHandles --forceExit
```

### Coverage Analysis
```bash
npm run test:coverage
# Open coverage/lcov-report/index.html
```

## Continuous Integration

Tests are configured to run in CI environments:
- Automatic test execution
- Coverage reporting
- Failure notifications
- Performance monitoring

## Troubleshooting

### Common Issues
1. **Mock not working**: Ensure mocks are properly configured
2. **Async test failures**: Check for proper async/await usage
3. **Environment variables**: Verify test environment setup
4. **TypeScript errors**: Ensure proper type definitions

### Performance
- Tests run in parallel where possible
- Mock heavy operations
- Use appropriate timeouts
- Clean up resources after tests 