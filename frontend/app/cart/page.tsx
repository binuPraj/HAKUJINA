"use client";

import React from "react";
import Link from "next/link";
import { useStore } from "@/lib/store-context";
import { resolveImageUrl } from "@/lib/api";

export default function CartPage() {
  const {
    cart,
    cartCount,
    updateQuantity,
    removeFromCart,
    clearCart,
    isAuthenticated,
  } = useStore();

  const items = cart?.items ?? [];
  const subtotalNumber = parseFloat(cart?.subtotal || "0");
  const deliveryFee = 150;
  const grandTotal = subtotalNumber > 0 ? subtotalNumber + deliveryFee : 0;

  return (
    <div className="cart-page-container">
      <div className="cart-page-header">
        <p className="eyebrow-line">
          <span className="eyebrow-dot" /> SHOPPING BAG
        </p>
        <h1 className="cart-page-title">Your Selected Pieces</h1>
        <p className="cart-page-subtitle">
          Pieces are made in limited studio runs. Reserved in your bag for your order.
        </p>
      </div>

      {!isAuthenticated ? (
        <div className="cart-empty-panel">
          <span className="empty-symbol">✳</span>
          <h2>Sign in to view your bag</h2>
          <p>Sign in to your Hakujina account to view pieces saved in your shopping bag.</p>
          <div className="empty-actions">
            <Link href="/login" className="button button-terracotta">
              Sign In to Your Account →
            </Link>
            <Link href="/products" className="button button-outline">
              Explore Collection
            </Link>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="cart-empty-panel">
          <span className="empty-symbol">𓊈</span>
          <h2>Your bag is currently empty</h2>
          <p>You haven&apos;t added any ceramic pieces to your bag yet.</p>
          <div className="empty-actions">
            <Link href="/products" className="button button-terracotta">
              Browse Studio Collection →
            </Link>
          </div>
        </div>
      ) : (
        <div className="cart-page-grid">
          {/* Items List Column */}
          <div className="cart-page-items-col">
            <div className="cart-table-header">
              <span>Piece</span>
              <span>Quantity</span>
              <span>Total</span>
            </div>

            <div className="cart-table-body">
              {items.map((item) => {
                const img = resolveImageUrl(
                  item.product.primary_image?.image,
                  "/images/stone-vase.jpg",
                );
                return (
                  <div key={item.id} className="cart-row-item">
                    <div className="cart-row-product">
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="cart-row-img-wrap"
                      >
                        <img
                          src={img}
                          alt={item.product.primary_image?.alt_text || item.product.name}
                        />
                      </Link>
                      <div className="cart-row-details">
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="cart-row-title"
                        >
                          {item.product.name}
                        </Link>
                        <span className="cart-row-category">
                          {item.product.category?.name || "Ceramics"} · Rs. {item.product.price}
                        </span>
                        <button
                          type="button"
                          className="cart-row-delete"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Remove piece
                        </button>
                      </div>
                    </div>

                    <div className="cart-row-qty">
                      <div className="quantity-controls">
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
                    </div>

                    <div className="cart-row-total">
                      <span>Rs. {item.line_total}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-page-clear-bar">
              <button
                type="button"
                className="clear-bag-btn"
                onClick={clearCart}
              >
                Clear Entire Bag
              </button>
              <Link href="/products" className="continue-shopping-link">
                ← Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary Column */}
          <div className="cart-summary-card">
            <h3 className="summary-card-title">Order Summary</h3>

            <div className="summary-row">
              <span>Subtotal ({cartCount} {cartCount === 1 ? "piece" : "pieces"})</span>
              <strong>Rs. {cart?.subtotal}</strong>
            </div>

            <div className="summary-row">
              <span>Delivery Fee (Nepal)</span>
              <strong>Rs. {deliveryFee}</strong>
            </div>

            <div className="summary-divider" />

            <div className="summary-row total-row">
              <span>Estimated Total</span>
              <strong className="summary-grand-total">
                Rs. {grandTotal.toFixed(2)}
              </strong>
            </div>

            <p className="summary-note">
              Orders are verified manually via bank transfer / QR payment screenshot
              after placement.
            </p>

            <Link href="/checkout" className="button button-terracotta button-full">
              Proceed to Checkout →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

