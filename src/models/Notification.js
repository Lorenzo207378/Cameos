import { normalizeTimestamp } from './modelUtils.js';

/**
 * Standard notification event types supported by Cameos (extensible for future events).
 */
export const NOTIFICATION_TYPES = Object.freeze({
  FRIEND_REQUEST: 'friend_request',
  FRIEND_REQUEST_ACCEPTED: 'friend_request_accepted',
  FRIEND_REQUEST_REJECTED: 'friend_request_rejected',
  REVIEW_LIKE: 'review_like',
  MEDIA_RECOMMENDATION: 'media_recommendation',
  SYSTEM: 'system'
});

/**
 * Notification
 * Domain model representing a user notification stored in the `notifications` Firestore collection.
 */
export class Notification {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    this.id = data.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.recipientUid = data.recipientUid || null;
    this.senderUid = data.senderUid || null;
    this.senderUsername = data.senderUsername || null;
    this.type = data.type || NOTIFICATION_TYPES.SYSTEM;
    this.title = data.title || '';
    this.message = data.message || '';
    this.referenceId = data.referenceId || null;
    this.payload = data.payload && typeof data.payload === 'object' ? { ...data.payload } : {};
    this.read = Boolean(data.read);
    this.createdAt = normalizeTimestamp(data.createdAt) || new Date().toISOString();
    this.readAt = normalizeTimestamp(data.readAt) || null;
  }

  /**
   * Convert Notification instance into a plain serializable object
   * @returns {Object}
   */
  toPlainObject() {
    return {
      id: this.id,
      recipientUid: this.recipientUid,
      senderUid: this.senderUid,
      senderUsername: this.senderUsername,
      type: this.type,
      title: this.title,
      message: this.message,
      referenceId: this.referenceId,
      payload: { ...this.payload },
      read: this.read,
      createdAt: this.createdAt,
      readAt: this.readAt
    };
  }
}

export default Notification;
