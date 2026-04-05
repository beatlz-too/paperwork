import { h } from 'vue'
import type { HeaderContext } from '@tanstack/vue-table'

function sortGlyph(sortState: false | 'asc' | 'desc'): string {
  if (sortState === 'asc') return '↑'
  if (sortState === 'desc') return '↓'
  return '↕'
}

export function sortableHeader<T>(label: string) {
  return ({ column }: HeaderContext<T, unknown>) =>
    h(
      'button',
      {
        type: 'button',
        class: 'inline-flex items-center gap-1 select-none',
        onClick: column.getToggleSortingHandler()
      },
      [
        h('span', label),
        h(
          'span',
          {
            class: 'text-xs text-muted'
          },
          sortGlyph(column.getIsSorted())
        )
      ]
    )
}
