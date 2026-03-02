'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'camera', label: 'Camera' },
  { value: 'lens', label: 'Lens' },
]

interface SortControlsProps {
  value: string
  onChange: (value: string) => void
}

export function SortControls({ value, onChange }: SortControlsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const currentLabel = OPTIONS.find((o) => o.value === value)?.label ?? 'Date'

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openDropdown = useCallback(() => {
    setIsOpen(true)
    const idx = OPTIONS.findIndex((o) => o.value === value)
    setFocusedIndex(idx >= 0 ? idx : 0)
  }, [value])

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setFocusedIndex(-1)
  }, [])

  const selectOption = useCallback(
    (optionValue: string) => {
      onChange(optionValue)
      closeDropdown()
    },
    [onChange, closeDropdown]
  )

  // Keyboard navigation on the trigger
  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (isOpen) {
          closeDropdown()
        } else {
          openDropdown()
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          openDropdown()
        } else {
          setFocusedIndex((prev) => Math.min(prev + 1, OPTIONS.length - 1))
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (isOpen) {
          setFocusedIndex((prev) => Math.max(prev - 1, 0))
        }
        break
      case 'Escape':
        e.preventDefault()
        closeDropdown()
        break
    }
  }

  // Keyboard navigation on menu options
  function handleMenuKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 1, OPTIONS.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < OPTIONS.length) {
          selectOption(OPTIONS[focusedIndex].value)
        }
        break
      case 'Escape':
        e.preventDefault()
        closeDropdown()
        break
    }
  }

  // Focus the active option when focusedIndex changes
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.focus()
    }
  }, [isOpen, focusedIndex])

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-full px-5 py-2.5 bg-cream-dark dark:bg-night-card border border-cream-border dark:border-night-border text-sm font-[family-name:var(--font-mono)] text-ink dark:text-night-text cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      >
        <span>Sort: {currentLabel}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-activedescendant={
            focusedIndex >= 0 ? `sort-option-${OPTIONS[focusedIndex].value}` : undefined
          }
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 mt-2 min-w-[160px] rounded-xl bg-cream-dark dark:bg-night-card border border-cream-border dark:border-night-border shadow-card py-1 z-50 animate-dropdown-in"
        >
          {OPTIONS.map((option, index) => (
            <button
              key={option.value}
              id={`sort-option-${option.value}`}
              ref={(el) => {
                optionRefs.current[index] = el
              }}
              role="option"
              aria-selected={value === option.value}
              type="button"
              onClick={() => selectOption(option.value)}
              className={`w-full text-left px-4 py-3 text-sm font-[family-name:var(--font-mono)] text-ink dark:text-night-text cursor-pointer transition-colors duration-150 ${
                value === option.value
                  ? 'bg-sapphire/10 dark:bg-sapphire-dark/10'
                  : 'hover:bg-ink/5 dark:hover:bg-night-text/5'
              } ${focusedIndex === index ? 'bg-ink/5 dark:bg-night-text/5' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
