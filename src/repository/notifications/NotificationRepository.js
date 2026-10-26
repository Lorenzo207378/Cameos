import { BaseRepository, STORES } from '../BaseRepository.js';
import { notificationBackend as defaultNotificationBackend } from '../../backend/notifications/NotificationBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { Notification } from '../../models/index.js';

const notificationKey = (notificationId) => `notif:${notificationId}`;

/**
 * NotificationRepository
 * Gestisce la persistenza e il recupero delle notifiche utente.
 * Strategia: Network-First su Firestore con fallback locale su IndexedDB (`STORES.NOTIFICATIONS`).
 */
export class NotificationRepository extends BaseRepository {
  /**
   * @param {import('../../backend/notifications/NotificationBackend.js').NotificationBackend} [backend]
   * @param {import('../../storage/IndexedDBService.js').IndexedDBService} [storage]
   */
  constructor(backend = defaultNotificationBackend, storage = defaultStorage) {
    super(storage);
    this.backend = backend;
  }

  /**
   * Converte le istanze di Notification in record per IndexedDB
   * @param {Array<Notification>} notifications
   * @returns {Array<Object>}
   */
  notificationRecords(notifications) {
    return notifications.map((n) => ({
      cacheKey: notificationKey(n.id),
      recipientUid: n.recipientUid,
      data: { ...n }
    }));
  }

  /**
   * Invia una nuova notifica ad un utente (richiede connettività)
   * @param {Object} notificationData
   * @returns {Promise<Notification>}
   */
  async sendNotification(notificationData = {}) {
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile inviare notifiche offline');
    }

    const notification = await this.backend.sendNotification(notificationData);
    await this.storage.putMany(STORES.NOTIFICATIONS, this.notificationRecords([notification]));
    return notification;
  }

  /**
   * Recupera le notifiche di un utente (Network-First + IndexedDB Fallback)
   * @param {string} recipientUid
   * @param {Object} [options={}]
   * @param {boolean} [options.unreadOnly=false]
   * @returns {Promise<Array<Notification>>}
   */
  async getUserNotifications(recipientUid, { unreadOnly = false } = {}) {
    if (!recipientUid) throw new Error('recipientUid is required');

    return this.executeWithFallback({
      context: `notifications:${recipientUid}:${unreadOnly}`,
      fetchRemote: () => this.backend.getUserNotifications(recipientUid, { unreadOnly }),
      saveLocal: async (notifications) => {
        const records = this.notificationRecords(notifications);
        if (unreadOnly) {
          await this.storage.putMany(STORES.NOTIFICATIONS, records);
        } else {
          const stale = await this.storage.getByIndex(STORES.NOTIFICATIONS, 'recipientUid', recipientUid);
          await Promise.all(stale.map((r) => this.storage.delete(STORES.NOTIFICATIONS, r.cacheKey)));
          await this.storage.putMany(STORES.NOTIFICATIONS, records);
        }
      },
      getLocal: async () => {
        const records = await this.storage.getByIndex(STORES.NOTIFICATIONS, 'recipientUid', recipientUid);
        return records
          .map((r) => new Notification(r.data))
          .filter((n) => !unreadOnly || !n.read)
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      }
    });
  }

  /**
   * Contrassegna una notifica come letta
   * @param {string} notificationId
   * @returns {Promise<Notification|null>}
   */
  async markNotificationAsRead(notificationId) {
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile aggiornare la notifica');
    }

    const updated = await this.backend.markNotificationAsRead(notificationId);
    if (updated) {
      await this.storage.putMany(STORES.NOTIFICATIONS, this.notificationRecords([updated]));
    }
    return updated;
  }

  /**
   * Contrassegna come lette tutte le notifiche di un utente
   * @param {string} recipientUid
   * @returns {Promise<Array<Notification>>}
   */
  async markAllNotificationsAsRead(recipientUid) {
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile aggiornare le notifiche');
    }

    const notifications = await this.backend.markAllNotificationsAsRead(recipientUid);
    await this.storage.putMany(STORES.NOTIFICATIONS, this.notificationRecords(notifications));
    return notifications;
  }

  /**
   * Elimina una notifica da Firestore e da IndexedDB
   * @param {string} notificationId
   * @returns {Promise<void>}
   */
  async deleteNotification(notificationId) {
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile eliminare la notifica');
    }

    await this.backend.deleteNotification(notificationId);
    await this.storage.delete(STORES.NOTIFICATIONS, notificationKey(notificationId));
  }
}

export const notificationRepository = new NotificationRepository();
export default NotificationRepository;
