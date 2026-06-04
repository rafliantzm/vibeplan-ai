"use client";

import { useState } from "react";
import MockCodingPromptGenerator from "@/components/home/MockCodingPromptGenerator";
import MockHistoryPanel from "@/components/home/MockHistoryPanel";
import MockNextStepPlanner from "@/components/home/MockNextStepPlanner";
import MockPrdGenerator from "@/components/home/MockPrdGenerator";
import MockResultPreview from "@/components/home/MockResultPreview";
import RevealOnScroll from "@/components/home/RevealOnScroll";
import { showcaseTabs } from "@/lib/showcase";

const RENDERERS = {
  prd: MockPrdGenerator,
  "next-step": MockNextStepPlanner,
  "coding-prompt": MockCodingPromptGenerator,
  history: MockHistoryPanel,
  result: MockResultPreview,
};

export default function FeaturePreviewTabs() {
  const [activeTab, setActiveTab] = useState(showcaseTabs[0].id);
  const currentTab = showcaseTabs.find((tab) => tab.id === activeTab) || showcaseTabs[0];
  const ActiveRenderer = RENDERERS[currentTab.id] || MockPrdGenerator;

  return (
    <div className="grid gap-6">
      <div
        role="tablist"
        aria-label="Preview workflow VibePlan AI"
        className="no-scrollbar flex gap-3 overflow-x-auto pb-1"
      >
        {showcaseTabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`showcase-panel-${tab.id}`}
              id={`showcase-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4">
        <aside className="rounded-[1.75rem] border border-slate-200 bg-white/85 p-5 shadow-lg shadow-slate-900/5 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
            Explore VibePlan AI Workflow
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {currentTab.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {currentTab.description}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {showcaseTabs.map((tab, index) => (
              <RevealOnScroll
                key={tab.id}
                delay={index * 60}
                className={`rounded-2xl border px-4 py-3 transition ${
                  tab.id === activeTab
                    ? "border-sky-200 bg-sky-50/90"
                    : "border-slate-200 bg-slate-50/80"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Step {index + 1}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{tab.label}</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  {tab.id === "prd"
                    ? "Brief ke dokumen requirement"
                    : tab.id === "next-step"
                      ? "PRD ke roadmap implementasi"
                      : tab.id === "coding-prompt"
                        ? "Roadmap ke prompt agent"
                        : tab.id === "history"
                          ? "Timeline dokumen tersimpan"
                          : "Ringkasan hasil final"}
                </p>
              </RevealOnScroll>
            ))}
          </div>
        </aside>

        <RevealOnScroll
          id={`showcase-panel-${currentTab.id}`}
          role="tabpanel"
          aria-labelledby={`showcase-tab-${currentTab.id}`}
          className="home-showcase-panel home-glow-panel rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-2xl shadow-slate-900/5 backdrop-blur sm:p-5"
          delay={140}
        >
          <ActiveRenderer ctaHref={currentTab.ctaHref} ctaLabel={currentTab.ctaLabel} />
        </RevealOnScroll>
      </div>
    </div>
  );
}
