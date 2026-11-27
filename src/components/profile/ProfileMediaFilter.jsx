import { useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslation } from '../../contexts/LanguageContext.jsx';

/**
 * ProfileMediaFilter
 * Box compatto con icona filtro e dropdown per filtrare tutte le liste preferenziali per tipo di media.
 * @param {Object} props
 * @param {'all'|'movie'|'tv'|'season'|'episode'} [props.value='all']
 * @param {(nextValue: 'all'|'movie'|'tv'|'season'|'episode') => void} props.onChange
 * @returns {import('react').ReactElement}
 */
export default function ProfileMediaFilter({ value = 'all', onChange }) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const triggerRef = useRef(/** @type {HTMLButtonElement|null} */ (null));
  const listboxId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (containerRef.current && event.target instanceof Node && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  /** @type {Array<{ value: 'all'|'movie'|'tv'|'season'|'episode', label: string, icon: string }>} */
  const options = [
    { value: 'all', label: t('profile.filterAll'), icon: 'bi-grid' },
    { value: 'movie', label: t('profile.filterMovies'), icon: 'bi-film' },
    { value: 'tv', label: t('profile.filterSeries'), icon: 'bi-tv' },
    { value: 'season', label: t('profile.filterSeasons'), icon: 'bi-layers' },
    { value: 'episode', label: t('profile.filterEpisodes'), icon: 'bi-play-btn' }
  ];

  const activeOption = options.find((opt) => opt.value === value) || options[0];
  const isFiltered = activeOption.value !== 'all';
  const activeLabel = activeOption.label;

  /** @param {'all'|'movie'|'tv'|'season'|'episode'} nextValue */
  const handleSelect = (nextValue) => {
    setIsOpen(false);
    onChange(nextValue);
  };

  return (
    <div ref={containerRef} className="profile-filter-box position-relative d-inline-flex align-items-center gap-2 flex-shrink-0">
      <span className="profile-filter-current-label fw-semibold text-nowrap">{activeLabel}</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`profile-filter-trigger d-inline-flex align-items-center justify-content-center gap-2${isFiltered ? ' is-filtered' : ''}${isOpen ? ' is-open' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={`${t('profile.filterLabel')}: ${activeLabel}`}
        title={`${t('profile.filterLabel')}: ${activeLabel}`}
      >
        <i className={`bi ${isFiltered ? 'bi-funnel-fill text-success' : 'bi-funnel'}`} aria-hidden="true" />
        <i
          className={`bi bi-chevron-down profile-filter-chevron${isOpen ? ' is-open' : ''}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={listboxId}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="profile-filter-menu position-absolute end-0 mt-2"
            role="listbox"
            aria-label={t('profile.filterLabel')}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === activeOption.value}
                onClick={() => handleSelect(option.value)}
                className={`profile-filter-item w-100 border-0 d-flex align-items-center justify-content-between gap-2 text-start${
                  option.value === activeOption.value ? ' is-active' : ''
                }`}
              >
                <span className="d-inline-flex align-items-center gap-2 min-w-0">
                  <i className={`bi ${option.icon} flex-shrink-0`} aria-hidden="true" />
                  <span className="text-truncate">{option.label}</span>
                </span>
                {option.value === activeOption.value && (
                  <i className="bi bi-check2 text-success flex-shrink-0" aria-hidden="true" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

ProfileMediaFilter.propTypes = {
  value: PropTypes.oneOf(['all', 'movie', 'tv', 'season', 'episode']),
  onChange: PropTypes.func.isRequired
};
