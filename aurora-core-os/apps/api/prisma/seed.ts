import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function makeKey() {
  const raw = "ak_" + randomBytes(24).toString("hex");
  const hashed = createHash("sha256").update(raw).digest("hex");
  return { raw, hashed, prefix: raw.slice(0, 8) };
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@aurora.local" },
    update: {},
    create: { email: "demo@aurora.local" },
  });

  const inst = await prisma.installation.create({
    data: { userId: user.id, name: "Demo Habitat" },
  });

  await prisma.modeConfig.create({
    data: { installationId: inst.id, active: "habitat_optimizer" },
  });

  const k = makeKey();
  await prisma.apiKey.create({
    data: {
      userId: user.id,
      installationId: inst.id,
      hashedKey: k.hashed,
      prefix: k.prefix,
    },
  });

  await prisma.device.createMany({
    data: [
      { installationId: inst.id, kind: "turnbot", label: "TurnBot · Kitchen" },
      { installationId: inst.id, kind: "light",   label: "Living Room Lights" },
      { installationId: inst.id, kind: "hvac",    label: "Main HVAC" },
    ],
  });

  console.log("Seed complete.");
  console.log("Installation:", inst.id);
  console.log("API key (store this — shown once):", k.raw);
}

main().finally(() => prisma.$disconnect());
