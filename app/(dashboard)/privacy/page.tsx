import { Card, CardContent } from "@/components/ui/card"

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-muted-foreground mt-1">Last updated: January 15, 2024</p>
      </div>

      <Card className="border-border">
        <CardContent className="p-6 prose prose-neutral max-w-none">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect information you provide directly to us, including your name, email address, 
              and transaction details. We also collect information automatically when you use our 
              platform, such as IP address, browser type, and usage patterns.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">2. Payment Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              Payment information is processed by Stripe, our payment processor. We do not store 
              complete credit card numbers or bank account details on our servers. Stripe is 
              PCI-DSS compliant and uses industry-standard encryption.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use your information to provide and improve our services, process transactions, 
              communicate with you, and comply with legal obligations. We do not sell your personal 
              information to third parties.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">4. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We share information with counterparties in transactions (limited to what is necessary), 
              with service providers who help operate our platform, and when required by law. We may 
              also share aggregated, non-identifiable data for analytical purposes.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction. However, 
              no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide 
              services. We may also retain information to comply with legal obligations, resolve disputes, 
              and enforce our agreements.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, correct, or delete your personal information. You may also 
              object to certain processing of your data. To exercise these rights, please contact us 
              at privacy@secureescrow.com.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">8. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to provide functionality, remember preferences, 
              and analyze usage. You can control cookie settings through your browser, though some 
              features may not function properly without cookies.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new policy on this page and updating the date at the top.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-foreground">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about this Privacy Policy, please contact us at privacy@secureescrow.com.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
