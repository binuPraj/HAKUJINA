"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store-context";

/** Inner component that uses usePathname — must be inside Suspense. */
function NavLinks() {
  const pathname = usePathname();
  const { isAuthenticated } = useStore();
  return (
    <>
      <Link
        href="/products"
        className={`nav-link ${pathname === "/products" ? "active" : ""}`}
      >
        Collection
      </Link>
      <Link
        href="/reservations"
        className={`nav-link ${pathname.startsWith("/reservations") ? "active" : ""}`}
      >
        Reserve a Wheel
      </Link>
      <Link href="/#studio" className="nav-link">
        The Studio
      </Link>
      <Link href="/#process" className="nav-link">
        Our Process
      </Link>
      {isAuthenticated && (
        <>
          <Link
            href="/orders"
            className={`nav-link ${pathname.startsWith("/orders") ? "active" : ""}`}
          >
            Orders
          </Link>
          <Link
            href="/bookings"
            className={`nav-link ${pathname.startsWith("/bookings") ? "active" : ""}`}
          >
            Bookings
          </Link>
        </>
      )}
    </>
  );
}

export function SiteHeader() {
  const { user, isAuthenticated, cartCount, openCart, logout } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <header className="site-header-nav">
      <div className="site-header-inner">
        {/* Brand / Logo */}
        <Link href="/" className="studio-brand" aria-label="Hakujina Home">
          <span className="brand-kanji" aria-hidden="true">白磁</span>
          <span className="brand-text">
            <span className="brand-title">HAKUJINA</span>
            <span className="brand-subtitle">CERAMIC STUDIO</span>
          </span>
        </Link>

        {/* Desktop Primary Navigation */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <Suspense
            fallback={
              <>
                <Link href="/products" className="nav-link">
                  Collection
                </Link>
                <Link href="/reservations" className="nav-link">
                  Reserve a Wheel
                </Link>
                <Link href="/#studio" className="nav-link">
                  The Studio
                </Link>
                <Link href="/#process" className="nav-link">
                  Our Process
                </Link>
              </>
            }
          >
            <NavLinks />
          </Suspense>
        </nav>

        {/* Right Utility Navigation */}
        <div className="header-utilities">
          {isAuthenticated ? (
            <div className="account-dropdown-wrapper">
              <button
                type="button"
                className="user-pill-btn"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                aria-expanded={accountMenuOpen}
              >
                <span className="user-avatar-initial">
                  {user?.name ? user.name[0].toUpperCase() : "U"}
                </span>
                <span className="user-first-name">
                  {user?.name ? user.name.split(" ")[0] : "Account"}
                </span>
                <span className="user-caret">▾</span>
              </button>

              {accountMenuOpen && (
                <div
                  className="account-menu-popover"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  <div className="account-menu-header">
                    <strong>{user?.name}</strong>
                    <small>{user?.email}</small>
                  </div>
                  <Link href="/orders" className="account-menu-link">
                    My Orders
                  </Link>
                  <Link href="/bookings" className="account-menu-link">
                    My Bookings
                  </Link>
                  <Link href="/cart" className="account-menu-link">
                    Shopping Bag
                  </Link>
                  <button
                    type="button"
                    className="account-menu-logout"
                    onClick={() => {
                      logout();
                      setAccountMenuOpen(false);
                    }}
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-links-desktop">
              <Link href="/login" className="login-link">
                Log In
              </Link>
              <Link href="/register" className="button button-small button-pill">
                Join Studio
              </Link>
            </div>
          )}

          {/* Shopping Bag Trigger Button */}
          <button
            type="button"
            className="bag-trigger-btn"
            onClick={openCart}
            aria-label={`View shopping bag with ${cartCount} items`}
          >
            <svg
              className="bag-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span className="bag-label">Bag</span>
            {cartCount > 0 && <span className="bag-count-pill">{cartCount}</span>}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="mobile-hamburger"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-panel">
          <Link
            href="/products"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            Collection
          </Link>
          <Link
            href="/reservations"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            Reserve a Pottery Wheel
          </Link>
          <Link
            href="/#studio"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            The Studio
          </Link>
          <Link
            href="/#process"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            Our Process
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                href="/orders"
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                My Orders
              </Link>
              <Link
                href="/bookings"
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                My Bookings
              </Link>
              <Link
                href="/cart"
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                Shopping Bag ({cartCount})
              </Link>
              <button
                type="button"
                className="mobile-nav-link text-left"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
              >
                Log Out
              </button>
            </>
          ) : (
            <div className="mobile-auth-actions">
              <Link
                href="/login"
                className="button button-outline button-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="button button-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                Join Studio
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

