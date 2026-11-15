"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { ordersApi, resolveImageUrl, type Order } from "@/lib/api";
import { useStore } from "@/lib/store-context";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const resolvedParams = use(params);
  const orderNumber = resolvedParams.orderNumber;

  const { showToast } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment proof upload states
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Cancel order state
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let mounted = true;
    ordersApi
      .getOrder(orderNumber)
      .then((data) => {
        if (!mounted) return;
        setOrder(data);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load order.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [orderNumber]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError("");
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      setFilePreview("");
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setUploadError("Payment screenshot must be 5 MB or smaller.");
      setFile(null);
      setFilePreview("");
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(selected);
  }

  async function handleUploadPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !order) return;

    setUploading(true);
    setUploadError("");
    try {
      const updatedOrder = await ordersApi.uploadPaymentProof(order.order_number, file);
      setOrder(updatedOrder);
      setFile(null);
      setFilePreview("");
      showToast("Payment screenshot uploaded successfully!", "success");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload payment proof.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCancelOrder() {
    if (!order) return;
    const confirmed = window.confirm(
      "Are you sure you want to cancel this order? This will release reserved pieces.",
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      const updated = await ordersApi.cancelOrder(order.order_number);
      setOrder(updated);
      showToast("Order cancelled.", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to cancel order.", "error");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="order-detail-loading">
        <div className="card-skeleton" style={{ height: "180px", marginBottom: "24px" }} />
        <div className="card-skeleton" style={{ height: "350px" }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="orders-error-panel">
        <span className="empty-symbol">!</span>
        <h2>Order Not Found</h2>
        <p>{error || "We could not locate this order in your account."}</p>
        <Link href="/orders" className="button button-terracotta">
          Back to Your Orders →
        </Link>
      </div>
    );
  }

  // Progress steps calculation
  const steps = [
    { key: "pending_payment", label: "Placed" },
    { key: "payment_submitted", label: "Payment Sent" },
    { key: "confirmed", label: "Confirmed" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ];

  const statusOrder = [
    "pending_payment",
    "payment_submitted",
    "confirmed",
    "shipped",
    "delivered",
  ];
  const currentIndex = statusOrder.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="order-detail-container">
      {/* Top Breadcrumb & Header */}
      <div className="order-detail-top">
        <Link href="/orders" className="back-link">
          ← Back to Orders
        </Link>
        <div className="order-title-row">
          <div>
            <p className="eyebrow-line">
              <span className="eyebrow-dot" /> ORDER RECEIPT
            </p>
            <h1 className="order-page-title">Order {order.order_number}</h1>
            <span className="order-time">
              Placed on {new Date(order.created_at).toLocaleString()}
            </span>
          </div>

          <div className="order-status-badge-wrap">
            <span className={`status-pill status-badge-${order.status}`}>
              {order.status_label || order.status}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      {!isCancelled && (
        <div className="order-stepper-card">
          <div className="stepper-track">
            {steps.map((step, idx) => {
              const isCompleted = currentIndex >= idx;
              const isCurrent = currentIndex === idx;
              return (
                <div
                  key={step.key}
                  className={`stepper-step ${isCompleted ? "completed" : ""} ${
                    isCurrent ? "current" : ""
                  }`}
                >
                  <div className="step-circle">{isCompleted ? "✓" : idx + 1}</div>
                  <span className="step-label">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Studio Payment Note Banner if present */}
      {order.payment_note && (
        <div className="studio-note-banner">
          <strong>Note from Hakujina Studio:</strong>
          <p>{order.payment_note}</p>
        </div>
      )}

      {/* Cancellation Banner */}
      {isCancelled && (
        <div className="order-cancelled-banner">
          <span>✕</span>
          <div>
            <strong>This order was cancelled</strong>
            <p>Reserved ceramic items have been returned to studio stock.</p>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="order-detail-grid">
        {/* Left Column: Payment Section */}
        <div className="order-payment-col">
          {order.status === "pending_payment" && (
            <div className="payment-action-card">
              <div className="card-top-alert">
                <span className="alert-badge">Awaiting Payment</span>
                <p>Please complete transfer to confirm your pieces.</p>
              </div>

              <div className="bank-details-box">
                <h4>Hakujina Studio Bank Details</h4>
                <div className="bank-meta-line">
                  <span>Bank:</span>
                  <strong>Nabil Bank / Himalayan Bank</strong>
                </div>
                <div className="bank-meta-line">
                  <span>Account Name:</span>
                  <strong>Hakujina Ceramic Studio</strong>
                </div>
                <div className="bank-meta-line">
                  <span>Account Number:</span>
                  <code>0190100012345678</code>
                </div>
                <div className="bank-meta-line">
                  <span>Total Due:</span>
                  <strong className="amount-highlight">Rs. {order.total}</strong>
                </div>
                <div className="bank-meta-line">
                  <span>Remarks:</span>
                  <code>{order.order_number}</code>
                </div>
              </div>

              {/* Fonepay / QR Code Box */}
              <div className="qr-code-box">
                <div className="qr-placeholder" aria-label="Fonepay QR Code">
                  <svg viewBox="0 0 100 100" fill="currentColor" className="qr-svg">
                    <rect x="10" y="10" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="20" y="20" width="10" height="10" />
                    <rect x="60" y="10" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="70" y="20" width="10" height="10" />
                    <rect x="10" y="60" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="20" y="70" width="10" height="10" />
                    <rect x="60" y="60" width="10" height="10" />
                    <rect x="80" y="60" width="10" height="10" />
                    <rect x="70" y="80" width="20" height="10" />
                    <rect x="48" y="20" width="4" height="20" />
                    <rect x="48" y="60" width="4" height="20" />
                  </svg>
                  <span className="qr-caption">Scan to pay with any Nepal Banking / eSewa / Khalti app</span>
                </div>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleUploadPayment} className="proof-upload-form">
                <label className="upload-dropzone">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="file-input-hidden"
                  />
                  <span className="dropzone-icon">📷</span>
                  <span className="dropzone-title">
                    {file ? file.name : "Choose Payment Screenshot"}
                  </span>
                  <span className="dropzone-subtitle">JPG or PNG (max 5 MB)</span>
                </label>

                {filePreview && (
                  <div className="file-preview-wrap">
                    <img src={filePreview} alt="Screenshot Preview" className="preview-img" />
                    <button
                      type="button"
                      className="preview-remove-btn"
                      onClick={() => {
                        setFile(null);
                        setFilePreview("");
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}

                {uploadError && <p className="upload-error-msg">{uploadError}</p>}

                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="button button-terracotta button-full"
                >
                  {uploading ? "Submitting Screenshot…" : "Submit Payment Screenshot →"}
                </button>
              </form>

              {/* Cancel Option */}
              <div className="cancel-option-row">
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="cancel-order-btn"
                >
                  {cancelling ? "Cancelling…" : "Cancel This Order"}
                </button>
              </div>
            </div>
          )}

          {order.status === "payment_submitted" && (
            <div className="payment-submitted-card">
              <span className="success-check-badge">✓</span>
              <h3>Payment Proof Submitted</h3>
              <p>
                We received your payment screenshot on{" "}
                {order.payment_submitted_at
                  ? new Date(order.payment_submitted_at).toLocaleString()
                  : "record"}
                . Our studio team is verifying the transaction.
              </p>

              {order.payment_screenshot && (
                <div className="submitted-proof-preview">
                  <span className="preview-label">Your Uploaded Receipt:</span>
                  <img
                    src={resolveImageUrl(order.payment_screenshot, "")}
                    alt="Uploaded payment proof"
                    className="submitted-proof-img"
                  />
                </div>
              )}
            </div>
          )}

          {order.status === "confirmed" && (
            <div className="payment-confirmed-card">
              <span className="success-check-badge">✓</span>
              <h3>Order Confirmed</h3>
              <p>
                Payment verified. Your pieces are currently being carefully wrapped
                in biodegradable honeycomb paper and packed for delivery.
              </p>
            </div>
          )}

          {order.status === "shipped" && (
            <div className="payment-shipped-card">
              <span className="success-check-badge">🚚</span>
              <h3>Dispatched from Studio</h3>
              <p>
                Your package is en route with our studio delivery partner to {order.city}.
              </p>
            </div>
          )}

          {order.status === "delivered" && (
            <div className="payment-delivered-card">
              <span className="success-check-badge">🏡</span>
              <h3>Delivered</h3>
              <p>
                May these pieces bring quiet warmth and ritual to your home.
              </p>
            </div>
          )}

          {/* Shipping Address Summary */}
          <div className="shipping-address-card">
            <h4>Destination & Contact</h4>
            <div className="address-content">
              <strong>{order.full_name}</strong>
              <p>{order.phone}</p>
              <p>{order.address_line}</p>
              <p>{order.city}</p>
              {order.landmark && <p>Landmark: {order.landmark}</p>}
              {order.notes && <p className="order-notes">Notes: {order.notes}</p>}
            </div>
          </div>
        </div>

        {/* Right Column: Invoice & Line Items */}
        <div className="order-invoice-col">
          <div className="order-items-card">
            <h4>Pieces in this Order ({order.items.length})</h4>

            <div className="order-items-table">
              {order.items.map((item) => (
                <div key={item.id} className="order-item-row">
                  <div className="order-item-col-info">
                    {item.product_slug ? (
                      <Link
                        href={`/products/${item.product_slug}`}
                        className="item-name-link"
                      >
                        {item.product_name}
                      </Link>
                    ) : (
                      <span className="item-name-plain">{item.product_name}</span>
                    )}
                    <span className="item-price-meta">
                      Rs. {item.unit_price} × {item.quantity}
                    </span>
                  </div>
                  <div className="order-item-col-total">
                    Rs. {item.line_total}
                  </div>
                </div>
              ))}
            </div>

            <div className="order-totals-breakdown">
              <div className="total-line">
                <span>Subtotal</span>
                <span>Rs. {order.subtotal}</span>
              </div>
              <div className="total-line">
                <span>Delivery Fee (Nepal)</span>
                <span>Rs. {order.delivery_fee}</span>
              </div>
              <div className="total-divider" />
              <div className="total-line grand-line">
                <span>Total Amount</span>
                <strong>Rs. {order.total}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

