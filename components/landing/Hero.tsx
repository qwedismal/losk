"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import type { QuizAnswers } from "@/lib/types";
import { formatMoney, getItem } from "@/lib/pricing";
import { Icon } from "@/components/icons";
import { Calculator } from "./Calculator";
import { BRAND } from "@/lib/brand";

/** WebGL is optional: never block the first paint on it. */
const SoftScene = dynamic(() => import("@/components/three/SoftScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="size-28 animate-pulse rounded-[36px] bg-gradient-to-br from-sand to-accent-mist motion-reduce:animate-none" />
    </div>
  ),
});

export function Hero() {
  const [answers, setAnswers] = useState<QuizAnswers>({
    item: "sofa",
    size: "small",
    stains: "light",
    timing: "asap",
    quantity: 1,
  });

  const item = getItem(answers.item);

  return (
    <section id="top" className="relative -mt-1 overflow-hidden">
      <div className="aurora" aria-hidden />
      <div className="page relative pb-14 pt-8 sm:pt-12 lg:pb-20 lg:pt-16">
        <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
          {/* -------------------------------- copy -------------------------------- */}
          <div className="lg:col-span-5 lg:pt-4">
            <h1>
              <span className="block text-[15px] font-medium text-ink-soft sm:text-[16px]">
                Химчистка мебели на дому в Москве
              </span>
              <span className="mt-2 block text-[clamp(32px,7.6vw,56px)] font-semibold leading-[1.02] tracking-[-0.045em]">
                Диван как из магазина
                <span className="block text-accent-deep">
                  за 2 часа<span className="text-ink">.</span>
                </span>
              </span>
            </h1>

            <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-ink-soft sm:text-[17px]">
              Без выноса из квартиры и без запаха. Считаете цену за минуту в трёх шагах, фиксируем смету до
              выезда, доплат по факту не бывает.
            </p>

            {/* offer */}
            <div className="mt-5 flex items-end gap-3">
              <div className="rounded-[18px] border border-line bg-canvas/80 px-3.5 py-2.5 backdrop-blur">
                <p className="text-[11.5px] font-medium text-mute">Сейчас</p>
                <p className="tnum text-[22px] font-semibold leading-tight tracking-[-0.03em]">
                  от {formatMoney(item.base)}
                </p>
                <p className="text-[11.5px] text-mute">{item.label.toLowerCase()} · выезд включён</p>
              </div>
              <div className="rounded-[18px] bg-accent-mist px-3 py-2.5">
                <p className="text-[11.5px] font-medium text-accent-deep">Выгода</p>
                <p className="text-[13px] font-semibold leading-tight text-accent-deep">
                  2 предмета
                  <br />
                  −10%
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href="#calculator"
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-white shadow-[0_14px_34px_-16px_rgba(20,22,26,.6)] transition-colors hover:bg-[#22252b]"
              >
                Рассчитать за минуту
                <Icon name="arrowRight" size={17} />
              </Link>
              <a
                href={BRAND.phoneHref}
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-canvas px-5 text-[15px] font-medium text-ink transition-colors hover:bg-canvas-soft"
              >
                <Icon name="phone" size={17} className="text-accent-deep" />
                Позвонить
              </a>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
              {[
                { icon: "van" as const, text: "Выезд в день заявки" },
                { icon: "shield" as const, text: "Гарантия 48 часов" },
                { icon: "leaf" as const, text: "Без хлора" },
              ].map((c) => (
                <li
                  key={c.text}
                  className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft"
                >
                  <Icon name={c.icon} size={15} className="text-accent-deep" />
                  {c.text}
                </li>
              ))}
            </ul>
          </div>

          {/* ------------------------------ visual + quiz ------------------------------ */}
          <div className="lg:col-span-7">
            <div className="relative">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[220px] w-[86%] rounded-[48px] bg-[radial-gradient(60%_70%_at_50%_35%,rgba(15,182,166,.18),rgba(243,238,230,.55)_60%,transparent_78%)] blur-[2px] sm:h-[270px] lg:h-[300px]"
                aria-hidden
              />
              <div className="relative mx-auto h-[190px] w-full max-w-[440px] sm:h-[240px] lg:h-[280px]">
                <SoftScene item={answers.item} className="h-full w-full" />
              </div>

              <div id="calculator" className="relative scroll-mt-24 lg:-mt-4">
                <Calculator answers={answers} setAnswers={setAnswers} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
