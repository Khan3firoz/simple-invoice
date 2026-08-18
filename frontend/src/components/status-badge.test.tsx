import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  it.each([
    ['Draft', 'Draft'],
    ['Pending', 'Pending'],
    ['Paid', 'Paid'],
    ['Overdue', 'Overdue'],
  ] as const)('renders the %s status label', (status, expectedText) => {
    render(<StatusBadge status={status} />)
    expect(screen.getByText(expectedText)).toBeInTheDocument()
  })
})
