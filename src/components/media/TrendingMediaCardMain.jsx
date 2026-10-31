import { formatTranslation } from '../../utils/translationUtils.js';
import { Link, useNavigate } from 'react-router-dom';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import '../../css/common/text.css';

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
  const { isMobile } = useDevice();

  if (!media) return null;

  const animationClass = slideDirection ? `slide-anim-${slideDirection}` : '';
  const ariaLabel = formatTranslation(t('slider.activeTitleAria'), { title: media.title });

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
      {/* Sfondo backdrop con gradiente cinematografico */}
      <div
        className={`trending-card-backdrop ${media.backdropSrc ? 'has-backdrop' : ''}`}
        style={media.backdropSrc ? { '--card-backdrop-img': `url("${media.backdropSrc}")` } : undefined}
      />

      {/* Contenuto centrale prominente */}
      <div className="position-relative z-1 d-flex flex-column justify-content-between trending-card-content">
        <div className="trending-card-copy">
          {/* Riga pill in alto: su mobile solo "TOP #rank", su desktop testo completo */}
          <div className="d-flex flex-wrap align-items-center trending-card-badges">
            <span className="badge rounded-pill bg-success fw-semibold d-inline-flex align-items-center gap-1">
              <i className="bi bi-fire text-warning"></i>
              <span>{isMobile ? `#${rank}` : formatTranslation(t('slider.topOfMonth'), { rank })}</span>
            </span>
            {media.extraBadge && (
              <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 border border-secondary border-opacity-25">
                {media.extraBadge}
              </span>
            )}
            {media.rating > 0 && (
              <span className="badge rounded-pill bg-warning text-dark fw-bold d-inline-flex align-items-center gap-1">
                <i className="bi bi-star-fill"></i> {media.rating}
              </span>
            )}
            {media.cameoHighlight && (
              <span className="d-inline-flex align-items-center gap-1 fw-semibold text-info trending-cameo-badge">
                <i className="bi bi-person-badge"></i>
                <span>{t('slider.cameoDetected')}</span>
              </span>
            )}
          </div>

          {/* Titolo in risalto e trama secondaria discreta */}
          <div className="trending-card-middle">
            <h2 className="fw-bold text-white trending-card-title text-lines" title={media.title}>
              {media.title}
            </h2>

            <div className="trending-card-overview-space">
              <p className="mb-0 trending-card-overview text-lines">
                {media.overviewSnippet}
              </p>
            </div>
          </div>

          {/* Pulsante "Dettagli completi": posizionato sempre in basso a destra */}
          <div className="trending-card-action">
            <Link
              to={media.detailPath}
              className="btn btn-success rounded-pill fw-bold shadow-sm d-inline-flex align-items-center"
            >
              <i className="bi bi-info-circle-fill"></i> {t('slider.fullDetails')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
