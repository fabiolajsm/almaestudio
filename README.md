This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Configurar reservas de turnos

El flujo de creación guarda los turnos en Supabase y los crea en Google Calendar:

1. En un proyecto Supabase nuevo, ejecutá una sola vez `supabase/createAppoinment.sql`. Crea la tabla de reservas y la función `createAppoinment`.
2. Copiá `.env.example` a `.env.local` y completá la URL y la clave `service_role` del proyecto. Esa clave es solo de servidor: no la uses en variables `NEXT_PUBLIC_*`.
3. Configurá `ADMIN_PASSWORD` con una contraseña fuerte y `ADMIN_SESSION_SECRET` con al menos 32 bytes aleatorios. Podés generar el secreto con `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Son variables solo de servidor: no las subas al repositorio ni uses variables `NEXT_PUBLIC_*`.
4. Reiniciá la aplicación después de cambiar las variables.

El turno se valida y crea en Google Calendar al enviar los datos de contacto. La solicitud permanece pendiente hasta que se confirme o cancele desde el panel de administración.

El panel privado está en `/admin`. Confirma solicitudes mediante `/api/admin/appointments` y cancela turnos mediante `/api/appointments/cancel`. La sesión de administración dura 8 horas y usa una cookie `HttpOnly`.

## Conectar Google Calendar

La disponibilidad consulta los bloques libre/ocupado de `almaestudio.arg@gmail.com`; no lee títulos ni detalles de eventos. Al completar una solicitud se crea un evento en esa agenda, y al cancelar desde el panel también se elimina el evento correspondiente. Los horarios ocupados y las reservas guardadas en la aplicación se ocultan en el selector y se vuelven a verificar antes de crear un turno. Se conserva un margen de 15 minutos entre eventos y turnos.

1. En Google Cloud, habilitá la Google Calendar API y creá una cuenta de servicio con una clave JSON.
2. Desde la configuración de Google Calendar de `almaestudio.arg@gmail.com`, compartí la agenda con el correo de la cuenta de servicio y asignale permiso para **hacer cambios en los eventos**.
3. En las variables de entorno del servidor, configurá `GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL` con ese correo y `GOOGLE_CALENDAR_PRIVATE_KEY` con el campo `private_key` de la clave JSON. No subas la clave al repositorio ni uses variables `NEXT_PUBLIC_*`.
4. Reiniciá la aplicación después de configurar las variables. Si la agenda no está accesible, el selector informa el error y no permite completar una reserva sin verificar disponibilidad.

Para probar Google Calendar localmente sin configurar Supabase, iniciá `npm run dev` y abrí `http://localhost:3000/api/appointments/calendar-test?start=AAAA-MM-DD&end=AAAA-MM-DD&duration=30`, reemplazando las fechas por una fecha futura válida. La respuesta muestra los bloques ocupados en `busyIntervals` y todos los horarios de inicio en `timeSlots`, marcados como disponibles u ocupados; esta ruta solo existe en desarrollo y no incluye reservas guardadas en la aplicación.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
