import { useLayoutEffect, useRef } from 'react';
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
  const overviewSpaceRef = useRef(null);
  const overviewRef = useRef(null);

  useLayoutEffect(() => {
    const space = overviewSpaceRef.current;
    const overview = overviewRef.current;
    if (!space || !overview) return undefined;

    // Fit only complete lines in the bounded space between the title and the action button.
    // Su mobile limitato a massimo 2/3 righe con troncamento '...'.
    const fitOverview = () => {
      const computed = getComputedStyle(overview);
      const lineHeight =
        parseFloat(computed.lineHeight) ||
        (parseFloat(computed.fontSize) || 11) * 1.35;
      if (!lineHeight) return;

      const availableHeight = space.clientHeight;
      const maxAllowed = isMobile ? 3 : 5;
      const computedLines = Math.floor(availableHeight / lineHeight);
      const lines = Math.min(maxAllowed, Math.max(1, computedLines));

      if (availableHeight < lineHeight * 0.8) {
        overview.style.visibility = 'hidden';
        overview.style.setProperty('--text-max-lines', '1');
        overview.style.webkitLineClamp = '1';
      } else {
        const lineStr = String(lines);
        overview.style.visibility = 'visible';
        overview.style.display = '-webkit-box';
        overview.style.webkitBoxOrient = 'vertical';
        overview.style.overflow = 'hidden';
        overview.style.textOverflow = 'ellipsis';
        overview.style.setProperty('--text-max-lines', lineStr);
        overview.style.webkitLineClamp = lineStr;
      }
    };

    fitOverview();
    const observer = new ResizeObserver(fitOverview);
    observer.observe(space);
    observer.observe(overview);
    window.addEventListener('resize', fitOverview, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fitOverview);
    };
  }, [media, isMobile]);

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
      {/* Sfondo backdrop con gradiente */}
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
              <span>{isMobile ? `TOP #${rank}` : formatTranslation(t('slider.topOfMonth'), { rank })}</span>
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

          {/* Titolo e trama: su mobile centrati verticalmente tra riga pill e pulsante */}
          <div className="trending-card-middle">
            <h2 className="fw-bold text-white trending-card-title text-lines" title={media.title}>
              {media.title}
            </h2>

            <div ref={overviewSpaceRef} className="trending-card-overview-space">
              <p ref={overviewRef} className="text-white-50 mb-0 trending-card-overview text-lines">
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
