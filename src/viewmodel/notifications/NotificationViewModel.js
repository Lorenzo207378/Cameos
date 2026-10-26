import { BaseViewModel } from '../BaseViewModel.js';
import { notificationRepository as defaultNotificationRepository } from '../../repository/notifications/NotificationRepository.js';

/**
 * NotificationViewModel
 * ViewModel MVVM per la gestione e la visualizzazione delle notifiche utente.
 */
export class NotificationViewModel extends BaseViewModel {
  /**
   * @param {import('../../repository/notifications/NotificationRepository.js').NotificationRepository} [repository]
   * @param {Object} [options={}]
   */
  constructor(repository = defaultNotificationRepository, options = {}) {
    super(
      {
        notifications: [],
        unreadCount: 0
      },
      options
    );
    this.repository = repository;
  }

  /**
   * Calcola lo stato delle notifiche con relativo conteggio non lette
   * @param {Array<import('../../models/Notification.js').Notification>} notifications
   * @returns {{ notifications: Array<Object>, unreadCount: number }}
   */
  notificationsState(notifications = []) {
    return {
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length
    };
  }

  /**
   * Carica le notifiche dell'utente
   * @param {string} recipientUid
   * @param {Object} [options={}]
   * @returns {Promise<Array<Object>|null>}
   */
  loadNotifications = (recipientUid, options = {}) => {
    return this.runAsync(
      'loadNotifications',
      () => this.repository.getUserNotifications(recipientUid, options),
      (notifications) => this.notificationsState(notifications)
    );
  };

  /**
   * Invia una nuova notifica
   * @param {Object} notificationData
   * @returns {Promise<Object|null>}
   */
  sendNotification = (notificationData) => {
    return this.runAsync(
      'sendNotification',
      () => this.repository.sendNotification(notificationData),
      (created) => ({
        notifications: [created, ...this.state.notifications]
      })
    );
  };

  /**
   * Contrassegna una notifica come letta
   * @param {string} notificationId
   * @returns {Promise<Object|null>}
   */
  markAsRead = (notificationId) => {
    return this.runAsync(
      'markAsRead',
      () => this.repository.markNotificationAsRead(notificationId),
      (updated) =>
        this.notificationsState(
          this.state.notifications.map((n) => (n.id === notificationId && updated ? updated : n))
        )
    );
  };

  /**
   * Contrassegna tutte le notifiche dell'utente come lette
   * @param {string} recipientUid
   * @returns {Promise<Array<Object>|null>}
   */
  markAllAsRead = (recipientUid) => {
    return this.runAsync(
      'markAllAsRead',
      () => this.repository.markAllNotificationsAsRead(recipientUid),
      (notifications) => this.notificationsState(notifications)
    );
  };

  /**
   * Elimina una notifica
   * @param {string} notificationId
   * @returns {Promise<boolean|null>}
   */
  deleteNotification = (notificationId) => {
    return this.runAsync(
      'deleteNotification',
      async () => {
        await this.repository.deleteNotification(notificationId);
        return true;
      },
      () => this.notificationsState(this.state.notifications.filter((n) => n.id !== notificationId))
    );
  };
}

export default NotificationViewModel;
