import { Review } from '../models/Review.js';

// Rich curated mock community reviews
export const INITIAL_COMMUNITY_REVIEWS = [
  {
    id: 'rev_comm_1',
    uid: 'user_clara_99',
    username: 'Clara Cinefila',
    userPhotoURL: null,
    targetKey: 'movie:299534',
    mediaType: 'movie',
    mediaId: 299534,
    rating: 5,
    text: 'Il miglior finale possibile per dieci anni di MCU. Il cameo di Stan Lee negli anni 70 fa venire i brividi ad ogni visione.',
    likes: ['user_marco_44', 'user_elena_12', 'user_samuele_7'],
    createdAt: '2026-03-10T14:20:00.000Z'
  },
  {
    id: 'rev_comm_2',
    uid: 'user_marco_44',
    username: 'Marco Movies',
    userPhotoURL: null,
    targetKey: 'movie:299534',
    mediaType: 'movie',
    mediaId: 299534,
    rating: 5,
    text: 'Battaglia finale grandiosa e ritmo perfetto. Tre ore che volano!',
    likes: ['user_clara_99'],
    createdAt: '2026-03-12T18:45:00.000Z'
  },
  {
    id: 'rev_comm_3',
    uid: 'user_elena_12',
    username: 'Elena Rossi',
    userPhotoURL: null,
    targetKey: 'tv:1396',
    mediaType: 'tv',
    mediaId: 1396,
    rating: 5,
    text: 'Capolavoro assoluto della televisione moderna. Bryan Cranston e Aaron Paul leggendari, regia di Vince Gilligan da manuale.',
    likes: ['user_clara_99', 'user_luca_88', 'user_gianni_21'],
    createdAt: '2026-03-01T10:15:00.000Z'
  },
  {
    id: 'rev_comm_4',
    uid: 'user_sheldon_fan',
    username: 'Sheldonologer',
    userPhotoURL: null,
    targetKey: 'episode:1418:3:16',
    mediaType: 'episode',
    mediaId: 1418,
    seasonNumber: 3,
    episodeNumber: 16,
    rating: 5,
    text: 'L\'episodio in cui Sheldon si presenta a casa di Stan Lee è storia della commedia nerd! "La mia vestaglia dei Fantastici 4 non mente."',
    likes: ['user_elena_12', 'user_clara_99'],
    createdAt: '2026-02-28T22:30:00.000Z'
  },
  {
    id: 'rev_comm_5',
    uid: 'user_luca_88',
    username: 'Luca BingeWatcher',
    userPhotoURL: null,
    targetKey: 'tv:1418',
    mediaType: 'tv',
    mediaId: 1418,
    rating: 4,
    text: 'Le prime stagioni sono geniali. Le guest star (Stan Lee, Stephen Hawking, Wil Wheaton) sono il valore aggiunto unico.',
    likes: ['user_sheldon_fan'],
    createdAt: '2026-02-15T09:00:00.000Z'
  }
];

export function getReviewsForTarget(targetKey) {
  return INITIAL_COMMUNITY_REVIEWS.filter((r) => r.targetKey === targetKey).map((r) => new Review(r));
}
