import "dotenv/config";
import { z } from "zod";

export const configSchema = z.object({
  BASE_URL: z.string().default("https://mcp.tp.xyz")
});

export const config = configSchema.parse(process.env);
