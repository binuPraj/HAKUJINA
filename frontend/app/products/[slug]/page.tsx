"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { catalogApi, resolveImageUrl, type Product } from "@/lib/api";
import { useStore } from "@/lib/store-context";

// Fallback products catalog for direct matching if backend is empty
const DETAIL_FALLBACKS: Record<string, Product> = {
  "stone-vase": {
    id: 1,
    name: "Stone Vase",
    slug: "stone-vase",
    price: "1850",
    stock: 5,
    in_stock: true,
    primary_image: { id: 1, image: "/images/stone-vase.jpg", alt_text: "Stone Vase" },
    category: { id: 1, name: "Vases & Decor", slug: "vases" },
    description:
      "A generous stoneware vessel thrown with unrefined, iron-speckled clay. Fired with a raw exterior that preserves the tactile grain of the stone, paired with a water-tight matte interior glaze. Made to hold seasonal foliage or quietly anchor a room.",
  },
  "pedestal-bowl": {
    id: 2,
    name: "Pedestal Bowl",
    slug: "pedestal-bowl",
    price: "1600",
    stock: 4,
    in_stock: true,
    primary_image: { id: 2, image: "/images/pedestal-bowl.jpg", alt_text: "Pedestal Bowl" },
    category: { id: 2, name: "Tableware", slug: "tableware" },
    description:
      "Flared footed bowl thrown on the wheel from terracotta clay. The raised foot elevates fruits, morning bread, or studio keepsakes above the table surface, casting soft shadows beneath.",
  },
  "handle-jug": {
    id: 3,
    name: "Handle Jug",
    slug: "handle-jug",
    price: "2100",
    stock: 3,
    in_stock: true,
    primary_image: { id: 3, image: "/images/handle-jug.jpg", alt_text: "Handle Jug" },
    category: { id: 1, name: "Vases & Decor", slug: "vases" },
    description:
      "A spherical pouring jug with a sculptural pulled loop handle. Balances effortlessly in the hand for serving cool water, decanting wine, or displaying solitary dried stems.",
  },
  "rivulet-vase": {
    id: 4,
    name: "Rivulet Vase",
    slug: "rivulet-vase",
    price: "1950",
    stock: 6,
    in_stock: true,
    primary_image: { id: 4, image: "/images/rivulet-vase.jpg", alt_text: "Rivulet Vase" },
    category: { id: 1, name: "Vases & Decor", slug: "vases" },
    description:
      "Sculptural wave form celebrating asymmetry and organic fluidity. Each ridge is pinched by hand as the wheel spins, ensuring no two curves are quite the same.",
  },
  "drift-bowl-set": {
    id: 5,
    name: "Drift Bowl Set",
    slug: "drift-bowl-set",
    price: "2450",
    stock: 2,
    in_stock: true,
    primary_image: { id: 5, image: "/images/drift-bowls.jpg", alt_text: "Drift Bowl Set" },
    category: { id: 2, name: "Tableware", slug: "tableware" },
    description:
      "A nested pair of versatile bowls dipped in layered lilac and sand slips. Perfect for slow morning oats, broths, salads, or evening gatherings.",
  },
  "hearth-mug": {
    id: 6,
    name: "Hearth Mug",
    slug: "hearth-mug",
    price: "950",
    stock: 8,
    in_stock: true,
    primary_image: { id: 6, image: "/images/hearth-mug.jpg", alt_text: "Hearth Mug" },
    category: { id: 3, name: "Mugs & Cups", slug: "mugs" },
    description:
      "Our signature morning companion. Features a soft dipped mineral glaze, unglazed raw clay foot, and a generous thumb rest calibrated for contemplative sips.",
  },
};

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const { addToCart } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let mounted = true;
    catalogApi
      .getProduct(slug)
      .then((data) => {
        if (!mounted) return;
        setProduct(data);
        const img = resolveImageUrl(
          data.primary_image?.image,
          "/images/stone-vase.jpg",
        );
        setSelectedImage(img);
      })
      .catch(() => {
        // Fallback to sample item matching slug
        const fb = DETAIL_FALLBACKS[slug] || DETAIL_FALLBACKS["stone-vase"];
        if (mounted) {
          setProduct(fb);
          setSelectedImage(resolveImageUrl(fb.primary_image?.image, "/images/stone-vase.jpg"));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="product-detail-loading">
        <div className="card-skeleton" style={{ height: "480px" }} />
        <div className="detail-skeleton-info">
          <div className="skeleton-line" style={{ width: "30%", height: "20px" }} />
          <div className="skeleton-line" style={{ width: "80%", height: "44px" }} />
          <div className="skeleton-line" style={{ width: "40%", height: "28px" }} />
          <div className="skeleton-line" style={{ width: "100%", height: "120px" }} />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="catalog-empty-state">
        <span className="empty-symbol">𓊈</span>
        <h3>Piece not found</h3>
        <p>This ceramic piece may have been removed or is no longer listed in our catalog.</p>
        <Link href="/products" className="button button-terracotta">
          Back to Collection →
        </Link>
      </div>
    );
  }

  const allImages = product.images && product.images.length > 0
    ? product.images
    : product.primary_image
    ? [product.primary_image]
    : [{ id: 0, image: selectedImage, alt_text: product.name }];

  async function handleAdd(openDrawer: boolean = true) {
    if (!product || !product.in_stock || adding) return;
    setAdding(true);
    const ok = await addToCart(product.id, quantity);
    setAdding(false);
    if (ok && !openDrawer) {
      router.push("/checkout");
    }
  }

  return (
    <div className="product-detail-container">
      {/* Breadcrumb Navigation */}
      <nav className="detail-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="crumb-sep">/</span>
        <Link href="/products">Collection</Link>
        {product.category && (
          <>
            <span className="crumb-sep">/</span>
            <Link href={`/products?category=${product.category.slug}`}>
              {product.category.name}
            </Link>
          </>
        )}
        <span className="crumb-sep">/</span>
        <span className="current-crumb">{product.name}</span>
      </nav>

      {/* Main Split Layout */}
      <div className="product-detail-layout">
        {/* Left: Visual Gallery */}
        <div className="detail-gallery">
          <div className="detail-primary-image-frame">
            <img
              src={selectedImage}
              alt={product.primary_image?.alt_text || product.name}
              className="detail-primary-image"
            />
            {!product.in_stock && (
              <span className="detail-soldout-badge">Sold Out</span>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="detail-thumbnails-row">
              {allImages.map((img) => {
                const url = resolveImageUrl(img.image, "/images/stone-vase.jpg");
                return (
                  <button
                    key={img.id}
                    type="button"
                    className={`thumb-btn ${selectedImage === url ? "active" : ""}`}
                    onClick={() => setSelectedImage(url)}
                  >
                    <img src={url} alt={img.alt_text || product.name} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Editorial Product Details & Purchase Form */}
        <div className="detail-info-panel">
          <p className="eyebrow-line">
            <span className="eyebrow-dot" /> {product.category?.name || "STUDIO CERAMICS"}
          </p>

          <h1 className="detail-title">{product.name}</h1>

          <div className="detail-price-row">
            <span className="detail-price">Rs. {product.price}</span>
            <span className="detail-tax-note">Tax included · Flat Rs. 150 shipping</span>
          </div>

          <div className="detail-stock-status">
            {product.in_stock ? (
              <span className="status-indicator in-stock">
                <span className="status-dot green" />
                In stock ({product.stock} available in studio)
              </span>
            ) : (
              <span className="status-indicator sold-out">
                <span className="status-dot red" />
                Currently sold out
              </span>
            )}
          </div>

          <div className="detail-description">
            <p>{product.description || "Handmade ceramic piece created with studio care."}</p>
          </div>

          {/* Quantity Selector & Action Buttons */}
          {product.in_stock && (
            <div className="purchase-controls">
              <div className="quantity-box">
                <label className="qty-label">Quantity</label>
                <div className="qty-selector">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="qty-display">{quantity}</span>
                  <button
                    type="button"
                    disabled={quantity >= product.stock}
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="action-buttons-stack">
                <button
                  type="button"
                  className="button button-terracotta button-full"
                  disabled={adding}
                  onClick={() => handleAdd(true)}
                >
                  {adding ? "Adding to Bag…" : "Add to Bag →"}
                </button>
                <button
                  type="button"
                  className="button button-outline button-full"
                  disabled={adding}
                  onClick={() => handleAdd(false)}
                >
                  Instant Checkout
                </button>
              </div>
            </div>
          )}

          {/* Craftsmanship & Material Details Accordion */}
          <div className="detail-specifications">
            <div className="spec-item">
              <strong>Clay & Glaze</strong>
              <span>High-fire stoneware, food-safe mineral glazes, raw unglazed foot.</span>
            </div>
            <div className="spec-item">
              <strong>Craft</strong>
              <span>Hand-thrown on the potter&apos;s wheel, trimmed, bisque and high-fired at 1240°C.</span>
            </div>
            <div className="spec-item">
              <strong>Care Instructions</strong>
              <span>Microwave and dishwasher safe. Hand-washing recommended for longevity.</span>
            </div>
            <div className="spec-item">
              <strong>Studio Delivery</strong>
              <span>Delivered nationwide in eco-friendly protective paper wrap.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

