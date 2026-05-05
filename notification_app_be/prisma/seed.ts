import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create sample students
  const students = await Promise.all([
    prisma.student.upsert({
      where: { email: "student1@college.edu" },
      update: {},
      create: {
        name: "Rahul Sharma",
        email: "student1@college.edu",
        rollNo: "CS2021001",
      },
    }),
    prisma.student.upsert({
      where: { email: "student2@college.edu" },
      update: {},
      create: {
        name: "Priya Patel",
        email: "student2@college.edu",
        rollNo: "CS2021002",
      },
    }),
    prisma.student.upsert({
      where: { email: "student3@college.edu" },
      update: {},
      create: {
        name: "Arjun Kumar",
        email: "student3@college.edu",
        rollNo: "CS2021003",
      },
    }),
  ]);

  console.log(`✅ Created ${students.length} students`);

  // Create sample notifications
  const notifications = await Promise.all([
    prisma.notification.create({
      data: { type: "Placement", message: "Google SWE hiring - Apply by May 15" },
    }),
    prisma.notification.create({
      data: { type: "Placement", message: "Microsoft hiring for SDET role" },
    }),
    prisma.notification.create({
      data: { type: "Result", message: "Mid-semester exam results published" },
    }),
    prisma.notification.create({
      data: { type: "Result", message: "Project review grades uploaded" },
    }),
    prisma.notification.create({
      data: { type: "Event", message: "Tech-Fest 2026 - Register by May 10" },
    }),
    prisma.notification.create({
      data: { type: "Event", message: "Farewell ceremony for 2026 batch" },
    }),
    prisma.notification.create({
      data: { type: "Placement", message: "Amazon campus drive - CSE & ECE only" },
    }),
  ]);

  console.log(`✅ Created ${notifications.length} notifications`);

  // Link notifications to students
  const links = [];
  for (const student of students) {
    for (const notification of notifications) {
      links.push({
        studentId: student.id,
        notificationId: notification.id,
        isRead: Math.random() > 0.5, // Random read/unread for demo
      });
    }
  }

  await prisma.studentNotification.createMany({
    data: links,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${links.length} student-notification links`);
  console.log("✅ Seed completed!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
