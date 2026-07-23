import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const querySource = readFileSync(join(process.cwd(), "lib/orders/queries.ts"), "utf8");
const pageSource = readFileSync(join(process.cwd(), "app/(shop)/commande/[number]/page.tsx"), "utf8");

describe("confirmation de commande publique", () => {
  it("valide le numéro avant la requête et limite la sélection aux snapshots publics", () => {
    expect(querySource).toContain("/^BOT-[A-Z0-9]{10}$/");
    expect(querySource).toContain("if (!ORDER_NUMBER.test(number)) return null");
    expect(querySource).not.toMatch(/customerFirstName|customerLastName|customerPhone|customerAddress/);
    expect(querySource).not.toMatch(/variant:\s*true|product:\s*true/);
  });

  it("empêche l’indexation et la fuite du référent de la page bearer", () => {
    expect(pageSource).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
    expect(pageSource).toMatch(/referrer:\s*"no-referrer"/);
  });
});
