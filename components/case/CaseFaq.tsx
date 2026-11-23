import { Icon } from "@/components/icons";
import { CASE_FAQ } from "@/lib/case";

/** Native <details> accordion: works without JS and without a client bundle. */
export function CaseFaq() {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-canvas">
      {CASE_FAQ.map((entry) => (
        <details key={entry.q} className="group px-5 sm:px-6">
          <summary className="flex min-h-[64px] cursor-pointer list-none items-start justify-between gap-5 py-5 text-[15px] font-medium leading-snug text-ink sm:text-[16.5px] [&::-webkit-details-marker]:hidden">
            <span>{entry.q}</span>
            <span
              aria-hidden
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition-transform duration-200 group-open:rotate-45"
            >
              <Icon name="plus" size={13} />
            </span>
          </summary>
          <p className="max-w-[74ch] pb-6 pr-8 text-[13.5px] leading-relaxed text-ink-soft sm:text-[15px]">
            {entry.a}
          </p>
        </details>
      ))}
    </div>
  );
}
