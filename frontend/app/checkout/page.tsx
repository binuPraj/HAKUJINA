"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ordersApi, resolveImageUrl } from "@/lib/api";
import { useStore } from "@/lib/store-context";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, cart, refreshCart, showToast } = useStore();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Kathmandu");
  const [addressLine, setAddressLine] = useState("");
  const [landmark, setLandmark] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Pre-fill user details if available
  useEffect(() => {
    if (user) {
      if (user.name) setFullName(user.name);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  const items = cart?.items ?? [];
  const subtotalNumber = parseFloat(cart?.subtotal || "0");
  const deliveryFee = 150;
  const grandTotal = subtotalNumber > 0 ? subtotalNumber + deliveryFee : 0;

  async function handleOrderSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!isAuthenticated) {
      setFormError("Please log in to place your order.");
      return;
    }

    if (items.length === 0) {
      setFormError("Your shopping bag is empty. Please add pieces before checkout.");
      return;
    }

    // Client-side phone format check matching backend ^\+?[0-9]{7,15}$
    const cleanPhone = phone.trim();
    if (!/^\+?[0-9]{7,15}$/.test(cleanPhone)) {
      setFormError(
        "Please enter a valid phone number (7 to 15 digits, optional leading +). Spaces or special characters are not allowed.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const order = await ordersApi.createOrder({
        full_name: fullName.trim(),
        phone: cleanPhone,
        city: city.trim(),
        address_line: addressLine.trim(),
        landmark: landmark.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      await refreshCart();
      showToast(`Order ${order.order_number} created successfully!`, "success");
      router.push(`/orders/${order.order_number}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to place order.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="checkout-auth-guard">
        <div className="auth-guard-box">
          <span className="empty-symbol">✳</span>
          <h2>Sign In to Complete Checkout</h2>
          <p>
            Please sign in or create a Hakujina account so you can track your
            delivery and upload your payment verification.
          </p>
          <div className="auth-guard-actions">
            <Link href="/login" className="button button-terracotta button-full">
              Sign In to Your Account →
            </Link>
            <Link href="/register" className="button button-outline button-full">
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user && user.is_email_verified === false) {
    return (
      <div className="checkout-auth-guard">
        <div className="auth-guard-box">
          <span className="empty-symbol">✉</span>
          <h2>Email Verification Required</h2>
          <p>
            To protect studio orders, please verify your email (<b>{user.email}</b>)
            before checking out. Check your inbox for the confirmation link.
          </p>
          <div className="auth-guard-actions">
            <Link href="/login" className="button button-terracotta button-full">
              Request Verification Link →
            </Link>
            <Link href="/cart" className="button button-outline button-full">
              Back to Shopping Bag
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="checkout-auth-guard">
        <div className="auth-guard-box">
          <span className="empty-symbol">𓊈</span>
          <h2>Your bag is empty</h2>
          <p>There are no pieces to checkout right now.</p>
          <Link href="/products" className="button button-terracotta button-full">
            Browse Studio Pieces →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <p className="eyebrow-line">
          <span className="eyebrow-dot" /> CHECKOUT
        </p>
        <h1 className="checkout-title">Delivery & Order Review</h1>
        <p className="checkout-subtitle">
          Please provide your delivery destination. You will submit payment
          verification after this step.
        </p>
      </div>

      <div className="checkout-grid">
        {/* Left: Shipping Form */}
        <div className="checkout-form-panel">
          <h2 className="panel-heading">1. Shipping Information</h2>

          {formError && (
            <div className="checkout-error-banner" role="alert">
              <span>!</span>
              <div>{formError}</div>
            </div>
          )}

          <form onSubmit={handleOrderSubmit} id="checkout-form" className="checkout-form">
            <div className="form-group">
              <label htmlFor="full_name" className="field-label">
                Full Name <span className="req">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                required
                maxLength={150}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Maya Sharma"
                className="studio-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="field-label">
                Mobile / Phone Number <span className="req">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                required
                pattern="^\+?[0-9]{7,15}$"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+9779812345678"
                className="studio-input"
              />
              <span className="field-hint">
                7 to 15 digits with optional leading + (no spaces).
              </span>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="city" className="field-label">
                  City / Town <span className="req">*</span>
                </label>
                <input
                  id="city"
                  type="text"
                  required
                  maxLength={100}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Kathmandu, Lalitpur, Pokhara"
                  className="studio-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="landmark" className="field-label">
                  Nearest Landmark <span className="opt">(Optional)</span>
                </label>
                <input
                  id="landmark"
                  type="text"
                  maxLength={150}
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Patan Durbar Square"
                  className="studio-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address_line" className="field-label">
                Full Street Address <span className="req">*</span>
              </label>
              <input
                id="address_line"
                type="text"
                required
                maxLength={255}
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="House / Building No., Street, Ward No."
                className="studio-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes" className="field-label">
                Delivery Instructions <span className="opt">(Optional)</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special handling notes, gate code, or gift note for our studio."
                className="studio-textarea"
              />
            </div>
          </form>
        </div>

        {/* Right: Order Summary & Placement */}
        <div className="checkout-summary-panel">
          <h2 className="panel-heading">2. Order Summary</h2>

          <div className="checkout-items-list">
            {items.map((item) => {
              const img = resolveImageUrl(
                item.product.primary_image?.image,
                "/images/stone-vase.jpg",
              );
              return (
                <div key={item.id} className="checkout-item-row">
                  <div className="checkout-item-img-wrap">
                    <img
                      src={img}
                      alt={item.product.primary_image?.alt_text || item.product.name}
                    />
                    <span className="checkout-qty-badge">{item.quantity}</span>
                  </div>
                  <div className="checkout-item-text">
                    <span className="checkout-item-title">{item.product.name}</span>
                    <span className="checkout-item-sub">
                      Rs. {item.product.price} each
                    </span>
                  </div>
                  <span className="checkout-item-total">
                    Rs. {item.line_total}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="checkout-costs">
            <div className="cost-row">
              <span>Subtotal</span>
              <span>Rs. {cart?.subtotal}</span>
            </div>
            <div className="cost-row">
              <span>Studio Delivery</span>
              <span>Rs. {deliveryFee}</span>
            </div>
            <div className="cost-divider" />
            <div className="cost-row grand-total-row">
              <span>Total Payable</span>
              <strong>Rs. {grandTotal.toFixed(2)}</strong>
            </div>
          </div>

          <div className="payment-explanation-card">
            <h4>Payment Method: Bank Transfer / Fonepay QR</h4>
            <p>
              After placing this order, you will be directed to your order page with
              our studio QR code to transfer payment and upload a screenshot receipt.
            </p>
          </div>

          <button
            type="submit"
            form="checkout-form"
            className="button button-terracotta button-full checkout-submit-btn"
            disabled={submitting}
          >
            {submitting ? "Placing Your Order…" : "Place Order & Pay →"}
          </button>
        </div>
      </div>
    </div>
  );
}

