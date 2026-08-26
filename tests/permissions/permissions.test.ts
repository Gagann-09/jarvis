import { describe, expect, it } from "vitest";
import {
  hasPermission,
  PermissionLevel,
} from "../../src/types/permissions.js";

describe("Permission contract", () => {
  it("allows read context to use read tools", () => {
    expect(
      hasPermission(
        PermissionLevel.READ,
        PermissionLevel.READ,
      ),
    ).toBe(true);
  });

  it("allows prepare context to use read tools", () => {
    expect(
      hasPermission(
        PermissionLevel.PREPARE,
        PermissionLevel.READ,
      ),
    ).toBe(true);
  });

  it("allows execute context to use read tools", () => {
    expect(
      hasPermission(
        PermissionLevel.EXECUTE,
        PermissionLevel.READ,
      ),
    ).toBe(true);
  });

  it("allows execute context to use prepare tools", () => {
    expect(
      hasPermission(
        PermissionLevel.EXECUTE,
        PermissionLevel.PREPARE,
      ),
    ).toBe(true);
  });

  it("denies read context from prepare tools", () => {
    expect(
      hasPermission(
        PermissionLevel.READ,
        PermissionLevel.PREPARE,
      ),
    ).toBe(false);
  });

  it("denies read context from execute tools", () => {
    expect(
      hasPermission(
        PermissionLevel.READ,
        PermissionLevel.EXECUTE,
      ),
    ).toBe(false);
  });

  it("denies prepare context from execute tools", () => {
    expect(
      hasPermission(
        PermissionLevel.PREPARE,
        PermissionLevel.EXECUTE,
      ),
    ).toBe(false);
  });
});
