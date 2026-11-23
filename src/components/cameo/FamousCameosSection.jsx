import PropTypes from 'prop-types';
import CarouselHeading from '../CarouselHeading.jsx';
import { useMemo } from 'react';
import Carousel from '../Carousel.jsx';
import CameoCard from './CameoCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import '../../css/common/carouselControls.css';
import '../../css/common/text.css';
import '../../css/media/mediaCarousel.css';

/**
 * FamousCameosSection
 * Carousel scrollabile orizzontalmente per visualizzare i camei celebri/leggendari.
 * Su mobile collassa in un carosello a riga singola con card estesa quasi a tutta larghezza e peek visivo.
 * Su desktop mantiene la griglia a due righe.
 *
 * @param {Object} props
 * @param {Array<import('../../models/Cameo.js').Cameo>} [props.cameos=[]] - Lista dei camei da visualizzare
 * @param {boolean} [props.loading=false] - Stato di caricamento iniziale
 * @param {Error|string|Object|null} [props.error=null] - Stato di errore
 * @param {() => any} [props.onLoadMore] - Callback per caricare la pagina successiva
 * @param {boolean} [props.hasMore=false] - Se ci sono ulteriori pagine
 * @param {boolean} [props.isLoadingMore=false] - Se la pagina successiva è in caricamento
 */
export default function FamousCameosSection({
  cameos = [],
  loading = false,
  error = null,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}) {
  const { t } = useTranslation();
  const { isMobile } = useDevice();

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

  // Su mobile, riga singola (1 card per colonna). Su desktop/tablet, 2 righe (2 card per colonna).
  const columns = useMemo(() => {
    const seen = new Set();
    /** @type {Array<import('../../models/Cameo.js').Cameo>} */
    const uniqueCameos = [];
    for (const c of cameos) {
      if (!c) continue;
      const uniqueKey = `${c.id ?? ''}_${c.mediaType ?? ''}_${c.mediaId ?? ''}_${c.character ?? ''}`;
      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        uniqueCameos.push(c);
      }
    }
    const chunkSize = isMobile ? 1 : 2;
    /** @type {Array<Array<import('../../models/Cameo.js').Cameo>>} */
    const cols = [];
    for (let i = 0; i < uniqueCameos.length; i += chunkSize) {
      cols.push(uniqueCameos.slice(i, i + chunkSize));
    }
    return cols;
  }, [cameos, isMobile]);


  if ((loading || error) && (!cameos || cameos.length === 0)) {
    return (
      <div className="famous-cameos-section rounded-4 glass-card shadow-lg" data-catalog-loading={loading && !error}>
        <div className="mb-2">{heading}</div>
        <div className="catalog-cameos-placeholder d-flex justify-content-center align-items-center py-4">
          {error ? <p role="alert" className="text-warning">{t('common.error')}</p> : (
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
        itemCount={columns.length}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        scrollDistance="page"
        header={heading}
      >
        {columns.map(/** @returns {import('react').JSX.Element} */ (col, colIdx) => (
          <div
            key={`col-${colIdx}-${col[0]?.id || ''}-${col[0]?.mediaId || ''}-${col[1]?.id || ''}-${col[1]?.mediaId || ''}`}
            className="d-flex flex-column gap-2 flex-shrink-0 famous-cameos-column min-w-0"
          >
            {col.map(/** @returns {import('react').JSX.Element} */ (cameo, idx) => (
              <div
                key={`card-${colIdx}-${idx}-${cameo.id || ''}-${cameo.mediaId || ''}`}
                className="w-100 min-w-0 d-flex flex-column h-100"
              >
                <CameoCard cameo={cameo} />
              </div>
            ))}
          </div>
        ))}

        {isLoadingMore && (
          <div
            className="d-flex flex-column align-items-center justify-content-center text-white-50 flex-shrink-0 carousel-loading"
          >
            <div className="spinner-border spinner-border-sm text-success mb-2" role="status">
              <span className="visually-hidden">{t('common.loading')}</span>
            </div>
            <span className="small fw-semibold">{t('common.loading')}</span>
          </div>
        )}
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
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool
};
