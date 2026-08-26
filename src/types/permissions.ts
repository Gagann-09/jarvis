export const PermissionLevel = {
  READ: "read",
  PREPARE: "prepare",
  EXECUTE: "execute",
} as const;

export type PermissionLevel =
  (typeof PermissionLevel)[keyof typeof PermissionLevel];

const permissionRank: Record<PermissionLevel, number> = {
  read: 0,
  prepare: 1,
  execute: 2,
};

export const hasPermission = (
  contextPermission: PermissionLevel,
  requiredPermission: PermissionLevel,
): boolean =>
  permissionRank[contextPermission] >=
  permissionRank[requiredPermission];