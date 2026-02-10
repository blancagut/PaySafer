import { getOfferByToken } from "@/lib/actions/offers"
import { createClient } from "@/lib/supabase/server"
import { OfferAcceptClient } from "./client"

export default async function OfferAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Check auth but do NOT redirect — offer page is public
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const result = await getOfferByToken(token)

  if (result.error || !result.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-auto p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">Offer Not Found</h1>
          <p className="text-muted-foreground text-sm">
            {result.error || "This offer link is invalid, expired, or has already been used."}
          </p>
          <a href="/" className="inline-block mt-4 text-primary hover:underline text-sm">
            Go Home
          </a>
        </div>
      </div>
    )
  }

  const offer = result.data

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6 pt-16 space-y-6">
        <OfferAcceptClient offer={offer} token={token} isAuthenticated={!!user} />
      </div>
    </div>
  )
}
