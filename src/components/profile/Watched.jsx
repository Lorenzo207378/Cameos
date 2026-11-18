import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import ProfileMediaGrid from './ProfileMediaGrid.jsx';

/**
 * Watched
 * Sezione dei contenuti segnati come visti nella pagina profilo.
 * @param {Object} props
 * @param {Array<any>} [props.items=[]]
 * @param {string} [props.titleLink]
 * @param {boolean} [props.loading=false]
 * @param {string|null} [props.error='']
 * @returns {import('react').JSX.Element}
 */
export default function Watched({ items = [], titleLink = undefined, loading = false, error = '' }) {
  const { t } = useTranslation();

  return (
    <ProfileMediaGrid
      title={t('profile.watchedTab')}
      titleLink={titleLink}
      items={items}
      loading={loading}
      error={error}
      loadingLabel={t('profile.loadingWatched')}
      emptyLabel={t('profile.noWatched')}
    />
  );
}

Watched.propTypes = {
  items: PropTypes.array,
  titleLink: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.instanceOf(Error),
    PropTypes.string,
    PropTypes.object
  ])
};
