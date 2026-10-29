import { useTranslation } from '../../utils/translations.js';
import '../../css/media/crewCredits.css';

export default function CrewCredits({ directors = [], writers = [] }) {
  const { t } = useTranslation();

  if (directors.length === 0 && writers.length === 0) return null;

  return (
    <section className="glass-card rounded-4 p-3 p-md-4 mb-4 mb-md-5">
      <h3 className="h5 text-white fw-bold mb-2 mb-md-3 d-flex align-items-center gap-2 crew-credits-title">
        <i className="bi bi-camera-reels text-success" />
        {t('detail.directorsAndWriters')}
      </h3>

      <div className="d-flex flex-column gap-2 gap-md-3">
        {directors.length > 0 && (
          <div className="crew-credits-row">
            <span className="crew-credits-label text-success"> {t('detail.directing')} </span>
            <div className="d-flex flex-wrap gap-1 gap-md-2 align-items-center">
              {directors.map((d, idx) => (
                <span
                  key={d.credit_id || d.id || idx}
                  className="credit-badge"
                >
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {writers.length > 0 && (
          <div className={`crew-credits-row ${directors.length > 0 ? 'pt-2 pt-md-3 border-top border-white border-opacity-10' : ''}`}>
            <span className="crew-credits-label text-info"> {t('detail.writing')} </span>
            <div className="d-flex flex-wrap gap-1 gap-md-2 align-items-center">
              {writers.map((w, idx) => (
                <span
                  key={w.credit_id || w.id || idx}
                  className="credit-badge"
                >
                  {w.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
