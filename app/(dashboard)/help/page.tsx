"use client"

import { HelpCircle, MessageSquare, Mail, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "What is escrow?",
    answer:
      "Escrow is a financial arrangement where a third party (SecureEscrow) holds and regulates the payment of funds required for two parties involved in a transaction. The funds are held by us until we receive appropriate instructions or until predetermined contractual obligations have been fulfilled. This protects both buyers and sellers from fraud.",
  },
  {
    question: "When does the seller get paid?",
    answer:
      "The seller receives payment only after the buyer confirms they have received the goods or services as described. Once the buyer clicks 'Confirm Delivery', the funds are released to the seller immediately. This ensures the seller is protected from payment issues while the buyer is protected from non-delivery.",
  },
  {
    question: "What happens in a dispute?",
    answer:
      "If there's a disagreement between the buyer and seller, either party can open a dispute. Our team will review the case, examine any evidence provided, and make a fair decision based on the transaction terms. Both parties have equal opportunity to present their case. Resolution typically takes 5-10 business days.",
  },
  {
    question: "Is SecureEscrow a bank?",
    answer:
      "No, SecureEscrow is not a bank, financial institution, or money services business. We are an escrow facilitation platform. We do not store balances, offer loans, provide interest-bearing accounts, or perform any banking services. All payments are processed securely through Stripe, a licensed payment processor.",
  },
  {
    question: "How is Stripe used?",
    answer:
      "Stripe is our payment processor. When you make a payment, Stripe securely processes your credit card or bank information. We never see or store your full payment details. Stripe is PCI-compliant and used by millions of businesses worldwide including companies like Amazon, Google, and Shopify.",
  },
  {
    question: "What fees do you charge?",
    answer:
      "We charge a small percentage fee on each transaction to cover operational costs and Stripe processing fees. The exact fee is displayed before you confirm any transaction. There are no hidden fees, monthly charges, or account maintenance costs.",
  },
  {
    question: "How long does a transaction take?",
    answer:
      "The timeline depends entirely on the agreement between buyer and seller. Once the seller marks the item as delivered and the buyer confirms receipt, funds are released immediately. We recommend setting clear expectations about delivery timelines when creating a transaction.",
  },
  {
    question: "Can I cancel a transaction?",
    answer:
      "Transactions can be cancelled before payment is made. Once funds are in escrow, cancellation requires agreement from both parties or resolution through our dispute process. If both parties agree to cancel, funds are returned to the buyer minus any applicable fees.",
  },
  {
    question: "What currencies do you support?",
    answer:
      "We currently support major currencies including USD, EUR, GBP, CAD, and AUD. The currency is set when creating a transaction and cannot be changed afterwards. Both parties see the amount in the selected currency.",
  },
  {
    question: "How do I contact support?",
    answer:
      "You can reach our support team by emailing support@secureescrow.com. We typically respond within 24 hours during business days. For urgent matters related to active disputes, please reference your transaction or dispute ID in your message.",
  },
]

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Help & FAQ</h2>
        <p className="text-muted-foreground mt-1">Find answers to common questions</p>
      </div>

      {/* Contact options */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Email Support</h3>
                <p className="text-sm text-muted-foreground mt-1">Get help via email</p>
                <Button variant="link" className="px-0 mt-2 h-auto text-primary">
                  support@secureescrow.com
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Documentation</h3>
                <p className="text-sm text-muted-foreground mt-1">Read our guides</p>
                <Button variant="link" className="px-0 mt-2 h-auto text-primary">
                  View Docs
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Quick answers to common questions about our escrow service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Still need help */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-6 text-center">
          <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-foreground mt-4">Still have questions?</h3>
          <p className="text-sm text-muted-foreground mt-2">
            {"Can't find what you're looking for? Our support team is here to help."}
          </p>
          <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
            <Mail className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
