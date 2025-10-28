// scripts/create-admin-user.ts
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...');

    const adminEmail = 'admin@marketpulse360.live';
    const adminPassword = 'Admin@123';
    const adminName = 'System Administrator';

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`👤 Name: ${existingAdmin.name}`);
      console.log(`🔑 Role: ${existingAdmin.role}`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: Role.ADMIN,
        emailVerified: new Date(),
        phoneVerified: new Date(),
        clientId: 'ADMIN001'
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`👤 Name: ${adminName}`);
    console.log(`🆔 Client ID: ${adminUser.clientId}`);
    console.log(`🔐 Role: ${adminUser.role}`);
    console.log('');
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Create moderator user as well
async function createModeratorUser() {
  try {
    console.log('🔧 Creating moderator user...');

    const moderatorEmail = 'moderator@marketpulse360.live';
    const moderatorPassword = 'Moderator@123';
    const moderatorName = 'System Moderator';

    // Check if moderator already exists
    const existingModerator = await prisma.user.findUnique({
      where: { email: moderatorEmail }
    });

    if (existingModerator) {
      console.log('✅ Moderator user already exists');
      console.log(`📧 Email: ${moderatorEmail}`);
      console.log(`👤 Name: ${existingModerator.name}`);
      console.log(`🔑 Role: ${existingModerator.role}`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(moderatorPassword, 10);

    // Create moderator user
    const moderatorUser = await prisma.user.create({
      data: {
        name: moderatorName,
        email: moderatorEmail,
        password: hashedPassword,
        role: Role.MODERATOR,
        emailVerified: new Date(),
        phoneVerified: new Date(),
        clientId: 'MOD001'
      }
    });

    console.log('✅ Moderator user created successfully!');
    console.log(`📧 Email: ${moderatorEmail}`);
    console.log(`🔑 Password: ${moderatorPassword}`);
    console.log(`👤 Name: ${moderatorName}`);
    console.log(`🆔 Client ID: ${moderatorUser.clientId}`);
    console.log(`🔐 Role: ${moderatorUser.role}`);
    console.log('');
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating moderator user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the functions
async function main() {
  await createAdminUser();
  console.log('');
  await createModeratorUser();
}

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
