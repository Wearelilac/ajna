/**
 * Navigation Component — High-Tier Editorial Healthtech Aesthetic
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { soundEffects } from '@/utils/sound';

export function Navigation() {
  const pathname = usePathname();
  const { user, logout, isDemo, resetDemo } = useAuth();

  const navItems = [
    { href: '/', label: 'Overview', roles: [] as string[] },
    { href: '/app', label: '📱 Member Simulator & Dual Showcase', roles: [] as string[], highlight: true },
    { href: '/crisis-reviews', label: 'Crisis Reviews', roles: ['reviewer', 'admin'] },
    { href: '/caregap-review', label: 'Care-Gap Review', roles: ['reviewer', 'admin'] },
    { href: '/population', label: 'Population Pulse', roles: ['official', 'admin'] },
  ];

  const visibleItems = navItems.filter(
    (item) =>
      item.roles.length === 0 ||
      isDemo ||
      (user && item.roles.includes(user.role)),
  );

  return (
    <nav className="sticky top-0 z-40 border-b border-sand-300/80 bg-sand-0/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              onClick={() => soundEffects.playClick()}
              className="flex items-center gap-2 font-serif text-2xl font-semibold text-sand-900 hover:text-clay transition-colors"
            >
              <span>Ajna</span>
              <span className="hidden md:inline-block rounded-full bg-sand-200/80 px-2 py-0.5 text-[10px] font-mono tracking-widest text-sand-700 uppercase">
                Privacy-First
              </span>
            </Link>

            <div className="flex space-x-1 sm:space-x-2">
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href + '/'));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => soundEffects.playClick()}
                    className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                      item.highlight
                        ? 'bg-clay text-sand-50 shadow-sm hover:bg-clay-deep'
                        : isActive
                        ? 'bg-sand-900 text-sand-50 shadow-sm'
                        : 'text-sand-700 hover:bg-sand-200/70 hover:text-sand-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isDemo && (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-sand-200/80 text-sand-800 border border-sand-300/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Demo Mode
              </span>
            )}

            {user ? (
              <div className="flex items-center space-x-3 text-xs">
                <span className="hidden sm:inline text-sand-700 font-medium">
                  {user.email.split('@')[0]} ({user.role})
                </span>
                {isDemo && (
                  <button
                    onClick={() => {
                      soundEffects.playClick();
                      resetDemo();
                    }}
                    className="text-sand-600 hover:text-sand-900 underline text-xs"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => {
                    soundEffects.playClick();
                    logout();
                  }}
                  className="rounded-full border border-sand-300 bg-sand-100 px-3 py-1 text-sand-700 hover:bg-sand-200 transition text-xs"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => soundEffects.playClick()}
                className="rounded-full border border-sand-400 bg-sand-100 px-3.5 py-1.5 text-xs font-medium text-sand-900 hover:bg-sand-200 transition"
              >
                Staff Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
