"use client";
import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { formatPrice, calculateBestPrice } from "@/lib/pricing";
import { SITE_CONFIG, PRICING } from "@/lib/constants";

// Utility function to format duration in a human-readable way
const formatDuration = (startDate: Date, endDate: Date): string => {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.round(diffDays / 30);

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    const remainingDays = diffDays % 7;
    if (remainingDays === 0) {
      return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    } else {
      return `${weeks} week${weeks !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
    }
  } else if (diffDays < 90) {
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    if (remainingDays === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (remainingDays < 7) {
      return `${months} month${months !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
    } else {
      const weeks = Math.floor(remainingDays / 7);
      const finalDays = remainingDays % 7;
      if (finalDays === 0) {
        return `${months} month${months !== 1 ? 's' : ''}, ${weeks} week${weeks !== 1 ? 's' : ''}`;
      } else {
        return `${months} month${months !== 1 ? 's' : ''}, ${weeks} week${weeks !== 1 ? 's' : ''}, ${finalDays} day${finalDays !== 1 ? 's' : ''}`;
      }
    }
  } else {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
  }
};

// Define types for better TypeScript support
interface EventData {
  id: string;
  title: string;
  start: Date;
  end: Date;
  spot: string;
  name: string;
  ref: string;
  plate: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    spot: string;
    name: string;
    ref: string;
    plate: string;
  };
}

interface TempEventInfo {
  event: EventData;
  revert?: () => void;
}

export default function Home() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date; resourceId?: string } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [plate, setPlate] = useState("");
  const [selectedSpot, setSelectedSpot] = useState("northern");
  const [availableSpots, setAvailableSpots] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyingEvent, setModifyingEvent] = useState<EventData | null>(null);
  const [modifyRef, setModifyRef] = useState("");
  const [showRefModal, setShowRefModal] = useState(false);
  const [refAction, setRefAction] = useState<'modify' | 'reschedule' | null>(null);
  const [tempEventInfo, setTempEventInfo] = useState<TempEventInfo | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [modifyAvailable, setModifyAvailable] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ ref: string; price: number } | null>(null);
  const [showEnforcementModal, setShowEnforcementModal] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [modifyAvailabilityMessage, setModifyAvailabilityMessage] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    loadEvents();
    
    // Detect mobile device
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                           ('ontouchstart' in window) || 
                           (window.innerWidth <= 768);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const loadEvents = async () => {
    const res = await fetch(`/api/events?spot=both`);
    const json = await res.json();
    if (res.ok) {
      setEvents(json.events.map((e: any) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
        title: e.name || 'Booked',
        backgroundColor: e.spot === "northern" ? "#0d6efd" : "#198754",
        borderColor: e.spot === "northern" ? "#0d6efd" : "#198754",
        textColor: "#ffffff",
        spot: e.spot,
        name: e.name,
        ref: e.ref,
        plate: e.plate,
        className: `event-${e.spot}`, // Add class for positioning
        extendedProps: {
          spot: e.spot,
          name: e.name,
          ref: e.ref,
          plate: e.plate
        }
      })));
    }
  };

  const onDateSelect = async (selectInfo: any) => {
    const start = selectInfo.start;
    const end = selectInfo.end;
    const now = new Date();
    
    // Smart "now" handling - if start is in the past, bump to now
    const adjustedStart = start < now ? now : start;
    let adjustedEnd = end < now ? new Date(now.getTime() + 60 * 60 * 1000) : end; // Add 1 hour if end is also in past
    
    // Enforce minimum 24-hour booking duration
    const minEndTime = new Date(adjustedStart.getTime() + 24 * 60 * 60 * 1000); // 24 hours after start
    if (adjustedEnd < minEndTime) {
      adjustedEnd = minEndTime;
    }
    
    // Convert to local time strings to avoid timezone issues
    const toLocalISOString = (date: Date) => {
      const tzOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    };
    
    const startIso = toLocalISOString(adjustedStart);
    const endIso = toLocalISOString(adjustedEnd);
    
    // Check availability for both spots
    const available = [];
    const unavailable = [];
    
    for (const spot of ["northern", "southern"]) {
      const res = await fetch(`/api/availability?spot=${spot}&start=${startIso}&end=${endIso}`);
      const json = await res.json();
      if (res.ok && json.available) {
        available.push(spot);
      } else {
        unavailable.push(spot);
      }
    }
    
    // If no spots available, show error
    if (available.length === 0) {
      setErrorMessage("Neither parking spot is available for the selected time. Please choose a different time.");
      setShowErrorModal(true);
      return;
    }
    
    setAvailableSpots(available);
    setSelectedSpot(available.includes("northern") ? "northern" : available[0]);
    setAvailabilityMessage(""); // Clear old message
    setSelectedSlot({ start: adjustedStart, end: adjustedEnd });
    setStartTime(startIso);
    setEndTime(endIso);
    setShowBookingModal(true);
  };

  // Handler for "New Booking" button
  const openNewBookingModal = async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
    
    const toLocalISOString = (date: Date) => {
      const tzOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    };
    
    const startIso = toLocalISOString(startDate);
    const endIso = toLocalISOString(endDate);
    
    // Check availability for both spots
    const available = [];
    for (const spot of ["northern", "southern"]) {
      const res = await fetch(`/api/availability?spot=${spot}&start=${startIso}&end=${endIso}`);
      const json = await res.json();
      if (res.ok && json.available) {
        available.push(spot);
      }
    }
    
    setAvailableSpots(available.length > 0 ? available : ["northern", "southern"]);
    setSelectedSpot(available.includes("northern") ? "northern" : (available[0] || "northern"));
    setAvailabilityMessage("");
    setSelectedSlot({ start: startDate, end: endDate });
    setStartTime(startIso);
    setEndTime(endIso);
    setShowBookingModal(true);
  };

  const onEventClick = async (info: any) => {
    // Show booking details first
    const event = info.event;
    const eventData = event.extendedProps;
    
    console.log('Event clicked - eventData:', eventData);
    console.log('Event clicked - event.title:', event.title);
    
    const bookingDetails: EventData = {
      id: event.id || 'unknown',
      title: event.title || 'Unknown',
      spot: eventData.spot || event.title?.split(' - ')[0]?.toLowerCase() || 'unknown',
      name: eventData.name || event.title?.split(' - ')[1] || 'Unknown',
      ref: eventData.ref || 'Unknown',
      plate: eventData.plate || 'Unknown',
      start: event.start,
      end: event.end,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      textColor: event.textColor,
      extendedProps: eventData
    };
    
    console.log('Booking details:', bookingDetails);
    
    setModifyingEvent(bookingDetails);
    setShowBookingDetailsModal(true);
  };

  const onEventDrop = async (info: any) => {
    setTempEventInfo(info);
    setRefAction('reschedule');
    setShowRefModal(true);
  };

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    
    setLoading(true);
    
    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spot: selectedSpot,
        startIso: startTime,
        endIso: endTime,
        plate,
        name,
        phone,
        email
      })
    });
    
    const json = await res.json();
    setLoading(false);
    
    if (res.ok) {
      setSuccessData({ ref: json.ref, price: json.priceCents });
      setShowBookingModal(false);
      loadEvents();
      // Clear form
      setName("");
      setPhone("");
      setEmail("");
      setPlate("");
      setStartTime("");
      setEndTime("");
    } else {
      setErrorMessage(json.error || "Unknown error occurred while booking");
      setShowErrorModal(true);
    }
  };

  const closeModal = () => {
    setShowBookingModal(false);
    setSelectedSlot(null);
    setAvailabilityMessage("");
    setAcceptTerms(false);
  };

  const validateReferenceCode = async (ref: string, spot: string) => {
    try {
      const response = await fetch(`/api/booking/${ref}?spot=${spot}`, {
        method: 'GET'
      });
      return response.ok;
    } catch (error) {
      console.error('Reference code validation error:', error);
      return false;
    }
  };

  const handleModifyClick = async () => {
    if (!modifyRef.trim()) {
      setErrorMessage("Please enter your reference code");
      setShowErrorModal(true);
      return;
    }

    if (!modifyingEvent) {
      setErrorMessage("No booking selected");
      setShowErrorModal(true);
      return;
    }

    // Check if booking has already started or ended
    const now = new Date();
    if (modifyingEvent.start <= now) {
      setErrorMessage("This booking has already started or ended and cannot be modified. Only future bookings can be changed.");
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    console.log('Validating reference code:', modifyRef, 'for spot:', modifyingEvent.spot.toLowerCase());
    
    try {
      const response = await fetch(`/api/booking/${modifyRef}?spot=${modifyingEvent.spot.toLowerCase()}`, {
        method: 'GET'
      });
      
      console.log('Validation response status:', response.status);
      
      if (response.ok) {
        // Reference code is valid, pre-populate form and show modify UI
        const toLocalISOString = (date: Date) => {
          const tzOffset = date.getTimezoneOffset() * 60000;
          return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
        };
        
        // Pre-populate form fields with current booking data
        const startTimeStr = toLocalISOString(modifyingEvent.start);
        const endTimeStr = toLocalISOString(modifyingEvent.end);
        
        setStartTime(startTimeStr);
        setEndTime(endTimeStr);
        setSelectedSpot(modifyingEvent.spot.toLowerCase());
        
        // Check availability for the current booking times (excluding the current booking)
        setTimeout(() => {
          checkModifyAvailability(startTimeStr, endTimeStr, modifyingEvent.spot.toLowerCase());
        }, 100);
        
        setLoading(false);
        setShowBookingDetailsModal(false);
        setShowModifyModal(true);
      } else {
        setLoading(false);
        const errorData = await response.json().catch(() => ({}));
        console.log('Validation error:', errorData);
        setErrorMessage(`Invalid reference code (${response.status}). Please check your booking confirmation and try again.`);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Reference code validation error:', error);
      setLoading(false);
      setErrorMessage("Error validating reference code. Please try again.");
      setShowErrorModal(true);
    }
  };

  const closeModifyModal = () => {
    setShowModifyModal(false);
    setModifyingEvent(null);
    setModifyRef("");
    setModifyAvailabilityMessage("");
    setModifyAvailable([]);
    // Clear form fields
    setStartTime("");
    setEndTime("");
    setSelectedSpot("northern");
  };

  const closeBookingDetailsModal = () => {
    setShowBookingDetailsModal(false);
    setModifyingEvent(null);
    setModifyRef("");
    // Clear form fields
    setStartTime("");
    setEndTime("");
    setSelectedSpot("northern");
  };

  const handleRefSubmit = async (code: string) => {
    if (!tempEventInfo || !refAction) return;
    
    setShowRefModal(false);
    setModifyRef(code);
    
    if (refAction === 'modify') {
      const spot = tempEventInfo.event.extendedProps?.spot || tempEventInfo.event.spot || (tempEventInfo.event.title.toLowerCase().includes("northern") ? "northern" : "southern");
      setModifyingEvent(tempEventInfo.event);
      setSelectedSpot(spot);
      setStartTime(tempEventInfo.event.start.toISOString().slice(0, 16));
      setEndTime(tempEventInfo.event.end.toISOString().slice(0, 16));
      
      // Check availability for both spots
      const available = [];
      for (const checkSpot of ["northern", "southern"]) {
        const res = await fetch(`/api/availability?spot=${checkSpot}&start=${tempEventInfo.event.start.toISOString().slice(0, 16)}&end=${tempEventInfo.event.end.toISOString().slice(0, 16)}`);
        const json = await res.json();
        if (res.ok && (json.available || checkSpot === spot)) {
          available.push(checkSpot);
        }
      }
      setAvailableSpots(available);
      setModifyAvailable(available); // Initialize modify availability
      setShowModifyModal(true);
      
      // Check availability for the current times
      const originalSpot = tempEventInfo.event.extendedProps?.spot || tempEventInfo.event.spot || (tempEventInfo.event.title.toLowerCase().includes("northern") ? "northern" : "southern");
      checkModifyAvailability(tempEventInfo.event.start.toISOString().slice(0, 16), tempEventInfo.event.end.toISOString().slice(0, 16), originalSpot);
    } else if (refAction === 'reschedule') {
      const spot = tempEventInfo.event.extendedProps?.spot || tempEventInfo.event.spot || (tempEventInfo.event.title.toLowerCase().includes("northern") ? "northern" : "southern");
      const startIso = tempEventInfo.event.start.toISOString().slice(0, 16);
      const endIso = tempEventInfo.event.end.toISOString().slice(0, 16);
      
      setLoading(true);
      const res = await fetch(`/api/booking/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spot, startIso, endIso })
      });
      setLoading(false);
      
      if (res.ok) {
        setSuccessData({ ref: code, price: 0 }); // Use success modal for confirmation
        loadEvents();
      } else {
        const json = await res.json();
        setErrorMessage(json.error || "Failed to reschedule booking");
        setShowErrorModal(true);
        tempEventInfo.revert?.();
      }
    }
    
    setTempEventInfo(null);
    setRefAction(null);
  };

  const submitModification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modifyingEvent || !modifyRef) return;
    
    setLoading(true);
    
    const res = await fetch(`/api/booking/${modifyRef}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spot: selectedSpot,
        startIso: startTime,
        endIso: endTime
      })
    });
    
    setLoading(false);
    
    if (res.ok) {
      setSuccessData({ ref: modifyRef, price: price });
      setShowModifyModal(false);
      loadEvents();
      setModifyingEvent(null);
      setModifyRef("");
    } else {
      const json = await res.json();
      setErrorMessage(json.error || "Failed to update booking");
      setShowErrorModal(true);
    }
  };

  const cancelBooking = async () => {
    if (!modifyingEvent || !modifyRef) return;
    
    const originalSpot = modifyingEvent.extendedProps?.spot || modifyingEvent.spot || (modifyingEvent.title.toLowerCase().includes("northern") ? "northern" : "southern");
    
    setConfirmMessage("Are you sure you want to cancel this booking? This action cannot be undone.");
    setConfirmAction(() => async () => {
      setLoading(true);
      const res = await fetch(`/api/booking/${modifyRef}?spot=${originalSpot}`, { method: "DELETE" });
      setLoading(false);
      
      if (res.ok) {
        setSuccessData({ ref: modifyRef, price: 0 });
        setShowModifyModal(false);
        loadEvents();
        setModifyingEvent(null);
        setModifyRef("");
      } else {
        setErrorMessage("Failed to cancel booking. Please try again.");
        setShowErrorModal(true);
      }
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };

  const checkBookingAvailability = async (checkStartTime: string, checkEndTime: string) => {
    if (!checkStartTime || !checkEndTime) {
      setAvailableSpots([]);
      setAvailabilityMessage("");
      return;
    }

    const available = [];
    const unavailable = [];
    
    for (const spot of ["northern", "southern"]) {
      const res = await fetch(`/api/availability?spot=${spot}&start=${checkStartTime}&end=${checkEndTime}`);
      const json = await res.json();
      if (res.ok && json.available) {
        available.push(spot);
      } else {
        unavailable.push(spot);
      }
    }
    
    setAvailableSpots(available);
    
    // Auto-select the available spot if only one is available
    if (available.length === 1) {
      setSelectedSpot(available[0]);
    } else if (available.length > 1 && !available.includes(selectedSpot)) {
      // If current selection is not available, select the first available
      setSelectedSpot(available[0]);
    }
    
    // Clear the old availability message (no longer used)
    setAvailabilityMessage("");
  };

  const checkModifyAvailability = async (checkStartTime: string, checkEndTime: string, currentSpot: string) => {
    if (!checkStartTime || !checkEndTime) {
      setModifyAvailable([]);
      setModifyAvailabilityMessage("");
      return;
    }

    const available = [];
    const unavailable = [];
    
    for (const spot of ["northern", "southern"]) {
      // Exclude the current booking by passing the reference code
      const excludeParam = modifyRef ? `&exclude=${modifyRef}` : '';
      const res = await fetch(`/api/availability?spot=${spot}&start=${checkStartTime}&end=${checkEndTime}${excludeParam}`);
      const json = await res.json();
      if (res.ok && json.available) {
        available.push(spot);
      } else {
        unavailable.push(spot);
      }
    }
    
    setModifyAvailable(available);
    
    // Auto-select the available spot if only one is available
    if (available.length === 1) {
      setSelectedSpot(available[0]);
    } else if (available.length > 1 && !available.includes(selectedSpot)) {
      // If current selection is not available, select the first available
      setSelectedSpot(available[0]);
    }
    
    // Clear the old availability message (no longer used)
    setModifyAvailabilityMessage("");
  };

  const price = startTime && endTime ? calculateBestPrice(startTime, endTime).totalCents : 0;

  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center align-items-md-center mb-4 gap-3">
            <div className="text-center text-md-start">
              <h1 className="mb-1 h2">{SITE_CONFIG.address}</h1>
              <p className="text-muted mb-0">{SITE_CONFIG.description}</p>
            </div>
            <div className="text-center p-3 bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded">
              <div className="small text-warning-emphasis mb-2 fw-medium">Someone in your spot?</div>
              <button 
                type="button" 
                className="btn btn-warning btn-sm"
                onClick={() => setShowEnforcementModal(true)}
              >
                <i className="bi bi-headset me-1"></i>
                Report Issue
              </button>
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4">
              <div className="row g-4">
                {/* Instructions */}
                <div className="col-md-8">
                  <div className="d-flex align-items-start">
                    <div className="me-3">
                      <i className="bi bi-info-circle text-primary fs-5"></i>
                    </div>
                    <div>
                      <h6 className="mb-2 fw-semibold">How to Use</h6>
                      <div className="small text-muted mb-2">
                        <ol>
                          <li>Select a date and time to book</li>
                          <li>Enter your details and confirm the booking</li>
                          <li>Take note of the confirmation code so you can modify or cancel the booking</li>
                          <li>Make payment via e-transfer to andrewjohnmcgrath@gmail.com</li>
                        </ol>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center">
                          <div className="rounded-circle me-2" style={{width: '8px', height: '8px', backgroundColor: '#0d6efd'}}></div>
                          <span className="small text-muted">Northern</span>
                        </div>
                        <div className="d-flex align-items-center">
                          <div className="rounded-circle me-2" style={{width: '8px', height: '8px', backgroundColor: '#198754'}}></div>
                          <span className="small text-muted">Southern</span>
                        </div>
                      </div>
                      <button 
                        className="btn btn-primary btn-sm mt-3"
                        onClick={openNewBookingModal}
                      >
                        <i className="bi bi-plus-circle me-2"></i>
                        New Booking
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="col-md-4">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <i className="bi bi-currency-dollar text-success fs-5"></i>
                    </div>
                    <div>
                      <h6 className="mb-2 fw-semibold">Pricing</h6>
                      <div className="d-flex gap-2">
                        <span className="badge text-bg-light border text-dark">{PRICING.daily.label}/day</span>
                        <span className="badge text-bg-light border text-dark">{PRICING.weekly.label}/wk</span>
                        <span className="badge text-bg-light border text-dark">{PRICING.monthly.label}/mo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
            slotEventOverlap={false}
            height="auto"
            eventMaxStack={2}
            
            contentHeight={isMobile ? "400" : "500"}
            aspectRatio={isMobile ? 1 : 1.35}
            selectable
            editable
            select={onDateSelect}
            eventClick={onEventClick}
            eventDrop={onEventDrop}
            events={events}
            allDaySlot={false}
            longPressDelay={isMobile ? 100 : 150}
            eventLongPressDelay={isMobile ? 100 : 150}
            selectLongPressDelay={isMobile ? 100 : 150}
            unselectAuto={!isMobile}
            eventInteractive={true}
            droppable={true}
            selectMirror={true}
            headerToolbar={{
              left: 'prev,next',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            buttonText={{
              month: 'Month',
              week: 'Week', 
              day: 'Day'
            }}
            dayMaxEvents={true}
            slotDuration="01:00:00"
            slotLabelInterval="02:00:00"
            selectConstraint={{
              start: new Date().toISOString(),
              end: '9999-12-31'
            }}
            selectAllow={(selectInfo) => {
              const now = new Date();
              return selectInfo.start >= now;
            }}
            viewDidMount={(info) => {
              // Style past time slots after view renders
              setTimeout(() => {
                const now = new Date();
                const currentHour = now.getHours();
                const today = now.toDateString();
                
                // Get all time slot elements
                const timeSlots = document.querySelectorAll('.fc-timegrid-slot-lane');
                timeSlots.forEach((slot, index) => {
                  const slotElement = slot.closest('.fc-timegrid-slot');
                  if (slotElement) {
                    const timeLabel = slotElement.querySelector('.fc-timegrid-slot-label');
                    if (timeLabel) {
                      const timeText = timeLabel.textContent || '';
                      const hour = parseInt(timeText.split(':')[0]) || 0;
                      
                      // Check if this slot is in the past for today's column
                      const dayColumns = document.querySelectorAll('.fc-day-today .fc-timegrid-slot-lane');
                      if (Array.from(dayColumns).includes(slot) && hour < currentHour) {
                        const htmlSlot = slot as HTMLElement;
                        htmlSlot.style.backgroundColor = '#f8f9fa';
                        htmlSlot.style.opacity = '0.5';
                        htmlSlot.style.position = 'relative';
                        htmlSlot.style.pointerEvents = 'none';
                      }
                    }
                  }
                });
                
                // Add mobile touch event optimization
                if (isMobile) {
                  const calendarEl = info.el;
                  const slots = calendarEl.querySelectorAll('.fc-timegrid-slot-lane');
                  slots.forEach(slot => {
                    const htmlSlot = slot as HTMLElement;
                    htmlSlot.style.touchAction = 'manipulation';
                    htmlSlot.style.userSelect = 'none';
                    
                    // Add visual feedback for touch
                    htmlSlot.addEventListener('touchstart', (e) => {
                      htmlSlot.style.backgroundColor = 'rgba(13, 110, 253, 0.1)';
                    }, { passive: true });
                    
                    htmlSlot.addEventListener('touchend', (e) => {
                      setTimeout(() => {
                        htmlSlot.style.backgroundColor = '';
                      }, 150);
                    }, { passive: true });
                  });
                }
              }, 200);
            }}
          />
        </div>
      </div>

      {/* Booking Details Modal */}
      {showBookingDetailsModal && modifyingEvent && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-info-circle me-2"></i>
                  Booking Details
                </h5>
                <button type="button" className="btn-close" onClick={closeBookingDetailsModal}></button>
              </div>
              <div className="modal-body">
                <div className="card">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">
                      <i className="bi bi-calendar-check me-2"></i>
                      Reservation Information
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <strong><i className="bi bi-geo-alt me-1 text-primary"></i>Parking Spot:</strong>
                        <p className="mb-2">{modifyingEvent.spot.charAt(0).toUpperCase() + modifyingEvent.spot.slice(1)}</p>
                      </div>
                      <div className="col-md-6">
                        <strong><i className="bi bi-person-fill me-1 text-success"></i>Reserved by:</strong>
                        <p className="mb-2">{modifyingEvent.name}</p>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <strong><i className="bi bi-car-front me-1 text-danger"></i>License Plate:</strong>
                        <p className="mb-2 font-monospace fw-bold text-uppercase">{modifyingEvent.plate}</p>
                      </div>
                      <div className="col-md-6">
                        <strong><i className="bi bi-clock me-1 text-info"></i>Duration:</strong>
                        <p className="mb-2">{formatDuration(modifyingEvent.start, modifyingEvent.end)}</p>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <strong><i className="bi bi-key me-1 text-warning"></i>Reference Code:</strong>
                        <p className="mb-2 font-monospace">{modifyingEvent.ref}</p>
                      </div>
                      <div className="col-md-6">
                        <div className="d-none d-md-block"></div> {/* Spacer for alignment */}
                      </div>
                    </div>
                    <div className="mt-3">
                      <strong><i className="bi bi-calendar-event me-1 text-secondary"></i>Booking Period:</strong>
                      <p className="mb-0">
                        <strong>Start:</strong> {modifyingEvent.start.toLocaleString()}<br/>
                        <strong>End:</strong> {modifyingEvent.end.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {modifyingEvent.start > new Date() ? (
                  <>
                    <div className="alert alert-info mt-4">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Want to modify this booking?</strong><br/>
                      Enter your reference code below to make changes to this reservation.
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">
                        <i className="bi bi-key me-2"></i>
                        Reference Code
                      </label>
                      <input 
                        className="form-control form-control-lg text-center" 
                        type="text"
                        value={modifyRef}
                        onChange={(e) => setModifyRef(e.target.value.toUpperCase())}
                        placeholder="Enter your reference code"
                        style={{ letterSpacing: '2px' }}
                        maxLength={10}
                      />
                      <div className="form-text">
                        This code was provided when you made your booking.
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="alert alert-warning mt-4">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    <strong>Booking Cannot Be Modified</strong><br/>
                    This booking has already started or ended. Only future bookings can be modified.
                  </div>
                )}
              </div>
              <div className="modal-footer pb-3">
                <button type="button" className="btn btn-secondary" onClick={closeBookingDetailsModal}>
                  Close
                </button>
                {modifyingEvent.start > new Date() && (
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleModifyClick}
                    disabled={loading || !modifyRef.trim()}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Validating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-pencil-square me-2"></i>
                        Modify Booking
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Book {selectedSpot} Parking</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={submitBooking}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">
                      <i className="bi bi-geo-alt me-2"></i>
                      Select Parking Spot
                    </label>
                    <div className="btn-group w-100" role="group">
                      <input 
                        type="radio" 
                        className="btn-check" 
                        name="modalSpot" 
                        id="modalNorthern" 
                        value="northern" 
                        checked={selectedSpot === "northern"} 
                        disabled={!availableSpots.includes("northern")}
                        onChange={e => setSelectedSpot(e.target.value)} 
                      />
                      <label 
                        className={`btn ${availableSpots.includes("northern") ? 'btn-outline-primary' : 'btn-outline-secondary'}`} 
                        htmlFor="modalNorthern"
                      >
                        <i className="bi bi-geo-alt me-1"></i>
                        Northern
                        {!availableSpots.includes("northern") && <i className="bi bi-lock-fill ms-2"></i>}
                      </label>
                      
                      <input 
                        type="radio" 
                        className="btn-check" 
                        name="modalSpot" 
                        id="modalSouthern" 
                        value="southern"
                        checked={selectedSpot === "southern"} 
                        disabled={!availableSpots.includes("southern")}
                        onChange={e => setSelectedSpot(e.target.value)} 
                      />
                      <label 
                        className={`btn ${availableSpots.includes("southern") ? 'btn-outline-success' : 'btn-outline-secondary'}`} 
                        htmlFor="modalSouthern"
                      >
                        <i className="bi bi-geo-alt me-1"></i>
                        Southern
                        {!availableSpots.includes("southern") && <i className="bi bi-lock-fill ms-2"></i>}
                      </label>
                    </div>
                    {availableSpots.length === 0 && (
                      <div className="form-text text-danger mt-2">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        Neither spot is available for this time. Please choose a different time.
                      </div>
                    )}
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Start Time</label>
                      <input className="form-control" type="datetime-local" value={startTime} 
                             onChange={e => {
                               const newStart = e.target.value;
                               setStartTime(newStart);
                               
                               // Ensure minimum 24-hour booking
                               if (newStart) {
                                 const startDate = new Date(newStart);
                                 const minEndDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
                                 const toLocalISOString = (date: Date) => {
                                   const tzOffset = date.getTimezoneOffset() * 60000;
                                   return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
                                 };
                                 const minEndTime = toLocalISOString(minEndDate);
                                 
                                 if (!endTime || endTime < minEndTime) {
                                   setEndTime(minEndTime);
                                 }
                                 
                                 // Check 90-day maximum
                                 const maxEndDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
                                 const currentEndDate = new Date(endTime || minEndTime);
                                 if (currentEndDate > maxEndDate) {
                                   const maxEndTime = toLocalISOString(maxEndDate);
                                   setEndTime(maxEndTime);
                                 }
                                 
                                 // Check availability with new times
                                 const checkEndTime = endTime && endTime >= minEndTime ? endTime : minEndTime;
                                 if (checkEndTime) {
                                   setTimeout(() => checkBookingAvailability(newStart, checkEndTime), 300);
                                 }
                               }
                             }} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">End Time</label>
                      <input className="form-control" type="datetime-local" value={endTime} 
                             onChange={e => {
                               const newEnd = e.target.value;
                               
                               // Ensure minimum 24-hour booking
                               if (startTime && newEnd) {
                                 const startDate = new Date(startTime);
                                 const endDate = new Date(newEnd);
                                 const minEndDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
                                 
                                 if (endDate < minEndDate) {
                                   const toLocalISOString = (date: Date) => {
                                     const tzOffset = date.getTimezoneOffset() * 60000;
                                     return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
                                   };
                                   const minEndTime = toLocalISOString(minEndDate);
                                   setEndTime(minEndTime);
                                   setTimeout(() => checkBookingAvailability(startTime, minEndTime), 300);
                                 } else {
                                   setEndTime(newEnd);
                                   setTimeout(() => checkBookingAvailability(startTime, newEnd), 300);
                                 }
                               } else {
                                 setEndTime(newEnd);
                               }
                             }} required />
                    </div>
                  </div>
                  
                  {startTime && endTime && (
                    <div className="card mb-3 bg-light">
                      <div className="card-body">
                        <h6 className="card-title mb-2">
                          <i className="bi bi-calculator me-2"></i>
                          Booking Summary
                        </h6>
                        <div className="row">
                          <div className="col-md-6">
                            <strong><i className="bi bi-clock me-1"></i>Duration:</strong>
                            <p className="mb-1">{formatDuration(new Date(startTime), new Date(endTime))}</p>
                          </div>
                          <div className="col-md-6">
                            <strong><i className="bi bi-currency-dollar me-1"></i>Cost:</strong>
                            <p className="mb-1 text-success fw-bold">{formatPrice(price)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label className="form-label">Your Name</label>
                    <input className="form-control" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Phone</label>
                    <input className="form-control" value={phone} onChange={e => setPhone(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">License Plate</label>
                    <input className="form-control" value={plate} onChange={e => setPlate(e.target.value)} required />
                  </div>
                  
                  <div className="mb-3">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="acceptTerms" 
                             checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} required />
                      <label className="form-check-label" htmlFor="acceptTerms">
                        I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                        <small className="d-block text-muted mt-1">
                          By checking this box, you acknowledge that you park at your own risk and the property owner is not liable for any damage, theft, or loss.
                        </small>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer" style={{ paddingBottom: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading || availableSpots.length === 0}>
                    {loading ? "Booking..." : "Book Now"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successData && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <div className="w-100 text-center">
                  <div className="mb-3">
                    <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
                  </div>
                  <h4 className="modal-title mb-2">
                    {successData.price > 0 ? "Booking Confirmed!" : "Action Completed Successfully!"}
                  </h4>
                </div>
                <button type="button" className="btn-close" onClick={() => setSuccessData(null)}></button>
              </div>
              <div className="modal-body pt-0">
                {successData.price > 0 ? (
                  <>
                    {/* Reference Code Section */}
                    <div className="card mb-4 border-success">
                      <div className="card-body text-center bg-light">
                        <h5 className="card-title text-success mb-3">
                          <i className="bi bi-bookmark-fill me-2"></i>
                          Your Reference Code
                        </h5>
                        <div className="bg-white border rounded p-3 mb-3">
                          <span className="h3 font-monospace text-dark fw-bold" style={{ letterSpacing: '3px' }}>
                            {successData.ref}
                          </span>
                        </div>
                        <p className="text-muted mb-0">
                          <i className="bi bi-info-circle me-2"></i>
                          Save this code to modify or cancel your booking
                        </p>
                      </div>
                    </div>

                    {/* Payment Section */}
                    <div className="card border-warning">
                      <div className="card-header bg-warning bg-opacity-10">
                        <h5 className="card-title mb-0 text-warning">
                          <i className="bi bi-credit-card me-2"></i>
                          Payment Required
                        </h5>
                      </div>
                      <div className="card-body">
                        <div className="row align-items-center">
                          <div className="col-md-8">
                            <p className="mb-2">Send payment by e-transfer to:</p>
                            <div className="bg-light rounded p-2 mb-3">
                              <strong className="text-primary">andrewjohnmcgrath@gmail.com</strong>
                            </div>
                          </div>
                          <div className="col-md-4 text-end">
                            <div className="text-muted">Amount Due</div>
                            <div className="h4 text-success fw-bold mb-0">{formatPrice(successData.price)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <h5 className="text-success">Operation completed successfully!</h5>
                    <p className="text-muted">Your booking has been updated.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 pt-0">
                <div className="w-100 text-center">
                  <button type="button" className="btn btn-primary btn-lg px-5" onClick={() => setSuccessData(null)}>
                    <i className="bi bi-check-lg me-2"></i>
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modify Booking Modal */}
      {showModifyModal && modifyingEvent && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-pencil-square me-2"></i>
                  Modify Your Booking
                </h5>
                <button type="button" className="btn-close" onClick={closeModifyModal}></button>
              </div>
              <form onSubmit={submitModification}>
                <div className="modal-body">

                  

                  <div className="mb-4">
                    <label className="form-label fw-bold">
                      <i className="bi bi-geo-alt me-2"></i>
                      Select Parking Spot
                    </label>
                    <div className="btn-group w-100" role="group">
                      <input 
                        type="radio" 
                        className="btn-check" 
                        name="modifySpot" 
                        id="modifyNorthern" 
                        value="northern" 
                        checked={selectedSpot === "northern"} 
                        disabled={!modifyAvailable.includes("northern")}
                        onChange={e => {
                          setSelectedSpot(e.target.value);
                          if (modifyingEvent && startTime && endTime) {
                            const originalSpot = modifyingEvent.extendedProps?.spot || modifyingEvent.spot || "northern";
                            setTimeout(() => {
                              checkModifyAvailability(startTime, endTime, originalSpot);
                            }, 100);
                          }
                        }} 
                      />
                      <label 
                        className={`btn ${modifyAvailable.includes("northern") ? 'btn-outline-primary' : 'btn-outline-secondary'}`} 
                        htmlFor="modifyNorthern"
                      >
                        <i className="bi bi-geo-alt me-1"></i>
                        Northern
                        {!modifyAvailable.includes("northern") && <i className="bi bi-lock-fill ms-2"></i>}
                      </label>
                      
                      <input 
                        type="radio" 
                        className="btn-check" 
                        name="modifySpot" 
                        id="modifySouthern" 
                        value="southern"
                        checked={selectedSpot === "southern"} 
                        disabled={!modifyAvailable.includes("southern")}
                        onChange={e => {
                          setSelectedSpot(e.target.value);
                          if (modifyingEvent && startTime && endTime) {
                            const originalSpot = modifyingEvent.extendedProps?.spot || modifyingEvent.spot || "southern";
                            setTimeout(() => {
                              checkModifyAvailability(startTime, endTime, originalSpot);
                            }, 100);
                          }
                        }} 
                      />
                      <label 
                        className={`btn ${modifyAvailable.includes("southern") ? 'btn-outline-success' : 'btn-outline-secondary'}`} 
                        htmlFor="modifySouthern"
                      >
                        <i className="bi bi-geo-alt me-1"></i>
                        Southern
                        {!modifyAvailable.includes("southern") && <i className="bi bi-lock-fill ms-2"></i>}
                      </label>
                    </div>
                    {modifyAvailable.length === 0 && (
                      <div className="form-text text-danger mt-2">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        Neither spot is available for this time. Please choose a different time.
                      </div>
                    )}
                  </div>
                  
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        <i className="bi bi-calendar-event me-2"></i>Start Time
                      </label>
                      <input className="form-control" type="datetime-local" value={startTime} 
                             onChange={e => {
                               const newStart = e.target.value;
                               setStartTime(newStart);
                               
                               // Ensure minimum 24-hour booking
                               if (newStart) {
                                 const startDate = new Date(newStart);
                                 const minEndDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
                                 const toLocalISOString = (date: Date) => {
                                   const tzOffset = date.getTimezoneOffset() * 60000;
                                   return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
                                 };
                                 const minEndTime = toLocalISOString(minEndDate);
                                 
                                 if (!endTime || endTime < minEndTime) {
                                   setEndTime(minEndTime);
                                 }
                                 
                                 // Check 90-day maximum
                                 const maxEndDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
                                 const currentEndDate = new Date(endTime || minEndTime);
                                 if (currentEndDate > maxEndDate) {
                                   const maxEndTime = toLocalISOString(maxEndDate);
                                   setEndTime(maxEndTime);
                                 }
                                 
                                 // Check availability with debouncing
                                 if (modifyingEvent) {
                                   const originalSpot = modifyingEvent.extendedProps?.spot || modifyingEvent.spot || "northern";
                                   const checkEndTime = endTime && endTime >= minEndTime ? endTime : minEndTime;
                                   setTimeout(() => {
                                     checkModifyAvailability(newStart, checkEndTime, originalSpot);
                                   }, 300);
                                 }
                               }
                             }} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        <i className="bi bi-calendar-event me-2"></i>End Time
                      </label>
                      <input className="form-control" type="datetime-local" value={endTime} 
                             onChange={e => {
                               const newEnd = e.target.value;
                               
                               // Ensure minimum 24-hour booking
                               if (startTime && newEnd) {
                                 const startDate = new Date(startTime);
                                 const endDate = new Date(newEnd);
                                 const minEndDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
                                 
                                 if (endDate < minEndDate) {
                                   const toLocalISOString = (date: Date) => {
                                     const tzOffset = date.getTimezoneOffset() * 60000;
                                     return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
                                   };
                                   const minEndTime = toLocalISOString(minEndDate);
                                   setEndTime(minEndTime);
                                   
                                   // Check availability with debouncing
                                   if (modifyingEvent) {
                                     const originalSpot = modifyingEvent.extendedProps?.spot || modifyingEvent.spot || "northern";
                                     setTimeout(() => {
                                       checkModifyAvailability(startTime, minEndTime, originalSpot);
                                     }, 300);
                                   }
                                 } else {
                                   setEndTime(newEnd);
                                   
                                   // Check availability with debouncing
                                   if (modifyingEvent) {
                                     const originalSpot = modifyingEvent.extendedProps?.spot || modifyingEvent.spot || "northern";
                                     setTimeout(() => {
                                       checkModifyAvailability(startTime, newEnd, originalSpot);
                                     }, 300);
                                   }
                                 }
                               } else {
                                 setEndTime(newEnd);
                               }
                             }} required />
                    </div>
                  </div>
                  
                  <div className="card bg-light">
                    <div className="card-body">
                      <h6 className="card-title mb-2">
                        <i className="bi bi-calculator me-2"></i>
                        Updated Booking Summary
                      </h6>
                      <div className="row">
                        <div className="col-md-6">
                          <strong><i className="bi bi-clock me-1"></i>New Duration:</strong>
                          <p className="mb-1">{startTime && endTime ? formatDuration(new Date(startTime), new Date(endTime)) : 'Not set'}</p>
                        </div>
                        <div className="col-md-6">
                          <strong><i className="bi bi-currency-dollar me-1"></i>Updated Cost:</strong>
                          <p className="mb-1 text-primary fw-bold">{formatPrice(price)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer" style={{ paddingBottom: '1.5rem' }}>
                  <button type="button" className="btn btn-outline-danger" onClick={cancelBooking} disabled={loading}>
                    <i className="bi bi-trash me-2"></i>
                    {loading ? "Cancelling..." : "Cancel Booking"}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={closeModifyModal}>
                    <i className="bi bi-x-lg me-2"></i>Close
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading || modifyAvailable.length === 0}>
                    <i className="bi bi-check-lg me-2"></i>
                    {loading ? "Updating..." : "Update Booking"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reference Code Modal */}
      {showRefModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-key me-2"></i>
                  Enter Reference Code
                </h5>
                <button type="button" className="btn-close" onClick={() => {
                  setShowRefModal(false);
                  if (tempEventInfo?.revert) tempEventInfo.revert();
                  setTempEventInfo(null);
                  setRefAction(null);
                }}></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const code = formData.get('refCode') as string;
                if (code.trim()) handleRefSubmit(code.trim().toUpperCase());
              }}>
                <div className="modal-body">
                  <div className="mb-3">
                    <p className="text-muted">
                      {refAction === 'modify' 
                        ? "Please enter your booking reference code to modify this reservation."
                        : "Please enter your booking reference code to confirm this reschedule."
                      }
                    </p>
                    <label className="form-label fw-bold">Reference Code</label>
                    <input 
                      name="refCode" 
                      className="form-control form-control-lg text-center" 
                      placeholder="e.g. ABC123" 
                      style={{ letterSpacing: '2px', textTransform: 'uppercase' }}
                      maxLength={10}
                      required 
                      autoFocus
                    />
                    <div className="form-text">
                      This code was provided when you made your booking. If you have lost this code please contact us to modify this booking.
                    </div>
                  </div>
                </div>
                <div className="modal-footer pb-3">
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setShowRefModal(false);
                    if (tempEventInfo?.revert) tempEventInfo.revert();
                    setTempEventInfo(null);
                    setRefAction(null);
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-arrow-right me-2"></i>
                    Continue
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Error
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowErrorModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger mb-0">
                  <i className="bi bi-x-circle me-2"></i>
                  {errorMessage}
                </div>
              </div>
              <div className="modal-footer pb-3">
                <button type="button" className="btn btn-primary" onClick={() => setShowErrorModal(false)}>
                  <i className="bi bi-check-lg me-2"></i>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-warning">
                  <i className="bi bi-question-circle me-2"></i>
                  Confirm Action
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowConfirmModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning mb-0">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {confirmMessage}
                </div>
              </div>
              <div className="modal-footer pb-3">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>
                  <i className="bi bi-x-lg me-2"></i>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={() => {
                  if (confirmAction) confirmAction();
                }}>
                  <i className="bi bi-check-lg me-2"></i>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enforcement Info Modal */}
      {showEnforcementModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-shield-exclamation me-2 text-warning"></i>
                  Parking Enforcement
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowEnforcementModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning mb-4">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <strong>Someone parked in your reserved spot?</strong><br/>
                  Contact the landlord to report the violation.
                </div>

                <div className="card border-success">
                  <div className="card-header bg-success bg-opacity-10">
                    <h6 className="mb-0 text-success">
                      <i className="bi bi-lightbulb me-2"></i>
                      What to Include in Your Report
                    </h6>
                  </div>
                  <div className="card-body">
                    <ul className="mb-0">
                      <li className="mb-2">
                        <strong>Photos:</strong> License plate and the car in your spot
                      </li>
                      <li className="mb-2">
                        <strong>Details:</strong> Time, date, and which spot (Northern/Southern)
                      </li>
                      <li className="mb-2">
                        <strong>Your booking info:</strong> Reference code and reservation times
                      </li>
                      <li className="mb-0">
                        <strong>Stay safe:</strong> Don't confront the driver - let the landlord handle it
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="modal-footer pb-3">
                <button type="button" className="btn btn-primary" onClick={() => setShowEnforcementModal(false)}>
                  <i className="bi bi-check-lg me-2"></i>
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

