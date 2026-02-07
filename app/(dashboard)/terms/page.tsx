import { FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-muted-foreground mt-1">Last updated: January 15, 2024</p>
      </div>

      <Card className="border-border">
        <CardContent className="p-6 prose prose-neutral max-w-none">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using SecureEscrow, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, you may not use our services. We reserve the right 
              to modify these terms at any time, and your continued use of the platform constitutes 
              acceptance of any changes.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              SecureEscrow provides an online escrow facilitation platform that enables secure transactions 
              between buyers and sellers. We act as a neutral third party to hold funds until predetermined 
              conditions are met. We are not a bank, financial institution, or money transmitter.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must create an account to use our services. You are responsible for maintaining the 
              confidentiality of your account credentials and for all activities that occur under your 
              account. You must provide accurate and complete information when creating your account 
              and keep this information up to date.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">4. Transaction Process</h2>
            <p className="text-muted-foreground leading-relaxed">
              When a buyer initiates a transaction, funds are collected and held in escrow until the 
              buyer confirms receipt of goods or services. The seller is responsible for delivering 
              as described. Upon buyer confirmation, funds are released to the seller minus applicable fees.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">5. Fees</h2>
            <p className="text-muted-foreground leading-relaxed">
              We charge fees for our escrow services. All applicable fees are disclosed before you 
              confirm a transaction. Fees are non-refundable once a transaction is completed. We 
              reserve the right to modify our fee structure with reasonable notice.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">6. Disputes</h2>
            <p className="text-muted-foreground leading-relaxed">
              If a dispute arises between buyer and seller, either party may open a dispute through 
              our platform. We will review the case and make a determination based on the evidence 
              provided and the original transaction terms. Our decision is final and binding.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">7. Prohibited Uses</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may not use SecureEscrow for any illegal purpose, to defraud other users, to launder 
              money, or for any transaction involving prohibited items or services. Violation of these 
              terms may result in immediate account termination and reporting to authorities.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              SecureEscrow is provided {"\"as is\""} without warranties of any kind. We are not liable for 
              any indirect, incidental, special, consequential, or punitive damages. Our total liability 
              is limited to the fees paid by you for the specific transaction in question.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, please contact us at legal@secureescrow.com.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
