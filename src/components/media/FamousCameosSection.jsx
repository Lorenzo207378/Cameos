import { useMemo, useRef } from 'react';
import Carousel from '../Carousel.jsx';
import CameoCard from './CameoCard.jsx';
import { useTranslation } from '../../utils/translations.js';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useSingleLineFit } from '../../utils/domUtils.js';
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
 * @param {string} [props.tag] - Etichetta superiore (es. Easter Egg & Curiosità)
 * @param {string} [props.title] - Titolo della sezione (es. Camei della Storia del Cinema)
 * @param {string} [props.icon='bi-camera-reels-fill'] - Icona Bootstrap
 * @param {'success'|'warning'|'info'} [props.theme='success'] - Tema cromatico per badge e icona
 * @param {boolean} [props.loading=false] - Stato di caricamento iniziale
 * @param {Function} [props.onLoadMore] - Callback per caricare la pagina successiva
 * @param {boolean} [props.hasMore=false] - Se ci sono ulteriori pagine
 * @param {boolean} [props.isLoadingMore=false] - Se la pagina successiva è in caricamento
 */
export default function FamousCameosSection({
  cameos = [],
  tag,
  title,
  icon = 'bi-camera-reels-fill',
  theme = 'success',
  loading = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}) {
  const { t } = useTranslation();
  const textWrapRef = useRef(null);
  const titleRef = useRef(null);

  const displayTag = tag || t('carousels.easterEggsTag');
  const displayTitle = title || t('carousels.cameoHistoryTitle');

  const badgeBgClass = theme === 'warning' ? 'bg-warning text-warning' : 'bg-success text-success';
  const textClass = theme === 'warning' ? 'text-warning' : 'text-success';

  const { isMobile } = useDevice();

  // Su mobile, riga singola (1 card per colonna). Su desktop/tablet, 2 righe (2 card per colonna).
  const columns = useMemo(() => {
    const chunkSize = isMobile ? 1 : 2;
    const cols = [];
    for (let i = 0; i < cameos.length; i += chunkSize) {
      cols.push(cameos.slice(i, i + chunkSize));
    }
    return cols;
  }, [cameos, isMobile]);

  useSingleLineFit(textWrapRef, titleRef, [displayTitle, columns.length, loading], 0);

  if (loading && (!cameos || cameos.length === 0)) {
    return (
      <div className="famous-cameos-section rounded-4 card-2pxb-dark-background shadow-lg">
        <div className="famous-cameos-heading d-flex align-items-center mb-2">
          <div
            className={`famous-cameos-icon rounded-circle bg-opacity-25 ${badgeBgClass} d-flex align-items-center justify-content-center flex-shrink-0`}
          >
            <i className={`bi ${icon}`}></i>
          </div>
          <div ref={textWrapRef} className="famous-cameos-heading-text">
            <p className={`${textClass} text-uppercase fw-bold mb-0`} title={displayTag}>{displayTag}</p>
            <h3 ref={titleRef} className="text-white fw-bold mb-0 media-carousel-title" title={displayTitle}>{displayTitle}</h3>
          </div>
        </div>
        <div className="d-flex justify-content-center align-items-center py-4">
          <div className={`spinner-border ${theme === 'warning' ? 'text-warning' : 'text-success'}`} role="status">
            <span className="visually-hidden">{t('common.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!cameos || cameos.length === 0) {
    return null;
  }

  return (
    <div className="famous-cameos-section rounded-4 card-2pxb-dark-background shadow-lg">
      <Carousel
        className="famous-cameos-carousel mb-0"
        headerClassName="align-items-center mb-2"
        trackClassName="famous-cameos-track pt-1 pb-2"
        itemCount={columns.length}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        scrollDistance="page"
        header={
          <div className="famous-cameos-heading d-flex align-items-center">
            <div
              className={`famous-cameos-icon rounded-circle bg-opacity-25 ${badgeBgClass} d-flex align-items-center justify-content-center flex-shrink-0`}
            >
              <i className={`bi ${icon}`}></i>
            </div>
            <div ref={textWrapRef} className="famous-cameos-heading-text">
              <p className={`${textClass} text-uppercase fw-bold mb-0`} title={displayTag}>{displayTag}</p>
              <h3 ref={titleRef} className="text-white fw-bold mb-0 media-carousel-title" title={displayTitle}>{displayTitle}</h3>
            </div>
          </div>
        }
      >
        {columns.map((col, colIdx) => (
          <div
            key={`col-${col[0]?.id || colIdx}-${col[1]?.id || ''}`}
            className="d-flex flex-column gap-2 flex-shrink-0 famous-cameos-column min-w-0"
          >
            {col.map((cameo, idx) => (
              <div
                key={`${cameo.id || idx}-${cameo.mediaId || idx}`}
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
            <div className={`spinner-border spinner-border-sm ${theme === 'warning' ? 'text-warning' : 'text-success'} mb-2`} role="status">
              <span className="visually-hidden">{t('common.loading')}</span>
            </div>
            <span className="small fw-semibold">{t('common.loading')}</span>
          </div>
        )}
      </Carousel>
    </div>
  );
}
