import { useRef } from 'react';
import { useSingleLineFit } from '../utils/domUtils.js';
import { Link } from 'react-router-dom';
import '../css/common/text.css';

/** Shared heading typography, including optional category navigation. */
export default function CarouselHeading({ title, subtitle, as = 'h3', className = '', subtitleClassName = 'text-success', titleLink, onTitleClick }) {
  const Title = as;
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  useSingleLineFit(titleRef, titleRef, [title]);
  useSingleLineFit(subtitleRef, subtitleRef, [subtitle]);
  const text = <Title ref={titleRef} className="text-single-line text-white fw-bold mb-0 media-carousel-title" title={title}>{title}</Title>;
  const arrow = <i className="bi bi-chevron-right text-secondary media-carousel-title-arrow" aria-hidden="true" />;

  return (
    <div className={`carousel-heading ${className}`}>
      {subtitle && <p ref={subtitleRef} className={`text-single-line ${subtitleClassName} text-uppercase fw-bold mb-0`} title={subtitle}>{subtitle}</p>}
      {titleLink ? (
        <Link to={titleLink} className="text-decoration-none text-white media-carousel-title-link">{text}{arrow}</Link>
      ) : onTitleClick ? (
        <button type="button" onClick={onTitleClick} className="btn btn-link p-0 text-decoration-none text-white media-carousel-title-link">{text}{arrow}</button>
      ) : text}
    </div>
  );
}
