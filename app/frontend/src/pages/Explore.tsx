import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  TrendingUp,
  Star,
  Eye,
  Code2,
  Globe,
  ArrowRight,
  Sparkles,
  Gamepad2,
  BarChart3,
  ShoppingCart,
  FileText,
  Palette,
  MessageSquare,
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All", icon: <Sparkles className="w-4 h-4" /> },
  { id: "landing", label: "Landing Pages", icon: <Globe className="w-4 h-4" /> },
  { id: "dashboard", label: "Dashboards", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "ecommerce", label: "E-Commerce", icon: <ShoppingCart className="w-4 h-4" /> },
  { id: "game", label: "Games", icon: <Gamepad2 className="w-4 h-4" /> },
  { id: "portfolio", label: "Portfolios", icon: <Palette className="w-4 h-4" /> },
  { id: "blog", label: "Blogs", icon: <FileText className="w-4 h-4" /> },
  { id: "chat", label: "Chat Apps", icon: <MessageSquare className="w-4 h-4" /> },
];

const FEATURED_PROJECTS = [
  {
    id: 1,
    name: "SaaS Landing Page",
    author: "Alex Chen",
    description: "Modern SaaS landing page with pricing, features, and testimonials",
    category: "landing",
    stars: 234,
    views: 1890,
    thumbnail: "https://mgx-backend-cdn.metadl.com/generate/images/1069105/2026-03-29/a58369f6-e59a-454f-986e-d7347e612693.png",
    tags: ["React", "Tailwind", "Framer Motion"],
  },
  {
    id: 2,
    name: "Analytics Dashboard",
    author: "Sarah Kim",
    description: "Real-time analytics dashboard with charts and data visualization",
    category: "dashboard",
    stars: 189,
    views: 1456,
    thumbnail: "https://mgx-backend-cdn.metadl.com/generate/images/1069105/2026-03-29/27cb7eea-2e57-4edb-9eb8-9c437626fcb3.png",
    tags: ["React", "Recharts", "shadcn/ui"],
  },
  {
    id: 3,
    name: "2048 Game",
    author: "Mike Johnson",
    description: "Classic 2048 puzzle game with smooth animations and score tracking",
    category: "game",
    stars: 312,
    views: 2341,
    thumbnail: "https://mgx-backend-cdn.metadl.com/generate/images/1069105/2026-03-29/548ce3e0-3d48-4dff-ab25-c8d80e17473b.png",
    tags: ["React", "TypeScript", "CSS Grid"],
  },
  {
    id: 4,
    name: "E-Commerce Store",
    author: "Emma Davis",
    description: "Full-featured online store with cart, checkout, and product management",
    category: "ecommerce",
    stars: 156,
    views: 1234,
    thumbnail: "https://mgx-backend-cdn.metadl.com/generate/images/1069105/2026-03-29/0d145037-f933-4d82-9977-95054238f44a.png",
    tags: ["React", "Stripe", "Atoms Cloud"],
  },
  {
    id: 5,
    name: "Developer Portfolio",
    author: "David Lee",
    description: "Minimalist developer portfolio with project showcase and blog",
    category: "portfolio",
    stars: 278,
    views: 2100,
    thumbnail: "https://mgx-backend-cdn.metadl.com/generate/images/1069105/2026-03-29/a58369f6-e59a-454f-986e-d7347e612693.png",
    tags: ["React", "Three.js", "GSAP"],
  },
  {
    id: 6,
    name: "AI Chat Interface",
    author: "Lisa Wang",
    description: "ChatGPT-style AI chat interface with streaming responses",
    category: "chat",
    stars: 445,
    views: 3200,
    thumbnail: "https://mgx-backend-cdn.metadl.com/generate/images/1069105/2026-03-29/27cb7eea-2e57-4edb-9eb8-9c437626fcb3.png",
    tags: ["React", "SSE", "Markdown"],
  },
];

export default function ExplorePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = FEATURED_PROJECTS.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "all" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">
            Explore{" "}
            <span className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] bg-clip-text text-transparent">
              Community Projects
            </span>
          </h1>
          <p className="text-[#A1A1AA] max-w-lg mx-auto">
            Discover amazing projects built by the Atoms community. Remix any
            project to make it your own.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mx-auto mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#52525B]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, templates, and more..."
            className="pl-12 h-12 bg-[#18181B] border-[#27272A] text-white placeholder:text-[#52525B] rounded-xl text-base"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-[#7C3AED] text-white"
                  : "bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-white hover:border-[#3F3F46]"
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Trending Banner */}
        <div className="bg-gradient-to-r from-[#7C3AED]/10 to-[#A855F7]/10 border border-[#7C3AED]/20 rounded-xl p-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-[#A855F7]" />
            <div>
              <h3 className="font-semibold">Trending This Week</h3>
              <p className="text-sm text-[#A1A1AA]">
                AI Chat Interface is the most remixed project this week
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-[#7C3AED]/30 text-[#A855F7] hover:bg-[#7C3AED]/10 bg-transparent"
          >
            View Trending
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="group bg-[#18181B] border border-[#27272A] rounded-xl overflow-hidden hover:border-[#7C3AED]/40 transition-all duration-300 cursor-pointer"
              onClick={() => navigate("/dashboard")}
            >
              {/* Thumbnail */}
              <div className="aspect-video overflow-hidden relative">
                <img
                  src={project.thumbnail}
                  alt={project.name}
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#18181B] via-transparent to-transparent" />
                <div className="absolute top-3 right-3">
                  <Button
                    size="sm"
                    className="bg-[#7C3AED]/80 text-white hover:bg-[#7C3AED] text-xs h-7 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/dashboard");
                    }}
                  >
                    <Code2 className="w-3 h-3 mr-1" />
                    Remix
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {project.name}
                    </h3>
                    <p className="text-xs text-[#71717A]">
                      by {project.author}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[#A1A1AA] mb-3 line-clamp-2">
                  {project.description}
                </p>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 bg-[#27272A] text-[#A1A1AA] rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[#52525B]">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400" />
                    {project.stars}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {project.views}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}