"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { catalogApi, type Product } from "@/lib/api";
import { ProductCard } from "@/components/product-card";

// Fallback curated pieces if backend has no products yet
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Stone Vase",
    slug: "stone-vase",
    price: "1850",
    stock: 5,
    in_stock: true,
    primary_image: {
      id: 101,
      image: "/images/stone-vase.jpg",
      alt_text: "Hand-thrown stone ceramic vase",
    },
    category: { id: 1, name: "Vases & Decor", slug: "vases" },
    description: "Sculptural stoneware vase with organic textural finish.",
  },
  {
    id: 2,
    name: "Pedestal Bowl",
    slug: "pedestal-bowl",
    price: "1600",
    stock: 4,
    in_stock: true,
    primary_image: {
      id: 102,
      image: "/images/pedestal-bowl.jpg",
      alt_text: "Terracotta pedestal ceramic bowl",
    },
    category: { id: 2, name: "Tableware", slug: "tableware" },
    description: "Flared pedestal bowl crafted from iron-rich terracotta clay.",
  },
  {
    id: 3,
    name: "Handle Jug",
    slug: "handle-jug",
    price: "2100",
    stock: 2,
    in_stock: true,
    primary_image: {
      id: 103,
      image: "/images/handle-jug.jpg",
      alt_text: "Round ceramic pitcher with sculptural handle",
    },
    category: { id: 1, name: "Vases & Decor", slug: "vases" },
    description: "A spherical pouring jug with a comfortable curved handle.",
  },
  {
    id: 4,
    name: "Rivulet Vase",
    slug: "rivulet-vase",
    price: "1950",
    stock: 6,
    in_stock: true,
    primary_image: {
      id: 104,
      image: "/images/rivulet-vase.jpg",
      alt_text: "Chalk white sculptural wave vase",
    },
    category: { id: 1, name: "Vases & Decor", slug: "vases" },
    description: "Sinuous undulating form glazed in matte chalk white.",
  },
  {
    id: 5,
    name: "Drift Bowl Set",
    slug: "drift-bowl-set",
    price: "2450",
    stock: 3,
    in_stock: true,
    primary_image: {
      id: 105,
      image: "/images/drift-bowls.jpg",
      alt_text: "Stack of nested lilac and sand ceramic bowls",
    },
    category: { id: 2, name: "Tableware", slug: "tableware" },
    description: "A nested trio of shallow bowls finished in sand and soft lilac glaze.",
  },
  {
    id: 6,
    name: "Hearth Mug",
    slug: "hearth-mug",
    price: "950",
    stock: 8,
    in_stock: true,
    primary_image: {
      id: 106,
      image: "/images/hearth-mug.jpg",
      alt_text: "Two-tone dipped ceramic coffee mug",
    },
    category: { id: 3, name: "Mugs & Cups", slug: "mugs" },
    description: "Dipped glaze morning mug with a generous thumb rest.",
  },
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    catalogApi
      .getProducts({ page: 1 })
      .then((res) => {
        if (!mounted) return;
        if (res.results && res.results.length > 0) {
          setFeaturedProducts(res.results.slice(0, 6));
        } else {
          setFeaturedProducts(FALLBACK_PRODUCTS);
        }
      })
      .catch(() => {
        if (mounted) setFeaturedProducts(FALLBACK_PRODUCTS);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="home-container">
      {/* =========================================================================
          HERO SECTION (Inspired by TERO & FORM / CLAY)
          ========================================================================= */}
      <section className="hero-editorial">
        <div className="hero-editorial-left">
          <p className="eyebrow-line">
            <span className="eyebrow-dot" /> CERAMICS FOR A CALMER HOME
          </p>
          <h1 className="hero-heading">
            Shaped by hand.
          </h1>
          <p className="hero-body-text">
            Timeless ceramic objects, made slowly in our studio. Rooted in nature,
            designed for everyday life and everyday rituals.
          </p>
          <div className="hero-cta-group">
            <Link href="/products" className="button button-terracotta">
              Explore collection →
            </Link>
            <Link href="#studio" className="hero-secondary-link">
              Our studio story
            </Link>
          </div>

          <div className="hero-mantra">
            <span className="hero-mantra-line" />
            <span>NATURAL FORMS · BRIGHTER DAYS</span>
          </div>
        </div>

        <div className="hero-editorial-right">
          <div className="hero-image-frame">
            <img
              src="/images/hero-tero.jpg"
              alt="Handmade ceramic vases and bowls on stone"
              className="hero-main-img"
            />
            <div className="hero-floating-badge" aria-hidden="true">
              <span>ONE OF<br />A KIND</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FEATURED PIECES (Directly linked with Backend Catalog)
          ========================================================================= */}
      <section className="section-featured-forms">
        <div className="section-header-row">
          <div>
            <p className="eyebrow-line">
              <span className="eyebrow-dot" /> FEATURED FORMS
            </p>
            <h2 className="section-title-editorial">Featured pieces</h2>
          </div>
          <Link href="/products" className="view-all-link">
            View all collection →
          </Link>
        </div>

        {loading ? (
          <div className="product-grid-loading">
            {[1, 2, 3].map((n) => (
              <div key={n} className="card-skeleton" />
            ))}
          </div>
        ) : (
          <div className="ceramic-grid">
            {featuredProducts.slice(0, 3).map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx} />
            ))}
          </div>
        )}
      </section>

      {/* =========================================================================
          OUR STUDIO SECTION (Wheel Throwing Hands & Studio Character from TERO)
          ========================================================================= */}
      <section id="studio" className="studio-story-split">
        <div className="studio-story-visual">
          <div className="studio-visual-frame">
            <img
              src="/images/studio-craft.jpg"
              alt="Potter hands shaping clay vessel on wheel"
              className="studio-craft-img"
            />
            <div className="visual-caption-tags">
              <span>PEOPLE</span>
              <span>·</span>
              <span>CLAY</span>
              <span>·</span>
              <span>PLACE</span>
              <span>·</span>
              <span>PURPOSE</span>
            </div>
          </div>
        </div>

        <div className="studio-story-copy">
          <p className="eyebrow-line">
            <span className="eyebrow-dot" /> OUR STUDIO
          </p>
          <h2 className="section-title-editorial">Objects with character.</h2>
          <p className="editorial-lead">
            Each piece is shaped by hand in our studio, where natural materials
            and a slower pace inspire a more considered way of living.
          </p>
          <p className="editorial-paragraph">
            We throw on the potter&apos;s wheel using locally sourced clays, mineral glazes,
            and wood ash. No two pieces are ever identical — slight variations in form,
            rim thickness, and glaze crystallization carry the fingerprint of the maker.
          </p>
          <div className="story-actions">
            <Link href="/products" className="button button-terracotta">
              Shop Studio Pieces →
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          OUR PROCESS SECTION (Form & Clay Raw Materials)
          ========================================================================= */}
      <section id="process" className="process-showcase">
        <div className="process-grid">
          <div className="process-left-img">
            <img
              src="/images/raw-materials.jpg"
              alt="Raw natural clay powder and earthen mixing bowls"
            />
          </div>

          <div className="process-center-card">
            <p className="eyebrow-line">
              <span className="eyebrow-dot" /> OUR PROCESS
            </p>
            <h2 className="section-title-editorial">
              Rooted in natural materials.
            </h2>
            <p className="editorial-lead">
              We work with earth, water, and time to create ceramics that
              celebrate imperfection and bring quiet beauty to everyday moments.
            </p>
            <div className="process-pillars">
              <div className="pillar-item">
                <strong>01. Throwing & Trimming</strong>
                <span>Centered by hand on the slow wheel and trimmed after drying to leather-hard.</span>
              </div>
              <div className="pillar-item">
                <strong>02. Bisque & Glazing</strong>
                <span>First fired to 1000°C, dipped in proprietary mineral glazes, and wiped clean at the foot.</span>
              </div>
              <div className="pillar-item">
                <strong>03. High Fire & Vitrification</strong>
                <span>Fired to 1240°C over 14 hours for durable, water-tight, food-safe stoneware.</span>
              </div>
            </div>
            <Link href="/products" className="button button-outline">
              Explore Our Pieces →
            </Link>
          </div>

          <div className="process-right-img">
            <img
              src="/images/clay-texture.jpg"
              alt="Textured ribbed stoneware pottery surface close-up"
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
          MORE FORMS SHOWCASE
          ========================================================================= */}
      {featuredProducts.length > 3 && (
        <section className="section-more-forms">
          <div className="section-header-row">
            <div>
              <p className="eyebrow-line">
                <span className="eyebrow-dot" /> STUDIO PICKS
              </p>
              <h2 className="section-title-editorial">Pieces for your rituals</h2>
            </div>
            <Link href="/products" className="view-all-link">
              Browse full catalog →
            </Link>
          </div>

          <div className="ceramic-grid">
            {featuredProducts.slice(3, 6).map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx + 3} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
