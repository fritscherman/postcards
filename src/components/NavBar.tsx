import { NavLink } from 'react-router-dom';
import { usePostcards } from '../store/PostcardStore';

const LINKS = [
  { to: '/create', label: 'Erstellen', icon: '✏️' },
  { to: '/mailbox', label: 'Briefkasten', icon: '📬' },
  { to: '/world', label: 'Weltansicht', icon: '🌍' },
  { to: '/pinboard', label: 'Pinwand', icon: '📌' },
];

export function NavBar() {
  const { cardsIn } = usePostcards();
  const unread = cardsIn('inbox').filter((c) => !c.read).length;

  return (
    <nav className="navbar">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">
            {link.icon}
            {link.to === '/mailbox' && unread > 0 && <span className="badge">{unread}</span>}
          </span>
          <span className="nav-label">{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
