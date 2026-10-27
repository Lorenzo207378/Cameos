import { Link, useNavigate } from 'react-router-dom';

/**
 * TrendingMediaCardMain
 * Card centrale attiva per il contenuto principale in tendenza nel carousel (780px x 440px).
 *
 * @param {Object} props
 * @param {Object} props.media - Dati di presentazione del contenuto multimediale
 * @param {number} props.rank - Posizione in classifica (1-based)
 * @param {string} [props.slideDirection=''] - Direzione animazione slider ('next' | 'prev' | '')
 * @param {Function} [props.onAnimationEnd] - Callback al termine dell'animazione
 * @param {Function} props.t - Funzione di traduzione
 */
export default function TrendingMediaCardMain({
  media,
  rank,
  slideDirection = '',
  onAnimationEnd,
  t
}) {
  const navigate = useNavigate();

  if (!media) return null;

  const animationClass = slideDirection ? `slide-anim-${slideDirection}` : '';
  const ariaLabel = t('slider.activeTitleAria', { title: media.title });

  const handleClick = (e) => {
    if (!e.target.closest('a, button') && media.detailPath) {
      navigate(media.detailPath);
    }
  };

  return (
    <div
      className={`trending-card-active shadow-lg ${animationClass}`}
      tabIndex={0}
      onAnimationEnd={onAnimationEnd}
      onClick={handleClick}
      aria-label={ariaLabel}
    >
      {/* Sfondo backdrop con gradiente */}
      <div
        className={`trending-card-backdrop ${media.backdropSrc ? 'has-backdrop' : ''}`}
        style={media.backdropSrc ? { '--card-backdrop-img': `url("${media.backdropSrc}")` } : undefined}
      />

      {/* Contenuto centrale prominente */}
      <div className="position-relative z-1 p-4 p-md-5 h-100 d-flex flex-column justify-content-center trending-card-content">
        <div className="col-12 col-md-11 col-lg-10">
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3 trending-card-badges">
            <span className="badge rounded-pill bg-success px-3 py-2 fw-semibold">
              <i className="bi bi-fire me-1 text-warning"></i> {t('slider.topOfMonth', { rank })}
            </span>
            {media.extraBadge && (
              <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 px-3 py-2 border border-secondary border-opacity-25">
                {media.extraBadge}
              </span>
            )}
            {media.rating > 0 && (
              <span className="badge rounded-pill bg-warning text-dark px-3 py-2 fw-bold d-flex align-items-center gap-1">
                <i className="bi bi-star-fill"></i> {media.rating}
              </span>
            )}
            {media.cameoHighlight && (
              <span className="d-inline-flex align-items-center gap-2 fw-semibold text-info trending-cameo-badge">
                <i className="bi bi-person-badge"></i>
                <span>{t('slider.cameoDetected')}</span>
              </span>
            )}
          </div>

          <h2 className="display-6 fw-bold text-white mb-3 trending-card-title">{media.title}</h2>
          <p className="text-white-50 mb-3 trending-card-overview">
            {media.overviewSnippet}
          </p>

          <div className="d-flex flex-wrap gap-3 mt-4 trending-card-action">
            <Link
              to={media.detailPath}
              className="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2"
            >
              <i className="bi bi-info-circle-fill"></i> {t('slider.fullDetails')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
