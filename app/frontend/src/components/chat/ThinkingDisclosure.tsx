import { ChevronRight } from "lucide-react";

interface ThinkingDisclosureProps {
  thinking: string;
}

export function ThinkingDisclosure({ thinking }: ThinkingDisclosureProps) {
  if (!thinking.trim()) {
    return null;
  }

  return (
    <details className="mt-2 group rounded-lg border border-[#27272A] bg-[#0F0F12]">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-[#A1A1AA]">
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
        <span>思考中... Show thinking</span>
      </summary>
      <pre className="overflow-x-auto border-t border-[#27272A] px-3 py-2 text-xs leading-5 text-[#A1A1AA] whitespace-pre-wrap">
        {thinking}
      </pre>
    </details>
  );
}
