"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bookingsApi, type Booking, parseApiError } from "@/lib/api";
import { useStore } from "@/lib/store-context";

interface PageProps {
  params: Promise<{ bookingNumber: string }>;
}

export default function BookingDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const bookingNumber = resolvedParams.bookingNumber;

  const { isAuthenticated, isAuthLoading, showToast } = useStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment upload state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Cancel state
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isAuthLoading) {
      setLoading(false);
      return;
    }

    let mounted = true;
    bookingsApi
      .getBooking(bookingNumber)
      .then((data) => {
        if (!mounted) return;
        setBooking(data);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load booking.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [bookingNumber, isAuthenticated, isAuthLoading]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setUploadError("Please choose an image file (JPG, PNG).");
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setUploadError("Screenshot must be under 5 MB.");
      return;
    }

    setUploadError("");
    setFile(selected);

    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(selected);
  }

  async function handleUploadPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !booking) return;

    setUploading(true);
    setUploadError("");

    try {
      const updated = await bookingsApi.uploadPaymentProof(booking.booking_number, file);
      setBooking(updated);
      setFile(null);
      setFilePreview("");
      showToast("Payment screenshot submitted! Review in progress.", "success");
    } catch (err) {
      setUploadError(parseApiError(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleCancelBooking() {
    if (!booking) return;
    setCancelling(true);

    try {
      const updated = await bookingsApi.cancelBooking(booking.booking_number);
      setBooking(updated);
      setShowCancelModal(false);
      showToast("Booking cancelled successfully.", "info");
    } catch (err) {
      showToast(parseApiError(err), "error");
    } finally {
      setCancelling(false);
    }
  }

  function formatDateTime(isoString: string) {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  }

  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="orders-auth-guard">
        <div className="auth-guard-box">
          <span className="empty-symbol">✳</span>
          <h2>Sign In to View Booking</h2>
          <p>Please sign in to verify your workshop booking and submit payment proof.</p>
          <Link href="/login" className="button button-terracotta button-full">
            Sign In to Your Account →
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="orders-loading-state">
        <div className="spinner-sand" />
        <p>Loading booking details…</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="orders-error-panel">
        <span className="empty-symbol">!</span>
        <h2>Booking Not Found</h2>
        <p>{error || "We could not locate this booking in your account."}</p>
        <Link href="/bookings" className="button button-terracotta">
          Back to Your Bookings →
        </Link>
      </div>
    );
  }

  const steps = [
    { key: "pending_payment", label: "Reserved" },
    { key: "payment_submitted", label: "Payment Sent" },
    { key: "confirmed", label: "Confirmed" },
  ];

  const statusOrder = ["pending_payment", "payment_submitted", "confirmed"];
  const currentIndex = statusOrder.indexOf(booking.status);
  const isCancelled = booking.status === "cancelled";

  return (
    <div className="order-detail-container">
      {/* Top Header */}
      <div className="order-detail-top">
        <Link href="/bookings" className="back-link">
          ← Back to All Bookings
        </Link>
        <div className="order-title-row">
          <div>
            <p className="eyebrow-line">
              <span className="eyebrow-dot" /> STUDIO WHEEL PASS
            </p>
            <h1 className="order-page-title">Booking {booking.booking_number}</h1>
            <span className="order-time">
              Created on {formatDateTime(booking.created_at)}
            </span>
          </div>

          <div className="order-status-badge-wrap">
            <span className={`status-pill status-badge-${booking.status}`}>
              {booking.status_label || booking.status}
            </span>
          </div>
        </div>
      </div>

      {/* Stepper */}
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

      {/* Note from Studio */}
      {booking.payment_note && (
        <div className="studio-note-banner">
          <strong>Note from Hakujina Studio:</strong>
          <p>{booking.payment_note}</p>
        </div>
      )}

      {/* Cancelled Banner */}
      {isCancelled && (
        <div className="order-cancelled-banner">
          <span>✕</span>
          <div>
            <strong>This booking was cancelled</strong>
            <p>Your reserved workshop seats have been released back to the schedule.</p>
          </div>
        </div>
      )}

      {/* Two-Column Grid */}
      <div className="order-detail-grid">
        {/* Left Column: Payment / Status Instructions */}
        <div className="order-payment-col">
          {booking.status === "pending_payment" && (
            <div className="payment-action-card">
              <div className="card-top-alert">
                <span className="alert-badge">Awaiting Payment</span>
                <p>Please complete payment to guarantee your workshop seats.</p>
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
                  <span>Total Amount Due:</span>
                  <strong className="amount-highlight">
                    Rs. {Number(booking.total).toLocaleString()}
                  </strong>
                </div>
                <div className="bank-meta-line">
                  <span>Transfer Remarks:</span>
                  <code>{booking.booking_number}</code>
                </div>
              </div>

              {/* Fonepay QR */}
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

              {/* Upload Screenshot Form */}
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
                    {file ? file.name : "Upload Payment Screenshot"}
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
                  {uploading ? "Submitting Screenshot…" : "Submit Verification Screenshot →"}
                </button>
              </form>
            </div>
          )}

          {booking.status === "payment_submitted" && (
            <div className="payment-action-card verified-state-card">
              <div className="card-top-alert alert-submitted">
                <span className="alert-badge">Verification In Progress</span>
                <p>
                  We have received your payment screenshot. Our team will verify and
                  confirm your seats shortly.
                </p>
              </div>

              {booking.payment_screenshot && (
                <div className="submitted-proof-preview">
                  <p className="preview-heading">Submitted Screenshot:</p>
                  <img
                    src={booking.payment_screenshot}
                    alt="Payment proof screenshot"
                    className="submitted-img"
                  />
                  {booking.payment_submitted_at && (
                    <small className="submitted-time">
                      Uploaded on {formatDateTime(booking.payment_submitted_at)}
                    </small>
                  )}
                </div>
              )}
            </div>
          )}

          {booking.status === "confirmed" && (
            <div className="payment-action-card confirmed-state-card">
              <div className="card-top-alert alert-confirmed">
                <span className="alert-badge">Seats Confirmed ✓</span>
                <p>Your spot is reserved. We look forward to seeing you at Hakujina Studio!</p>
              </div>

              <div className="studio-visit-guide">
                <h4>Studio Instructions</h4>
                <ul className="guide-list">
                  <li>📍 <strong>Studio Location:</strong> Hakujina Ceramic Studio, Ward 10, Kathmandu</li>
                  <li>⏰ <strong>Arrival:</strong> Please arrive 10–15 minutes before session start.</li>
                  <li>👕 <strong>Attire:</strong> Wear comfortable clothes that can get clay on them. Aprons and toolkits are provided.</li>
                  <li>🏺 <strong>Firing Pickup:</strong> Your finished pieces will be trimmed, glazed, and kiln-fired, ready in 10–14 days.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Cancellation Option */}
          {booking.can_cancel && (
            <div className="cancel-option-row">
              <button
                type="button"
                className="cancel-order-btn"
                onClick={() => setShowCancelModal(true)}
              >
                Cancel this Workshop Booking
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Workshop & Attendee Summary */}
        <div className="order-summary-col">
          <div className="summary-card">
            <h3 className="summary-title">Reservation Details</h3>

            <div className="booking-summary-session-card">
              <h4 className="session-card-title">
                {booking.session?.session_type?.name || "Pottery Wheel Studio Session"}
              </h4>
              <p className="session-card-when">
                📅 {formatDateTime(booking.start_time || booking.session?.start_at || booking.created_at)}
              </p>
              <p className="session-card-dur">
                ⏱ Duration: {booking.duration_minutes || booking.session?.session_type?.duration_minutes || 30} minutes
              </p>
              {booking.session?.notes && (
                <p className="session-card-notes">✦ {booking.session.notes}</p>
              )}
            </div>

            <div className="summary-divider" />

            <h4 className="meta-section-heading">Attendee Details</h4>
            <div className="attendee-details-box">
              <div className="attendee-line">
                <span>Attendee Name:</span>
                <strong>{booking.full_name}</strong>
              </div>
              <div className="attendee-line">
                <span>Phone:</span>
                <strong>{booking.phone}</strong>
              </div>
              {booking.notes && (
                <div className="attendee-line">
                  <span>Special Notes:</span>
                  <p>{booking.notes}</p>
                </div>
              )}
            </div>

            <div className="summary-divider" />

            <div className="cost-breakdown">
              {booking.session ? (
                <>
                  <div className="cost-line">
                    <span>Workshop Rate:</span>
                    <span>Rs. {Number(booking.unit_price).toLocaleString()} / person</span>
                  </div>
                  <div className="cost-line">
                    <span>Seats Booked:</span>
                    <span>{booking.seats} seat{booking.seats > 1 ? "s" : ""}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="cost-line">
                    <span>Rate per Machine Slot:</span>
                    <span>Rs. {Number(booking.unit_price_per_slot || booking.unit_price).toLocaleString()}</span>
                  </div>
                  <div className="cost-line">
                    <span>Machines Reserved:</span>
                    <span>{booking.machines || booking.seats} wheel{(booking.machines || booking.seats) > 1 ? "s" : ""}</span>
                  </div>
                  <div className="cost-line">
                    <span>Slots Count:</span>
                    <span>{booking.slots_count || 1} ({booking.duration_minutes || 30} mins)</span>
                  </div>
                </>
              )}
              <div className="cost-line total-line">
                <span>Total Amount:</span>
                <span className="total-highlight">
                  Rs. {Number(booking.total).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="modal-backdrop" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel Workshop Booking?</h3>
            <p>
              Are you sure you want to cancel booking <strong>{booking.booking_number}</strong>?
              Your reserved seats will be immediately released back to the studio calendar.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
              >
                Keep Reservation
              </button>
              <button
                type="button"
                className="button button-terracotta"
                onClick={handleCancelBooking}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling…" : "Yes, Cancel Booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
