import { describe, it, expect } from "vitest";
import request from "supertest";
import { Router } from "express";
import { z } from "zod";
import { SignJWT } from "jose";
import { createApp } from "./app";
import { testDeps, profile } from "./test/support";
import { authenticate, roles } from "./middlewares/auth";
import { parse } from "./middlewares/validate";
import { readEnv } from "./config/env";
import { Sessions } from "./lib/session";
import { limiter } from "./middlewares/rate-limit";

describe("API foundation", () => {
  it("limits repeated requests", async () => {
    const routes = Router().get("/limited", limiter(2), (_req, res) => {
      res.json({ ok: true });
    });
    const app = createApp(testDeps(), routes);
    expect((await request(app).get("/v1/limited")).status).toBe(200);
    expect((await request(app).get("/v1/limited")).status).toBe(200);
    expect((await request(app).get("/v1/limited")).status).toBe(429);
  });
  it("serves health without configuration and never leaks exceptions", async () => {
    const deps = testDeps();
    const routes = Router().get("/explode", () => {
      throw new Error("private database password");
    });
    const app = createApp(deps, routes);
    expect((await request(app).get("/health")).body).toEqual({ status: "ok" });
    expect((await request(app).get("/v1/explode")).body).toEqual({
      error: { code: "E_INTERNAL", message: "Something went wrong. Please try again." },
    });
    expect((await request(app).get("/missing")).status).toBe(404);
    expect((await request(app).get("/health").set("Origin", "https://other.example")).status).toBe(
      403,
    );
  });
  it("authenticates only current versions of signed sessions and enforces roles", async () => {
    const deps = testDeps();
    const p = profile();
    await deps.store.insert("profiles", p.accountId, p);
    const { token } = await deps.sessions.issue(p);
    const routes = Router().get(
      "/staff",
      authenticate(deps.sessions, deps.store),
      roles("admin"),
      (_req, res) => {
        res.json({ ok: true });
      },
    );
    const app = createApp(deps, routes);
    expect((await request(app).get("/v1/me")).status).toBe(401);
    expect((await request(app).get("/v1/me").auth(token, { type: "bearer" })).body.accountId).toBe(
      p.accountId,
    );
    expect((await request(app).get("/v1/staff").auth(token, { type: "bearer" })).status).toBe(403);
    expect(
      (
        await request(app)
          .get("/v1/me")
          .auth(token + "bad", { type: "bearer" })
      ).status,
    ).toBe(401);
    await deps.store.replace("profiles", p.accountId, 0, { ...p, sessionVersion: 1 });
    expect((await request(app).get("/v1/me").auth(token, { type: "bearer" })).status).toBe(401);
  });
  it("rejects expired JWTs and a missing signing configuration", async () => {
    const deps = testDeps();
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("a.testnet")
      .setExpirationTime(1)
      .sign(new TextEncoder().encode(String(deps.env.JWT_SECRET)));
    await expect(deps.sessions.verify(token)).rejects.toMatchObject({ code: "E_SESSION" });
    const app = createApp({ ...deps, sessions: new Sessions(readEnv({})) });
    expect((await request(app).get("/v1/me").auth("token", { type: "bearer" })).status).toBe(503);
  });
  it("validates input, malformed JSON and configuration", async () => {
    const routes = Router().post("/input", (req, res) => {
      res.json(parse(z.object({ n: z.number() }).strict(), req.body));
    });
    const app = createApp(testDeps(), routes);
    expect((await request(app).post("/v1/input").send({ n: "bad" })).status).toBe(400);
    expect(
      (await request(app).post("/v1/input").set("Content-Type", "application/json").send("{"))
        .status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/v1/input")
          .send({ n: "x".repeat(70000) })
      ).status,
    ).toBe(413);
    expect(() => readEnv({ JWT_SECRET: "short" })).toThrow();
    expect(() => readEnv({ SUPABASE_URL: "https://example.com" })).toThrow();
    expect(readEnv({ PORT: "" }).PORT).toBe(4000);
  });
});
