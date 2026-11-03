import { createSign } from "node:crypto";
import {
  appointmentClosingTime,
  appointmentBufferMinutes,
  appointmentOpeningTime,
  isAppointmentTimeWithinBusinessHours,
  isAppointmentWorkingDay,
} from "@/app/Appoinments/appointmentCatalog";
import { getArgentinaDateKey } from "@/app/Appoinments/appointmentDates";
import { callSupabaseRpc } from "@/lib/supabaseAdmin";

const calendarId = "almaestudio.arg@gmail.com";
const timeZone = "America/Argentina/Buenos_Aires";
const slotBufferMilliseconds = appointmentBufferMinutes * 60 * 1000;
const tokenUrl = "https://oauth2.googleapis.com/token";
const freeBusyUrl = "https://www.googleapis.com/calendar/v3/freeBusy";

type BusyInterval = {
  start: number;
  end: number;
};

type BusyReservation = {
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
};

type GoogleCalendarCredentials = {
  serviceAccountEmail: string;
  privateKey: string;
};

export class GoogleCalendarIntegrationError extends Error {
  constructor(
    message: string,
    public readonly code: "not_configured" | "unavailable",
  ) {
    super(message);
    this.name = "GoogleCalendarIntegrationError";
  }
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

function getCredentials(): GoogleCalendarCredentials {
  const serviceAccountEmail =
    process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.trim();

  if (!serviceAccountEmail || !privateKey) {
    throw new GoogleCalendarIntegrationError(
      "Google Calendar no está configurado.",
      "not_configured",
    );
  }

  return {
    serviceAccountEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  };
}

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  const { serviceAccountEmail, privateKey } = getCredentials();
  const issuedAt = Math.floor(Date.now() / 1000);
  const unsignedToken = [
    encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    encodeBase64Url(
      JSON.stringify({
        iss: serviceAccountEmail,
        scope: "https://www.googleapis.com/auth/calendar.freebusy",
        aud: tokenUrl,
        iat: issuedAt,
        exp: issuedAt + 3600,
      }),
    ),
  ].join(".");
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${encodeBase64Url(signer.sign(privateKey))}`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new GoogleCalendarIntegrationError(
      "Google no pudo autorizar la consulta de disponibilidad.",
      "unavailable",
    );
  }

  const result = (await response.json()) as {
    access_token?: unknown;
    expires_in?: unknown;
  };

  if (
    typeof result.access_token !== "string" ||
    typeof result.expires_in !== "number"
  ) {
    throw new GoogleCalendarIntegrationError(
      "Google devolvió una autorización incompleta.",
      "unavailable",
    );
  }

  cachedAccessToken = result.access_token;
  tokenExpiresAt = Date.now() + result.expires_in * 1000;
  return cachedAccessToken;
}

async function getCalendarBusyIntervals(start: Date, end: Date) {
  const accessToken = await getAccessToken();
  const response = await fetch(freeBusyUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      timeZone,
      items: [{ id: calendarId }],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new GoogleCalendarIntegrationError(
      "No se pudo consultar la agenda de Google Calendar.",
      "unavailable",
    );
  }

  const result = (await response.json()) as {
    calendars?: Record<
      string,
      {
        errors?: unknown[];
        busy?: Array<{ start?: unknown; end?: unknown }>;
      }
    >;
  };
  const calendar = result.calendars?.[calendarId];

  if (!calendar || calendar.errors?.length || !Array.isArray(calendar.busy)) {
    throw new GoogleCalendarIntegrationError(
      "Google Calendar no permitió consultar la disponibilidad de la agenda.",
      "unavailable",
    );
  }

  return calendar.busy.map(({ start: busyStart, end: busyEnd }) => {
    const startTime =
      typeof busyStart === "string" ? Date.parse(busyStart) : Number.NaN;
    const endTime = typeof busyEnd === "string" ? Date.parse(busyEnd) : Number.NaN;

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
      throw new GoogleCalendarIntegrationError(
        "Google Calendar devolvió un horario inválido.",
        "unavailable",
      );
    }

    return { start: startTime, end: endTime };
  });
}

async function getReservationBusyIntervals(
  startDate: string,
  endDate: string,
) {
  const reservations = await callSupabaseRpc<BusyReservation[]>(
    "get_active_appointment_busy_intervals",
    {
      p_start_date: startDate,
      p_end_date: endDate,
    },
  );

  return reservations.map(
    ({ appointment_date, start_time, duration_minutes }) => {
      const start = Date.parse(
        `${appointment_date}T${start_time.slice(0, 8)}-03:00`,
      );
      const end = start + duration_minutes * 60 * 1000;

      if (!Number.isFinite(start) || !Number.isInteger(duration_minutes)) {
        throw new Error("Supabase devolvió una reserva con horario inválido.");
      }

      return { start, end };
    },
  );
}

async function getBusyIntervals(
  start: Date,
  end: Date,
  startDate: string,
  endDate: string,
) {
  const [calendarIntervals, reservationIntervals] = await Promise.all([
    getCalendarBusyIntervals(start, end),
    getReservationBusyIntervals(startDate, endDate),
  ]);

  return [...calendarIntervals, ...reservationIntervals];
}

function getLocalDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00-03:00`);
}

function getNextDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));

  return [
    nextDate.getUTCFullYear(),
    String(nextDate.getUTCMonth() + 1).padStart(2, "0"),
    String(nextDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function getTimeKey(timestamp: number) {
  const date = new Date(timestamp);
  const argentinaTime = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);

  return argentinaTime;
}

function getNextSequentialAppointmentTime(
  dateKey: string,
  durationMinutes: number,
  busyIntervals: BusyInterval[],
) {
  const openingTime = getLocalDateTime(
    dateKey,
    `${String(Math.floor(appointmentOpeningTime / 60)).padStart(2, "0")}:${String(appointmentOpeningTime % 60).padStart(2, "0")}`,
  ).getTime();
  const closingTime = getLocalDateTime(
    dateKey,
    `${String(Math.floor(appointmentClosingTime / 60)).padStart(2, "0")}:${String(appointmentClosingTime % 60).padStart(2, "0")}`,
  ).getTime();
  const now = Date.now();
  const earliestStart =
    dateKey === getArgentinaDateKey(new Date()) && now > openingTime
      ? openingTime +
        Math.ceil((now - openingTime) / slotBufferMilliseconds) *
          slotBufferMilliseconds
      : openingTime;

  for (
    let appointmentStart = earliestStart;
    appointmentStart + durationMinutes * 60 * 1000 <= closingTime;
  ) {
    const appointmentEnd =
      appointmentStart + durationMinutes * 60 * 1000;
    const conflict = busyIntervals.find(
      (busy) =>
        appointmentStart < busy.end + slotBufferMilliseconds &&
        appointmentEnd > busy.start - slotBufferMilliseconds,
    );

    if (!conflict) {
      return getTimeKey(appointmentStart);
    }

    appointmentStart = conflict.end + slotBufferMilliseconds;
  }

  return null;
}

export async function getAvailableTimesByDate(
  startDate: string,
  endDate: string,
  durationMinutes: number,
) {
  const start = getLocalDateTime(startDate, "00:00");
  const end = getLocalDateTime(getNextDateKey(endDate), "00:00");
  const busyIntervals = await getBusyIntervals(
    start,
    end,
    startDate,
    endDate,
  );
  const availableTimesByDate: Record<string, string[]> = {};

  for (
    let date = new Date(`${startDate}T00:00:00.000Z`);
    date <= new Date(`${endDate}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const dateKey = date.toISOString().slice(0, 10);
    const nextTime = isAppointmentWorkingDay(dateKey)
      ? getNextSequentialAppointmentTime(
          dateKey,
          durationMinutes,
          busyIntervals,
        )
      : null;
    availableTimesByDate[dateKey] = nextTime ? [nextTime] : [];
  }

  return availableTimesByDate;
}

export async function isAppointmentSlotAvailable(
  date: string,
  time: string,
  durationMinutes: number,
) {
  const appointmentStart = getLocalDateTime(date, time).getTime();
  if (
    date === getArgentinaDateKey(new Date()) &&
    appointmentStart <= Date.now()
  ) {
    return false;
  }

  if (
    !isAppointmentWorkingDay(date) ||
    !isAppointmentTimeWithinBusinessHours(time, durationMinutes)
  ) {
    return false;
  }

  const appointmentEnd = appointmentStart + durationMinutes * 60 * 1000;
  const busyIntervals = await getBusyIntervals(
    new Date(appointmentStart - slotBufferMilliseconds),
    new Date(appointmentEnd + slotBufferMilliseconds),
    date,
    date,
  );

  return (
    getNextSequentialAppointmentTime(date, durationMinutes, busyIntervals) ===
    time
  );
}
