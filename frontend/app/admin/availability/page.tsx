"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  adminAvailabilityApi,
  type AdminCalendarOverview,
  type DateException,
  type CapacityBlock,
  type ConflictItem,
  parseApiError,
} from "@/lib/api";
import { useStore } from "@/lib/store-context";

export default function AdminAvailabilityPage() {
  const { user, isAuthenticated, isAuthLoading, showToast } = useStore();

  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(11); // 1-12
  const [todayIso, setTodayIso] = useState<string>("");
  const [overview, setOverview] = useState<AdminCalendarOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sync to actual client date upon mount (prevents SSR/prerender clock mismatch)
  useEffect(() => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setTodayIso(now.toISOString().split("T")[0]);
  }, []);

  // Date Modal / Drawer state
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [customOpen, setCustomOpen] = useState("");
  const [customClose, setCustomClose] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState("");

  // Capacity Blocks state
  const [capacityBlocks, setCapacityBlocks] = useState<CapacityBlock[]>([]);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockMachines, setBlockMachines] = useState(1);
  const [blockReason, setBlockReason] = useState("");
  const [submittingBlock, setSubmittingBlock] = useState(false);
  const [blockError, setBlockError] = useState("");

  // Load calendar overview for currentYear & currentMonth
  useEffect(() => {
    if (!isAuthenticated && !isAuthLoading) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError("");

    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

    Promise.all([
      adminAvailabilityApi.getCalendar(monthStr),
      adminAvailabilityApi.getCapacityBlocks().catch(() => []),
    ])
      .then(([calData, blocksData]) => {
        if (!mounted) return;
        setOverview(calData);
        setCapacityBlocks(blocksData || []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(parseApiError(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentYear, currentMonth, isAuthenticated, isAuthLoading]);

  // Navigate months
  function handlePrevMonth() {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  // Open Date Override Modal
  function handleOpenDate(dateStr: string) {
    setSelectedDateStr(dateStr);
    setConflicts([]);
    setOverrideError("");

    const existing = overview?.date_exceptions?.[dateStr];
    if (existing) {
      setIsClosed(existing.is_closed);
      setCustomOpen(existing.opening_time || "");
      setCustomClose(existing.closing_time || "");
      setOverrideNote(existing.note || "");
    } else {
      setIsClosed(false);
      setCustomOpen(overview?.base_settings?.opening_time || "08:00");
      setCustomClose(overview?.base_settings?.closing_time || "18:00");
      setOverrideNote("");
    }
  }

  function handleCloseDateModal() {
    setSelectedDateStr(null);
    setConflicts([]);
    setOverrideError("");
  }

  // Pre-check conflicts
  async function handleCheckConflicts() {
    if (!selectedDateStr) return;
    setCheckingConflicts(true);
    setOverrideError("");

    try {
      const res = await adminAvailabilityApi.checkConflicts({
        date: selectedDateStr,
        is_closed: isClosed,
        opening_time: isClosed ? null : customOpen || null,
        closing_time: isClosed ? null : customClose || null,
      });
      setConflicts(res.conflicts || []);
      if (!res.has_conflicts) {
        showToast("No booking conflicts detected for this schedule.", "info");
      }
    } catch (err) {
      setOverrideError(parseApiError(err));
    } finally {
      setCheckingConflicts(false);
    }
  }

  // Save Date Override
  async function handleSaveOverride(force = false) {
    if (!selectedDateStr) return;
    setSavingOverride(true);
    setOverrideError("");

    try {
      await adminAvailabilityApi.setDateOverride({
        date: selectedDateStr,
        is_closed: isClosed,
        opening_time: isClosed ? null : customOpen || null,
        closing_time: isClosed ? null : customClose || null,
        note: overrideNote.trim(),
        force,
      });

      showToast(`Schedule override saved for ${selectedDateStr}.`, "success");
      handleCloseDateModal();

      // Refresh calendar overview
      const monthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
      const updated = await adminAvailabilityApi.getCalendar(monthStr);
      setOverview(updated);
    } catch (err: unknown) {
      const errorObj = err as { conflicts?: ConflictItem[] };
      if (errorObj?.conflicts && Array.isArray(errorObj.conflicts)) {
        setConflicts(errorObj.conflicts);
        setOverrideError("Schedule conflicts with active customer reservations. Review below.");
      } else {
        setOverrideError(parseApiError(err));
      }
    } finally {
      setSavingOverride(false);
    }
  }

  // Reset Date Override
  async function handleDeleteOverride() {
    if (!selectedDateStr) return;
    setSavingOverride(true);
    setOverrideError("");

    try {
      await adminAvailabilityApi.deleteDateOverride(selectedDateStr);
      showToast(`Override removed for ${selectedDateStr}. Reverted to default schedule.`, "info");
      handleCloseDateModal();

      const monthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
      const updated = await adminAvailabilityApi.getCalendar(monthStr);
      setOverview(updated);
    } catch (err) {
      setOverrideError(parseApiError(err));
    } finally {
      setSavingOverride(false);
    }
  }

  // Add Capacity Block
  async function handleAddCapacityBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!blockStart || !blockEnd) {
      setBlockError("Please enter start and end date/time.");
      return;
    }

    setSubmittingBlock(true);
    setBlockError("");

    try {
      await adminAvailabilityApi.createCapacityBlock({
        start_time: new Date(blockStart).toISOString(),
        end_time: new Date(blockEnd).toISOString(),
        machines_blocked: blockMachines,
        reason: blockReason.trim(),
      });

      showToast("Capacity block saved.", "success");
      setBlockStart("");
      setBlockEnd("");
      setBlockReason("");

      // Refresh
      const updatedBlocks = await adminAvailabilityApi.getCapacityBlocks();
      setCapacityBlocks(updatedBlocks);
      const monthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
      const updated = await adminAvailabilityApi.getCalendar(monthStr);
      setOverview(updated);
    } catch (err) {
      setBlockError(parseApiError(err));
    } finally {
      setSubmittingBlock(false);
    }
  }

  // Delete Capacity Block
  async function handleDeleteCapacityBlock(id: number) {
    try {
      await adminAvailabilityApi.deleteCapacityBlock(id);
      showToast("Capacity block removed.", "info");
      const updatedBlocks = await adminAvailabilityApi.getCapacityBlocks();
      setCapacityBlocks(updatedBlocks);
      const monthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
      const updated = await adminAvailabilityApi.getCalendar(monthStr);
      setOverview(updated);
    } catch (err) {
      showToast(parseApiError(err), "error");
    }
  }

  // Calendar calculations
  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sunday

  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="orders-auth-guard">
        <div className="auth-guard-box">
          <span className="empty-symbol">⚙</span>
          <h2>Studio Management Sign In</h2>
          <p>Please log in with an administrator account to manage studio schedules and machine capacity.</p>
          <Link href="/login?next=/admin/availability" className="button button-terracotta button-full">
            Log In as Administrator →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-availability-page">
      {/* Top Banner */}
      <div className="admin-page-header">
        <div>
          <p className="eyebrow-line">
            <span className="eyebrow-dot" /> STUDIO OPERATIONS
          </p>
          <h1 className="admin-page-title">Availability & Capacity Calendar</h1>
          <p className="admin-page-desc">
            The studio is <strong>open by default every day</strong> (
            {overview?.base_settings?.opening_time || "08:00"} – {overview?.base_settings?.closing_time || "18:00"}
            ). Use this calendar to set date-specific closures, custom hours, or machine maintenance blocks without manual session creation.
          </p>
        </div>

        <div className="admin-header-actions">
          <Link href="/workshops" className="button button-outline button-small">
            View Customer Booking Flow →
          </Link>
        </div>
      </div>

      {/* Baseline Settings Bar */}
      {overview && (
        <div className="baseline-settings-bar">
          <div className="baseline-item">
            <span className="baseline-label">Default Hours:</span>
            <strong>{overview.base_settings.opening_time} – {overview.base_settings.closing_time}</strong>
          </div>
          <div className="baseline-item">
            <span className="baseline-label">Studio Machines:</span>
            <strong>{overview.base_settings.total_machines} Wheels</strong>
          </div>
          <div className="baseline-item">
            <span className="baseline-label">Interval Slot:</span>
            <strong>{overview.base_settings.slot_duration_minutes} mins</strong>
          </div>
          <div className="baseline-item">
            <span className="baseline-label">Base Rate:</span>
            <strong>Rs. {Number(overview.base_settings.price_per_machine_per_slot).toLocaleString()} / slot</strong>
          </div>
        </div>
      )}

      {loading ? (
        <div className="orders-loading-state">
          <div className="spinner-sand" />
          <p>Loading studio schedule & bookings…</p>
        </div>
      ) : error ? (
        <div className="orders-error-panel">
          <p>{error}</p>
        </div>
      ) : (
        <div className="admin-content-grid">
          {/* Main Calendar View */}
          <div className="calendar-main-card">
            {/* Calendar Controls */}
            <div className="calendar-month-nav">
              <button type="button" onClick={handlePrevMonth} className="month-nav-btn">
                ← Previous Month
              </button>
              <h2 className="current-month-title">{monthName}</h2>
              <button type="button" onClick={handleNextMonth} className="month-nav-btn">
                Next Month →
              </button>
            </div>

            {/* Weekday Header */}
            <div className="calendar-weekdays-row">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="weekday-col-header">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="calendar-days-grid">
              {/* Empty leading offset days */}
              {Array.from({ length: firstDayWeekday }).map((_, idx) => (
                <div key={`empty-${idx}`} className="calendar-day-cell empty-cell" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const exception = overview?.date_exceptions?.[dateStr];
                const bookingCount = overview?.booking_counts?.[dateStr] || 0;
                const isToday = todayIso === dateStr;

                return (
                  <div
                    key={dateStr}
                    className={`calendar-day-cell ${exception ? "has-override" : ""} ${
                      exception?.is_closed ? "cell-closed" : ""
                    } ${isToday ? "cell-today" : ""}`}
                    onClick={() => handleOpenDate(dateStr)}
                  >
                    <div className="cell-top">
                      <span className="cell-day-num">{dayNum}</span>
                      {bookingCount > 0 && (
                        <span className="booking-count-pill" title={`${bookingCount} active booking(s)`}>
                          {bookingCount} 🏺
                        </span>
                      )}
                    </div>

                    <div className="cell-body">
                      {exception?.is_closed ? (
                        <span className="override-badge badge-closed">
                          Closed {exception.note ? `• ${exception.note}` : ""}
                        </span>
                      ) : exception?.opening_time ? (
                        <span className="override-badge badge-custom">
                          {exception.opening_time}–{exception.closing_time}
                        </span>
                      ) : (
                        <span className="cell-default-text">Normal Hours</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Capacity Blocks & Maintenance */}
          <div className="capacity-blocks-card">
            <h3 className="section-card-title">Temporary Machine Blocks</h3>
            <p className="section-card-subtitle">
              Reduce machine capacity for maintenance or masterclasses without closing the entire studio.
            </p>

            <form onSubmit={handleAddCapacityBlock} className="capacity-block-form">
              <div className="form-group">
                <label className="field-label">Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label className="field-label">End Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label className="field-label">Wheels / Machines to Block</label>
                <input
                  type="number"
                  min={1}
                  max={overview?.base_settings?.total_machines || 4}
                  value={blockMachines}
                  onChange={(e) => setBlockMachines(Number(e.target.value))}
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label className="field-label">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="E.g. Wheel 2 pedal replacement"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="input-field"
                />
              </div>

              {blockError && <p className="form-error-banner">{blockError}</p>}

              <button
                type="submit"
                disabled={submittingBlock}
                className="button button-terracotta button-small button-full"
              >
                {submittingBlock ? "Adding Block…" : "Apply Capacity Block"}
              </button>
            </form>

            <div className="active-blocks-list">
              <h4>Active Blocks ({capacityBlocks.length})</h4>
              {capacityBlocks.length === 0 ? (
                <p className="no-blocks-hint">All machines running at full baseline capacity.</p>
              ) : (
                <div className="blocks-items">
                  {capacityBlocks.map((blk) => (
                    <div key={blk.id} className="block-item-card">
                      <div className="block-item-info">
                        <strong>{blk.machines_blocked} wheel(s) blocked</strong>
                        <p>{new Date(blk.start_time).toLocaleString()} – {new Date(blk.end_time).toLocaleTimeString()}</p>
                        {blk.reason && <small>✦ {blk.reason}</small>}
                      </div>
                      <button
                        type="button"
                        className="block-delete-btn"
                        onClick={() => handleDeleteCapacityBlock(blk.id)}
                        title="Remove Block"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Date Override Modal */}
      {selectedDateStr && (
        <div className="booking-modal-overlay" onClick={handleCloseDateModal}>
          <div
            className="override-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={handleCloseDateModal}
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="modal-header">
              <p className="eyebrow-line">
                <span className="eyebrow-dot" /> DATE SCHEDULE MANAGER
              </p>
              <h2 className="modal-title">{selectedDateStr}</h2>
              <p className="modal-subtitle">
                Configure special hours or mark this date as closed. Existing default is{" "}
                {overview?.base_settings?.opening_time} – {overview?.base_settings?.closing_time}.
              </p>
            </div>

            <div className="override-form">
              {/* Closed Toggle */}
              <div className="form-toggle-row">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={isClosed}
                    onChange={(e) => setIsClosed(e.target.checked)}
                    className="toggle-checkbox"
                  />
                  <span>Mark studio as FULLY CLOSED on this date</span>
                </label>
              </div>

              {/* Custom Hours (if not closed) */}
              {!isClosed && (
                <div className="custom-hours-fields">
                  <div className="form-group">
                    <label className="field-label">Special Opening Time</label>
                    <input
                      type="time"
                      value={customOpen}
                      onChange={(e) => setCustomOpen(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Special Closing Time</label>
                    <input
                      type="time"
                      value={customClose}
                      onChange={(e) => setCustomClose(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              )}

              {/* Note / Reason */}
              <div className="form-group">
                <label className="field-label">Reason / Note for Customers</label>
                <input
                  type="text"
                  placeholder="E.g. Dashain Festival, Staff Retreat, Private Masterclass"
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Conflict Pre-check Button */}
              <button
                type="button"
                className="button button-outline button-small button-full"
                onClick={handleCheckConflicts}
                disabled={checkingConflicts}
              >
                {checkingConflicts ? "Checking Conflicts…" : "Pre-check Booking Conflicts"}
              </button>

              {/* Conflicts Alert Box */}
              {conflicts.length > 0 && (
                <div className="conflicts-warning-box">
                  <span className="conflict-icon">⚠️</span>
                  <div>
                    <strong>{conflicts.length} Active Booking(s) Conflict with this Schedule:</strong>
                    <ul className="conflict-list">
                      {conflicts.map((c) => (
                        <li key={c.booking_number}>
                          <strong>{c.booking_number}</strong>: {c.customer_name} ({c.phone}) — {c.reason}
                        </li>
                      ))}
                    </ul>
                    <small>Overriding with force will retain these bookings while shifting studio hours.</small>
                  </div>
                </div>
              )}

              {overrideError && <p className="form-error-banner">{overrideError}</p>}

              {/* Modal Actions */}
              <div className="modal-actions-row">
                {overview?.date_exceptions?.[selectedDateStr] && (
                  <button
                    type="button"
                    className="button button-outline delete-override-btn"
                    onClick={handleDeleteOverride}
                    disabled={savingOverride}
                  >
                    Reset to Default
                  </button>
                )}

                {conflicts.length > 0 ? (
                  <button
                    type="button"
                    className="button button-terracotta force-save-btn"
                    onClick={() => handleSaveOverride(true)}
                    disabled={savingOverride}
                  >
                    {savingOverride ? "Saving…" : "Save Anyway (Force Override)"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button button-terracotta save-override-btn"
                    onClick={() => handleSaveOverride(false)}
                    disabled={savingOverride}
                  >
                    {savingOverride ? "Saving…" : "Save Schedule Override"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
