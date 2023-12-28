import type { PlatformMulterFile } from "@tsed/common";
import { BadRequest } from "@tsed/exceptions";
import { ExtendedBadRequest } from "~/exceptions/extended-bad-request";

export function parseImportFile(file: PlatformMulterFile | undefined) {
  if (!file) {
    throw new ExtendedBadRequest({ file: "No file provided." });
  }

  if (file.mimetype !== "application/json") {
    throw new BadRequest("invalidImageType");
  }

  const rawBody = file.buffer.toString("utf8").trim();
  let body;

  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new BadRequest("couldNotParseBody");
  }

  if (!body) {
    throw new BadRequest("EmptyBody");
  }

  return body;
}
