import "dotenv/config";

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Invalid PORT configuration.");
}

export const env = {
  port,
} as const;