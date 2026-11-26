import {Link} from "react-router-dom";
import PropTypes from "prop-types";
import { APP_ROUTES } from "../../utils/appRoutes.js";

/**
 * @param {Object} props
 * @param {{ id?: number|string, name?: string }} props.member
 * @returns {import('react').ReactElement}
 */
export default function CreditBadge({ member }) {
    return member.id ? (
        <Link to={APP_ROUTES.person(member.id)} className="credit-badge credit-badge-link">
            {member.name}
        </Link>
    ) : (
        <span className="credit-badge">{member.name}</span>
    );
}

CreditBadge.propTypes = { member: PropTypes.object.isRequired }