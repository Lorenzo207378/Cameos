import { useMemo } from 'react';
import { useTranslation } from '../../utils/translations.js';
import '../../css/media/crewCredits.css';

/**
 * Deduplicate crew members by ID or name while preserving list order
 * @param {Array<Object>} [list=[]]
 * @returns {Array<Object>}
 */
const dedupeCrew = (list) => {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.filter((member) => {
    const key = member?.id ? String(member.id) : (member?.name || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function CrewCredits({ directors = [], writers = [] }) {
  const { t } = useTranslation();

  const uniqueDirectors = useMemo(() => dedupeCrew(directors), [directors]);
  const uniqueWriters = useMemo(() => dedupeCrew(writers), [writers]);

  if (uniqueDirectors.length === 0 && uniqueWriters.length === 0) return null;

  return (
    <section className="glass-card rounded-4 p-3 p-md-4 mb-4 mb-md-5">
      <h3 className="h5 text-white fw-bold mb-2 mb-md-3 d-flex align-items-center gap-2 crew-credits-title">
        <i className="bi bi-camera-reels text-success" />
        {t('detail.directorsAndWriters')}
      </h3>

      <div className="d-flex flex-column gap-2 gap-md-3">
        {uniqueDirectors.length > 0 && (
          <div className="crew-credits-row">
            <span className="crew-credits-label text-success"> {t('detail.directing')} </span>
            <div className="d-flex flex-wrap gap-1 gap-md-2 align-items-center">
              {uniqueDirectors.map((d, idx) => (
                <span
                  key={d.id ? `dir-${d.id}` : (d.credit_id || idx)}
                  className="credit-badge"
                >
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {uniqueWriters.length > 0 && (
          <div className={`crew-credits-row ${uniqueDirectors.length > 0 ? 'pt-2 pt-md-3 border-top border-white border-opacity-10' : ''}`}>
            <span className="crew-credits-label text-info"> {t('detail.writing')} </span>
            <div className="d-flex flex-wrap gap-1 gap-md-2 align-items-center">
              {uniqueWriters.map((w, idx) => (
                <span
                  key={w.id ? `wri-${w.id}` : (w.credit_id || idx)}
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
