import { expect } from 'chai';
import uploadController from '../controllers/uploadController.js';
import cacheService from '../services/cacheService.js';

// Test cleanup of expired upload sessions

describe('UploadController.cleanupExpiredSessions', () => {
  it('removes expired sessions', async () => {
    const prefix = `${process.env.CACHE_PREFIX || 'weppix'}:`;
    const prefixedKey = `${prefix}upload_session:user1:123`;
    const session = {
      uploadId: '123',
      userId: 'user1',
      lastActivity: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      tempDir: '/tmp/fake'
    };

    const origKeys = cacheService.keys;
    const origGet = cacheService.get;
    const origDelete = cacheService.delete;
    const origCleanup = uploadController.cleanupUploadSession;

    let deletedKey;

    cacheService.keys = async () => [prefixedKey];
    cacheService.get = async (key) => {
      expect(key).to.equal('upload_session:user1:123');
      return session;
    };
    cacheService.delete = async (key) => {
      deletedKey = key;
      return true;
    };
    uploadController.cleanupUploadSession = async (sess) => {
      expect(sess).to.equal(session);
    };

    const removed = await uploadController.cleanupExpiredSessions();

    expect(removed).to.equal(1);
    expect(deletedKey).to.equal('upload_session:user1:123');

    cacheService.keys = origKeys;
    cacheService.get = origGet;
    cacheService.delete = origDelete;
    uploadController.cleanupUploadSession = origCleanup;
  });
});
