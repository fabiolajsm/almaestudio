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

El flujo de creación guarda las reservas confirmadas en Supabase y crea el evento en Google Calendar. A cada reserva se le asigna un código numérico único y permanente para identificarla. No requieren pago.

1. En un proyecto Supabase nuevo, ejecutá `supabase/createAppoinment.sql` y `supabase/appointmentSettings.sql`. El segundo script crea `appointment_services` (una fila por servicio), `appointment_service_categories` (los nombres de las categorías) y `appointment_business_hours` (apertura, cierre y días laborables), y carga los valores iniciales.
2. Copiá `.env.example` a `.env.local` y completá la URL y la clave `service_role` del proyecto. Esa clave es solo de servidor: no la uses en variables `NEXT_PUBLIC_*`.
3. Configurá `ADMIN_PASSWORD` con una contraseña larga que solo use la administradora. Es la única clave necesaria para entrar al panel y firmar su sesión; mantenela solo en el servidor, sin usar variables `NEXT_PUBLIC_*` ni subirla al repositorio.
4. Reiniciá la aplicación después de cambiar las variables.

Si las reservas ya estaban configuradas, ejecutá `supabase/appointmentSettings.sql` en Supabase para habilitar el guardado de cambios del panel.

Si ya ejecutaste una versión anterior del script, volvé a ejecutarlo para agregar los códigos de reserva y quitar de Supabase los campos y funciones que usaba la integración de pagos. Se conservan las reservas existentes, se asignan códigos a las que no tenían y las que estaban pendientes quedan confirmadas.

El panel privado está en `/admin`. Ingresá con la contraseña definida en `ADMIN_PASSWORD` para crear, editar o eliminar servicios y renombrar categorías, además de cambiar los días y horarios de atención. La sesión dura 8 horas y usa una cookie `HttpOnly`. Los cambios se guardan en las tablas `appointment_services`, `appointment_service_categories` y `appointment_business_hours`, y se aplican al selector y a las validaciones de las reservas.

## Conectar Google Calendar

La disponibilidad consulta los bloques libre/ocupado de `almaestudio.arg@gmail.com`; no lee títulos ni detalles de eventos. Al completar una solicitud se crea un evento en esa agenda, y al cancelar un turno también se elimina el evento correspondiente. Los horarios ocupados y las reservas guardadas en la aplicación se ocultan en el selector y se vuelven a verificar antes de crear un turno. Se conserva un margen de 15 minutos entre eventos y turnos.

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
