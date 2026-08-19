export const PermissionLevel = {
  READ: "read",
  PREPARE: "prepare",
  EXECUTE: "execute",
} as const;

export type PermissionLevel =
  (typeof PermissionLevel)[keyof typeof PermissionLevel];