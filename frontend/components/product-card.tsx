"use client";

import React, { useState } from "react";
import Link from "next/link";
import { type Product, resolveImageUrl } from "@/lib/api";
import { useStore } from "@/lib/store-context";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  const { addToCart } = useStore();
  const [adding, setAdding] = useState(false);

  const fallbackImages = [
    "/images/stone-vase.jpg",
    "/images/pedestal-bowl.jpg",
    "/images/handle-jug.jpg",
    "/images/rivulet-vase.jpg",
    "/images/drift-bowls.jpg",
    "/images/hearth-mug.jpg",
  ];
  const defaultFallback = fallbackImages[(index ?? product.id) % fallbackImages.length];

  const imageUrl = resolveImageUrl(
    product.primary_image?.image,
    defaultFallback,
  );

  async function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.in_stock || adding) return;

    setAdding(true);
    await addToCart(product.id, 1);
    setAdding(false);
  }

  const formNumber = index !== undefined
    ? `Form ${String(index + 1).padStart(2, "0")}`
    : `Form ${String(product.id).padStart(2, "0")}`;

  return (
    <article className="ceramic-card group">
      <Link href={`/products/${product.slug}`} className="ceramic-card-link">
        <div className="ceramic-card-image-wrap">
          <img
            src={imageUrl}
            alt={product.primary_image?.alt_text || product.name}
            className="ceramic-card-image"
            loading="lazy"
          />

          {!product.in_stock && (
            <span className="stock-badge stock-badge-soldout">Sold Out</span>
          )}
          {product.in_stock && product.stock <= 3 && (
            <span className="stock-badge stock-badge-low">
              Only {product.stock} left
            </span>
          )}

          {/* Quick Add + Button from Form & Clay */}
          {product.in_stock && (
            <button
              type="button"
              className={`quick-add-btn ${adding ? "loading" : ""}`}
              onClick={handleQuickAdd}
              disabled={adding}
              aria-label={`Add ${product.name} to bag`}
              title="Add to shopping bag"
            >
              {adding ? "…" : "+"}
            </button>
          )}
        </div>

        <div className="ceramic-card-body">
          <div className="ceramic-card-meta">
            <span className="form-num">{formNumber}</span>
            <span className="category-tag">{product.category?.name || "Ceramics"}</span>
          </div>

          <h3 className="ceramic-card-title">{product.name}</h3>

          <div className="ceramic-card-footer">
            <span className="ceramic-card-price">Rs. {product.price}</span>
            <span className="ceramic-view-arrow" aria-hidden="true">→</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

