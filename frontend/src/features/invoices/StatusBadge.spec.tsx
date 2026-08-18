import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['Draft', 'text-muted-foreground'],
    ['Pending', 'text-amber-500'],
    ['Paid', 'text-emerald-500'],
    ['Overdue', 'text-rose-500'],
  ] as const)('renders %s with its status color', (status, expectedClass) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByText(status);
    expect(badge).toHaveClass(expectedClass);
  });
});
