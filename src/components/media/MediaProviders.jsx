import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { WatchProvider } from '../../models/WatchProvider.js';
import '../../css/media/mediaProviders.css';

/**
 * Single watch provider option block (category label badge + provider pills).
 *
 * @param {Object} props
 * @param {string} [props.label] - Option label (e.g. "In abbonamento", "Noleggio")
 * @param {string} [props.badgeClass] - Bootstrap badge class (e.g. "bg-primary")
 * @param {import('../../models/WatchProvider.js').WatchProvider[]} [props.items] - Provider instances already filtered by the media model.
 */
export default function MediaProviders({ label = '', badgeClass = 'bg-secondary', items = [] }) {
  const { langKey } = useTranslation();

  if (!items.length) return null;

  return (
    <div className="provider-category-group">
      <div className="d-flex align-items-center gap-1 flex-shrink-0 provider-category-header">
        <span className={`badge rounded-pill ${badgeClass} provider-category-badge align-content-center`}>
          {label}
        </span>
        <span className="provider-category-count">({items.length})</span>
      </div>

      <div className="provider-pills-list">
        {items.map((provider) => {
          const item = provider instanceof WatchProvider ? provider : new WatchProvider(provider);
          const logoUrl = item.getLogoUrl(langKey);
          const displayName = item.displayName;
          return (
            <span
              key={item.providerId}
              className="provider-pill"
              title={displayName}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={displayName}
                  className="provider-logo"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <i className="bi bi-play-circle provider-fallback-icon" />
              )}
              <span className="provider-name">{displayName}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
