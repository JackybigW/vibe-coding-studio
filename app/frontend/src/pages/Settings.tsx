import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  CreditCard,
  Key,
  Bell,
  Shield,
  Coins,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#A855F7] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <h1 className="text-2xl font-bold mb-4">Sign in required</h1>
          <Button
            className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white hover:opacity-90 border-0"
            onClick={login}
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Profile updated");
    }, 1000);
  };

  const planDetails = {
    free: {
      name: "Free",
      credits: "25/month",
      storage: "2GB",
      color: "text-[#A1A1AA]",
    },
    pro: {
      name: "Pro",
      credits: "100/month",
      storage: "10GB",
      color: "text-[#A855F7]",
    },
    max: {
      name: "Max",
      credits: "500/month",
      storage: "100GB",
      color: "text-amber-400",
    },
  };

  const currentPlan =
    planDetails[(user?.plan as keyof typeof planDetails) || "free"];

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 pt-24 pb-12">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-[#18181B] border border-[#27272A] p-1">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-[#27272A] data-[state=active]:text-white text-[#A1A1AA]"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="data-[state=active]:bg-[#27272A] data-[state=active]:text-white text-[#A1A1AA]"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Billing
            </TabsTrigger>
            <TabsTrigger
              value="api-keys"
              className="data-[state=active]:bg-[#27272A] data-[state=active]:text-white text-[#A1A1AA]"
            >
              <Key className="w-4 h-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-[#27272A] data-[state=active]:text-white text-[#A1A1AA]"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-4">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-16 h-16 rounded-full border-2 border-[#27272A]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center text-white text-xl font-bold">
                    {user?.display_name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{user?.display_name}</h3>
                  <p className="text-sm text-[#71717A]">{user?.email}</p>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#27272A] ${currentPlan.color}`}
                  >
                    {currentPlan.name}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#A1A1AA] text-xs">
                    Display Name
                  </Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1.5 bg-[#09090B] border-[#27272A] text-white"
                  />
                </div>
                <div>
                  <Label className="text-[#A1A1AA] text-xs">Email</Label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="mt-1.5 bg-[#09090B] border-[#27272A] text-[#52525B]"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[#A1A1AA] text-xs">Theme</Label>
                <Select defaultValue="dark">
                  <SelectTrigger className="mt-1.5 bg-[#09090B] border-[#27272A] text-white w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#27272A]">
                    <SelectItem value="dark" className="text-[#FAFAFA]">
                      Dark
                    </SelectItem>
                    <SelectItem value="light" className="text-[#FAFAFA]">
                      Light
                    </SelectItem>
                    <SelectItem value="system" className="text-[#FAFAFA]">
                      System
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white hover:opacity-90 border-0"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing">
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
                <h3 className="font-semibold mb-4">Current Plan</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-bold ${currentPlan.color}`}>
                        {currentPlan.name}
                      </span>
                      <Shield className="w-5 h-5 text-[#7C3AED]" />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-[#A1A1AA]">
                      <span className="flex items-center gap-1">
                        <Coins className="w-4 h-4 text-amber-400" />
                        {currentPlan.credits}
                      </span>
                      <span>{currentPlan.storage} storage</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-[#27272A] text-white hover:bg-[#27272A] bg-transparent"
                  >
                    Upgrade Plan
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Credits Usage */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
                <h3 className="font-semibold mb-4">Credits Usage</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#A1A1AA]">Used this month</span>
                    <span className="font-medium">
                      {25 - (user?.credits || 0)} credits
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#27272A] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] rounded-full transition-all"
                      style={{
                        width: `${((25 - (user?.credits || 0)) / 25) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-[#52525B]">
                    {user?.credits || 0} credits remaining
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys">
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
              <h3 className="font-semibold mb-4">API Keys</h3>
              <p className="text-sm text-[#71717A] mb-4">
                Manage your API keys for external integrations.
              </p>
              <div className="bg-[#09090B] border border-[#27272A] rounded-lg p-4 text-center">
                <Key className="w-8 h-8 text-[#27272A] mx-auto mb-2" />
                <p className="text-sm text-[#52525B]">No API keys yet</p>
                <Button
                  size="sm"
                  className="mt-3 bg-[#27272A] text-white hover:bg-[#3F3F46] border-0"
                >
                  Generate API Key
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
              <h3 className="font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  {
                    label: "Email notifications",
                    desc: "Receive updates about your projects",
                  },
                  {
                    label: "Deploy notifications",
                    desc: "Get notified when deployments complete",
                  },
                  {
                    label: "Credit alerts",
                    desc: "Alert when credits are running low",
                  },
                  {
                    label: "Marketing emails",
                    desc: "Product updates and announcements",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-[#71717A]">{item.desc}</p>
                    </div>
                    <button
                      className={`w-10 h-6 rounded-full transition-colors ${
                        i < 3 ? "bg-[#7C3AED]" : "bg-[#27272A]"
                      } relative`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                          i < 3 ? "right-1" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}