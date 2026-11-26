import PropTypes from 'prop-types';
import CarouselHeading from '../CarouselHeading.jsx';
import Carousel from '../Carousel.jsx';
import CameoCard from './CameoCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/common/carouselControls.css';
import '../../css/common/text.css';
import '../../css/media/mediaCarousel.css';

/**
 * FamousCameosSection
 * Carousel scrollabile orizzontalmente per visualizzare i camei celebri/leggendari.
 * Su desktop usa CSS Grid a due righe; su mobile collassa in riga singola via media query.
 *
 * @param {Object} props
 * @param {Array<import('../../models/Cameo.js').Cameo>} [props.cameos=[]] - Lista dei camei da visualizzare
 * @param {boolean} [props.loading=false] - Stato di caricamento iniziale
 * @param {Error|string|Object|null} [props.error=null] - Stato di errore
 * @param {() => any} [props.onLoadMore] - Callback per caricare la pagina successiva
 * @param {() => void} [props.onRetry] - Callback per riprovare il caricamento in caso di errore
 * @param {boolean} [props.hasMore=false] - Se ci sono ulteriori pagine
 * @param {boolean} [props.isLoadingMore=false] - Se la pagina successiva è in caricamento
 */
export default function FamousCameosSection({
  cameos = [],
  loading = false,
  error = null,
  onLoadMore,
  onRetry = undefined,
  hasMore = false,
  isLoadingMore = false
}) {
  const { t } = useTranslation();

  const heading = (
    <div className="famous-cameos-heading d-flex align-items-center">
      <div className="famous-cameos-icon rounded-circle bg-opacity-25 bg-success text-success d-flex align-items-center justify-content-center flex-shrink-0">
        <i className="bi bi-camera-reels-fill" aria-hidden="true"></i>
      </div>
      <CarouselHeading
        className="famous-cameos-heading-text"
        title={t('carousels.cameoHistoryTitle')}
        subtitle={t('carousels.easterEggsTag')}
      />
    </div>
  );

  if ((loading || error) && (!cameos || cameos.length === 0)) {
    return (
      <div className="famous-cameos-section rounded-4 glass-card shadow-lg" data-catalog-loading={loading && !error}>
        <div className="mb-2">{heading}</div>
        <div className="catalog-cameos-placeholder d-flex justify-content-center align-items-center py-4">
          {error ? (
            <div className="text-center" role="alert">
              <p className="text-warning mb-2">{t('common.error')}</p>
              {onRetry && (
                <button type="button" className="btn btn-outline-success rounded-pill" onClick={onRetry}>
                  {t('common.retry')}
                </button>
              )}
            </div>
          ) : (
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">{t('common.loading')}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!cameos || cameos.length === 0) {
    return null;
  }

  return (
    <div className="famous-cameos-section rounded-4 glass-card shadow-lg">
      <Carousel
        className="famous-cameos-carousel mb-0"
        headerClassName="align-items-center mb-2"
        trackClassName="famous-cameos-track pt-1 pb-2"
        itemCount={cameos.length}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        scrollDistance="page"
        header={heading}
      >
        {cameos.map((cameo, idx) => (
          <div
            key={`card-${cameo?.id ?? ''}-${cameo?.mediaId ?? ''}-${idx}`}
            className="famous-cameos-item min-w-0 d-flex flex-column"
          >
            <CameoCard cameo={cameo} />
          </div>
        ))}
      </Carousel>
    </div>
  );
}

FamousCameosSection.propTypes = {
  cameos: PropTypes.array,
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.instanceOf(Error),
    PropTypes.string,
    PropTypes.object
  ]),
  onLoadMore: PropTypes.func,
  onRetry: PropTypes.func,
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool
};
