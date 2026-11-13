import { generateKeyPairSync, sign } from "node:crypto";
import { it, expect, vi } from "vitest";
import { NearAI, UnreadablePapers } from "./near-ai";
import { sha256 } from "./storage";
import { samplePng, samplePdf, testEnv } from "../test/support";

const extraction = {
  readable: true,
  registrationCompany: "SAMPLE Freight",
  registrationNumber: "1234567890123",
  bankCompany: "SAMPLE Freight",
  currency: "USD",
  monthlyOutgoing: ["2026-08", "2026-09", "2026-10"].map((month) => ({
    month,
    amount: "12000.00",
  })),
  reasons: [],
};
function setup(tamper = false, gatewayOnly = false, model = "sample-private-model") {
  const env = testEnv();
  const key = generateKeyPairSync("ed25519");
  const publicKey = key.publicKey
    .export({ type: "spki", format: "der" })
    .subarray(-32)
    .toString("hex");
  env.NEAR_AI_MODEL = model;
  env.NEAR_AI_API_KEY = "sample-test-key";
  env.NEAR_AI_TRUSTED_SIGNERS_JSON = JSON.stringify([
    {
      model: env.NEAR_AI_MODEL,
      publicKey,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    },
  ]);
  let requestBody = "";
  let responseBody = "";
  const request = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/models"))
      return Response.json({
        data: [
          {
            id: env.NEAR_AI_MODEL,
            input_modalities: ["text", "image"],
            supported_features: ["structured_outputs"],
          },
        ],
      });
    if (url.pathname.endsWith("/attestation/report"))
      return Response.json({
        model_attestations: [
          {
            signing_address: publicKey,
            signing_algo: "ed25519",
            request_nonce: url.searchParams.get("nonce"),
            intel_quote: "sample-evidence-reference",
          },
        ],
      });
    if (url.pathname.endsWith("/chat/completions")) {
      requestBody = String(init!.body);
      responseBody = JSON.stringify({
        id: "sample-chat",
        choices: [{ message: { content: JSON.stringify(extraction) } }],
      });
      return new Response(responseBody);
    }
    const text = `${env.NEAR_AI_MODEL}:${sha256(requestBody)}:${sha256(responseBody)}`;
    const signature = sign(null, Buffer.from(text), key.privateKey);
    if (tamper) signature[0] = signature[0]! ^ 1;
    return Response.json({
      text,
      signature: signature.toString("hex"),
      signing_address: publicKey,
      signing_algo: "ed25519",
      signature_kind: gatewayOnly ? "gateway" : "provider_tee",
    });
  });
  const reader = new NearAI(env, request);
  return { env, request, reader };
}
const pngDocument = () => [
  { kind: "registration", mime: "image/png", bytes: samplePng, sha256: sha256(samplePng) },
];

function searchablePdf(text: string) {
  const stream = `BT /F1 10 Tf 10 100 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const [i, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map((v) => `${String(v).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf));
}

it("extracts actual searchable PDF text before sending it to the verified model", async () => {
  const { reader, request } = setup();
  const text =
    "SAMPLE registration paper for SAMPLE Freight with registration number 1234567890123.";
  const bytes = searchablePdf(text);
  const result = await reader.check([
    { kind: "registration", mime: "application/pdf", bytes, sha256: sha256(bytes) },
  ]);
  expect(result.papers.readable).toBe(true);
  const body = request.mock.calls.find(([url]) => String(url).endsWith("/chat/completions"))![1]!
    .body;
  expect(String(body)).toContain(text);
});
it("verifies a real Ed25519 signature over the exact request/response hashes", async () => {
  const { reader, request } = setup();
  const result = await reader.check(pngDocument());
  expect(result.papers.registrationNumber).toBe(extraction.registrationNumber);
  expect(result.proof.verification).toBe("pinned_model_signer");
  expect(result.proof.requestHash).toHaveLength(64);
  expect(
    request.mock.calls.find(([url]) => String(url).includes("/chat/completions"))![1]!.headers,
  ).toMatchObject({ "x-no-aliasing": "true", "Accept-Encoding": "identity" });
});
it("rejects a changed signature and gateway-only evidence", async () => {
  await expect(setup(true).reader.check(pngDocument())).rejects.toMatchObject({
    code: "E_AI_PROOF",
  });
  await expect(setup(false, true).reader.check(pngDocument())).rejects.toMatchObject({
    code: "E_AI_PROOF",
  });
});
it("requires an independently configured unexpired signer before sending documents", async () => {
  const { env, request, reader } = setup();
  env.NEAR_AI_TRUSTED_SIGNERS_JSON = "[]";
  await expect(reader.check(pngDocument())).rejects.toMatchObject({ code: "E_AI_TRUST" });
  expect(request).not.toHaveBeenCalled();
});
it("rejects changed file bytes and unreadable PDF input without inventing extracted facts", async () => {
  const { reader, request } = setup();
  await expect(
    reader.check([{ ...pngDocument()[0]!, sha256: "0".repeat(64) }]),
  ).rejects.toBeInstanceOf(UnreadablePapers);
  await expect(
    reader.check([
      {
        kind: "registration",
        mime: "application/pdf",
        bytes: samplePdf,
        sha256: sha256(samplePdf),
      },
    ]),
  ).rejects.toBeInstanceOf(UnreadablePapers);
  expect(request).not.toHaveBeenCalled();
});
const chatBody = (request: ReturnType<typeof setup>["request"]) =>
  JSON.parse(
    String(request.mock.calls.find(([url]) => String(url).endsWith("/chat/completions"))![1]!.body),
  ) as Record<string, unknown> & { messages: Array<{ role: string; content: unknown }> };
it("turns thinking off for Qwen models through the chat template", async () => {
  const { reader, request } = setup(false, false, "Qwen/Qwen3.8-27B");
  await reader.check(pngDocument());
  const body = chatBody(request);
  expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
  expect(body).not.toHaveProperty("reasoning_effort");
});
it("asks other models for low reasoning effort instead", async () => {
  const { reader, request } = setup(false, false, "z-ai/glm-5.3-flash");
  await reader.check(pngDocument());
  const body = chatBody(request);
  expect(body.reasoning_effort).toBe("low");
  expect(body).not.toHaveProperty("chat_template_kwargs");
});
it("asks for the bank account holder, not the bank, and waits up to two minutes", async () => {
  const timeout = vi.spyOn(AbortSignal, "timeout");
  try {
    const { reader, request } = setup();
    await reader.check(pngDocument());
    const system = chatBody(request).messages.find((m) => m.role === "system")!.content;
    expect(system).toContain(
      "bankCompany (the account holder name printed on the bank statement, not the name of the bank)",
    );
    expect(timeout).toHaveBeenCalledWith(120000);
    expect(timeout).not.toHaveBeenCalledWith(45000);
  } finally {
    timeout.mockRestore();
  }
});
