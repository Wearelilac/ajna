'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useDemo } from '@/hooks/useDemo';
import { demoStore } from '@/demo/store';
import { type ScenarioId, SCENARIO_COPY } from '@/demo/member';
import { DeskCommandConsole } from '@/features/prototype/DeskCommandConsole';
import { PredictiveDiseaseEngine } from '@/features/prototype/PredictiveDiseaseEngine';
import { soundEffects } from '@/utils/sound';

const TABS = [
  { href: '/app', label: 'Today', match: (p: string) => p === '/app', icon: '☀️' },
  { href: '/app/radar', label: 'Radar', match: (p: string) => p.startsWith('/app/radar'), icon: '📈' },
  { href: '/app/listen', label: 'Listen', match: (p: string) => p.startsWith('/app/listen'), icon: '🎙️' },
  { href: '/app/privacy', label: 'Vault', match: (p: string) => p.startsWith('/app/privacy'), icon: '🛡️' },
  { href: '/app/desk', label: 'Desk', match: (p: string) => p.startsWith('/app/desk'), icon: '💼' },
];

const SCENARIOS: ScenarioId[] = [
  'steady',
  'gradual_decline',
  'acute_deviation',
  'night_watch',
];

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resetDemo } = useAuth();
  const { member } = useDemo();
  const [viewMode, setViewMode] = useState<'single' | 'split' | 'predictive' | 'desk'>('split');
  const [soundOn, setSoundOn] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    setSoundOn(soundEffects.isEnabled());
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const isListeningRoute = pathname.startsWith('/app/listen');

  const toggleSound = () => {
    const next = soundEffects.toggle();
    setSoundOn(next);
  };

  return (
    <div className="studio-bg grain relative min-h-screen text-sand-900 pb-16">
      {/* Top Executive Presenter HUD */}
      <header className="sticky top-0 z-40 border-b border-sand-300/70 bg-sand-0/80 px-4 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              onClick={() => soundEffects.playClick()}
              className="font-serif text-2xl font-semibold tracking-tight text-sand-900 hover:text-clay transition-colors"
            >
              Ajna
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-sand-300" />
            <span className="hidden sm:inline-block text-xs uppercase tracking-widest text-sand-600 font-mono">
              High-Tier Interactive Prototype
            </span>
          </div>

          {/* Quick HUD Controls */}
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center rounded-full border border-sand-300/80 bg-sand-100/90 p-1 text-xs">
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setViewMode('single');
                }}
                className={`rounded-full px-3 py-1 font-medium transition-all ${
                  viewMode === 'single'
                    ? 'bg-sand-900 text-sand-50 shadow-sm'
                    : 'text-sand-700 hover:text-sand-900'
                }`}
              >
                📱 Phone
              </button>
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setViewMode('split');
                }}
                className={`rounded-full px-3 py-1 font-medium transition-all ${
                  viewMode === 'split'
                    ? 'bg-sand-900 text-sand-50 shadow-sm'
                    : 'text-sand-700 hover:text-sand-900'
                }`}
              >
                ⚡ Dual Showcase
              </button>
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setViewMode('predictive');
                }}
                className={`rounded-full px-3 py-1 font-medium transition-all ${
                  viewMode === 'predictive'
                    ? 'bg-clay text-sand-50 shadow-sm'
                    : 'text-clay-deep hover:text-sand-900'
                }`}
              >
                🧬 Predictive Engine
              </button>
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setViewMode('desk');
                }}
                className={`hidden md:inline-block rounded-full px-3 py-1 font-medium transition-all ${
                  viewMode === 'desk'
                    ? 'bg-sand-900 text-sand-50 shadow-sm'
                    : 'text-sand-700 hover:text-sand-900'
                }`}
              >
                🖥️ Clinical Desk
              </button>
            </div>

            {/* Quick Scenario Preset Dropdown / Pill */}
            <div className="hidden lg:flex items-center gap-1 rounded-full border border-sand-300/80 bg-sand-100/90 px-2 py-1 text-xs">
              <span className="text-[10px] uppercase font-mono text-sand-500 font-semibold px-1">
                Scenario:
              </span>
              <select
                value={member.scenario}
                onChange={(e) => {
                  soundEffects.playClick();
                  demoStore.setScenario(e.target.value as ScenarioId);
                }}
                className="bg-transparent font-medium text-sand-900 cursor-pointer focus:outline-none"
              >
                {SCENARIOS.map((id) => (
                  <option key={id} value={id}>
                    {SCENARIO_COPY[id].title}
                  </option>
                ))}
              </select>
            </div>

            {/* Sound FX Toggle */}
            <button
              onClick={toggleSound}
              title={soundOn ? 'Mute tactile audio' : 'Enable tactile audio'}
              className={`rounded-full border px-2.5 py-1 text-xs font-mono transition-all ${
                soundOn
                  ? 'border-clay/50 bg-clay text-sand-50 shadow-sm'
                  : 'border-sand-300 bg-sand-100/80 text-sand-600 hover:bg-sand-200'
              }`}
            >
              {soundOn ? '🔊 SFX' : '🔇 Muted'}
            </button>

            {/* Demo Reset */}
            <button
              onClick={() => {
                soundEffects.playClick();
                resetDemo();
              }}
              className="rounded-full border border-sand-300/90 bg-sand-100 px-3 py-1 text-xs font-medium text-sand-800 hover:bg-sand-200 active:scale-95 transition-all"
            >
              Reset State
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* PREDICTIVE DISEASE ENGINE VIEW */}
        {viewMode === 'predictive' ? (
          <div className="min-h-[780px]">
            <PredictiveDiseaseEngine />
          </div>
        ) : viewMode === 'desk' ? (
          <div className="min-h-[780px]">
            <DeskCommandConsole />
          </div>
        ) : (
          /* SINGLE OR SPLIT VIEW */
          <div
            className={`flex flex-col items-center justify-center gap-8 ${
              viewMode === 'split' ? 'lg:grid lg:grid-cols-[410px_1fr] lg:items-start lg:gap-10' : ''
            }`}
          >
            {/* LEFT / CENTER: THE iPHONE 16 PRO SIMULATOR */}
            <div className="relative flex flex-col items-center">
              {/* External Phone Chassis Container */}
              <div className="relative">
                {/* Physical Metallic Hardware Buttons */}
                {/* Left side: Action Button */}
                <div className="absolute -left-[5px] top-[108px] h-9 w-[4px] rounded-l-md bg-stone-700 shadow-sm" />
                {/* Left side: Volume Up */}
                <div className="absolute -left-[5px] top-[156px] h-14 w-[4px] rounded-l-md bg-stone-700 shadow-sm" />
                {/* Left side: Volume Down */}
                <div className="absolute -left-[5px] top-[226px] h-14 w-[4px] rounded-l-md bg-stone-700 shadow-sm" />
                {/* Right side: Power / Siri button */}
                <div className="absolute -right-[5px] top-[168px] h-20 w-[4px] rounded-r-md bg-stone-700 shadow-sm" />

                {/* iPhone Titanium Frame Bezel */}
                <div className="relative w-full max-w-[392px] sm:w-[392px] sm:h-[812px] overflow-hidden rounded-[3.2rem] bg-gradient-to-b from-[#423a31] via-[#2a241c] to-[#1c1813] p-[10px] shadow-[0_25px_70px_-15px_rgba(26,20,14,0.65),0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_2px_rgba(255,255,255,0.25)]">
                  {/* Inner Screen Bezel */}
                  <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[2.6rem] bg-sand-50 shadow-inner">
                    {/* Status Bar & Dynamic Island */}
                    <div className="relative z-30 flex items-center justify-between px-7 pt-3.5 pb-1 text-[12px] font-semibold text-sand-900 select-none">
                      {/* Left: Clock */}
                      <span className="tracking-tight">{currentTime || '9:41'}</span>

                      {/* Center: Interactive Dynamic Island */}
                      <div className="absolute left-1/2 top-2.5 z-40 -translate-x-1/2">
                        <div
                          className={`flex items-center justify-between rounded-full bg-black px-3 py-1 shadow-md transition-all duration-300 ${
                            isListeningRoute ? 'h-7 w-32 ring-1 ring-amber-500/40' : 'h-6 w-24'
                          }`}
                        >
                          {/* Camera pinhole */}
                          <div className="h-2.5 w-2.5 rounded-full bg-stone-900 ring-1 ring-stone-800" />

                          {/* Dynamic Island Status Pill */}
                          {isListeningRoute ? (
                            <span className="flex items-center gap-1.5 text-[9px] font-mono text-amber-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                              MIC ON
                            </span>
                          ) : (
                            <span className="text-[8px] font-mono tracking-widest text-stone-500">
                              AJNA
                            </span>
                          )}

                          {/* Sensor aperture */}
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-950/80" />
                        </div>
                      </div>

                      {/* Right: Connectivity & Battery Icons */}
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-sand-800">
                        <span>5G</span>
                        <span>·</span>
                        {/* Battery Icon */}
                        <div className="relative flex h-3 w-5 items-center rounded-sm border border-sand-800 p-[1px]">
                          <div className="h-full w-4/5 rounded-2xs bg-sand-800" />
                          <div className="absolute -right-1 top-1 h-1 w-0.5 rounded-r-xs bg-sand-800" />
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Viewport */}
                    <div className="phone-scroll relative min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-1">
                      {children}
                    </div>

                    {/* Bottom Navigation Dock */}
                    <nav className="relative z-20 grid grid-cols-5 border-t border-sand-200/90 bg-sand-0/95 px-1 pb-4 pt-2 backdrop-blur-md">
                      {TABS.map((tab) => {
                        const active = tab.match(pathname);
                        return (
                          <Link
                            key={tab.href}
                            href={tab.href}
                            onClick={() => soundEffects.playClick()}
                            className={`group flex flex-col items-center rounded-xl py-1 text-center text-[10px] font-medium transition-all ${
                              active
                                ? 'font-semibold text-sand-900'
                                : 'text-sand-600 hover:text-sand-800'
                            }`}
                          >
                            <span
                              className={`text-base transition-transform group-hover:scale-110 ${
                                active ? 'scale-105' : 'opacity-70'
                              }`}
                            >
                              {tab.icon}
                            </span>
                            <span
                              className={`mt-0.5 ${
                                active
                                  ? 'text-clay font-bold'
                                  : 'text-sand-600'
                              }`}
                            >
                              {tab.label}
                            </span>
                          </Link>
                        );
                      })}
                    </nav>

                    {/* Bottom Home Indicator Bar */}
                    <div className="absolute bottom-1 left-1/2 z-30 h-1 w-32 -translate-x-1/2 rounded-full bg-sand-400/80" />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: STAFF COMMAND CONSOLE (IN SPLIT SHOWCASE MODE) */}
            {viewMode === 'split' && (
              <div className="w-full min-h-[812px] h-[812px]">
                <DeskCommandConsole />
              </div>
            )}

            {/* NARRATIVE ASIDE (IN SINGLE PHONE MODE) */}
            {viewMode === 'single' && (
              <aside className="hidden max-w-sm lg:block space-y-4">
                <span className="rounded-full bg-sand-200 px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-sand-800 font-semibold">
                  Executive Simulation
                </span>
                <h1 className="font-serif text-4xl leading-tight text-sand-900">
                  Ajna: The Complete Privacy-First Loop
                </h1>
                <p className="text-sm leading-relaxed text-sand-700">
                  Every interaction here has a real simulated outcome. Watch how personal wearable
                  resilience, on-device audio memory zero-fills, and human-in-the-loop crisis triage
                  unite in a zero-trust architecture.
                </p>

                <div className="rounded-2xl border border-sand-200 bg-sand-0 p-4 space-y-2 text-xs text-sand-800 shadow-sm">
                  <p className="font-semibold text-sand-900">High-Tier Demo Guide:</p>
                  <ul className="space-y-1.5 list-disc pl-4 text-sand-700">
                    <li>Switch to <strong>Dual Showcase</strong> to see the clinical desk react in real-time.</li>
                    <li>Try the <strong>Listen</strong> tab and watch the RAM memory zero-fill wipe.</li>
                    <li>Toggle off consent in <strong>Vault</strong> to observe instant cryptographic gating.</li>
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => {
                      soundEffects.playClick();
                      setViewMode('split');
                    }}
                    className="rounded-full bg-sand-900 px-5 py-2.5 text-xs font-semibold text-sand-50 shadow hover:bg-sand-800 transition"
                  >
                    Switch to Dual Showcase View
                  </button>
                  <Link
                    href="/"
                    className="rounded-full border border-sand-400 bg-sand-100 px-4 py-2 text-xs font-medium text-sand-800 hover:bg-sand-200 transition"
                  >
                    Landing Overview
                  </Link>
                </div>
              </aside>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
