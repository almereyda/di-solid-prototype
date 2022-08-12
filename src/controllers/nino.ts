import {
  getSessionFromStorage,
  Session,
} from "@inrupt/solid-client-authn-node";
import { Request, Response } from "express";
import { getHostname } from "../config";
import SessionError from "../errors";
import { getDatasetUri, writeCheckToPod } from "../lib/pod";
import buildNiNumberArtifacts from "../lib/nationalInsurance";


async function fakeOIDCLogin(): Promise<Session> {
  const session = new Session();
  return session
    .login({
      // 2. Use the authenticated credentials to log in the session.
      clientId: "cd68b569-0b92-42dd-9993-879909502979",
      clientSecret: "7bd94621-21bf-4703-b9a2-5691d886854d",
      oidcIssuer: "https://openid.ess.solid.integration.account.gov.uk/",
    })
    .then(() => session);
}
export function startGet(req: Request, res: Response): void {
  if (req.session) {
    const returnUri = req.params.returnUri
      ? req.params.returnUri
      : getHostname();

    req.session.ninoReturnUri = returnUri;
  }
  res.redirect("/nino/enter-your-number");
}

export function enterNinoGet(req: Request, res: Response): void {
  res.render("nino/enter-your-number");
}

export function enterNinoPost(req: Request, res: Response): void {
  if (req.session) {
    req.session.nino = req.body["ni-number"];
  }
  res.redirect("/nino/weve-verified-your-number");
}

export function verifiedNinoGet(req: Request, res: Response): void {
  res.render("nino/weve-verified-your-number");
}

export async function verifiedNinoPost(
  req: Request,
  res: Response
): Promise<void> {
  const session = await getSessionFromStorage(req.session?.sessionId);

  if (session && req.session) {
    req.session.webId = session.info.webId;
    const containerUri = await getDatasetUri(
      session,
      "private/govuk/identity/poc/credentials/vcs"
    );

    const niNumberArtifacts = buildNiNumberArtifacts(req.session, containerUri);
    await writeCheckToPod(session, niNumberArtifacts);

    res.redirect("/nino/youve-saved-your-number");
  } else {
    throw new SessionError();
  }
}

export function savedNinoGet(req: Request, res: Response): void {
  res.render("nino/youve-saved-your-number");
}

export function continueGet(req: Request, res: Response): void {
  if (req.session) {
    res.redirect(req.session.ninoReturnUri);
  } else {
    res.redirect("/");
  }
}
