function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function renderInline(value: string): string {
  return escapeHtml(value)
}

export function renderMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  const blocks: string[] = []
  let paragraph: string[] = []
  let listItems: string[] = []
  let codeLines: string[] = []
  let codeLang = ''
  let inCode = false

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push(`<p>${renderInline(paragraph.join(' '))}</p>`)
    paragraph = []
  }

  const flushList = () => {
    if (!listItems.length) return
    blocks.push(`<ul>${listItems.map(item => `<li>${renderInline(item)}</li>`).join('')}</ul>`)
    listItems = []
  }

  const flushCode = () => {
    blocks.push(`<pre><code${codeLang ? ` data-lang="${escapeHtml(codeLang)}"` : ''}>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
    codeLines = []
    codeLang = ''
  }

  for (const line of lines) {
    if (inCode) {
      if (line.startsWith('```')) {
        flushCode()
        inCode = false
      } else {
        codeLines.push(line)
      }
      continue
    }

    const trimmed = line.trim()
    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    if (line.startsWith('```')) {
      flushParagraph()
      flushList()
      inCode = true
      codeLang = line.slice(3).trim()
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      flushParagraph()
      flushList()
      const level = heading[1]!.length
      blocks.push(`<h${level}>${renderInline(heading[2] ?? '')}</h${level}>`)
      continue
    }

    if (line.startsWith('- ')) {
      flushParagraph()
      listItems.push(line.slice(2))
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  if (inCode) flushCode()

  return blocks.join('')
}
