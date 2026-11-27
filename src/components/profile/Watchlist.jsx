import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import ProfileMediaGrid from './ProfileMediaGrid.jsx';

/**
 * Watchlist
 * Sezione watchlist dell'utente nella pagina profilo.
 * @param {Object} props
 * @param {Array<any>} [props.items=[]]
 * @param {string} [props.titleLink]
 * @param {boolean} [props.loading=false]
 * @param {string|null} [props.error='']
 * @param {string} [props.emptyLabel]
 * @returns {import('react').JSX.Element}
 */
export default function Watchlist({
  items = [],
  titleLink = undefined,
  loading = false,
  error = '',
  emptyLabel = undefined
}) {
  const { t } = useTranslation();

  return (
    <ProfileMediaGrid
      title={t('profile.watchlistTab')}
      titleLink={titleLink}
      items={items}
      loading={loading}
      error={error}
      loadingLabel={t('profile.loadingWatchlist')}
      emptyLabel={emptyLabel || t('profile.noWatchlist')}
    />
  );
}

Watchlist.propTypes = {
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
