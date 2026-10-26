export default class User {
    uid;
    email;
    username;
    photoURL;
    friends;
    watchlist;
    reviews;
    favorites;
    watched;
    voted;
    createdAt;
    updatedAt;

    constructor(data) {
        this.uid = data.uid || null;
        this.email = data.email || null;
        this.username = data.username || null;
        this.photoURL = data.photoURL || null;
        this.friends = data.friends || [];
        this.watchlist = data.watchlist || [];
        this.reviews = data.reviews || [];
        this.favorites = data.favorites || [];
        this.watched = data.watched || [];
        this.voted = data.voted || { series: [], episodes: [] };
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
    }
}