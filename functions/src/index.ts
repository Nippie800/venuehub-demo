import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";

initializeApp();

const db = getFirestore();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const BOOKING_FROM_EMAIL = defineSecret("BOOKING_FROM_EMAIL");

type BookingDoc = {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  bookingDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  boothLabel?: string;
  boothType?: string;
  eventType?: string;
  guestCount?: number;
  notes?: string | null;

  status?: string;
  notificationType?: "APPROVAL" | "REJECTION" | null;
  notificationStatus?: "NOT_REQUIRED" | "PENDING" | "SENT" | "FAILED" | null;
  notificationError?: string | null;
  customerNotifiedAt?: Timestamp | null;

  reminderStatus?: "NOT_SCHEDULED" | "PENDING" | "SENT" | "FAILED" | null;
  reminderError?: string | null;
  reminderSentAt?: Timestamp | null;
};

function buildApprovalEmailHtml(booking: BookingDoc, bookingId: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Your Golf Bar booking is confirmed ✅</h2>
      <p>Hi ${booking.customerName ?? "there"},</p>
      <p>Your booking has been approved by Golf Bar.</p>

      <div style="margin: 16px 0; padding: 16px; border: 1px solid #ddd; border-radius: 10px;">
        <p><strong>Reference:</strong> ${bookingId}</p>
        <p><strong>Date:</strong> ${booking.bookingDate ?? "-"}</p>
        <p><strong>Time:</strong> ${booking.startTime ?? "-"} – ${booking.endTime ?? "-"}</p>
        <p><strong>Booth:</strong> ${booking.boothLabel ?? "-"} (${booking.boothType ?? "-"})</p>
        <p><strong>Event:</strong> ${booking.eventType ?? "-"}</p>
        <p><strong>Guests:</strong> ${booking.guestCount ?? "-"}</p>
        ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ""}
      </div>

      <p>Please arrive 10 minutes before your session.</p>
      <p>See you soon,<br />Golf Bar</p>
    </div>
  `;
}

function buildRejectionEmailHtml(booking: BookingDoc, bookingId: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Your Golf Bar booking update</h2>
      <p>Hi ${booking.customerName ?? "there"},</p>
      <p>Unfortunately, we could not confirm your booking request at this time.</p>

      <div style="margin: 16px 0; padding: 16px; border: 1px solid #ddd; border-radius: 10px;">
        <p><strong>Reference:</strong> ${bookingId}</p>
        <p><strong>Date:</strong> ${booking.bookingDate ?? "-"}</p>
        <p><strong>Requested time:</strong> ${booking.startTime ?? "-"} – ${booking.endTime ?? "-"}</p>
        <p><strong>Requested booth:</strong> ${booking.boothLabel ?? "-"}</p>
      </div>

      <p>Please try another slot or contact Golf Bar for assistance.</p>
      <p>Kind regards,<br />Golf Bar</p>
    </div>
  `;
}

function buildReminderEmailHtml(booking: BookingDoc, bookingId: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Reminder: Your Golf Bar session starts soon ⛳</h2>
      <p>Hi ${booking.customerName ?? "there"},</p>
      <p>This is a reminder that your Golf Bar session is coming up soon.</p>

      <div style="margin: 16px 0; padding: 16px; border: 1px solid #ddd; border-radius: 10px;">
        <p><strong>Reference:</strong> ${bookingId}</p>
        <p><strong>Date:</strong> ${booking.bookingDate ?? "-"}</p>
        <p><strong>Time:</strong> ${booking.startTime ?? "-"} – ${booking.endTime ?? "-"}</p>
        <p><strong>Booth:</strong> ${booking.boothLabel ?? "-"} (${booking.boothType ?? "-"})</p>
        <p><strong>Event:</strong> ${booking.eventType ?? "-"}</p>
      </div>

      <p>Please arrive 10 minutes before your session.</p>
      <p>See you soon,<br />Golf Bar</p>
    </div>
  `;
}

function parseBookingStart(bookingDate?: string, startTime?: string): Date | null {
  if (!bookingDate || !startTime) return null;

  const [year, month, day] = bookingDate.split("-").map(Number);
  const [hour, minute] = startTime.split(":").map(Number);

  if (
    !year || !month || !day ||
    Number.isNaN(hour) || Number.isNaN(minute)
  ) {
    return null;
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export const sendBookingEmail = onDocumentUpdated(
  {
    document: "bookings/{bookingId}",
    region: "us-central1",
    secrets: [RESEND_API_KEY, BOOKING_FROM_EMAIL],
  },
  async (event) => {
    const before = event.data?.before.data() as BookingDoc | undefined;
    const after = event.data?.after.data() as BookingDoc | undefined;
    const bookingId = event.params.bookingId;

    if (!after) return;

    const shouldSend =
      after.notificationStatus === "PENDING" &&
      before?.notificationStatus !== "PENDING";

    if (!shouldSend) return;

    if (!after.customerEmail) {
      await db.collection("bookings").doc(bookingId).update({
        notificationStatus: "FAILED",
        notificationError: "Missing customerEmail",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const isApproval = after.notificationType === "APPROVAL";
    const isRejection = after.notificationType === "REJECTION";

    if (!isApproval && !isRejection) {
      await db.collection("bookings").doc(bookingId).update({
        notificationStatus: "FAILED",
        notificationError: "Missing or invalid notificationType",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const subject = isApproval
      ? "Your Golf Bar booking is confirmed"
      : "Your Golf Bar booking update";

    const html = isApproval
      ? buildApprovalEmailHtml(after, bookingId)
      : buildRejectionEmailHtml(after, bookingId);

    try {
      const resend = new Resend(RESEND_API_KEY.value());

      const result = await resend.emails.send({
        from: BOOKING_FROM_EMAIL.value(),
        to: [after.customerEmail],
        subject,
        html,
      });

      await db.collection("bookings").doc(bookingId).update({
        notificationStatus: "SENT",
        customerNotifiedAt: FieldValue.serverTimestamp(),
        notificationError: null,
        resendMessageId: (result as any)?.data?.id ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error: any) {
      await db.collection("bookings").doc(bookingId).update({
        notificationStatus: "FAILED",
        notificationError: error?.message ?? "Unknown email error",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
);

export const sendBookingReminders = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "us-central1",
    secrets: [RESEND_API_KEY, BOOKING_FROM_EMAIL],
  },
  async () => {
    const now = new Date();
    const lowerBound = new Date(now.getTime() + 60 * 60 * 1000);
    const upperBound = new Date(now.getTime() + 75 * 60 * 1000);

    const snap = await db.collection("bookings").where("status", "==", "CONFIRMED").get();

    const resend = new Resend(RESEND_API_KEY.value());

    for (const doc of snap.docs) {
      const booking = doc.data() as BookingDoc;
      const bookingId = doc.id;

      const alreadySent = booking.reminderStatus === "SENT";
      if (alreadySent) continue;

      const start = parseBookingStart(booking.bookingDate, booking.startTime);
      if (!start) continue;

      if (start < lowerBound || start > upperBound) continue;

      if (!booking.customerEmail) {
        await doc.ref.update({
          reminderStatus: "FAILED",
          reminderError: "Missing customerEmail",
          updatedAt: FieldValue.serverTimestamp(),
        });
        continue;
      }

      try {
        const result = await resend.emails.send({
          from: BOOKING_FROM_EMAIL.value(),
          to: [booking.customerEmail],
          subject: "Reminder: Your Golf Bar session starts soon",
          html: buildReminderEmailHtml(booking, bookingId),
        });

        await doc.ref.update({
          reminderStatus: "SENT",
          reminderSentAt: FieldValue.serverTimestamp(),
          reminderError: null,
          reminderMessageId: (result as any)?.data?.id ?? null,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (error: any) {
        await doc.ref.update({
          reminderStatus: "FAILED",
          reminderError: error?.message ?? "Unknown reminder email error",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }
);