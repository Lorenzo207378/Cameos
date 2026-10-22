/**
 * User
 * Modello di dominio che rappresenta l'utente dell'applicazione.
 */
export class User {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    this.uid = data.uid || null;
    this.email = data.email || null;
    this.username = data.username || null;
    this.photoURL = data.photoURL || null;
    this.language = data.language || 'it-IT';
    this.friends = Array.isArray(data.friends) ? [...data.friends] : [];
    this.watchlist = Array.isArray(data.watchlist) ? [...data.watchlist] : [];
    this.favorites = Array.isArray(data.favorites) ? [...data.favorites] : [];
    this.watched = Array.isArray(data.watched) ? [...data.watched] : [];
    this.reviews = Array.isArray(data.reviews) ? [...data.reviews] : [];
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }
}

export default User;
