import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { formatNumber } from '../../utils/formatters.js';
import CountUp from '../reactbits/CountUp/CountUp.jsx';

/**
 * MediaRatingPill
 * Badge pill riutilizzabile per valutazione media e numero di voti con icona sorgente a sinistra.
 * @param {Object} props
 * @param {string} props.iconSrc
 * @param {string} [props.iconAlt='']
 * @param {'tmdb'|'cameos'} [props.iconVariant='tmdb']
 * @param {number|string} [props.rating=0]
 * @param {number} [props.voteCount=0]
 * @param {string} [props.label='']
 * @returns {import('react').JSX.Element}
 */
export default function MediaRatingPill({
  iconSrc,
  iconAlt = '',
  iconVariant = 'tmdb',
  rating = 0,
  voteCount = 0,
  label = ''
}) {
  const { t, langKey } = useTranslation();
  const numericRating = Number(rating) || 0;
  const formattedRating = numericRating.toFixed(1);
  const numericVotes = Number(voteCount) || 0;
  const formattedVotes = formatNumber(numericVotes, langKey);
  const voteWord = numericVotes === 1 ? t('detail.voteSingle') : t('detail.votes');
  const accessibleText = `${label ? `${label}: ` : ''}${formattedRating} (${formattedVotes} ${voteWord})`;

  return (
    <span
      className={`badge rounded-pill fw-bold d-inline-flex align-items-center gap-1 gap-sm-2 shadow-sm media-overview-rating-badge is-${iconVariant}`}
      aria-label={accessibleText}
      title={accessibleText}
    >
      <span className={`media-rating-source-chip is-${iconVariant}`} aria-hidden={!iconAlt}>
        <img src={iconSrc} alt={iconAlt} className="media-rating-source-icon" decoding="async" />
      </span>
      <i className="bi bi-star-fill media-rating-star flex-shrink-0" aria-hidden="true" />
      <span className="media-rating-value">
        {numericRating > 0 ? (
          <CountUp
            to={numericRating}
            decimals={1}
            duration={2.1}
            delay={0.25}
            trigger="view"
            className="media-rating-countup"
          />
        ) : (
          formattedRating
        )}
      </span>
      <span className="media-rating-votes">
        ({formattedVotes} {voteWord})
      </span>
    </span>
  );
}

MediaRatingPill.propTypes = {
  iconSrc: PropTypes.string.isRequired,
  iconAlt: PropTypes.string,
  iconVariant: PropTypes.oneOf(['tmdb', 'cameos']),
  rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  voteCount: PropTypes.number,
  label: PropTypes.string
};
