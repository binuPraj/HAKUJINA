"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { bookingsApi, type Booking, type PaginatedResponse } from "@/lib/api";
import { useStore } from "@/lib/store-context";

export default function BookingsListPage() {
  const { isAuthenticated, isAuthLoading } = useStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated && !isAuthLoading) {
      setLoading(false);
      return;
    }

    let mounted = true;
    bookingsApi
      .getBookings()
      .then((data) => {
        if (!mounted) return;
        if (Array.isArray(data)) {
          setBookings(data);
        } else if (data && "results" in (data as PaginatedResponse<Booking>)) {
          setBookings((data as PaginatedResponse<Booking>).results);
        } else {
          setBookings([]);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load bookings.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isAuthLoading]);

  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="orders-auth-guard">
        <div className="auth-guard-box">
          <span className="empty-symbol">✳</span>
          <h2>Sign In to View Bookings</h2>
          <p>Sign in to your Hakujina account to view your workshop reservations and status.</p>
          <Link href="/login" className="button button-terracotta button-full">
            Sign In to Your Account →
          </Link>
        </div>
      </div>
    );
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case "pending_payment":
        return "status-badge-pending";
      case "payment_submitted":
        return "status-badge-submitted";
      case "confirmed":
        return "status-badge-confirmed";
      case "cancelled":
        return "status-badge-cancelled";
      default:
        return "status-badge-default";
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

  return (
    <div className="orders-page-container">
      {/* Top Header */}
      <div className="orders-header">
        <p className="eyebrow-line">
          <span className="eyebrow-dot" /> STUDIO RESERVATIONS
        </p>
        <div className="orders-header-row">
          <div>
            <h1 className="orders-title">My Studio Reservations</h1>
            <p className="orders-subtitle">
              Review your pottery machine reservations, submit payment proof, or view studio entry passes.
            </p>
          </div>
          <Link href="/reservations" className="button button-outline button-small">
            Reserve Another Wheel →
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="orders-loading-state">
          <div className="spinner-sand" />
          <p>Loading your studio wheel reservations…</p>
        </div>
      ) : error ? (
        <div className="orders-error-panel">
          <p>{error}</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="orders-empty-state">
          <span className="empty-symbol">○</span>
          <h3>No Studio Reservations Found</h3>
          <p>
            You haven't reserved any pottery wheel machines yet. Reserve your wheel station
            in advance to throw on electric wheels with unmetered clay.
          </p>
          <Link href="/reservations" className="button button-terracotta">
            Reserve a Pottery Wheel →
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {bookings.map((booking) => (
            <div key={booking.booking_number} className="order-summary-card">
              <div className="order-card-top">
                <div className="order-card-ident">
                  <span className="order-number-label">Booking</span>
                  <strong className="order-number-val">{booking.booking_number}</strong>
                  <span className="order-date-val">
                    Reserved {formatDateTime(booking.created_at)}
                  </span>
                </div>

                <div className="order-card-status">
                  <span className={`status-pill ${getStatusBadgeClass(booking.status)}`}>
                    {booking.status_label || booking.status}
                  </span>
                </div>
              </div>

              <div className="order-card-body">
                <div className="booking-session-highlight">
                  <h4>{booking.session?.session_type?.name || "Pottery Studio Session"}</h4>
                  <p className="session-when-text">
                    📅 {formatDateTime(booking.start_time || booking.session?.start_at || booking.created_at)}
                    {booking.duration_minutes ? ` (${booking.duration_minutes} mins)` : ""}
                  </p>
                  {booking.session?.notes && (
                    <small className="session-note-small">✦ {booking.session.notes}</small>
                  )}
                  {booking.notes && !booking.session && (
                    <small className="session-note-small">✦ {booking.notes}</small>
                  )}
                </div>

                <div className="order-meta-info">
                  <div className="order-meta-block">
                    <span>Attendee:</span>
                    <strong>{booking.full_name} ({booking.phone})</strong>
                  </div>
                  <div className="order-meta-block">
                    <span>{booking.session ? "Seats:" : "Machines:"}</span>
                    <strong>
                      {booking.session
                        ? `${booking.seats} person${booking.seats > 1 ? "s" : ""}`
                        : `${booking.machines || booking.seats} wheel${(booking.machines || booking.seats) > 1 ? "s" : ""}`}
                    </strong>
                  </div>
                  <div className="order-meta-block">
                    <span>Total Fee:</span>
                    <strong className="order-total-price">
                      Rs. {Number(booking.total).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="order-card-footer">
                <Link
                  href={`/bookings/${booking.booking_number}`}
                  className="button button-terracotta button-small"
                >
                  {booking.status === "pending_payment"
                    ? "Pay & Upload Verification →"
                    : "View Booking Details →"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
