import PropTypes from 'prop-types';
import { useContext, useRef } from 'react';
import { useSingleLineFit } from '../utils/domUtils.js';
import { CarouselHeadingContext } from '../utils/use/useCarouselNavigation.js';
import { Link } from 'react-router-dom';
import '../css/common/text.css';

/**
 * Shared heading typography, including optional category navigation.
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {import('react').ElementType} [props.as='h3']
 * @param {string} [props.className='']
 * @param {string} [props.subtitleClassName='text-success']
 * @param {string} [props.titleLink]
 * @returns {import('react').JSX.Element}
 */
export default function CarouselHeading({ title, subtitle, as = 'h3', className = '', subtitleClassName = 'text-success', titleLink }) {
  const Title = as;
  const headingId = useContext(CarouselHeadingContext);
  const titleRef = useRef(/** @type {HTMLElement|null} */ (null));
  const subtitleRef = useRef(/** @type {HTMLParagraphElement|null} */ (null));
  useSingleLineFit(titleRef, titleRef, [title]);
  useSingleLineFit(subtitleRef, subtitleRef, [subtitle]);
  const text = <Title id={headingId} ref={titleRef} className="text-single-line text-white fw-bold mb-0 media-carousel-title" title={title}>{title}</Title>;
  const arrow = <i className="bi bi-chevron-right text-secondary media-carousel-title-arrow" aria-hidden="true" />;

  return (
    <div className={`carousel-heading ${className}`}>
      {subtitle && <p ref={subtitleRef} className={`text-single-line ${subtitleClassName} text-uppercase fw-bold mb-0`} title={subtitle}>{subtitle}</p>}
      {titleLink ? (
        <Link to={titleLink} className="text-decoration-none text-white media-carousel-title-link">{text}{arrow}</Link>
      ) : text}
    </div>
  );
}

CarouselHeading.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  as: PropTypes.elementType,
  className: PropTypes.string,
  subtitleClassName: PropTypes.string,
  titleLink: PropTypes.string
};
