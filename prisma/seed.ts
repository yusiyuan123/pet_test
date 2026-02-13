import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  for (let index = 0; index < 10; index += 1) {
    const number = index + 1;
    const email = `user${number}@example.com`;
    const displayName = `User ${number}`;

    await prisma.user.upsert({
      where: { email },
      update: { displayName },
      create: { email, displayName }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
