import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/media/mediaProviders.css';

/**
 * @typedef {Object} WatchProvider
 * @property {number} provider_id
 * @property {string} provider_name
 * @property {string|null} [logo_path]
 * @property {string|Record<string, string>} [logoUrl]
 */

/**
 * Resolves the logo URL for a streaming provider item.
 * Supports enriched multi-language objects, direct URLs, or TMDb relative paths.
 * @param {WatchProvider} provider
 * @param {string} langKey
 * @returns {string|null}
 */
function resolveProviderLogo(provider, langKey) {
  if (!provider) return null;
  if (provider.logoUrl) {
    if (typeof provider.logoUrl === 'object') {
      return provider.logoUrl[langKey] || provider.logoUrl.it || provider.logoUrl.en || Object.values(provider.logoUrl)[0] || null;
    }
    return provider.logoUrl;
  }
  if (provider.logo_path) {
    return provider.logo_path.startsWith('http')
      ? provider.logo_path
      : `https://image.tmdb.org/t/p/w185${provider.logo_path}`;
  }
  return null;
}

/**
 * Single watch provider option block (category label badge + provider pills).
 *
 * @param {Object} props
 * @param {string} [props.label] - Option label (e.g. "In abbonamento", "Noleggio")
 * @param {string} [props.badgeClass] - Bootstrap badge class (e.g. "bg-primary")
 * @param {WatchProvider[]} [props.items] - List of provider items with provider_id, provider_name, logo_path
 */
export default function MediaProviders({ label = '', badgeClass = 'bg-secondary', items = [] }) {
  const { langKey } = useTranslation();

  if (!items.length) return null;

  return (
    <div className="d-flex flex-column w-100 provider-category-group">
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className={`badge rounded-pill ${badgeClass} provider-category-badge`}>
          {label}
        </span>
        <span className="text-secondary small">({items.length})</span>
      </div>

      <div className="d-flex flex-wrap gap-2">
        {items.map((provider) => {
          const logoUrl = resolveProviderLogo(provider, langKey);
          return (
            <span
              key={provider.provider_id}
              className="provider-pill"
              title={provider.provider_name}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={provider.provider_name}
                  className="provider-logo"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <i className="bi bi-play-circle provider-fallback-icon" />
              )}
              <span className="provider-name">{provider.provider_name}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
