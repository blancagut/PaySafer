import { format } from 'date-fns'

interface Transaction {
  id: string
  type: 'credit' | 'debit'
  amount: number
  currency: string
  description: string
  created_at: string
}

interface StatementData {
  accountHolder: string
  accountEmail: string
  periodStart: Date
  periodEnd: Date
  transactions: Transaction[]
  openingBalance: number
  closingBalance: number
  currency: string
}

export async function generateStatementCSV(data: StatementData) {
  const rows: string[] = []

  // Header metadata
  rows.push(['Account Holder', 'Account Email', 'Period Start', 'Period End', 'Currency'].join(','))
  rows.push([
    escapeCsv(data.accountHolder),
    escapeCsv(data.accountEmail),
    format(data.periodStart, 'yyyy-MM-dd'),
    format(data.periodEnd, 'yyyy-MM-dd'),
    data.currency,
  ].join(','))
  rows.push('')

  // Transactions header
  rows.push(['Date', 'Description', 'Type', 'Amount', 'Currency'].join(','))

  // Transaction rows
  for (const t of data.transactions) {
    rows.push([
      format(new Date(t.created_at), 'yyyy-MM-dd'),
      escapeCsv(t.description || ''),
      t.type,
      t.amount.toFixed(2),
      t.currency,
    ].join(','))
  }

  rows.push('')
  rows.push(['Opening Balance', data.openingBalance.toFixed(2)].join(','))
  rows.push(['Closing Balance', data.closingBalance.toFixed(2)].join(','))

  const csvContent = rows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const filename = `PaySafer-Statement-${format(data.periodStart, 'yyyy-MM')}.csv`
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeCsv(value: string) {
  if (value == null) return ''
  if (/[",\n]/.test(value)) {
    return '"' + String(value).replace(/"/g, '""') + '"'
  }
  return String(value)
}
