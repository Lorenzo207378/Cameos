import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
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

export default function CrewCredits({ directors = [], writers = [], creators = [], className = '' }) {
  const { t } = useTranslation();

  const uniqueDirectors = useMemo(() => dedupeCrew(directors), [directors]);
  const uniqueWriters = useMemo(() => dedupeCrew(writers), [writers]);
  const uniqueCreators = useMemo(() => dedupeCrew(creators), [creators]);

  if (uniqueDirectors.length === 0 && uniqueWriters.length === 0 && uniqueCreators.length === 0) return null;

  const sectionTitle = uniqueCreators.length > 0 && uniqueDirectors.length === 0 && uniqueWriters.length === 0
    ? (t('detail.creators') || 'Creatori')
    : t('detail.directorsAndWriters');

  return (
    <section className={`glass-card rounded-4 p-3 p-md-4 ${className}`.trim()}>
      <h3 className="h5 text-white fw-bold mb-2 mb-md-3 d-flex align-items-center gap-2 crew-credits-title">
        <i className="bi bi-camera-reels text-success" />
        {sectionTitle}
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

        {uniqueCreators.length > 0 && (
          <div className={`crew-credits-row ${(uniqueDirectors.length > 0 || uniqueWriters.length > 0) ? 'pt-2 pt-md-3 border-top border-white border-opacity-10' : ''}`}>
            <span className="crew-credits-label text-warning"> {t('detail.creator')} </span>
            <div className="d-flex flex-wrap gap-1 gap-md-2 align-items-center">
              {uniqueCreators.map((c, idx) => (
                <span
                  key={c.id ? `creator-${c.id}` : (c.credit_id || idx)}
                  className="credit-badge"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

CrewCredits.propTypes = {
  directors: PropTypes.array,
  writers: PropTypes.array,
  creators: PropTypes.array,
  className: PropTypes.string
};
