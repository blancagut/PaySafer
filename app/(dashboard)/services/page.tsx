"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Briefcase,
  Car,
  Globe,
  Home,
  Laptop,
  Package,
  Palette,
  Plane,
  ShoppingBag,
  Smartphone,
  Users,
  Wrench,
  Code,
  PenTool,
  Video,
  Music,
  BookOpen,
  Camera,
  Shield,
  CheckCircle2,
  ArrowRight,
  Search,
  Sparkles,
  HandshakeIcon,
  Clock,
  DollarSign,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const categories = [
  {
    id: "all",
    name: "All",
    icon: Sparkles,
  },
  {
    id: "services",
    name: "Services",
    icon: Briefcase,
  },
  {
    id: "products",
    name: "Products",
    icon: ShoppingBag,
  },
  {
    id: "digital",
    name: "Digital",
    icon: Globe,
  },
  {
    id: "vehicles",
    name: "Vehicles",
    icon: Car,
  },
  {
    id: "property",
    name: "Real Estate",
    icon: Home,
  },
]

const services = [
  // Services / Freelance
  {
    id: "freelance-work",
    name: "Freelance Work",
    description: "Web development, apps, software and tech projects",
    icon: Code,
    category: "services",
    popular: true,
    examples: ["Website development", "Mobile app", "Custom software"],
  },
  {
    id: "design-services",
    name: "Graphic Design",
    description: "Logos, branding, UI/UX design and marketing materials",
    icon: PenTool,
    category: "services",
    popular: true,
    examples: ["Business logo", "Brand identity", "Interface design"],
  },
  {
    id: "video-production",
    name: "Video Production",
    description: "Corporate videos, animations and professional editing",
    icon: Video,
    category: "services",
    popular: false,
    examples: ["Promo video", "2D/3D animation", "Content editing"],
  },
  {
    id: "consulting",
    name: "Consulting",
    description: "Business, legal, financial or technical advisory",
    icon: Users,
    category: "services",
    popular: false,
    examples: ["Business consulting", "Legal advice", "Coaching"],
  },
  {
    id: "home-services",
    name: "Home Services",
    description: "Repairs, remodeling and domestic services",
    icon: Wrench,
    category: "services",
    popular: false,
    examples: ["Remodeling", "Plumbing", "Electrical work"],
  },
  {
    id: "photography",
    name: "Photography",
    description: "Photo sessions, events and professional editing",
    icon: Camera,
    category: "services",
    popular: false,
    examples: ["Photo shoot", "Event coverage", "Product photos"],
  },

  // Products
  {
    id: "electronics",
    name: "Electronics",
    description: "Computers, phones, tablets and tech accessories",
    icon: Laptop,
    category: "products",
    popular: true,
    examples: ["Laptop", "Smartphone", "Gaming console"],
  },
  {
    id: "phones-tablets",
    name: "Phones & Tablets",
    description: "Smartphones, tablets and mobile accessories",
    icon: Smartphone,
    category: "products",
    popular: true,
    examples: ["iPhone", "Samsung Galaxy", "iPad"],
  },
  {
    id: "general-merchandise",
    name: "General Merchandise",
    description: "Clothing, accessories, home goods and more",
    icon: Package,
    category: "products",
    popular: false,
    examples: ["Designer clothing", "Jewelry", "Collectibles"],
  },
  {
    id: "art-collectibles",
    name: "Art & Collectibles",
    description: "Artwork, antiques and collector items",
    icon: Palette,
    category: "products",
    popular: false,
    examples: ["Original painting", "Antiques", "Physical NFTs"],
  },
  {
    id: "music-instruments",
    name: "Musical Instruments",
    description: "Guitars, pianos, professional audio equipment",
    icon: Music,
    category: "products",
    popular: false,
    examples: ["Electric guitar", "Digital piano", "DJ equipment"],
  },

  // Digital
  {
    id: "domains-websites",
    name: "Domains & Websites",
    description: "Domain trading, websites and online businesses",
    icon: Globe,
    category: "digital",
    popular: true,
    examples: ["Premium domain", "Established e-commerce", "Monetized blog"],
  },
  {
    id: "digital-content",
    name: "Digital Content",
    description: "Courses, ebooks, templates and downloadable resources",
    icon: BookOpen,
    category: "digital",
    popular: false,
    examples: ["Online course", "Template pack", "Software license"],
  },
  {
    id: "social-media",
    name: "Social Media Accounts",
    description: "Social media accounts, channels and communities",
    icon: Users,
    category: "digital",
    popular: false,
    examples: ["YouTube channel", "Instagram account", "Facebook page"],
  },

  // Vehicles
  {
    id: "cars",
    name: "Automobiles",
    description: "New, used, luxury and classic cars",
    icon: Car,
    category: "vehicles",
    popular: true,
    examples: ["Used car", "Luxury vehicle", "Classic car"],
  },
  {
    id: "motorcycles",
    name: "Motorcycles",
    description: "Bikes, scooters and two-wheeled vehicles",
    icon: Car,
    category: "vehicles",
    popular: false,
    examples: ["Sport bike", "Scooter", "Classic motorcycle"],
  },
  {
    id: "boats-aircraft",
    name: "Boats & Aircraft",
    description: "Boats, yachts, planes and special vehicles",
    icon: Plane,
    category: "vehicles",
    popular: false,
    examples: ["Yacht", "Speedboat", "Private plane"],
  },

  // Property
  {
    id: "real-estate",
    name: "Real Estate",
    description: "Houses, apartments, land and commercial properties",
    icon: Home,
    category: "property",
    popular: true,
    examples: ["Residential home", "Apartment", "Commercial space"],
  },
  {
    id: "rentals",
    name: "Rentals",
    description: "Rental deposits and lease agreements",
    icon: Home,
    category: "property",
    popular: false,
    examples: ["Rental deposit", "Vacation rental", "Office space"],
  },
]

const trustFeatures = [
  {
    icon: Shield,
    title: "100% Protected",
    description: "Your money is safe until you confirm delivery",
  },
  {
    icon: HandshakeIcon,
    title: "Fair Transactions",
    description: "Both parties are protected throughout the process",
  },
  {
    icon: Clock,
    title: "Clear Process",
    description: "Step-by-step tracking of every transaction",
  },
  {
    icon: DollarSign,
    title: "No Surprises",
    description: "Transparent fees with no hidden charges",
  },
]

export default function ServicesPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredServices = services.filter((service) => {
    const matchesCategory = selectedCategory === "all" || service.category === selectedCategory
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleContinue = () => {
    if (selectedService) {
      router.push(`/transactions/new?service=${selectedService}`)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Select Your Service</h1>
        <p className="text-muted-foreground">
          Choose the type of transaction you want to make. Both parties will be protected.
        </p>
      </div>

      {/* Trust Banner */}
      <Card className="border-border bg-gradient-to-r from-primary/5 to-accent/5 mb-8">
        <CardContent className="py-6">
          <div className="grid grid-cols-4 gap-6">
            {trustFeatures.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Categories */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search service or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <div className="flex items-center gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className={
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent"
              }
            >
              <category.icon className="w-4 h-4 mr-1.5" />
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {filteredServices.map((service) => (
          <Card
            key={service.id}
            className={`border-border cursor-pointer transition-all hover:shadow-md ${
              selectedService === service.id
                ? "ring-2 ring-primary border-primary bg-primary/5"
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedService(service.id)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedService === service.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <service.icon className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  {service.popular && (
                    <Badge variant="secondary" className="text-xs bg-accent/20 text-accent-foreground border-0">
                      Popular
                    </Badge>
                  )}
                  {selectedService === service.id && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{service.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {service.examples.map((example) => (
                  <span
                    key={example}
                    className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground"
                  >
                    {example}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-1">No services found</h3>
          <p className="text-sm text-muted-foreground">
            Try a different search or category
          </p>
        </div>
      )}

      {/* How it Works Section */}
      <Card className="border-border mb-8">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">How Escrow Works</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your security is our priority. This is how we protect your money and your transaction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {[
              {
                step: 1,
                title: "Select",
                description: "Choose the type of service or product",
                icon: Sparkles,
              },
              {
                step: 2,
                title: "Agree",
                description: "Define terms with the seller",
                icon: HandshakeIcon,
              },
              {
                step: 3,
                title: "Deposit",
                description: "Your money is protected in escrow",
                icon: Shield,
              },
              {
                step: 4,
                title: "Receive",
                description: "Seller delivers the product/service",
                icon: Package,
              },
              {
                step: 5,
                title: "Release",
                description: "Confirm and payment is released",
                icon: CheckCircle2,
              },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 relative">
                    <item.icon className="w-6 h-6 text-primary" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <p className="font-medium text-foreground text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                </div>
                {index < 4 && (
                  <div className="absolute top-7 left-[calc(50%+28px)] w-[calc(100%-56px)] h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ Quick Tips */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="font-medium text-foreground">For Buyers</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Your money is protected until you receive and approve what was agreed. If there are problems, 
              open a dispute and we will review the case.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <h4 className="font-medium text-foreground">For Sellers</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Receive guaranteed payments. The buyer has already deposited the money in escrow, 
              so you can deliver with confidence.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <h4 className="font-medium text-foreground">Processing Times</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Typical transactions are completed in 1-7 days. Funds are released 
              immediately after confirmation.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Continue Button */}
      <div className="sticky bottom-6 flex justify-end">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!selectedService}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
        >
          {selectedService ? (
            <>
              Continue with {services.find((s) => s.id === selectedService)?.name}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            "Select a service to continue"
          )}
        </Button>
      </div>
    </div>
  )
}
