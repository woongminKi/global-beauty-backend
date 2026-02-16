import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Clinic, OpsUser } from '../models/index.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined');
  process.exit(1);
}

const clinicsData = [
  // Seoul Clinics
  {
    name: {
      en: 'Seoul Aesthetic Clinic',
      ja: 'ソウル美容クリニック',
      zh: '首尔美容诊所',
    },
    city: 'seoul',
    address: {
      en: '123 Gangnam-daero, Gangnam-gu, Seoul',
      ja: 'ソウル特別市江南区江南大路123',
      zh: '首尔市江南区江南大路123号',
    },
    phone: '+82-2-1234-5678',
    location: {
      type: 'Point',
      coordinates: [127.0276, 37.4979],
    },
    languages: ['Korean', 'English', 'Japanese', 'Chinese'],
    hours: {
      monday: '10:00 - 19:00',
      tuesday: '10:00 - 19:00',
      wednesday: '10:00 - 19:00',
      thursday: '10:00 - 19:00',
      friday: '10:00 - 19:00',
      saturday: '10:00 - 17:00',
      sunday: 'Closed',
      note: 'Lunch break: 13:00 - 14:00',
    },
    tags: ['plastic-surgery', 'dermatology', 'anti-aging'],
    rating: 4.8,
    reviewCount: 256,
    images: [
      'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800',
      'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800',
    ],
    description: {
      en: 'Premier aesthetic clinic in Gangnam offering comprehensive beauty treatments with state-of-the-art technology and experienced surgeons.',
      ja: '江南にある一流の美容クリニック。最先端の技術と経験豊富な医師による総合的な美容治療を提供しています。',
      zh: '位于江南的顶级美容诊所，提供先进技术和经验丰富的医生进行的综合美容治疗。',
    },
    externalReviewLinks: [
      { source: 'Google', url: 'https://google.com/maps' },
      { source: 'Naver', url: 'https://map.naver.com' },
    ],
    isActive: true,
  },
  {
    name: {
      en: 'K-Beauty Dermatology',
      ja: 'Kビューティー皮膚科',
      zh: 'K美容皮肤科',
    },
    city: 'seoul',
    address: {
      en: '456 Apgujeong-ro, Gangnam-gu, Seoul',
      ja: 'ソウル特別市江南区狎鷗亭路456',
      zh: '首尔市江南区狎鸥亭路456号',
    },
    phone: '+82-2-2345-6789',
    location: {
      type: 'Point',
      coordinates: [127.0391, 37.5271],
    },
    languages: ['Korean', 'English', 'Chinese'],
    hours: {
      monday: '09:00 - 18:00',
      tuesday: '09:00 - 18:00',
      wednesday: '09:00 - 18:00',
      thursday: '09:00 - 21:00',
      friday: '09:00 - 18:00',
      saturday: '09:00 - 15:00',
      sunday: 'Closed',
    },
    tags: ['dermatology', 'skin-laser', 'acne'],
    rating: 4.6,
    reviewCount: 189,
    images: [
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',
    ],
    description: {
      en: 'Specialized dermatology clinic focusing on skin treatments, laser procedures, and acne solutions with personalized care.',
      ja: '肌治療、レーザー施術、ニキビ治療を専門とする皮膚科クリニック。個別ケアを提供します。',
      zh: '专注于皮肤治疗、激光手术和痤疮解决方案的专业皮肤科诊所，提供个性化护理。',
    },
    externalReviewLinks: [
      { source: 'Google', url: 'https://google.com/maps' },
    ],
    isActive: true,
  },
  {
    name: {
      en: 'Gangnam Premium Plastic Surgery',
      ja: '江南プレミアム整形外科',
      zh: '江南高级整形外科',
    },
    city: 'seoul',
    address: {
      en: '789 Teheran-ro, Gangnam-gu, Seoul',
      ja: 'ソウル特別市江南区テヘラン路789',
      zh: '首尔市江南区德黑兰路789号',
    },
    phone: '+82-2-3456-7890',
    location: {
      type: 'Point',
      coordinates: [127.0507, 37.5052],
    },
    languages: ['Korean', 'English', 'Japanese'],
    hours: {
      monday: '10:00 - 19:00',
      tuesday: '10:00 - 19:00',
      wednesday: '10:00 - 19:00',
      thursday: '10:00 - 19:00',
      friday: '10:00 - 19:00',
      saturday: '10:00 - 16:00',
      sunday: 'Closed',
    },
    tags: ['plastic-surgery', 'rhinoplasty', 'facial-contouring', 'double-eyelid'],
    rating: 4.9,
    reviewCount: 412,
    images: [
      'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=800',
      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
    ],
    description: {
      en: 'Top-rated plastic surgery clinic specializing in facial procedures including rhinoplasty, double eyelid surgery, and facial contouring.',
      ja: '鼻整形、二重まぶた手術、輪郭形成などの顔面施術を専門とする最高評価の整形外科クリニック。',
      zh: '顶级整形外科诊所，专门从事面部手术，包括鼻整形、双眼皮手术和面部轮廓整形。',
    },
    externalReviewLinks: [
      { source: 'Google', url: 'https://google.com/maps' },
      { source: 'RealSelf', url: 'https://realself.com' },
    ],
    isActive: true,
  },
  // Busan Clinics
  {
    name: {
      en: 'Haeundae Beauty Center',
      ja: '海雲台ビューティーセンター',
      zh: '海云台美容中心',
    },
    city: 'busan',
    address: {
      en: '100 Haeundaehaebyeon-ro, Haeundae-gu, Busan',
      ja: '釜山広域市海雲台区海雲台海辺路100',
      zh: '釜山市海云台区海云台海边路100号',
    },
    phone: '+82-51-1234-5678',
    location: {
      type: 'Point',
      coordinates: [129.1604, 35.1587],
    },
    languages: ['Korean', 'English', 'Japanese'],
    hours: {
      monday: '10:00 - 18:00',
      tuesday: '10:00 - 18:00',
      wednesday: '10:00 - 18:00',
      thursday: '10:00 - 18:00',
      friday: '10:00 - 18:00',
      saturday: '10:00 - 14:00',
      sunday: 'Closed',
    },
    tags: ['plastic-surgery', 'dermatology', 'body-contouring'],
    rating: 4.5,
    reviewCount: 134,
    images: [
      'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800',
    ],
    description: {
      en: "Busan's leading beauty center near Haeundae Beach, offering both surgical and non-surgical aesthetic treatments.",
      ja: '海雲台ビーチ近くにある釜山を代表するビューティーセンター。外科的・非外科的美容治療を提供。',
      zh: '位于海云台海滩附近的釜山领先美容中心，提供手术和非手术美容治疗。',
    },
    externalReviewLinks: [
      { source: 'Google', url: 'https://google.com/maps' },
    ],
    isActive: true,
  },
  {
    name: {
      en: 'Busan Skin Clinic',
      ja: '釜山スキンクリニック',
      zh: '釜山皮肤诊所',
    },
    city: 'busan',
    address: {
      en: '200 Jungang-daero, Jung-gu, Busan',
      ja: '釜山広域市中区中央大路200',
      zh: '釜山市中区中央大路200号',
    },
    phone: '+82-51-2345-6789',
    location: {
      type: 'Point',
      coordinates: [129.0324, 35.1028],
    },
    languages: ['Korean', 'English'],
    hours: {
      monday: '09:00 - 18:00',
      tuesday: '09:00 - 18:00',
      wednesday: '09:00 - 18:00',
      thursday: '09:00 - 18:00',
      friday: '09:00 - 18:00',
      saturday: '09:00 - 13:00',
      sunday: 'Closed',
    },
    tags: ['dermatology', 'skin-laser', 'anti-aging', 'botox'],
    rating: 4.4,
    reviewCount: 98,
    images: [
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800',
    ],
    description: {
      en: 'Expert skin care clinic in central Busan specializing in laser treatments, anti-aging procedures, and skin rejuvenation.',
      ja: '釜山中心部にあるスキンケア専門クリニック。レーザー治療、アンチエイジング、肌再生を専門としています。',
      zh: '位于釜山市中心的专业皮肤护理诊所，专门从事激光治疗、抗衰老手术和皮肤再生。',
    },
    externalReviewLinks: [],
    isActive: true,
  },
  // Jeju Clinics
  {
    name: {
      en: 'Jeju Island Wellness Clinic',
      ja: '済州島ウェルネスクリニック',
      zh: '济州岛健康诊所',
    },
    city: 'jeju',
    address: {
      en: '50 Nohyeong-ro, Jeju-si, Jeju',
      ja: '済州特別自治道済州市老衡路50',
      zh: '济州市老衡路50号',
    },
    phone: '+82-64-1234-5678',
    location: {
      type: 'Point',
      coordinates: [126.5312, 33.4996],
    },
    languages: ['Korean', 'English', 'Chinese'],
    hours: {
      monday: '10:00 - 18:00',
      tuesday: '10:00 - 18:00',
      wednesday: '10:00 - 18:00',
      thursday: '10:00 - 18:00',
      friday: '10:00 - 18:00',
      saturday: '10:00 - 14:00',
      sunday: 'Closed',
    },
    tags: ['wellness', 'dermatology', 'anti-aging', 'relaxation'],
    rating: 4.7,
    reviewCount: 76,
    images: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
    ],
    description: {
      en: 'Combine your Jeju vacation with premium wellness and beauty treatments in a relaxing island setting.',
      ja: '済州の休暇と高級ウェルネス・美容トリートメントを、リラックスできる島の環境で組み合わせましょう。',
      zh: '在轻松的海岛环境中，将您的济州假期与高端健康和美容护理相结合。',
    },
    externalReviewLinks: [
      { source: 'TripAdvisor', url: 'https://tripadvisor.com' },
    ],
    isActive: true,
  },
];

const opsUsersData = [
  {
    email: 'admin@globalbeauty.com',
    name: 'Admin User',
    password: 'admin123!',
    role: 'admin' as const,
  },
  {
    email: 'ops@globalbeauty.com',
    name: 'Ops User',
    password: 'ops123!',
    role: 'operator' as const,
  },
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected to MongoDB');

    // Seed Clinics
    console.log('\nSeeding clinics...');
    const existingClinics = await Clinic.countDocuments();
    if (existingClinics > 0) {
      console.log(`Found ${existingClinics} existing clinics. Skipping clinic seed.`);
    } else {
      await Clinic.insertMany(clinicsData);
      console.log(`Created ${clinicsData.length} clinics`);
    }

    // Seed Ops Users
    console.log('\nSeeding ops users...');
    for (const userData of opsUsersData) {
      const existingUser = await OpsUser.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`Ops user ${userData.email} already exists. Skipping.`);
      } else {
        const passwordHash = await bcrypt.hash(userData.password, 12);
        await OpsUser.create({
          email: userData.email,
          name: userData.name,
          passwordHash,
          role: userData.role,
          isActive: true,
        });
        console.log(`Created ops user: ${userData.email}`);
      }
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\nOps Login Credentials:');
    console.log('  Admin: admin@globalbeauty.com / admin123!');
    console.log('  Operator: ops@globalbeauty.com / ops123!');

  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seed();
