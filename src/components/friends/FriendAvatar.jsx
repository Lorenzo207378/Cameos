import PropTypes from 'prop-types';
import { useState } from 'react';
import '../../css/common/FriendAvatar.css';

const CINEMA_PALETTES = [
  { bg: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', ring: '#10b981' },
  { bg: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)', ring: '#f59e0b' },
  { bg: 'linear-gradient(135deg, #164e63 0%, #0e7490 100%)', ring: '#22d3ee' },
  { bg: 'linear-gradient(135deg, #7f1d1d 0%, #be123c 100%)', ring: '#fb7185' },
  { bg: 'linear-gradient(135deg, #3b0764 0%, #6d28d9 100%)', ring: '#a78bfa' }
];

const RING_VARIANTS = {
  emerald: '#10b981',
  amber: '#f59e0b',
  muted: 'rgba(148, 163, 184, 0.55)'
};

const pickCinemaPalette = (seedString) => {
  const input = String(seedString || 'cameos');
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash * 31) + input.charCodeAt(i)) >>> 0;
  }
  return CINEMA_PALETTES[hash % CINEMA_PALETTES.length];
};

const getMonogram = (label) => {
  const cleaned = String(label || '').trim();
  if (!cleaned) return 'U';
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  const alnum = cleaned.replace(/^@+/, '');
  return (alnum.slice(0, 2) || cleaned.charAt(0)).toUpperCase();
};

/**
 * FriendAvatar
 * Avatar utente con doppio anello cinematografico e palette deterministica su monogramma.
 * @param {Object} props
 * @param {string|null} [props.photoURL]
 * @param {string} [props.name='']
 * @param {string} [props.seed='']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {'auto'|'emerald'|'amber'|'muted'} [props.ringVariant='auto']
 * @returns {import('react').JSX.Element}
 */
export default function FriendAvatar({
  photoURL = undefined,
  name = '',
  seed = '',
  size = 'md',
  ringVariant = 'auto'
}) {
  const [failedUrl, setFailedUrl] = useState(/** @type {string|null} */ (null));
  const showImage = Boolean(photoURL && failedUrl !== photoURL);
  const palette = pickCinemaPalette(seed || name);
  const ringColor = RING_VARIANTS[ringVariant] || palette.ring;

  const avatarStyle = /** @type {import('react').CSSProperties} */ ({
    '--avatar-bg': palette.bg,
    '--avatar-ring': ringColor
  });

  return (
    <div
      className={`rounded-circle text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0 overflow-hidden friend-spotlight-avatar friend-avatar-${size}`}
      style={avatarStyle}
    >
      {showImage ? (
        <img
          src={photoURL}
          alt={name || 'Avatar'}
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          className="rounded-circle friend-avatar-img"
          onError={() => setFailedUrl(photoURL || null)}
        />
      ) : (
        <span className="friend-avatar-monogram">{getMonogram(name)}</span>
      )}
    </div>
  );
}

FriendAvatar.propTypes = {
  photoURL: PropTypes.string,
  name: PropTypes.string,
  seed: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  ringVariant: PropTypes.oneOf(['auto', 'emerald', 'amber', 'muted'])
};
