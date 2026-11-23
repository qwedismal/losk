import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui";
import { CASE_TIERS } from "@/lib/case";

/** Three tiers without rouble figures - the price conversation happens on a call. */
export function TierCards() {
  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-5">
      {CASE_TIERS.map((tier) => {
        const popular = Boolean(tier.popular);
        return (
          <article
            key={tier.key}
            aria-labelledby={`tier-${tier.key}`}
            className={`relative flex h-full flex-col rounded-card border p-5 sm:p-6 ${
              popular
                ? "border-ink bg-ink text-white shadow-lift"
                : "border-line bg-canvas text-ink shadow-soft"
            }`}
          >
            {popular ? (
              <span className="mb-3 inline-flex self-start rounded-full bg-accent-deep px-2.5 py-1 font-mono text-[10px] tracking-[0.01em] text-white">
                чаще берут
              </span>
            ) : null}

            <h3 id={`tier-${tier.key}`} className="text-[18px] font-semibold leading-tight">
              {tier.name}
            </h3>
            <p className={`mt-2 text-[13px] leading-relaxed ${popular ? "text-white/70" : "text-ink-soft"}`}>
              {tier.forWhom}
            </p>

            <ul className={`mt-5 space-y-2.5 border-t pt-5 ${popular ? "border-white/15" : "border-line"}`}>
              {tier.includes.map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <Icon
                    name="check"
                    size={15}
                    strokeWidth={2.2}
                    className={`mt-[3px] shrink-0 ${popular ? "text-accent-soft" : "text-accent-deep"}`}
                  />
                  <span className={`text-[13px] leading-snug ${popular ? "text-white/85" : "text-ink-soft"}`}>
                    {line}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              <ButtonLink
                href="#contact"
                variant={popular ? "accent" : "soft"}
                block
                aria-label={`Обсудить тариф «${tier.name}»`}
              >
                Обсудить
              </ButtonLink>
            </div>
          </article>
        );
      })}
    </div>
  );
}
