import { NavLink } from 'react-router-dom';
import { Globe, Mailbox, PenLine, Pin, Users, type LucideIcon } from 'lucide-react';
import { usePostcards } from '../store/PostcardStore';

const LINKS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/create', label: 'Erstellen', icon: PenLine },
  { to: '/mailbox', label: 'Briefkasten', icon: Mailbox },
  { to: '/world', label: 'Weltansicht', icon: Globe },
  { to: '/pinboard', label: 'Pinwand', icon: Pin },
  { to: '/friends', label: 'Freunde', icon: Users },
];

export function NavBar() {
  const { cardsIn } = usePostcards();
  const unread = cardsIn('inbox').filter((c) => !c.read).length;

  return (
    <nav className="navbar">
      {LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <Icon size={22} strokeWidth={2} aria-hidden="true" />
              {link.to === '/mailbox' && unread > 0 && <span className="badge">{unread}</span>}
            </span>
            <span className="nav-label">{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
