"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store-context";

export function SiteFooter() {
  const { showToast } = useStore();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleNewsletter(e: React.FormEvent) {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribed(true);
    showToast("Thank you for joining our studio newsletter.", "success");
    setNewsletterEmail("");
  }

  return (
    <footer className="studio-footer">
      <div className="studio-footer-inner">
        {/* Brand & Manifesto Column */}
        <div className="footer-col footer-col-brand">
          <Link href="/" className="footer-brand-title">
            HAKUJINA
          </Link>
          <p className="footer-tagline">
            HANDMADE FOR<br />BRIGHTER DAYS.
          </p>
          <p className="footer-desc">
            Small-batch pottery, shaped slowly by hand. Designed for everyday
            rituals and a more considered way of living.
          </p>
        </div>

        {/* Links Navigation Column */}
        <div className="footer-col footer-col-links">
          <h4 className="footer-heading">Studio Links</h4>
          <ul className="footer-nav-list">
            <li>
              <Link href="/products">Shop All Pieces</Link>
            </li>
            <li>
              <Link href="/reservations">Reserve a Pottery Wheel</Link>
            </li>
            <li>
              <Link href="/#studio">Our Studio Story</Link>
            </li>
            <li>
              <Link href="/#process">Ceramic Craft & Process</Link>
            </li>
            <li>
              <Link href="/orders">Order Tracking</Link>
            </li>
            <li>
              <Link href="/bookings">My Bookings</Link>
            </li>
            <li>
              <Link href="/cart">Shopping Bag</Link>
            </li>
          </ul>
        </div>

        {/* Customer Care Column */}
        <div className="footer-col footer-col-care">
          <h4 className="footer-heading">Care & Contact</h4>
          <ul className="footer-nav-list">
            <li>
              <span>Kathmandu, Nepal</span>
            </li>
            <li>
              <a href="mailto:studio@hakujina.com">studio@hakujina.com</a>
            </li>
            <li>
              <span>Delivery across Nepal: Rs. 150</span>
            </li>
            <li>
              <span>Food & Dishwasher Safe</span>
            </li>
          </ul>
        </div>

        {/* Newsletter Signup Column */}
        <div className="footer-col footer-col-newsletter">
          <h4 className="footer-heading">Join Our Journey</h4>
          <p className="footer-newsletter-text">
            Thoughtful updates, new piece releases, and studio reflections.
          </p>

          {subscribed ? (
            <p className="newsletter-thankyou">
              ✳ Welcome to our circle. We will share new drops gently.
            </p>
          ) : (
            <form onSubmit={handleNewsletter} className="newsletter-form">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="newsletter-input"
              />
              <button
                type="submit"
                className="newsletter-submit"
                aria-label="Subscribe to newsletter"
              >
                →
              </button>
            </form>
          )}

          {/* Botanical Illustration from Form & Clay */}
          <div className="footer-botanical" aria-hidden="true">
            <svg viewBox="0 0 60 90" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M30 85V20" />
              <path d="M30 50c-12-5-18-18-15-28 8 2 13 14 15 28Z" />
              <path d="M30 40c12-5 18-18 15-28-8 2-13 14-15 28Z" />
              <path d="M30 65c-10-4-15-14-12-22 6 2 10 11 12 22Z" />
              <path d="M30 58c10-4 15-14 12-22-6 2-10 11-12 22Z" />
              <circle cx="30" cy="18" r="5" />
            </svg>
          </div>
        </div>
      </div>

      <div className="studio-footer-bottom">
        <span>© 2026 HAKUJINA CERAMIC STUDIO. ALL RIGHTS RESERVED.</span>
        <span>A MORE HUMAN HOME.</span>
      </div>
    </footer>
  );
}

