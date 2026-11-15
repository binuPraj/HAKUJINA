"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store-context";
import { resolveImageUrl } from "@/lib/api";

export function CartDrawer() {
  const {
    cart,
    cartCount,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
    isAuthenticated,
  } = useStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isCartOpen) {
        closeCart();
      }
    }
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCartOpen, closeCart]);

  if (!isCartOpen) return null;

  const items = cart?.items ?? [];

  return (
    <div className="cart-drawer-overlay" onClick={closeCart}>
      <aside
        className="cart-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Shopping Bag"
        role="dialog"
        aria-modal="true"
      >
        <div className="cart-drawer-header">
          <div className="cart-drawer-title">
            <h2>Your Bag</h2>
            <span className="cart-drawer-count">({cartCount} {cartCount === 1 ? "piece" : "pieces"})</span>
          </div>
          <button
            type="button"
            className="cart-drawer-close"
            onClick={closeCart}
            aria-label="Close shopping bag"
          >
            ✕
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="cart-empty-state">
            <div className="empty-icon-ring">✳</div>
            <h3>Sign in to view your bag</h3>
            <p>Your shopping bag is connected with your Hakujina studio account.</p>
            <Link
              href="/login"
              className="button button-full"
              onClick={closeCart}
            >
              Sign In to Your Account →
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="cart-empty-state">
            <div className="empty-icon-ring">𓊈</div>
            <h3>Your bag is empty</h3>
            <p>Thoughtful pieces, shaped slowly by hand. Find something to live with.</p>
            <Link
              href="/products"
              className="button button-outline button-full"
              onClick={closeCart}
            >
              Explore Collection →
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-items-scroll">
              {items.map((item) => {
                const imgUrl = resolveImageUrl(
                  item.product.primary_image?.image,
                  "/images/stone-vase.jpg",
                );
                return (
                  <article key={item.id} className="cart-drawer-item">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="cart-item-image"
                      onClick={closeCart}
                    >
                      <img
                        src={imgUrl}
                        alt={item.product.primary_image?.alt_text || item.product.name}
                      />
                    </Link>
                    <div className="cart-item-info">
                      <div className="cart-item-top">
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="cart-item-name"
                          onClick={closeCart}
                        >
                          {item.product.name}
                        </Link>
                        <span className="cart-item-price">Rs. {item.line_total}</span>
                      </div>
                      <p className="cart-item-meta">
                        {item.product.category?.name || "Ceramic"} · Rs. {item.product.price} each
                      </p>
                      <div className="cart-item-bottom">
                        <div className="quantity-controls" aria-label="Item quantity">
                          <button
                            type="button"
                            className="qty-btn"
                            disabled={item.quantity <= 1}
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="qty-number">{item.quantity}</span>
                          <button
                            type="button"
                            className="qty-btn"
                            disabled={item.quantity >= item.product.stock}
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="cart-item-remove"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="cart-drawer-footer">
              <div className="cart-summary-line">
                <span>Subtotal</span>
                <span>Rs. {cart?.subtotal || "0"}</span>
              </div>
              <p className="cart-shipping-note">
                Shipping calculated at checkout (Rs. 150 delivery across Nepal).
              </p>
              <div className="cart-actions">
                <Link
                  href="/checkout"
                  className="button button-full"
                  onClick={closeCart}
                >
                  Proceed to Checkout →
                </Link>
                <Link
                  href="/cart"
                  className="button button-outline button-full"
                  onClick={closeCart}
                >
                  View Full Bag Details
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

