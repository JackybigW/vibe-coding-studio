import { Languages } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageToggle() {
  const { language, toggleLanguage, t } = useLanguage();
  const nextLabel = language === "en" ? "中文" : "English";
  const ariaLabel =
    language === "en" ? t("language.switchToChinese") : t("language.switchToEnglish");

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={ariaLabel}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-[#27272A] bg-[#18181B] px-3 text-sm font-medium text-[#FAFAFA] transition-colors hover:border-[#7C3AED] hover:bg-[#27272A]"
    >
      <Languages className="h-4 w-4 text-[#A855F7]" />
      {nextLabel}
    </button>
  );
}
