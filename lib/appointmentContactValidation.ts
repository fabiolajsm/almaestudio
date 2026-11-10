export type AppointmentContact = {
  name: string;
  email: string;
  phone: string;
};

export type AppointmentContactErrors = Partial<
  Record<keyof AppointmentContact, string>
>;

function isValidEmail(email: string) {
  const [localPart, domain, ...extraParts] = email.split("@");
  if (
    !localPart ||
    !domain ||
    extraParts.length > 0 ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !/^[\p{L}\p{N}!#$%&'*+/=?^_`{|}~.-]+$/u.test(localPart) ||
    /\s/.test(email)
  ) {
    return false;
  }

  const labels = domain.split(".");
  return (
    domain.length <= 253 &&
    labels.length > 1 &&
    labels.every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        /^[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?$/u.test(label),
    ) &&
    /^\p{L}{2,}$/u.test(labels[labels.length - 1])
  );
}

export function validateAppointmentContactFields(
  value: Record<string, unknown>,
) {
  const data: AppointmentContact = {
    name:
      typeof value.name === "string"
        ? value.name.trim().replace(/\s+/g, " ")
        : "",
    email: typeof value.email === "string" ? value.email.trim() : "",
    phone: typeof value.phone === "string" ? value.phone.trim() : "",
  };
  const errors: AppointmentContactErrors = {};

  if (
    data.name.length < 2 ||
    data.name.length > 100 ||
    data.name.split(" ").length < 2 ||
    !/^\p{L}+(?:[ '.\u2019-]\p{L}+)*$/u.test(data.name)
  ) {
    errors.name =
      "Ingresá nombre y apellido válidos. Podés usar tildes, puntos, guiones y apóstrofes.";
  }

  if (data.email.length > 254 || !isValidEmail(data.email)) {
    errors.email = "Ingresá un email válido, por ejemplo nombre@email.com.";
  }

  const phoneDigits = data.phone.replace(/\D/g, "");
  if (
    !/^\+?[0-9\s().-]+$/.test(data.phone) ||
    phoneDigits.length < 8 ||
    phoneDigits.length > 15
  ) {
    errors.phone =
      "Ingresá un teléfono válido con código de área (entre 8 y 15 números).";
  }

  return { data, errors };
}
