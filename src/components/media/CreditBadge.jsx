import {Link} from "react-router-dom";
import PropTypes from "prop-types";
import { APP_ROUTES } from "../../utils/appRoutes.js";

export default function CreditBadge({ member }) {
    return member.id ? (
        <Link to={APP_ROUTES.person(member.id, 'crew')} className="credit-badge credit-badge-link">
            {member.name}
        </Link>
    ) : (
        <span className="credit-badge">{member.name}</span>
    );
}

CreditBadge.propTypes = { member: PropTypes.object.isRequired }