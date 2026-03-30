import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface PricingCardProps {
  name: string;
  price: string;
  originalPrice?: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

export default function PricingCard({
  name,
  price,
  originalPrice,
  period,
  description,
  features,
  highlighted = false,
  badge,
}: PricingCardProps) {
  return (
    <div
      className={`relative rounded-2xl p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
        highlighted
          ? "bg-gradient-to-b from-[#7C3AED]/20 to-[#18181B] border-2 border-[#7C3AED]/50 shadow-[0_0_40px_rgba(124,58,237,0.15)]"
          : "bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46]"
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white text-xs font-semibold px-3 py-1 rounded-full">
            {badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">{name}</h3>
        <p className="text-[#A1A1AA] text-sm">{description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">{price}</span>
          <span className="text-[#A1A1AA] text-sm">{period}</span>
        </div>
        {originalPrice && (
          <span className="text-[#71717A] text-sm line-through">
            {originalPrice}
          </span>
        )}
      </div>

      <Button
        className={`w-full mb-6 ${
          highlighted
            ? "bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white hover:opacity-90 border-0"
            : "bg-[#27272A] text-white hover:bg-[#3F3F46] border border-[#3F3F46]"
        }`}
      >
        Get Started
      </Button>

      <ul className="space-y-3 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check className="w-4 h-4 text-[#7C3AED] mt-0.5 flex-shrink-0" />
            <span className="text-[#A1A1AA] text-sm">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}