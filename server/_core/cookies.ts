import type { CookieOptions } from "express";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSecureRequest(req: any): boolean {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers?.["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList: string[] = Array.isArray(forwardedProto)
    ? forwardedProto
    : (forwardedProto as string).split(",");

  return protoList.some((proto: string) => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  return {
    domain: undefined,
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}
