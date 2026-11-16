import { useTranslation } from '../../contexts/LanguageContext.jsx';
import ProfileMediaGrid from './ProfileMediaGrid.jsx';

/**
 * Watchlist
 * Sezione watchlist dell'utente nella pagina profilo.
 * @param {Object} props
 * @param {Array<any>} [props.items=[]]
 * @param {boolean} [props.loading=false]
 * @param {string|null} [props.error='']
 * @returns {import('react').JSX.Element}
 */
export default function Watchlist({ items = [], loading = false, error = '' }) {
  const { t } = useTranslation();

  return (
    <ProfileMediaGrid
      items={items}
      loading={loading}
      error={error}
      loadingLabel={t('profile.loadingWatchlist')}
      emptyLabel={t('profile.noWatchlist')}
    />
  );
}
