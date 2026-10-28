import CameoCard from '../media/CameoCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';

export default function ActorCameos({ cameos = [] }) {
  const { t } = useTranslation();
  return (
    <>
      {/* SEZIONE: CAMEI DELLA CARRIERA */}
      {cameos.length > 0 && (
        <section className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-stars text-warning fs-4"></i>
            <h2 className="h4 text-white fw-bold mb-0">{t('detail.memorableCameos')}</h2>
          </div>
          <div className="row g-4">
            {cameos.map((c) => (
              <div className="col-12 col-md-6" key={c.id + '-' + c.mediaTitle}>
                <CameoCard cameo={c} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
