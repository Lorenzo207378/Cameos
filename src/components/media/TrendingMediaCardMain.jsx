import PropTypes from 'prop-types';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { Link } from 'react-router-dom';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import '../../css/common/text.css';

const FLIP_SPRING = ({ type: 'spring', duration: 0.72, bounce: 0.12 });
const INSTANT_FLIP = ({ duration: 0 });

/**
 * TrendingMediaCardMain
 * Card centrale attiva per il contenuto principale in tendenza nel carousel (780px x 440px),
 * con flip 3D spring (motion/react) tra fronte (badge, titolo, pulsante dettagli) e retro scuro (titolo, trama, link dettagli).
 *
 * @param {Object} props
 * @param {Object<string, *>} props.media - Dati di presentazione del contenuto multimediale
 * @param {number} props.rank - Posizione in classifica (1-based)
 * @param {string} [props.slideDirection=''] - Direzione animazione slider ('next' | 'prev' | '')
 * @param {boolean} [props.isFlipped=false] - Mostra il retro della card con la trama completa
 * @param {() => void} [props.onToggleFlip] - Alterna fronte e retro della card
 * @param {import('react').AnimationEventHandler<HTMLElement>} [props.onAnimationEnd] - Callback al termine dell'animazione
 */
export default function TrendingMediaCardMain({
  media,
  rank,
  slideDirection = '',
  isFlipped = false,
  onToggleFlip = undefined,
  onAnimationEnd = undefined
}) {
  const { isMobile } = useDevice();
  const { t, formatTranslation } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  if (!media) return null;

  const animationClass = slideDirection ? `slide-anim-${slideDirection}` : '';
  const flipTransition = prefersReducedMotion || slideDirection ? INSTANT_FLIP : FLIP_SPRING;
  const ariaLabel = formatTranslation(t('slider.activeTitleAria'), { title: media.title });
  const detailAriaLabel = `${t('slider.fullDetails')} - ${media.title}`;
  const showPlotAria = formatTranslation(t('slider.showPlotAria'), { title: media.title });
  const showFrontAria = formatTranslation(t('slider.showFrontAria'), { title: media.title });

  return (
    <article
      className={`trending-card-active trending-card-flippable ${isFlipped ? 'is-flipped' : ''} ${animationClass}`.trim()}
      onAnimationEnd={onAnimationEnd}
      aria-label={ariaLabel}
    >
      <motion.div
        className="trending-card-flipper"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={flipTransition}
      >
        {/* FACCIA FRONTALE: backdrop, badge, titolo e pulsante dettagli */}
        <div
          className="trending-card-face trending-card-front"
          inert={isFlipped}
          aria-hidden={isFlipped}
        >
          <div
            className={`trending-card-backdrop ${media.backdropSrc ? 'has-backdrop' : ''}`}
            style={media.backdropSrc ? /** @type {import('react').CSSProperties} */ ({ '--card-backdrop-img': `url("${media.backdropSrc}")` }) : undefined}
          />

          <button
            type="button"
            className="trending-card-flip-trigger"
            onClick={onToggleFlip}
            aria-label={showPlotAria}
            aria-pressed={isFlipped}
          />

          <div className="position-relative z-2 d-flex flex-column justify-content-between trending-card-content pe-none">
            <div className="d-flex flex-column gap-2 trending-card-front-header">
              <div className="d-flex flex-wrap align-items-center gap-1 gap-md-2 trending-card-badges">
                <span className="badge rounded-pill bg-success fw-semibold d-inline-flex align-items-center gap-1">
                  <i className="bi bi-fire text-warning" aria-hidden="true" />
                  <span>{isMobile ? `#${rank}` : formatTranslation(t('slider.topOfMonth'), { rank })}</span>
                </span>
                {media.extraBadge && (
                  <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 border border-secondary border-opacity-25">
                    {media.extraBadge}
                  </span>
                )}
                {Number(media.rating) > 0 && (
                  <span className="badge rounded-pill bg-warning text-dark fw-bold d-inline-flex align-items-center gap-1">
                    <i className="bi bi-star-fill" aria-hidden="true" /> {media.rating}
                  </span>
                )}
              </div>

              <div className="trending-card-middle">
                <h2 className="fw-bold text-white trending-card-title text-lines mb-0" title={media.title}>
                  {media.title}
                </h2>
              </div>
            </div>

            <div className="trending-card-action d-flex justify-content-end w-100">
              <Link
                to={media.detailPath}
                className="btn btn-success rounded-pill fw-bold shadow-sm d-inline-flex align-items-center trending-card-detail-link pe-auto"
                aria-label={detailAriaLabel}
              >
                <i className="bi bi-info-circle-fill" aria-hidden="true" /> {t('slider.fullDetails')}
              </Link>
            </div>
          </div>
        </div>

        {/* FACCIA POSTERIORE: sfondo scuro, titolo in accento, trama e text-button dettagli */}
        <div
          className="trending-card-face trending-card-back"
          inert={!isFlipped}
          aria-hidden={!isFlipped}
        >
          <button
            type="button"
            className="trending-card-flip-trigger"
            onClick={onToggleFlip}
            aria-label={showFrontAria}
            aria-pressed={isFlipped}
          />

          <div className="position-relative z-2 d-flex flex-column justify-content-between gap-2 gap-md-3 trending-card-content pe-none">
            <h3 className="fw-semibold mb-0 trending-card-back-title text-truncate" title={media.title}>
              {media.title}
            </h3>

            <div
              className="trending-card-back-body flex-grow-1 overflow-y-auto pe-auto"
              onClick={onToggleFlip}
            >
              <p className="mb-0 trending-card-back-overview">
                {media.overviewSnippet}
              </p>
            </div>

            <div className="d-flex justify-content-end w-100">
              <Link
                to={media.detailPath}
                className="trending-card-back-link fw-semibold text-decoration-none d-inline-flex align-items-center gap-1 pe-auto"
                aria-label={detailAriaLabel}
              >
                <span>{t('slider.fullDetails')}</span>
                <i className="bi bi-chevron-right" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </article>
  );
}

TrendingMediaCardMain.propTypes = {
  media: PropTypes.object,
  rank: PropTypes.number.isRequired,
  slideDirection: PropTypes.string,
  isFlipped: PropTypes.bool,
  onToggleFlip: PropTypes.func,
  onAnimationEnd: PropTypes.func
};
