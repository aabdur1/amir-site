'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
}

export class ArtifactErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Artifact error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12 text-center py-20">
          <p
            className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4
              text-peach dark:text-peach-dark"
          >
            Error
          </p>
          <h2
            className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl
              text-ink dark:text-night-text mb-4"
          >
            Something went wrong loading this section
          </h2>
          <p className="text-[15px] text-ink-subtle dark:text-night-muted mb-8">
            An unexpected error occurred while rendering the interactive content.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="btn-lift inline-flex items-center gap-2 px-5 py-2.5 rounded-full
              text-[13px] font-[family-name:var(--font-mono)] tracking-wide
              border border-mauve/40 dark:border-mauve-dark/40
              bg-mauve/10 dark:bg-mauve-dark/10
              text-mauve dark:text-mauve-dark
              hover:border-mauve dark:hover:border-mauve-dark
              transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
