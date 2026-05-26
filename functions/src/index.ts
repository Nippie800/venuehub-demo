import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";

initializeApp();
const db = getFirestore();

const RESEND_API_KEY = "";

// Hardcoded temporarily for demo stability.
const VERIFIED_FROM_EMAIL = "bookings@golfbarapp.com";

type BookingDoc = {
  bookingRef?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
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
  resendMessageId?: string | null;

  reminderStatus?: "NOT_SCHEDULED" | "PENDING" | "SENT" | "FAILED" | null;
  reminderError?: string | null;
  reminderSentAt?: Timestamp | null;
  reminderMessageId?: string | null;
};

function getDisplayBookingRef(booking: BookingDoc, bookingId: string) {
  return booking.bookingRef?.trim() || bookingId;
}

function emailShell(title: string, bodyHtml: string) {
  return `
    <div style="margin:0;padding:0;background-color:#f4f1ea;">
      <div style="max-width:640px;margin:0 auto;padding:32px 16px;font-family:Arial,sans-serif;color:#111827;">
        <div style="background:linear-gradient(135deg,#062616 0%,#0d3a25 100%);border-radius:20px 20px 0 0;padding:28px 24px;border:1px solid rgba(255,215,0,0.12);">
          <div style="font-size:12px;letter-spacing:1.2px;font-weight:700;color:#a7d08d;text-transform:uppercase;">
            Golf Bar
          </div>
          <div style="margin-top:8px;font-size:32px;line-height:36px;font-weight:800;color:#ffffff;">
            VenueHub
          </div>
          <div style="margin-top:10px;font-size:15px;line-height:22px;color:rgba(255,255,255,0.78);">
            Premium booking experience for Golf Bar customers.
          </div>
        </div>

        <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 20px 20px;padding:28px 24px 24px 24px;">
          <h2 style="margin:0 0 16px 0;font-size:24px;line-height:30px;color:#0f2f1f;">
            ${title}
          </h2>

          ${bodyHtml}

          <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e5e7eb;font-size:13px;line-height:20px;color:#6b7280;">
            This message was sent automatically by Golf Bar via VenueHub.
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildInfoCard(booking: BookingDoc, bookingId: string) {
  const displayRef = getDisplayBookingRef(booking, bookingId);

  return `
    <div style="margin:18px 0;padding:18px;border:1px solid #e5e7eb;border-radius:16px;background:#f8fafc;">
      <div style="display:inline-block;margin-bottom:14px;padding:7px 12px;border-radius:999px;background:#f2b94b;color:#111;font-size:12px;font-weight:800;">
        Booking Ref: ${displayRef}
      </div>

      <p style="margin:8px 0;"><strong>Date:</strong> ${booking.bookingDate ?? "-"}</p>
      <p style="margin:8px 0;"><strong>Time:</strong> ${booking.startTime ?? "-"} – ${booking.endTime ?? "-"}</p>
      <p style="margin:8px 0;"><strong>Booth:</strong> ${booking.boothLabel ?? "-"} (${booking.boothType ?? "-"})</p>
      <p style="margin:8px 0;"><strong>Event:</strong> ${booking.eventType ?? "-"}</p>
      <p style="margin:8px 0;"><strong>Guests:</strong> ${booking.guestCount ?? "-"}</p>
      ${booking.notes ? `<p style="margin:8px 0;"><strong>Notes:</strong> ${booking.notes}</p>` : ""}
    </div>
  `;
}

function buildApprovalEmailHtml(booking: BookingDoc, bookingId: string) {
  return emailShell(
    "Your Golf Bar booking is confirmed",
    `
      <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">Hi ${booking.customerName ?? "there"},</p>
      <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">
        Your booking has been approved by Golf Bar.
      </p>

      ${buildInfoCard(booking, bookingId)}

      <div style="margin-top:18px;padding:16px;border-radius:14px;background:#eef8f0;border:1px solid #d7eadb;">
        <div style="font-weight:800;color:#0f5132;">What happens next</div>
        <div style="margin-top:6px;font-size:14px;line-height:22px;color:#274c3b;">
          Please arrive 10 minutes before your session and keep your booking reference ready.
        </div>
      </div>

      <p style="margin:20px 0 0 0;font-size:15px;line-height:24px;">
        See you soon,<br /><strong>Golf Bar</strong>
      </p>
    `
  );
}

function buildRejectionEmailHtml(booking: BookingDoc, bookingId: string) {
  return emailShell(
    "Your Golf Bar booking update",
    `
      <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">Hi ${booking.customerName ?? "there"},</p>
      <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">
        Unfortunately, we could not confirm your booking request at this time.
      </p>

      ${buildInfoCard(booking, bookingId)}

      <div style="margin-top:18px;padding:16px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;">
        <div style="font-weight:800;color:#9a3412;">Next step</div>
        <div style="margin-top:6px;font-size:14px;line-height:22px;color:#7c2d12;">
          Please try another slot or contact Golf Bar for assistance.
        </div>
      </div>

      <p style="margin:20px 0 0 0;font-size:15px;line-height:24px;">
        Kind regards,<br /><strong>Golf Bar</strong>
      </p>
    `
  );
}

function buildReminderEmailHtml(booking: BookingDoc, bookingId: string) {
  return emailShell(
    "Reminder: Your Golf Bar session starts soon",
    `
      <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">Hi ${booking.customerName ?? "there"},</p>
      <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">
        This is a reminder that your Golf Bar session is coming up soon.
      </p>

      ${buildInfoCard(booking, bookingId)}

      <div style="margin-top:18px;padding:16px;border-radius:14px;background:#eef8f0;border:1px solid #d7eadb;">
        <div style="font-weight:800;color:#0f5132;">Reminder</div>
        <div style="margin-top:6px;font-size:14px;line-height:22px;color:#274c3b;">
          Please arrive 10 minutes before your session.
        </div>
      </div>

      <p style="margin:20px 0 0 0;font-size:15px;line-height:24px;">
        See you soon,<br /><strong>Golf Bar</strong>
      </p>
    `
  );
}

function parseBookingStart(bookingDate?: string, startTime?: string): Date | null {
  if (!bookingDate || !startTime) return null;

  const [year, month, day] = bookingDate.split("-").map(Number);
  const [hour, minute] = startTime.split(":").map(Number);

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function getResendErrorMessage(result: any): string | null {
  if (!result?.error) return null;
  if (typeof result.error === "string") return result.error;
  return result.error.message ?? JSON.stringify(result.error);
}

function getResendMessageId(result: any): string | null {
  return result?.data?.id ?? result?.id ?? null;
}

export const sendBookingEmail = onDocumentUpdated(
  {
    document: "bookings/{bookingId}",
    region: "us-central1",
    
  },
  async (event) => {
    const before = event.data?.before.data() as BookingDoc | undefined;
    const after = event.data?.after.data() as BookingDoc | undefined;
    const bookingId = event.params.bookingId;

    logger.info("sendBookingEmail triggered", {
      bookingId,
      beforeNotificationStatus: before?.notificationStatus ?? null,
      afterNotificationStatus: after?.notificationStatus ?? null,
      notificationType: after?.notificationType ?? null,
      customerEmail: after?.customerEmail ?? null,
      bookingRef: after?.bookingRef ?? null,
    });

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
      ? `Golf Bar booking confirmed • ${getDisplayBookingRef(after, bookingId)}`
      : `Golf Bar booking update • ${getDisplayBookingRef(after, bookingId)}`;

    const html = isApproval
      ? buildApprovalEmailHtml(after, bookingId)
      : buildRejectionEmailHtml(after, bookingId);

    try {
      const resend = new Resend(RESEND_API_KEY);
      const fromEmail = VERIFIED_FROM_EMAIL;

      const result = await resend.emails.send({
        from: fromEmail,
        to: [after.customerEmail],
        subject,
        html,
      });

      logger.info("Resend booking result", { bookingId, result });

      const resendError = getResendErrorMessage(result);
      const resendMessageId = getResendMessageId(result);

      if (resendError || !resendMessageId) {
        await db.collection("bookings").doc(bookingId).update({
          notificationStatus: "FAILED",
          notificationError: resendError ?? "Resend did not return a message id",
          resendMessageId: null,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      await db.collection("bookings").doc(bookingId).update({
        notificationStatus: "SENT",
        customerNotifiedAt: FieldValue.serverTimestamp(),
        notificationError: null,
        resendMessageId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error: any) {
      logger.error("Booking email send threw", {
        bookingId,
        errorMessage: error?.message ?? "Unknown email error",
      });

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
    
  },
  async () => {
    const now = new Date();
    const lowerBound = new Date(now.getTime() + 60 * 60 * 1000);
    const upperBound = new Date(now.getTime() + 75 * 60 * 1000);

    const snap = await db.collection("bookings").where("status", "==", "CONFIRMED").get();

    const resend = new Resend(RESEND_API_KEY);
    const fromEmail = VERIFIED_FROM_EMAIL;

    for (const doc of snap.docs) {
      const booking = doc.data() as BookingDoc;
      const bookingId = doc.id;

      if (booking.reminderStatus === "SENT") continue;

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
          from: fromEmail,
          to: [booking.customerEmail],
          subject: `Reminder • Golf Bar booking ${getDisplayBookingRef(booking, bookingId)}`,
          html: buildReminderEmailHtml(booking, bookingId),
        });

        logger.info("Resend reminder result", { bookingId, result });

        const resendError = getResendErrorMessage(result);
        const resendMessageId = getResendMessageId(result);

        if (resendError || !resendMessageId) {
          await doc.ref.update({
            reminderStatus: "FAILED",
            reminderError: resendError ?? "Resend did not return a reminder message id",
            reminderMessageId: null,
            updatedAt: FieldValue.serverTimestamp(),
          });
          continue;
        }

        await doc.ref.update({
          reminderStatus: "SENT",
          reminderSentAt: FieldValue.serverTimestamp(),
          reminderError: null,
          reminderMessageId: resendMessageId,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (error: any) {
        logger.error("Reminder email send threw", {
          bookingId,
          errorMessage: error?.message ?? "Unknown reminder email error",
        });

        await doc.ref.update({
          reminderStatus: "FAILED",
          reminderError: error?.message ?? "Unknown reminder email error",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }
);