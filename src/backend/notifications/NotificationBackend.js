import { defaultDb, defaultFirestoreAdapter } from '../firestoreAdapter.js';
import { Notification, NOTIFICATION_TYPES } from '../../models/index.js';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * NotificationBackend
 * Ambito: Gestione remota delle notifiche utente su Cloud Firestore.
 */
export class NotificationBackend {
  /**
   * @param {import('firebase/firestore').Firestore} [db]
   * @param {Object} [adapter]
   */
  constructor(db = defaultDb, adapter = defaultFirestoreAdapter) {
    this.db = db;
    this.adapter = adapter;
  }

  /**
   * Invia e salva una notifica per l'utente destinatario
   * @param {Object} notificationData
   * @returns {Promise<Notification>}
   */
  async sendNotification(notificationData = {}) {
    if (!notificationData.recipientUid) {
      throw new Error('notification.recipientUid is required');
    }

    const notification = new Notification(notificationData);
    await this.adapter.setDocument(this.db, NOTIFICATIONS_COLLECTION, notification.id, {
      id: notification.id,
      recipientUid: notification.recipientUid,
      senderUid: notification.senderUid,
      senderUsername: notification.senderUsername,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      referenceId: notification.referenceId,
      payload: notification.payload,
      read: notification.read,
      createdAt: notification.createdAt,
      readAt: notification.readAt
    });

    return notification;
  }

  /**
   * Invia una notifica in modalità protetta senza bloccare il flusso chiamante
   * @param {Object} notificationData
   * @returns {Promise<void>}
   */
  async notifySafely(notificationData) {
    try {
      await this.sendNotification(notificationData);
    } catch (err) {
      console.warn(`[NotificationBackend] Notifica "${notificationData.type}" non recapitata:`, err);
    }
  }

  /**
   * Recupera le notifiche di un utente, ordinate dalla più recente
   * @param {string} recipientUid
   * @param {Object} [options={}]
   * @param {boolean} [options.unreadOnly=false]
   * @returns {Promise<Array<Notification>>}
   */
  async getUserNotifications(recipientUid, { unreadOnly = false } = {}) {
    if (!recipientUid) throw new Error('recipientUid is required');

    const docs = await this.adapter.queryByField(this.db, NOTIFICATIONS_COLLECTION, 'recipientUid', recipientUid);
    return docs
      .map((data) => new Notification(data))
      .filter((notification) => !unreadOnly || !notification.read)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  /**
   * Contrassegna una notifica come letta
   * @param {string} notificationId
   * @returns {Promise<Notification|null>}
   */
  async markNotificationAsRead(notificationId) {
    if (!notificationId) throw new Error('notificationId is required');

    const existing = await this.adapter.getDocument(this.db, NOTIFICATIONS_COLLECTION, notificationId);
    if (!existing) return null;

    const readAt = new Date().toISOString();
    const updated = new Notification({ ...existing, read: true, readAt });
    await this.adapter.setDocument(
      this.db,
      NOTIFICATIONS_COLLECTION,
      updated.id,
      { read: true, readAt },
      { merge: true }
    );

    return updated;
  }

  /**
   * Contrassegna come lette tutte le notifiche dell'utente
   * @param {string} recipientUid
   * @returns {Promise<Array<Notification>>}
   */
  async markAllNotificationsAsRead(recipientUid) {
    const notifications = await this.getUserNotifications(recipientUid);
    return Promise.all(
      notifications.map(async (n) => (n.read ? n : ((await this.markNotificationAsRead(n.id)) ?? n)))
    );
  }

  /**
   * Elimina una notifica da Firestore
   * @param {string} notificationId
   * @returns {Promise<void>}
   */
  async deleteNotification(notificationId) {
    if (!notificationId) throw new Error('notificationId is required');
    await this.adapter.deleteDocument(this.db, NOTIFICATIONS_COLLECTION, notificationId);
  }
}

export { NOTIFICATION_TYPES };
export const notificationBackend = new NotificationBackend();
export default NotificationBackend;
