import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../../App'

describe('App', () => {
  it('renders the header title', () => {
    render(<App />)
    expect(screen.getByText(/AI Creative Guardrail Copilot/i)).toBeInTheDocument()
  })

  it('renders the tools sidebar toggle', () => {
    render(<App />)
    expect(screen.getByTitle(/Close Tools Panel/i)).toBeInTheDocument()
  })
})
