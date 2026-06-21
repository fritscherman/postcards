import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostcardCard } from './PostcardCard';
import { makeCustomStamp } from '../data/templates';
import type { Postcard } from '../types';

function card(overrides: Partial<Postcard> = {}): Postcard {
  return {
    id: 'c1',
    image: 'data:image/png;base64,AAAA',
    templateId: 'classic',
    stampId: 'heart',
    message: 'Hallo!',
    to: 'Anna',
    from: 'Ben',
    createdAt: Date.UTC(2026, 0, 2),
    box: 'inbox',
    read: true,
    pin: { x: 0, y: 0, rotation: 0 },
    ...overrides,
  };
}

describe('PostcardCard', () => {
  it('shows the message and addressee on the back', () => {
    render(<PostcardCard card={card()} />);
    expect(screen.getByText('Hallo!')).toBeInTheDocument();
    expect(screen.getByText('Anna')).toBeInTheDocument();
  });

  it('renders a self-made stamp instead of the built-in one', () => {
    const customStamp = makeCustomStamp('🦋', '#ede9fe');
    render(<PostcardCard card={card({ stampId: 'custom', customStamp })} />);
    expect(screen.getByText('🦋')).toBeInTheDocument();
  });

  it('falls back to the default stamp emoji when none is chosen', () => {
    render(<PostcardCard card={card({ stampId: 'heart' })} />);
    expect(screen.getByText('❤️')).toBeInTheDocument();
  });
});
