import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import ProfileMediaGrid from './ProfileMediaGrid.jsx';

/**
 * Favourites
 * Sezione preferiti dell'utente nella pagina profilo.
 * @param {Object} props
 * @param {Array<any>} [props.items=[]]
 * @param {string} [props.titleLink]
 * @param {boolean} [props.loading=false]
 * @param {string|null} [props.error='']
 * @param {string} [props.emptyLabel]
 * @returns {import('react').JSX.Element}
 */
export default function Favourites({
  items = [],
  titleLink = undefined,
  loading = false,
  error = '',
  emptyLabel = undefined
}) {
  const { t } = useTranslation();

  return (
    <ProfileMediaGrid
      title={t('profile.favoritesTab')}
      titleLink={titleLink}
      items={items}
      loading={loading}
      error={error}
      loadingLabel={t('profile.loadingFavorites')}
      emptyLabel={emptyLabel || t('profile.noFavorites')}
    />
  );
}

Favourites.propTypes = {
  items: PropTypes.array,
  titleLink: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.instanceOf(Error),
    PropTypes.string,
    PropTypes.object
  ]),
  emptyLabel: PropTypes.string
};
