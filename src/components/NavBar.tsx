import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Mailbox, PenLine, Pin, Users, type LucideIcon } from 'lucide-react';
import { usePostcards } from '../store/PostcardStore';

const LINKS: { to: string; labelKey: string; icon: LucideIcon }[] = [
  { to: '/create', labelKey: 'nav.create', icon: PenLine },
  { to: '/mailbox', labelKey: 'nav.mailbox', icon: Mailbox },
  { to: '/world', labelKey: 'nav.world', icon: Globe },
  { to: '/pinboard', labelKey: 'nav.pinboard', icon: Pin },
  { to: '/friends', labelKey: 'nav.friends', icon: Users },
];

export function NavBar() {
  const { t } = useTranslation();
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
            <span className="nav-label">{t(link.labelKey)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
