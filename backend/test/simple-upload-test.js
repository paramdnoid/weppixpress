import { expect } from 'chai';
import chunkedUploadController from '../controllers/chunkedUploadController.js';
import cacheService from '../services/cacheService.js';

describe('cleanupExpiredSessions', () => {
  let originalKeys;
  let originalGet;
  let originalDelete;
  let originalCleanup;

  beforeEach(() => {
    // Save original implementations to restore after each test
    originalKeys = cacheService.keys;
    originalGet = cacheService.get;
    originalDelete = cacheService.delete;
    originalCleanup = chunkedUploadController.cleanupUploadSession;
  });

  afterEach(() => {
    // Restore original implementations
    cacheService.keys = originalKeys;
    cacheService.get = originalGet;
    cacheService.delete = originalDelete;
    chunkedUploadController.cleanupUploadSession = originalCleanup;
  });

  it('removes expired sessions and returns cleaned count', async () => {
    const keysCalledWith = [];
    const getCalls = [];
    const deleteCalls = [];
    const cleanupCalls = [];

    // Mock cache service methods
    cacheService.keys = async (pattern) => {
      keysCalledWith.push(pattern);
      return ['upload_session:1', 'upload_session:2'];
    };

    const now = Date.now();
    const sessions = {
      'upload_session:1': {
        lastActivity: new Date(now - 25 * 60 * 60 * 1000).toISOString()
      },
      'upload_session:2': {
        lastActivity: new Date(now - 60 * 60 * 1000).toISOString()
      }
    };

    cacheService.get = async (key) => {
      getCalls.push(key);
      return sessions[key];
    };

    cacheService.delete = async (key) => {
      deleteCalls.push(key);
      return true;
    };

    // Mock cleanup of individual session
    chunkedUploadController.cleanupUploadSession = async (session) => {
      cleanupCalls.push(session);
    };

    const cleaned = await chunkedUploadController.cleanupExpiredSessions();

    expect(cleaned).to.equal(1);
    expect(keysCalledWith).to.deep.equal(['upload_session:*']);
    expect(getCalls).to.deep.equal(['upload_session:1', 'upload_session:2']);
    expect(deleteCalls).to.deep.equal(['upload_session:1']);
    expect(cleanupCalls).to.have.lengthOf(1);
    expect(cleanupCalls[0]).to.deep.equal(sessions['upload_session:1']);
  });
});

