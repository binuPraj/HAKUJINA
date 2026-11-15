"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  bookingsApi,
  type BookingSettings,
  type AvailabilityResponse,
  type Interval,
  type Booking,
  parseApiError,
} from "@/lib/api";
import { useStore } from "@/lib/store-context";
import {
  buildMonthCalendar,
  formatBilingualDate,
  WEEKDAYS_NP,
  type MonthGridDay,
} from "@/lib/nepali-calendar";

export default function ReservationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, showToast } = useStore();

  const [shopSettings, setShopSettings] = useState<BookingSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Reservation Choices
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [selectedMachines, setSelectedMachines] = useState<number>(1);
  const [selectedStartTime, setSelectedStartTime] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Dynamic Availability
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  // Calendar State (client-mounted to avoid Next.js prerender mismatch)
  const [clientToday, setClientToday] = useState<Date | null>(null);
  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonth, setViewMonth] = useState<number>(10); // 0-based

  // Quote State
  const [quotePrice, setQuotePrice] = useState<string | null>(null);
  const [quoteSlotsCount, setQuoteSlotsCount] = useState<number>(2);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Helper to parse HH:MM into minutes without Date()
  function timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }

  // Load baseline shop settings & initialize calendar on client
  useEffect(() => {
    let mounted = true;
    setLoadingSettings(true);

    bookingsApi
      .getSettings()
      .then((settings) => {
        if (!mounted) return;
        setShopSettings(settings);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingSettings(false);
      });

    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    if (mounted) {
      setClientToday(now);
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      setSelectedDate(todayIso);
    }

    return () => {
      mounted = false;
    };
  }, []);

  const calendarData = useMemo(() => {
    if (!clientToday) return null;
    return buildMonthCalendar(viewYear, viewMonth, clientToday);
  }, [viewYear, viewMonth, clientToday]);

  const bilingualSelected = useMemo(() => {
    return formatBilingualDate(selectedDate);
  }, [selectedDate]);

  function handlePrevMonth() {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }

  function handleNextMonth() {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }

  // Pre-fill user data when authenticated
  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.name || "");
      if (!phone) setPhone(user.phone || "");
    }
  }, [user]);

  // Fetch availability whenever selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;

    let mounted = true;
    setLoadingAvailability(true);
    setAvailabilityError("");
    setSelectedStartTime("");

    bookingsApi
      .getAvailability(selectedDate, selectedDuration, selectedMachines)
      .then((res) => {
        if (!mounted) return;
        setAvailability(res);
        if (res.available_start_times && res.available_start_times.length > 0) {
          setSelectedStartTime(res.available_start_times[0]);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setAvailabilityError(parseApiError(err));
      })
      .finally(() => {
        if (mounted) setLoadingAvailability(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedDate]);

  // Re-check valid start times when duration or machines count changes
  useEffect(() => {
    if (!selectedDate || !availability?.is_open) return;

    let mounted = true;
    bookingsApi
      .getAvailability(selectedDate, selectedDuration, selectedMachines)
      .then((res) => {
        if (!mounted) return;
        setAvailability((prev) => (prev ? { ...prev, available_start_times: res.available_start_times } : res));
        if (res.available_start_times && res.available_start_times.length > 0) {
          if (!res.available_start_times.includes(selectedStartTime)) {
            setSelectedStartTime(res.available_start_times[0]);
          }
        } else {
          setSelectedStartTime("");
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [selectedDuration, selectedMachines]);

  // Real-time server quote check
  useEffect(() => {
    if (!selectedDate || !selectedStartTime || !selectedDuration || !selectedMachines) {
      setQuotePrice(null);
      return;
    }

    let mounted = true;
    setQuoteLoading(true);
    setQuoteError("");

    bookingsApi
      .getQuote({
        date: selectedDate,
        start_time: selectedStartTime,
        duration_minutes: selectedDuration,
        machines: selectedMachines,
      })
      .then((res) => {
        if (!mounted) return;
        if (res.is_available && res.total_price) {
          setQuotePrice(res.total_price);
          setQuoteSlotsCount(res.slots_count || Math.ceil(selectedDuration / 30));
        } else {
          setQuotePrice(null);
          setQuoteError(res.message || "Requested machine capacity is no longer available for this time.");
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setQuotePrice(null);
        setQuoteError(parseApiError(err));
      })
      .finally(() => {
        if (mounted) setQuoteLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedDate, selectedStartTime, selectedDuration, selectedMachines]);

  // Submit direct machine reservation
  async function handleSubmitReservation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedStartTime) return;

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent("/reservations")}`);
      return;
    }

    if (user && user.is_email_verified === false) {
      setSubmitError("Please verify your email address to confirm your pottery wheel reservation.");
      return;
    }

    if (!fullName.trim()) {
      setSubmitError("Please enter your name for the reservation.");
      return;
    }

    if (!phone.trim()) {
      setSubmitError("Please enter a valid phone number.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        date: selectedDate,
        start_time: selectedStartTime,
        duration_minutes: selectedDuration,
        machines: selectedMachines,
        full_name: fullName.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
      };

      const booking: Booking = await bookingsApi.createBooking(payload);

      showToast(
        `Reservation confirmed! ${booking.machines} pottery wheel(s) reserved.`,
        "success"
      );
      router.push(`/bookings/${booking.booking_number}`);
    } catch (err) {
      setSubmitError(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const durationOptions = [30, 60, 90, 120, 180];
  const maxMachines = availability?.total_machines || shopSettings?.total_machines || 4;

  return (
    <div className="reservations-page">
      {/* Editorial Header */}
      <section className="reservations-hero">
        <div className="reservations-hero-inner">
          <p className="eyebrow-line">
            <span className="eyebrow-dot" /> OPEN STUDIO RESERVATIONS · NO WORKSHOPS REQUIRED
          </p>
          <h1 className="reservations-title">Reserve a Pottery Wheel</h1>
          <p className="reservations-lead">
            Hakujina operates continuously like a restaurant that accepts advance reservations.
            Directly select your preferred date, starting time, duration, and number of wheels.
            All reservations include raw clay, sculpting tools, wheel stations, and high-fire kiln baking.
          </p>
        </div>
      </section>

      {/* Main Reservation Card */}
      <div className="reservations-container">
        <div className="reservation-builder-card">
          <form onSubmit={handleSubmitReservation} className="reservation-form">
            {/* Step 1: Date Selection */}
            <div className="reservation-step-block">
              <div className="step-heading-row">
                <span className="step-num-pill">1</span>
                <div>
                  <h3 className="step-title">Select Reservation Date</h3>
                  <p className="step-desc">
                    Pottery wheel reservations are open for the <strong>next 7 days</strong>.
                    Calendar displays both English (AD) and Bikram Sambat (BS) dates.
                  </p>
                </div>
              </div>

              {/* Bilingual Calendar Widget */}
              <div className="customer-calendar-widget">
                <div className="cal-header-bar">
                  <div className="cal-month-titles">
                    <h4 className="cal-en-month">
                      {calendarData ? `${calendarData.monthNameEn} ${calendarData.year}` : "Loading calendar…"}
                    </h4>
                    {calendarData?.bsMonthsInView && (
                      <span className="cal-bs-badge">
                        🇳🇵 वि.सं. {calendarData.bsMonthsInView}
                      </span>
                    )}
                  </div>
                  <div className="cal-nav-buttons">
                    <button
                      type="button"
                      className="cal-nav-btn"
                      onClick={handlePrevMonth}
                      aria-label="Previous month"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="cal-nav-btn"
                      onClick={handleNextMonth}
                      aria-label="Next month"
                    >
                      ›
                    </button>
                  </div>
                </div>

                {/* Weekday Column Headers */}
                <div className="cal-weekdays-header">
                  {WEEKDAYS_NP.map((wd) => (
                    <div
                      key={wd.enShort}
                      className={`cal-weekday-col ${wd.enShort === "Sat" ? "is-saturday" : ""}`}
                    >
                      <span className="wd-en">{wd.enShort}</span>
                      <span className="wd-np">{wd.short}</span>
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="cal-grid">
                  {calendarData ? (
                    calendarData.days.map((day: MonthGridDay | null, idx: number) => {
                      if (!day) {
                        return <div key={`empty-${idx}`} className="cal-day-cell empty-slot" />;
                      }

                      const isSelected = selectedDate === day.iso;
                      const isDisabled = !day.isBookable;

                      let tooltip = `${day.iso} · ${day.bsDayNp} ${day.bsMonthNameNp}`;
                      if (day.isPast) tooltip += " (Past date)";
                      else if (day.isTooFar) tooltip += " (Bookings open 7 days in advance)";
                      else tooltip += " (Available for booking)";

                      return (
                        <button
                          key={day.iso}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setSelectedDate(day.iso)}
                          className={`cal-day-cell ${day.isBookable ? "is-bookable" : "is-disabled"} ${
                            isSelected ? "is-selected" : ""
                          } ${day.isToday ? "is-today" : ""} ${day.isWeekend ? "is-weekend" : ""} ${
                            day.isTooFar ? "is-too-far" : ""
                          } ${day.isPast ? "is-past" : ""}`}
                          title={tooltip}
                        >
                          <div className="cal-cell-top">
                            <span className="cal-ad-day">{day.adDay}</span>
                            {day.isToday && <span className="cal-today-pill">Today</span>}
                          </div>

                          <div className="cal-cell-bs">
                            <span className="cal-bs-day">{day.bsDayNp}</span>
                            <span className="cal-bs-month">{day.bsMonthNameNp}</span>
                          </div>

                          <div className="cal-cell-foot">
                            {isSelected ? (
                              <span className="cal-pill-selected">✓ Selected</span>
                            ) : day.isBookable ? (
                              <span className="cal-pill-open">Open</span>
                            ) : day.isTooFar ? (
                              <span className="cal-pill-locked">7d max</span>
                            ) : (
                              <span className="cal-pill-closed">—</span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="cal-loading-skeleton">Loading studio calendar…</div>
                  )}
                </div>

                {/* Selected Date Bilingual Display Banner */}
                {selectedDate && (
                  <div className="cal-selected-banner">
                    <div className="selected-date-info">
                      <span className="selected-tag">Selected Reservation Date:</span>
                      <div className="selected-date-names">
                        <strong className="selected-en">{bilingualSelected.en}</strong>
                        {bilingualSelected.np && (
                          <span className="selected-np"> · {bilingualSelected.np}</span>
                        )}
                      </div>
                    </div>
                    <div className="selected-window-notice">
                      <span className="notice-icon">✓</span>
                      <span>Within 7-day advance reservation window</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Availability Loading */}
            {loadingAvailability && (
              <div className="availability-loading-bar">
                <div className="spinner-sand" />
                <span>Checking machine capacity for {selectedDate}…</span>
              </div>
            )}

            {/* Studio Closed Warning */}
            {availability && !availability.is_open && (
              <div className="studio-closed-banner">
                <span className="closed-icon">⚠️</span>
                <div>
                  <strong>Studio Closed on {selectedDate}</strong>
                  <p>{availability.reason || "The studio has a scheduled closure on this date. Please pick another day."}</p>
                </div>
              </div>
            )}

            {/* Step 2: Duration & Number of Machines */}
            {availability && availability.is_open && (
              <>
                <div className="reservation-step-block">
                  <div className="step-heading-row">
                    <span className="step-num-pill">2</span>
                    <div>
                      <h3 className="step-title">Duration & Machines</h3>
                      <p className="step-desc">Choose session length and how many wheels you need side-by-side.</p>
                    </div>
                  </div>

                  <div className="reservation-two-col">
                    {/* Duration */}
                    <div className="choice-box">
                      <label htmlFor="duration-select" className="choice-label">
                        Booking Duration
                      </label>
                      <select
                        id="duration-select"
                        value={selectedDuration}
                        onChange={(e) => setSelectedDuration(Number(e.target.value))}
                        className="select-field"
                      >
                        {durationOptions.map((dur) => (
                          <option key={dur} value={dur}>
                            {dur} minutes ({dur >= 60 ? `${dur / 60} hour${dur > 60 ? "s" : ""}` : "30 mins"})
                          </option>
                        ))}
                      </select>
                      <small className="choice-hint">30-min increments based on shop operating intervals.</small>
                    </div>

                    {/* Machine Count */}
                    <div className="choice-box">
                      <label className="choice-label">
                        Pottery Wheels / Machines
                      </label>
                      <div className="stepper-row">
                        <button
                          type="button"
                          className="stepper-btn"
                          disabled={selectedMachines <= 1}
                          onClick={() => setSelectedMachines((m) => Math.max(1, m - 1))}
                        >
                          −
                        </button>
                        <span className="stepper-value">{selectedMachines}</span>
                        <button
                          type="button"
                          className="stepper-btn"
                          disabled={selectedMachines >= maxMachines}
                          onClick={() => setSelectedMachines((m) => Math.min(maxMachines, m + 1))}
                        >
                          +
                        </button>
                        <span className="stepper-hint">
                          {selectedMachines === 1 ? "1 wheel (solo)" : `${selectedMachines} wheels together`}
                        </span>
                      </div>
                      <small className="choice-hint">Max {maxMachines} machines in studio.</small>
                    </div>
                  </div>
                </div>

                {/* Step 3: Choose Start Time */}
                <div className="reservation-step-block">
                  <div className="step-heading-row">
                    <span className="step-num-pill">3</span>
                    <div>
                      <h3 className="step-title">Select Starting Time</h3>
                      <p className="step-desc">
                        Shop operating hours: <strong>{availability.opening_time} – {availability.closing_time}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Machine Capacity Visualization */}
                  {availability.intervals && availability.intervals.length > 0 && (
                    <div className="interval-capacity-preview">
                      <span className="preview-label">Live Wheel Availability Timeline:</span>
                      <div className="interval-bars-scroller">
                        {availability.intervals.map((inv: Interval) => {
                          const ratio = inv.total_capacity > 0 ? inv.available_machines / inv.total_capacity : 0;
                          const startMin = timeToMinutes(selectedStartTime);
                          const invMin = timeToMinutes(inv.start_time);
                          const isChosen =
                            Boolean(selectedStartTime) &&
                            invMin >= startMin &&
                            invMin < startMin + selectedDuration;

                          return (
                            <div
                              key={inv.start_time}
                              className={`interval-bar-item ${isChosen ? "in-selection" : ""} ${
                                inv.available_machines === 0 ? "fully-booked" : ""
                              }`}
                              title={`${inv.start_time}–${inv.end_time}: ${inv.available_machines} of ${inv.total_capacity} wheels available`}
                            >
                              <span className="bar-time">{inv.start_time}</span>
                              <div className="bar-meter">
                                <div
                                  className="bar-fill"
                                  style={{ height: `${Math.round(ratio * 100)}%` }}
                                />
                              </div>
                              <span className="bar-count">{inv.available_machines}</span>
                            </div>
                          );
                        })}
                      </div>
                      <small className="capacity-legend">
                        Numbers show remaining machines per 30-min slot. Selected duration is highlighted in terracotta.
                      </small>
                    </div>
                  )}

                  {/* Start Times Grid */}
                  {availability.available_start_times && availability.available_start_times.length > 0 ? (
                    <div className="time-slots-grid">
                      {availability.available_start_times.map((timeStr) => (
                        <button
                          key={timeStr}
                          type="button"
                          className={`time-slot-btn ${selectedStartTime === timeStr ? "selected" : ""}`}
                          onClick={() => setSelectedStartTime(timeStr)}
                        >
                          <span className="time-val">{timeStr}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="no-starts-warning">
                      <p>
                        No consecutive time window has {selectedMachines} machine(s) available for {selectedDuration} minutes on this date.
                        Try reducing the duration or number of machines.
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 4: Contact Information */}
                <div className="reservation-step-block">
                  <div className="step-heading-row">
                    <span className="step-num-pill">4</span>
                    <div>
                      <h3 className="step-title">Reservation Details</h3>
                      <p className="step-desc">Name and phone number for your studio reservation pass.</p>
                    </div>
                  </div>

                  <div className="reservation-two-col">
                    <div className="form-group">
                      <label htmlFor="customer-name" className="field-label">
                        Full Name *
                      </label>
                      <input
                        id="customer-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="input-field"
                        placeholder="E.g. Aarav Sharma"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="customer-phone" className="field-label">
                        Phone Number (Nepal) *
                      </label>
                      <input
                        id="customer-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input-field"
                        placeholder="+977 9800000000"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="customer-notes" className="field-label">
                      Special Notes / Requests (Optional)
                    </label>
                    <textarea
                      id="customer-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="input-field"
                      placeholder="E.g. Celebrating an anniversary, left-handed wheel preference, beginner..."
                    />
                  </div>
                </div>

                {/* Step 5: Price Quote & Submit */}
                <div className="reservation-price-summary-card">
                  <div className="summary-row">
                    <span>Machine Rate:</span>
                    <span>
                      Rs. {Number(availability.price_per_machine_per_slot || 200).toLocaleString()} per wheel / 30-min slot
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Reservation:</span>
                    <span>
                      {selectedMachines} machine{selectedMachines > 1 ? "s" : ""} × {quoteSlotsCount} slot(s) ({selectedDuration} mins)
                    </span>
                  </div>
                  <div className="summary-row summary-grand-total">
                    <span>Total Studio Fee:</span>
                    <strong className="grand-total-amount">
                      {quoteLoading ? (
                        "Checking…"
                      ) : quotePrice ? (
                        `Rs. ${Number(quotePrice).toLocaleString()}`
                      ) : (
                        `Rs. ${(
                          Number(availability.price_per_machine_per_slot || 200) *
                          quoteSlotsCount *
                          selectedMachines
                        ).toLocaleString()}`
                      )}
                    </strong>
                  </div>
                  <small className="payment-explanation">
                    ✦ A holding reservation will be created. You can verify and submit Fonepay QR payment on the next screen.
                  </small>
                </div>

                {quoteError && <p className="form-error-banner">{quoteError}</p>}
                {submitError && <p className="form-error-banner">{submitError}</p>}

                {/* Submit Action */}
                {!isAuthenticated ? (
                  <div className="reservation-login-prompt">
                    <p>Please log in or register to complete your reservation pass.</p>
                    <div className="auth-prompt-buttons">
                      <Link
                        href={`/login?next=${encodeURIComponent("/reservations")}`}
                        className="button button-terracotta button-full"
                      >
                        Sign In to Complete Reservation →
                      </Link>
                      <Link
                        href={`/register?next=${encodeURIComponent("/reservations")}`}
                        className="button button-outline button-full"
                      >
                        Create Account
                      </Link>
                    </div>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting || !selectedStartTime || quoteLoading}
                    className="button button-terracotta button-full reservation-confirm-btn"
                  >
                    {submitting ? "Securing Pottery Wheels…" : "Confirm Reservation & Proceed →"}
                  </button>
                )}
              </>
            )}
          </form>
        </div>

        {/* Restaurant-style FAQ / Studio Info */}
        <section className="reservation-studio-faq">
          <div className="faq-grid">
            <div className="faq-card">
              <h4>Dining-Style Table/Wheel Reservations</h4>
              <p>
                Our studio operates continuously just like a dining establishment. When you reserve for 10:00 AM,
                your machine, foot pedal, and prepared clay will be ready when you step inside.
              </p>
            </div>
            <div className="faq-card">
              <h4>Kiln Firing & Glazes Included</h4>
              <p>
                After your throwing session, select your favorite finished pots. We trim, bisque-fire, glaze in
                our studio tones, and kiln-fire them. Ready for pickup or shipping in 10–14 days.
              </p>
            </div>
            <div className="faq-card">
              <h4>Multiple Machines for Groups</h4>
              <p>
                Coming with a partner, family, or friends? Select 2, 3, or 4 machines to reserve wheels side-by-side
                in a single reservation pass.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
