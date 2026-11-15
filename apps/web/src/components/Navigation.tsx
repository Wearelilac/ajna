/**
 * W1.1: Navigation Component
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { href: '/', label: 'Home', roles: [] },
    { href: '/population', label: 'Population', roles: ['official', 'admin'] },
    { href: '/crisis-reviews', label: 'Crisis Reviews', roles: ['reviewer', 'admin'] },
    { href: '/caregap-review', label: 'Care-Gap Review', roles: ['reviewer', 'admin'] },
  ];

  const visibleItems = navItems.filter(
    (item) => item.roles.length === 0 || (user && item.roles.includes(user.role))
  );

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-16">
          <div className="flex space-x-8">
            <Link href="/" className="flex items-center text-2xl font-bold text-blue-600">
              Ajna
            </Link>
            
            <div className="flex space-x-4">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-3 border-b-2 text-sm font-medium ${
                    pathname === item.href
                      ? 'border-blue-600 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {user.email} ({user.role})
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
