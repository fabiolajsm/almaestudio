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

El flujo de creación de turnos usa Supabase para retener horarios y guardar comprobantes de forma privada:

1. En un proyecto Supabase, ejecutá el SQL de `supabase/migrations/20261026090000_appointment_holds.sql`.
2. Ejecutá también `supabase/migrations/20261102120000_business_hours_and_buffer.sql` y `supabase/migrations/20261102130000_sequential_appointments_until_2200.sql` para aplicar el horario de lunes a sábado, de 9 a 22, calculando el siguiente turno según la duración de los servicios y dejando 15 minutos entre clientas.
3. Copiá `.env.example` a `.env.local` y completá la URL y la clave `service_role` del proyecto. Esa clave es solo de servidor: no la uses en variables `NEXT_PUBLIC_*`.
4. Configurá titular y alias o CVU de la cuenta que recibe la seña. Sin esos datos el flujo no permite reservar.
5. Configurá `ADMIN_PASSWORD` con una contraseña fuerte y `ADMIN_SESSION_SECRET` con al menos 32 bytes aleatorios. Podés generar el secreto con `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Son variables solo de servidor: no las subas al repositorio ni uses variables `NEXT_PUBLIC_*`.
6. Reiniciá la aplicación después de cambiar las variables.

Al pasar del paso de horario a los datos, la base retiene el turno durante 15 minutos. Al subir el comprobante, queda pendiente de verificación por 24 horas; después de ese plazo, otro intento de reserva libera la retención vencida. El bucket de comprobantes es privado y acepta imágenes JPG, PNG y WEBP de hasta 5 MB.

El panel privado está en `/admin`. Permite revisar comprobantes con enlaces temporales, confirmar pagos o cancelar reservas pendientes y confirmadas. La sesión de administración dura 8 horas y usa una cookie `HttpOnly`.

## Conectar Google Calendar

La disponibilidad consulta únicamente los bloques libre/ocupado de `almaestudio.arg@gmail.com`; no lee títulos ni detalles de eventos. Los horarios ocupados y las reservas retenidas en la aplicación se ocultan en el selector y se vuelven a verificar antes de retener un turno. Se conserva un margen de 15 minutos entre eventos y turnos.

1. En Google Cloud, habilitá la Google Calendar API y creá una cuenta de servicio con una clave JSON.
2. Desde la configuración de Google Calendar de `almaestudio.arg@gmail.com`, compartí la agenda con el correo de la cuenta de servicio y asignale el permiso **Ver solo libre/ocupado**.
3. En las variables de entorno del servidor, configurá `GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL` con ese correo y `GOOGLE_CALENDAR_PRIVATE_KEY` con el campo `private_key` de la clave JSON. No subas la clave al repositorio ni uses variables `NEXT_PUBLIC_*`.
4. Reiniciá la aplicación después de configurar las variables. Si la agenda no está accesible, el selector informa el error y no permite completar una reserva sin verificar disponibilidad.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
