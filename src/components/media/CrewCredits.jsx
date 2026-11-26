import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { dedupeCrew } from '../../utils/formatters.js';
import CreditBadge from './CreditBadge.jsx';
import '../../css/media/crewCredits.css';

/**
 * @param {Object} props
 * @param {Array<{ id?: number|string, name?: string }>} [props.directors=[]]
 * @param {Array<{ id?: number|string, name?: string }>} [props.writers=[]]
 * @param {Array<{ id?: number|string, name?: string }>} [props.creators=[]]
 * @param {string} [props.className='']
 * @returns {import('react').ReactElement|null}
 */
export default function CrewCredits({ directors = [], writers = [], creators = [], className = '' }) {
  const { t } = useTranslation();

  const groups = [
    { key: 'dir', label: t('detail.directing'), labelClass: 'text-success', items: dedupeCrew(directors) },
    { key: 'wri', label: t('detail.writing'), labelClass: 'text-info', items: dedupeCrew(writers) },
    { key: 'creator', label: t('detail.creator'), labelClass: 'text-warning', items: dedupeCrew(creators) }
  ].filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  const onlyCreators = groups.length === 1 && groups[0].key === 'creator';

  return (
    <section className={`glass-card rounded-4 p-3 p-md-4 ${className}`.trim()}>
      <h3 className="h5 text-white fw-bold mb-2 mb-md-3 d-flex align-items-center gap-2 crew-credits-title">
        <i className="bi bi-camera-reels text-success" aria-hidden="true" />
        {onlyCreators ? t('detail.creators') : t('detail.directorsAndWriters')}
      </h3>

      <div className="d-flex flex-column gap-2 gap-md-3">
        {groups.map((group, groupIdx) => (
          <div
            key={group.key}
            className={`crew-credits-row d-flex flex-column flex-md-row align-items-md-center gap-1 gap-md-3 ${groupIdx > 0 ? 'pt-2 pt-md-3 border-top border-white border-opacity-10' : ''}`.trim()}
          >
            <span className={`crew-credits-label ${group.labelClass}`}>{group.label}</span>
            <div className="d-flex flex-wrap gap-1 gap-md-2 align-items-center">
              {group.items.map((member, idx) => (
                <CreditBadge
                  key={member.id ? `${group.key}-${member.id}` : (member.name || idx)}
                  member={member}
                />
              ))}
            </div>
          </div>
        ))}
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
