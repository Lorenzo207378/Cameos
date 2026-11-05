import {Link} from "react-router-dom";
import PropTypes from "prop-types";

export default function CreditBadge({ member }) {
    return member.id ? (
        <Link to={`/Cameos/person/${member.id}?credits=crew`} className="credit-badge credit-badge-link">
            {member.name}
        </Link>
    ) : (
        <span className="credit-badge">{member.name}</span>
    );
}

CreditBadge.propTypes = { member: PropTypes.object.isRequired }