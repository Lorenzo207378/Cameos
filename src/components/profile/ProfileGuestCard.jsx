import { Link } from 'react-router-dom';
import { Card } from 'react-bootstrap';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useGoBack } from '../../utils/domUtils.js';
import SpotlightCard from '../reactbits/SpotlightCard.jsx';

/**
 * ProfileGuestCard
 * Prompt mostrato nella pagina profilo quando l'utente non è autenticato.
 * @param {Object} [props]
 * @param {() => void} [props.onBack]
 * @returns {import('react').JSX.Element}
 */
export default function ProfileGuestCard({ onBack = undefined }) {
  const { t } = useTranslation();
  const fallbackBack = useGoBack('/Cameos/');
  const handleBack = onBack || fallbackBack;

  return (
    <div className="profile-page d-flex flex-column flex-grow-1">
      <div className="profile-container d-flex flex-column flex-grow-1">
        <div className="profile-top-bar d-flex align-items-center mb-3">
          <button
            type="button"
            onClick={handleBack}
            className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn flex-shrink-0"
            aria-label={t('detail.goBack')}
            title={t('detail.goBack')}
          >
            <i className="bi bi-arrow-left text-white" aria-hidden="true" />
          </button>
        </div>
        <div className="d-flex justify-content-center align-items-center flex-grow-1">
          <SpotlightCard
            spotlightColor="rgba(16, 185, 129, 0.22)"
            spotlightSize={260}
            intensity={0.2}
            borderGlow={0.65}
            className="profile-guest-card glass-card card-border-primary text-center"
          >
            <Card className="border-0 bg-transparent text-white">
              <Card.Body className="p-0">
                <i className="bi bi-person-circle text-success d-block profile-guest-icon" aria-hidden="true" />
                <Card.Title className="fw-bold profile-guest-title">{t('profile.notLoggedInTitle')}</Card.Title>
                <Card.Text className="text-white-50 profile-guest-text">{t('profile.notLoggedInText')}</Card.Text>
                <Link to="/Cameos/login" className="btn btn-success rounded-pill fw-semibold profile-guest-btn">
                  {t('profile.loginBtn')}
                </Link>
              </Card.Body>
            </Card>
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
}
