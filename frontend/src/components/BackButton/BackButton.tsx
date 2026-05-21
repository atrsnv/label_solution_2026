import { useNavigate } from 'react-router-dom';

import './BackButton.scss';

const BackButton = () => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="back-button"
      onClick={() => navigate(-1)}
    >
      &lt;
    </button>
  );
};

export default BackButton;