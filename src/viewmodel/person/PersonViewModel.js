import { BaseViewModel } from '../BaseViewModel.js';
import { personRepository as defaultPersonRepository } from '../../repository/person/PersonRepository.js';
import { isExcludedMedia, resolveLocalizedImage, IMAGE_PLACEHOLDERS } from '../../models/utils/index.js';
import { selectPersonCredits } from '../../utils/formatters.js';

/**
 * @typedef {Object} PersonViewModelState
 * @property {import('../../models/Person.js').Person|null} personProfile
 * @property {{ profile: import('../../models/Person.js').Person|null, cast: Array<any>, crew: Array<any> }} filmography
 * @property {boolean} loading
 * @property {string|null} error
 * @property {boolean} isOffline
 * @property {string} language
 */

/**
 * PersonViewModel
 * MVVM ViewModel mediating between PersonRepository and Actor Profile UI components.
 * Holds observable state for actor profile details and sorted filmography.
 */
export class PersonViewModel extends BaseViewModel {
  /** @type {import('../../repository/person/PersonRepository.js').PersonRepository} */
  repository;

  /**
   * @param {import('../../repository/person/PersonRepository.js').PersonRepository} [repository]
   * @param {Object} [options={}]
   * @param {string} [options.language='it-IT']
   */
  constructor(repository = defaultPersonRepository, options = {}) {
    super(
      {
        personProfile: null,
        filmography: { profile: null, cast: [], crew: [] }
      },
      options
    );
    this.repository = repository;
  }

  /**
   * Convenience getter for typed state
   * @override
   * @returns {PersonViewModelState}
   */
  get state() {
    return /** @type {PersonViewModelState} */ (super.state);
  }

  /**
   * Prepare the profile's visible credits and artwork without retrieving data from the view.
   * @param {number|string} personId
   * @param {Array<Object>} [actorCameos=[]]
   * @param {{ creditsMode?: string|null, language?: string }} [options={}]
   */
  getPersonPageData = (personId, actorCameos = [], { creditsMode, language = this.language } = {}) => {
    const { personProfile, filmography } = this.state;
    const person = String(personProfile?.id) === String(personId) ? personProfile : null;
    // Exclude movies/series that appear in cameos from the acting filmography carousel.
    // Creative credits remain visible even when the person also has a cameo in that media.
    const cameos = actorCameos.filter(cameo => !isExcludedMedia(cameo));
    const mode = creditsMode === 'cast' || creditsMode === 'crew'
      ? creditsMode : ['Directing', 'Writing'].includes(person?.knownForDepartment) ? 'crew' : 'cast';
    const credits = String(filmography.profile?.id) === String(personId)
      ? selectPersonCredits(filmography, cameos, mode) : [];
    const imageSources = [
      person?.getProfileUrl(language),
      ...credits.map(item => resolveLocalizedImage(item.posterUrl || item.poster_path, language, IMAGE_PLACEHOLDERS.POSTER)),
      ...cameos.map(cameo => cameo.getPosterUrl?.(language)
        || resolveLocalizedImage(cameo.posterUrl, language, IMAGE_PLACEHOLDERS.POSTER))
    ];
    return { person, cameos, credits, imageSources };
  };

  /**
   * Load person profile details and credits
   * @param {number|string} personId
   * @param {boolean} [appendCredits=true]
   * @param {string} [language]
   * @returns {Promise<import('../../models/Person.js').Person|null>}
   */
  loadPersonProfile = async (personId, appendCredits = true, language = this.language) => {
    return this.runAsync(
      'loadPersonProfile',
      () => this.repository.getPersonProfile({ personId, appendCredits, language }),
      (person) => ({
        personProfile: person
      })
    );
  };

  /**
   * Load person filmography filtered by mediaType and sorted by popularity or date
   * @param {number|string} personId
   * @param {Object} [options={}]
   * @param {string} [options.mediaType='all']
   * @param {string} [options.sortBy='popularity']
   * @param {string} [options.language]
   * @returns {Promise<Object|null>}
   */
  loadPersonFilmography = async (personId, { mediaType = 'all', sortBy = 'popularity', language = this.language } = {}) => {
    return this.runAsync(
      'loadPersonFilmography',
      () => this.repository.getPersonFilmography({ personId, mediaType, sortBy, language }),
      (result) => ({
        personProfile: result.profile,
        filmography: result
      })
    );
  };

  /**
   * Clear currently loaded person state
   */
  clearPerson = () => {
    this.setState({
      personProfile: null,
      filmography: { profile: null, cast: [], crew: [] }
    });
  };
}

export default PersonViewModel;
