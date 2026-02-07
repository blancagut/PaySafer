import { Shield, Lock, CreditCard, Scale, CheckCircle2, AlertTriangle, Building2, Globe } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const trustFeatures = [
  {
    icon: Lock,
    title: "Secure Escrow",
    description: "Funds are held securely until both parties fulfill their obligations. Neither party can access the funds until conditions are met.",
  },
  {
    icon: Shield,
    title: "Buyer Protection",
    description: "Your money is protected. If you don't receive what was promised, you can open a dispute and we'll help resolve it.",
  },
  {
    icon: CheckCircle2,
    title: "Seller Assurance",
    description: "Sellers know payment is guaranteed once they deliver as promised. No more chasing payments or dealing with chargebacks.",
  },
  {
    icon: Scale,
    title: "Fair Disputes",
    description: "Our neutral dispute resolution process ensures both parties are heard and treated fairly based on evidence and terms.",
  },
]

const complianceItems = [
  "We do not hold customer balances",
  "We do not offer lending or credit services",
  "We do not provide investment advice",
  "We do not operate as a money transmitter",
  "We are not FDIC insured",
  "All payments processed by Stripe",
]

export default function TrustPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">Trust & Security</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          How we protect your transactions and build trust between strangers
        </p>
      </div>

      {/* Stripe badge */}
      <Card className="border-border bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Powered by Stripe</h2>
                <p className="text-muted-foreground">
                  Industry-leading payment infrastructure trusted by millions of businesses
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Stripe is used by</p>
              <p className="font-semibold text-foreground">Amazon, Google, Shopify</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust features */}
      <div className="grid grid-cols-2 gap-6">
        {trustFeatures.map((feature) => (
          <Card key={feature.title} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How escrow works */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">How Our Escrow Works</CardTitle>
          <CardDescription className="text-muted-foreground">
            A simple process that protects everyone involved
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {[
              { step: 1, title: "Agreement", desc: "Buyer and seller agree on terms" },
              { step: 2, title: "Payment", desc: "Buyer pays into escrow" },
              { step: 3, title: "Secure Hold", desc: "Funds held safely" },
              { step: 4, title: "Delivery", desc: "Seller delivers goods/service" },
              { step: 5, title: "Release", desc: "Buyer confirms, funds released" },
            ].map((item, index) => (
              <div key={item.step} className="relative text-center">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-semibold">
                  {item.step}
                </div>
                <p className="font-medium text-foreground mt-3 text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                {index < 4 && (
                  <div className="absolute top-5 left-full w-full h-0.5 bg-border -translate-x-1/2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Important notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">We Are Not a Bank</h3>
              <p className="text-amber-700 mt-1 leading-relaxed">
                SecureEscrow is an escrow facilitation platform, not a bank or financial institution. 
                We do not store balances, provide loans, or offer banking services of any kind. 
                All payment processing is handled securely by Stripe.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Compliance & Transparency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {complianceItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Global */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Global Transactions</h3>
              <p className="text-muted-foreground">
                Securely transact with anyone, anywhere in the world. We support multiple currencies 
                and work with Stripe to ensure payments are processed reliably across borders.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
