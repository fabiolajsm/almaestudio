import { TaloClient, type TaloEnvironment } from "talo-pay";

export class TaloConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaloConfigurationError";
  }
}

let client: TaloClient | null = null;

export function getTaloConfig() {
  const clientId = process.env.TALO_CLIENT_ID?.trim();
  const clientSecret = process.env.TALO_CLIENT_SECRET?.trim();
  const userId = process.env.TALO_USER_ID?.trim();
  const webhookUrl = process.env.TALO_WEBHOOK_URL?.trim();
  const configuredEnvironment = process.env.TALO_ENVIRONMENT?.trim() || "sandbox";

  if (!clientId || !clientSecret || !userId || !webhookUrl) {
    throw new TaloConfigurationError(
      "Faltan TALO_CLIENT_ID, TALO_CLIENT_SECRET, TALO_USER_ID o TALO_WEBHOOK_URL.",
    );
  }

  if (
    configuredEnvironment !== "sandbox" &&
    configuredEnvironment !== "production"
  ) {
    throw new TaloConfigurationError(
      "TALO_ENVIRONMENT debe ser sandbox o production.",
    );
  }

  let parsedWebhookUrl: URL;
  try {
    parsedWebhookUrl = new URL(webhookUrl);
  } catch {
    throw new TaloConfigurationError("TALO_WEBHOOK_URL no es una URL válida.");
  }

  if (
    parsedWebhookUrl.protocol !== "https:" &&
    parsedWebhookUrl.hostname !== "localhost"
  ) {
    throw new TaloConfigurationError(
      "TALO_WEBHOOK_URL debe usar HTTPS.",
    );
  }

  const environment: TaloEnvironment =
    configuredEnvironment === "production" ? "production" : "sandbox";

  return {
    clientId,
    clientSecret,
    userId,
    webhookUrl,
    environment,
  };
}

export function getTaloClient() {
  const config = getTaloConfig();
  client ??= new TaloClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    userId: config.userId,
    environment: config.environment,
  });
  return client;
}
