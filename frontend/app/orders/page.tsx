"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ordersApi, type Order, type PaginatedResponse } from "@/lib/api";
import { useStore } from "@/lib/store-context";

export default function OrdersListPage() {
  const { isAuthenticated, isAuthLoading } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated && !isAuthLoading) {
      setLoading(false);
      return;
    }

    let mounted = true;
    ordersApi
      .getOrders()
      .then((data) => {
        if (!mounted) return;
        if (Array.isArray(data)) {
          setOrders(data);
        } else if (data && "results" in (data as PaginatedResponse<Order>)) {
          setOrders((data as PaginatedResponse<Order>).results);
        } else {
          setOrders([]);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load orders.");
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
          <h2>Sign In to View Orders</h2>
          <p>Sign in to your Hakujina account to track your orders and payment status.</p>
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
      case "shipped":
        return "status-badge-shipped";
      case "delivered":
        return "status-badge-delivered";
      case "cancelled":
        return "status-badge-cancelled";
      default:
        return "status-badge-default";
    }
  }

  return (
    <div className="orders-page-container">
      <div className="orders-header">
        <p className="eyebrow-line">
          <span className="eyebrow-dot" /> CUSTOMER DASHBOARD
        </p>
        <h1 className="orders-title">Your Studio Orders</h1>
        <p className="orders-subtitle">
          Track the status of your handmade pieces from our kiln to your home.
        </p>
      </div>

      {loading ? (
        <div className="orders-loading-state">
          {[1, 2].map((n) => (
            <div key={n} className="order-card-skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="orders-error-panel" role="alert">
          <span>!</span>
          <p>{error}</p>
          <Link href="/products" className="button button-outline">
            Browse Studio Pieces
          </Link>
        </div>
      ) : orders.length === 0 ? (
        <div className="orders-empty-panel">
          <span className="empty-symbol">𓊈</span>
          <h2>No orders placed yet</h2>
          <p>You haven&apos;t placed any ceramic orders with our studio yet.</p>
          <Link href="/products" className="button button-terracotta">
            Explore Studio Pieces →
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const dateFormatted = new Date(order.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <article key={order.order_number} className="order-history-card">
                <div className="order-card-header">
                  <div className="order-meta-info">
                    <span className="order-num-label">Order Number</span>
                    <strong className="order-num-value">{order.order_number}</strong>
                    <span className="order-date-value">Placed on {dateFormatted}</span>
                  </div>

                  <div className="order-status-group">
                    <span className={`status-pill ${getStatusBadgeClass(order.status)}`}>
                      {order.status_label || order.status}
                    </span>
                  </div>
                </div>

                <div className="order-card-body">
                  <div className="order-items-summary">
                    {order.items.map((item) => (
                      <div key={item.id} className="order-mini-item">
                        <span className="item-bullet">·</span>
                        <span className="item-name">{item.product_name}</span>
                        <span className="item-qty">× {item.quantity}</span>
                        <span className="item-price">Rs. {item.line_total}</span>
                      </div>
                    ))}
                  </div>

                  <div className="order-card-action-bar">
                    <div className="order-total-block">
                      <span className="total-label">Total Amount</span>
                      <strong className="total-val">Rs. {order.total}</strong>
                    </div>

                    <Link
                      href={`/orders/${order.order_number}`}
                      className="button button-terracotta button-small"
                    >
                      {order.status === "pending_payment"
                        ? "Upload Payment Screenshot →"
                        : "View Order Details →"}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

