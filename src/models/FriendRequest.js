import { normalizeTimestamp } from './modelUtils.js';

/**
 * FriendRequest
 * Domain model representing a pending friend request stored in the `friend_requests` Firestore collection.
 * Once accepted or rejected by the recipient, the request document is deleted from `friend_requests`.
 */
export class FriendRequest {
  /**
   * Build deterministic friend request ID from sender and recipient UIDs
   * @param {string} fromUid
   * @param {string} toUid
   * @returns {string}
   */
  static buildId(fromUid, toUid) {
    return `${String(fromUid).trim()}_${String(toUid).trim()}`;
  }

  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    this.fromUid = data.fromUid || null;
    this.toUid = data.toUid || null;
    this.id = data.id || (this.fromUid && this.toUid ? FriendRequest.buildId(this.fromUid, this.toUid) : null);
    this.fromUsername = data.fromUsername || null;
    this.fromPhotoURL = data.fromPhotoURL || null;
    this.toUsername = data.toUsername || null;
    this.status = data.status || 'pending';
    this.createdAt = normalizeTimestamp(data.createdAt) || new Date().toISOString();
  }

  /**
   * Convert FriendRequest instance into a plain serializable object
   * @returns {Object}
   */
  toPlainObject() {
    return {
      id: this.id,
      fromUid: this.fromUid,
      fromUsername: this.fromUsername,
      fromPhotoURL: this.fromPhotoURL,
      toUid: this.toUid,
      toUsername: this.toUsername,
      status: this.status,
      createdAt: this.createdAt
    };
  }
}

export default FriendRequest;
