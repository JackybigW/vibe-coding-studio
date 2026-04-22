import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu, X, Coins, LogOut, User, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "max":
        return "bg-gradient-to-r from-amber-500 to-orange-500";
      case "pro":
        return "bg-gradient-to-r from-[#7C3AED] to-[#A855F7]";
      default:
        return "bg-[#27272A]";
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#09090B]/80 backdrop-blur-xl border-b border-[#27272A]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-white font-semibold text-xl">Atoms</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isActive("/")
                ? "text-white"
                : "text-[#A1A1AA] hover:text-white"
            }`}
          >
            Home
          </Link>

          {isAuthenticated && (
            <Link
              to="/dashboard"
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                isActive("/dashboard")
                  ? "text-white"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              Dashboard
            </Link>
          )}

          <Link
            to="/explore"
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isActive("/explore")
                ? "text-white"
                : "text-[#A1A1AA] hover:text-white"
            }`}
          >
            Explore
          </Link>

          <button
            onClick={() => {
              const el = document.getElementById("pricing");
              if (el) el.scrollIntoView({ behavior: "smooth" });
              else window.location.href = "/#pricing";
            }}
            className="px-4 py-2 text-sm rounded-lg transition-colors text-[#A1A1AA] hover:text-white"
          >
            Pricing
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="px-4 py-2 text-sm rounded-lg transition-colors text-[#A1A1AA] hover:text-white flex items-center gap-1 outline-none">
              Resources <ChevronDown className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#18181B] border-[#27272A]">
              <DropdownMenuItem asChild>
                <Link to="/workspace" className="text-[#FAFAFA] cursor-pointer">
                  Workspace Demo
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/architecture" className="text-[#FAFAFA] cursor-pointer">
                  Architecture
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="text-[#FAFAFA] cursor-pointer">
                  Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Side: Auth Area */}
        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-[#A1A1AA] animate-spin" />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {/* Credits Badge */}
              <div className="flex items-center gap-1.5 bg-[#18181B] border border-[#27272A] rounded-full px-3 py-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-white">
                  {user.credits}
                </span>
              </div>

              {/* User Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <div className="relative">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name}
                        className="w-9 h-9 rounded-full border-2 border-[#27272A] hover:border-[#7C3AED] transition-colors object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center text-white text-sm font-semibold border-2 border-[#27272A] hover:border-[#7C3AED] transition-colors">
                        {getInitials(user.display_name)}
                      </div>
                    )}
                    {/* Plan indicator dot */}
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#09090B] ${getPlanBadgeColor(
                        user.plan
                      )}`}
                    />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#18181B] border-[#27272A] w-56"
                >
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white truncate">
                      {user.display_name}
                    </p>
                    {user.email && (
                      <p className="text-xs text-[#71717A] truncate mt-0.5">
                        {user.email}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full text-white ${getPlanBadgeColor(
                          user.plan
                        )}`}
                      >
                        {user.plan}
                      </span>
                      <span className="text-xs text-[#A1A1AA] flex items-center gap-1">
                        <Coins className="w-3 h-3 text-amber-400" />
                        {user.credits} credits
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-[#27272A]" />
                  <DropdownMenuItem className="text-[#FAFAFA] cursor-pointer focus:bg-[#27272A]">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#27272A]" />
                  <DropdownMenuItem
                    className="text-red-400 cursor-pointer focus:bg-[#27272A] focus:text-red-400"
                    onClick={logout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-[#A1A1AA] hover:text-white hover:bg-[#27272A]"
                onClick={() => navigate("/login")}
              >
                Log in
              </Button>
              <Button
                className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white hover:opacity-90 border-0"
                onClick={() => navigate("/register")}
              >
                Sign up
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#09090B]/95 backdrop-blur-xl border-t border-[#27272A] px-6 py-4 space-y-2">
          <Link
            to="/"
            className="block py-2 text-[#A1A1AA] hover:text-white"
            onClick={() => setMobileOpen(false)}
          >
            Home
          </Link>
          <button
            onClick={() => {
              setMobileOpen(false);
              const el = document.getElementById("pricing");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="block py-2 text-[#A1A1AA] hover:text-white w-full text-left"
          >
            Pricing
          </button>
          <Link
            to="/workspace"
            className="block py-2 text-[#A1A1AA] hover:text-white"
            onClick={() => setMobileOpen(false)}
          >
            Workspace Demo
          </Link>
          <Link
            to="/architecture"
            className="block py-2 text-[#A1A1AA] hover:text-white"
            onClick={() => setMobileOpen(false)}
          >
            Architecture
          </Link>

          {/* Mobile Auth Section */}
          {isAuthenticated && user ? (
            <div className="pt-4 border-t border-[#27272A]">
              <div className="flex items-center gap-3 mb-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className="w-10 h-10 rounded-full border-2 border-[#27272A] object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center text-white text-sm font-semibold">
                    {getInitials(user.display_name)}
                  </div>
                )}
                <div>
                  <p className="text-white text-sm font-medium">
                    {user.display_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full text-white ${getPlanBadgeColor(
                        user.plan
                      )}`}
                    >
                      {user.plan}
                    </span>
                    <span className="text-xs text-[#A1A1AA] flex items-center gap-1">
                      <Coins className="w-3 h-3 text-amber-400" />
                      {user.credits}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full text-red-400 hover:text-red-300 hover:bg-[#27272A] justify-start"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </Button>
            </div>
          ) : (
            <div className="pt-4 flex gap-3">
              <Button
                variant="ghost"
                className="text-[#A1A1AA] hover:text-white hover:bg-[#27272A] flex-1"
                onClick={() => { setMobileOpen(false); navigate("/login"); }}
              >
                Log in
              </Button>
              <Button
                className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white flex-1"
                onClick={() => { setMobileOpen(false); navigate("/register"); }}
              >
                Sign up
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}