import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/tv/tvSeasonsSection.css';

/**
 * SeasonSelectionDropDown
 * Dropdown a pillola compatto per la selezione della stagione in modalità mobile.
 */
export default function SeasonSelectionDropDown({
  seasonsCount,
  selectedSeasonNumber = 1,
  onSelectSeason,
  className = ''
}) {
  const { t, formatTranslation } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Chiusura automatica al click esterno o pressione Escape
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
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

  const handleSelect = (seasonNum) => {
    setIsOpen(false);
    onSelectSeason?.(seasonNum);
  };

  if (!seasonsCount || seasonsCount <= 0) return null;

  return (
    <div
      ref={containerRef}
      className={`season-selection-dropdown-container position-relative d-inline-block ${className}`.trim()}
    >
      {/* Pillola trigger del dropdown con lo stesso stile del pill della stagione selezionata */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="btn btn-success text-white rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 text-nowrap fw-semibold small shadow-sm season-dropdown-pill"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <i
            className={`bi bi-chevron-down small text-white season-dropdown-chevron ${
                isOpen ? 'is-open' : ''
            }`}
        />
        <span>
          {formatTranslation(t('detail.seasonLabel'), { number: selectedSeasonNumber })}
        </span>

      </button>

      {/* Menu dropdown a comparsa */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="season-dropdown-menu position-absolute end-0 mt-2 py-1 rounded-3 shadow-lg bg-dark border border-secondary border-opacity-25"
            role="listbox"
          >
            {Array.from({ length: seasonsCount }).map((_, idx) => {
              const seasonNum = idx + 1;
              const isSelected = seasonNum === selectedSeasonNumber;
              return (
                <button
                  key={seasonNum}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(seasonNum)}
                  className={`dropdown-item px-3 py-2 text-start small w-100 border-0 bg-transparent d-flex justify-content-between align-items-center season-dropdown-item ${
                    isSelected ? 'text-success fw-bold' : 'text-white'
                  }`}
                >
                  <span>
                    {formatTranslation(t('detail.seasonLabel'), { number: seasonNum })}
                  </span>
                  {isSelected && <i className="bi bi-check2 text-success ms-2" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

SeasonSelectionDropDown.propTypes = {
  seasonsCount: PropTypes.number.isRequired,
  selectedSeasonNumber: PropTypes.number,
  onSelectSeason: PropTypes.func.isRequired,
  className: PropTypes.string
};
