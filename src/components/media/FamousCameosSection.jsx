import { useMemo } from 'react';
import Carousel from '../Carousel.jsx';
import CameoCard from './CameoCard.jsx';
import { useTranslation } from '../../utils/translations.js';
import '../../css/media/mediaCarousel.css';

/**
 * FamousCameosSection
 * Carousel a due righe scrollabile orizzontalmente per visualizzare i camei celebri/leggendari.
 * Supporta paginazione on-demand con caricamento della pagina successiva all'avvicinarsi della fine della traccia.
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

  const displayTag = tag || t('carousels.easterEggsTag');
  const displayTitle = title || t('carousels.cameoHistoryTitle');

  const badgeBgClass = theme === 'warning' ? 'bg-warning text-warning' : 'bg-success text-success';
  const textClass = theme === 'warning' ? 'text-warning' : 'text-success';

  const columns = useMemo(() => {
    const cols = [];
    for (let i = 0; i < cameos.length; i += 2) {
      cols.push(cameos.slice(i, i + 2));
    }
    return cols;
  }, [cameos]);

  if (loading && (!cameos || cameos.length === 0)) {
    return (
      <div className="mb-5 p-4 p-md-5 rounded-4 card-2pxb-dark-background shadow-lg">
        <div className="d-flex align-items-center gap-3 mb-4">
          <div
            className={`rounded-circle bg-opacity-25 ${badgeBgClass} fs-3 d-flex align-items-center justify-content-center flex-shrink-0`}
            style={{ width: '56px', height: '56px' }}
          >
            <i className={`bi ${icon}`}></i>
          </div>
          <div>
            <p className={`${textClass} text-uppercase small fw-bold mb-1`}>{displayTag}</p>
            <h3 className="h3 text-white fw-bold mb-0">{displayTitle}</h3>
          </div>
        </div>
        <div className="d-flex justify-content-center align-items-center py-5">
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
    <div className="mb-5 p-4 p-md-5 rounded-4 card-2pxb-dark-background shadow-lg">
      <Carousel
        className="famous-cameos-carousel mb-0"
        headerClassName="align-items-center mb-4"
        trackClassName="famous-cameos-track pt-2 pb-2"
        itemCount={columns.length}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        scrollDistance="page"
        header={
          <div className="d-flex align-items-center gap-3">
            <div
              className={`rounded-circle bg-opacity-25 ${badgeBgClass} fs-3 d-flex align-items-center justify-content-center flex-shrink-0`}
              style={{ width: '56px', height: '56px' }}
            >
              <i className={`bi ${icon}`}></i>
            </div>
            <div>
              <p className={`${textClass} text-uppercase small fw-bold mb-1`}>{displayTag}</p>
              <h3 className="h3 text-white fw-bold mb-0">{displayTitle}</h3>
            </div>
          </div>
        }
      >
        {columns.map((col, colIdx) => (
          <div
            key={`col-${col[0]?.id || colIdx}-${col[1]?.id || ''}`}
            className="d-flex flex-column gap-3 flex-shrink-0 famous-cameos-column min-w-0"
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
            className="d-flex flex-column align-items-center justify-content-center text-white-50 flex-shrink-0 px-4"
            style={{ width: '160px', minHeight: '340px', scrollSnapAlign: 'start' }}
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
