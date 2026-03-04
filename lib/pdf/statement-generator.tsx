import React from "react"
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import { format } from "date-fns"

// Define types
interface Transaction {
  id: string
  type: "credit" | "debit"
  amount: number
  currency: string
  description: string
  created_at: string
  recipient?: string
  sender?: string
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

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 40,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 30,
    borderBottom: "2px solid #10b981",
    paddingBottom: 20,
  },
  logo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#10b981",
    marginBottom: 5,
  },
  tagline: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 10,
    color: "#6b7280",
    width: 120,
  },
  infoValue: {
    fontSize: 10,
    color: "#111827",
    fontWeight: "bold",
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderBottom: "1px solid #e5e7eb",
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1px solid #f3f4f6",
    fontSize: 9,
  },
  tableRowAlt: {
    backgroundColor: "#fafafa",
  },
  colDate: {
    width: "15%",
  },
  colDescription: {
    width: "45%",
  },
  colType: {
    width: "15%",
  },
  colAmount: {
    width: "25%",
    textAlign: "right",
  },
  credit: {
    color: "#10b981",
  },
  debit: {
    color: "#ef4444",
  },
  summary: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
  },
  summaryTotal: {
    borderTop: "2px solid #10b981",
    paddingTop: 8,
    marginTop: 8,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    borderTop: "1px solid #e5e7eb",
    paddingTop: 15,
  },
  disclaimer: {
    fontSize: 8,
    color: "#9ca3af",
    marginTop: 30,
    fontStyle: "italic",
  },
})

// Statement Document Component
export const StatementDocument = ({ data }: { data: StatementData }) => {
  const totalCredits = data.transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0)

  const totalDebits = data.transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>PaySafer</Text>
          <Text style={styles.tagline}>Secure Digital Payments Platform</Text>
          <Text style={styles.title}>Account Statement</Text>
          <Text style={styles.subtitle}>
            {format(data.periodStart, "MMMM d, yyyy")} -{" "}
            {format(data.periodEnd, "MMMM d, yyyy")}
          </Text>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Holder:</Text>
            <Text style={styles.infoValue}>{data.accountHolder}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{data.accountEmail}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Statement Period:</Text>
            <Text style={styles.infoValue}>
              {format(data.periodStart, "MMM d")} -{" "}
              {format(data.periodEnd, "MMM d, yyyy")}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Currency:</Text>
            <Text style={styles.infoValue}>{data.currency}</Text>
          </View>
        </View>

        {/* Transactions Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Transactions ({data.transactions.length})
          </Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.colDate}>Date</Text>
              <Text style={styles.colDescription}>Description</Text>
              <Text style={styles.colType}>Type</Text>
              <Text style={styles.colAmount}>Amount</Text>
            </View>

            {/* Table Rows */}
            {data.transactions.map((txn, index) => (
              <View
                key={txn.id}
                style={
                  index % 2 === 1
                    ? [styles.tableRow, styles.tableRowAlt]
                    : styles.tableRow
                }
              >
                <Text style={styles.colDate}>
                  {format(new Date(txn.created_at), "MMM d")}
                </Text>
                <Text style={styles.colDescription}>
                  {txn.description || "—"}
                </Text>
                <Text style={styles.colType}>
                  {txn.type === "credit" ? "Credit" : "Debit"}
                </Text>
                <Text
                  style={[
                    styles.colAmount,
                    txn.type === "credit" ? styles.credit : styles.debit,
                  ]}
                >
                  {txn.type === "credit" ? "+" : "-"}
                  {data.currency} {txn.amount.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Opening Balance</Text>
            <Text style={styles.summaryValue}>
              {data.currency} {data.openingBalance.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Credits</Text>
            <Text style={[styles.summaryValue, styles.credit]}>
              +{data.currency} {totalCredits.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Debits</Text>
            <Text style={[styles.summaryValue, styles.debit]}>
              -{data.currency} {totalDebits.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryLabel}>Closing Balance</Text>
            <Text style={styles.summaryValue}>
              {data.currency} {data.closingBalance.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          This is a computer-generated statement and does not require a
          signature. For any discrepancies, please contact support@paysafer.site
          within 30 days.
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            PaySafer • Secure Digital Payments • www.paysafer.site
          </Text>
          <Text style={{ marginTop: 5 }}>
            Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

// Helper function to generate and download PDF
export async function generateStatement(data: StatementData) {
  // Dynamic import to avoid SSR issues
  const { pdf } = await import("@react-pdf/renderer")
  
  const blob = await pdf(<StatementDocument data={data} />).toBlob()
  
  // Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `PaySafer-Statement-${format(data.periodStart, "yyyy-MM")}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
