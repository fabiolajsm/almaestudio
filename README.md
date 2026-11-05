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

El flujo de creación de turnos usa Supabase para retener horarios y guardar solicitudes:

1. En un proyecto Supabase, ejecutá el SQL de `supabase/migrations/20261026090000_appointment_holds.sql`.
2. Ejecutá también `supabase/migrations/20261102120000_business_hours_and_buffer.sql`, `supabase/migrations/20261102130000_sequential_appointments_until_2200.sql` y `supabase/migrations/20261104180000_appointment_requests_without_proofs.sql`, en ese orden, para aplicar el horario de lunes a sábado, de 9 a 22, calcular el siguiente turno según la duración de los servicios y guardar solicitudes sin comprobantes.
3. Copiá `.env.example` a `.env.local` y completá la URL y la clave `service_role` del proyecto. Esa clave es solo de servidor: no la uses en variables `NEXT_PUBLIC_*`.
4. Configurá `ADMIN_PASSWORD` con una contraseña fuerte y `ADMIN_SESSION_SECRET` con al menos 32 bytes aleatorios. Podés generar el secreto con `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Son variables solo de servidor: no las subas al repositorio ni uses variables `NEXT_PUBLIC_*`.
5. Reiniciá la aplicación después de cambiar las variables.

Al pasar del paso de horario a los datos, la base retiene el turno durante 15 minutos. Al enviar los datos de contacto, la solicitud queda pendiente de confirmación por 24 horas; después de ese plazo, otro intento de reserva libera la retención vencida.

El panel privado está en `/admin`. Permite confirmar las solicitudes o cancelar reservas pendientes y confirmadas. La sesión de administración dura 8 horas y usa una cookie `HttpOnly`.

## Conectar Google Calendar

La disponibilidad consulta únicamente los bloques libre/ocupado de `almaestudio.arg@gmail.com`; no lee títulos ni detalles de eventos. Los horarios ocupados y las reservas retenidas en la aplicación se ocultan en el selector y se vuelven a verificar antes de retener un turno. Se conserva un margen de 15 minutos entre eventos y turnos.

1. En Google Cloud, habilitá la Google Calendar API y creá una cuenta de servicio con una clave JSON.
2. Desde la configuración de Google Calendar de `almaestudio.arg@gmail.com`, compartí la agenda con el correo de la cuenta de servicio y asignale el permiso **Ver solo libre/ocupado**.
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
