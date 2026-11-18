import { z } from "zod";

export const adminEmailSchema = z
  .string()
  .trim()
  .min(1, "Informe o e-mail do administrador")
  .max(254, "O e-mail deve ter no máximo 254 caracteres")
  .email("Informe um e-mail válido")
  .refine((email) => !/\s/.test(email), "O e-mail não pode conter espaços")
  .transform((email) => email.toLowerCase());

/** Only the last administrator is prevented from removing their own access. */
export function canRevokeAdmin({
  targetUserId,
  currentUserId,
  adminCount,
}: {
  targetUserId: string;
  currentUserId: string;
  adminCount: number;
}): boolean {
  return targetUserId !== currentUserId || adminCount > 1;
}
