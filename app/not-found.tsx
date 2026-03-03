import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { Home, Search, ArrowLeft, Shield } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0F1A] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0F1B2D]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="sm" linkTo="/" />
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md animate-fade-in">
          {/* 404 display */}
          <div className="relative mb-8">
            <span className="text-[120px] md:text-[160px] font-semibold tracking-tighter text-white/[0.04] leading-none select-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Shield className="w-10 h-10 text-emerald-400" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
            Page Not Found
          </h1>
          <p className="text-muted-foreground font-light leading-relaxed mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            If you believe this is an error, please contact support.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="border-white/[0.12] hover:bg-white/[0.06] w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>

          {/* Helpful links */}
          <div className="mt-12 pt-8 border-t border-white/[0.06]">
            <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-4">
              Helpful Links
            </span>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link href="/help" className="text-white/60 hover:text-emerald-400 transition-colors">
                Help Center
              </Link>
              <Link href="/fees" className="text-white/60 hover:text-emerald-400 transition-colors">
                Fees & Limits
              </Link>
              <Link href="/terms" className="text-white/60 hover:text-emerald-400 transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-white/60 hover:text-emerald-400 transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
