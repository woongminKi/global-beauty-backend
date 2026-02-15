import 'dotenv/config';
import mongoose from 'mongoose';
import { Clinic } from '../models/index.js';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

// Sample clinic data
const clinics = [
  // Seoul - Gangnam
  {
    name: {
      en: 'Seoul Aesthetic Clinic',
      ja: 'ソウル美容クリニック',
      zh: '首尔美容诊所',
    },
    city: 'seoul',
    address: {
      en: '123 Gangnam-daero, Gangnam-gu, Seoul',
      ja: 'ソウル市江南区江南大路123',
      zh: '首尔市江南区江南大路123号',
    },
    phone: '+82-2-1234-5678',
    location: {
      type: 'Point',
      coordinates: [127.0276, 37.4979], // Gangnam Station
    },
    languages: ['English', 'Japanese', 'Chinese', 'Korean'],
    hours: {
      monday: '10:00 - 19:00',
      tuesday: '10:00 - 19:00',
      wednesday: '10:00 - 19:00',
      thursday: '10:00 - 19:00',
      friday: '10:00 - 19:00',
      saturday: '10:00 - 17:00',
      sunday: 'Closed',
    },
    tags: ['plastic-surgery', 'dermatology', 'english-speaking', 'foreigner-friendly'],
    rating: 4.8,
    reviewCount: 234,
    images: ['/images/clinic1-1.jpg', '/images/clinic1-2.jpg'],
    description: {
      en: 'Premium aesthetic clinic in Gangnam with 20+ years of experience serving international patients.',
      ja: '20年以上の経験を持つ江南のプレミアム美容クリニック。海外からの患者様に対応。',
      zh: '位于江南的高端美容诊所，拥有20多年服务国际患者的经验。',
    },
    externalReviewLinks: [
      { source: 'Google', url: 'https://google.com/maps/place/...' },
    ],
  },
  {
    name: {
      en: 'K-Beauty Dermatology',
      ja: 'Kビューティー皮膚科',
      zh: 'K美丽皮肤科',
    },
    city: 'seoul',
    address: {
      en: '456 Apgujeong-ro, Gangnam-gu, Seoul',
      ja: 'ソウル市江南区狎鷗亭路456',
      zh: '首尔市江南区狎鸥亭路456号',
    },
    phone: '+82-2-2345-6789',
    location: {
      type: 'Point',
      coordinates: [127.0397, 37.5267], // Apgujeong
    },
    languages: ['English', 'Japanese', 'Korean'],
    hours: {
      monday: '09:00 - 20:00',
      tuesday: '09:00 - 20:00',
      wednesday: '09:00 - 20:00',
      thursday: '09:00 - 20:00',
      friday: '09:00 - 20:00',
      saturday: '09:00 - 15:00',
      sunday: 'Closed',
    },
    tags: ['dermatology', 'skin-care', 'laser', 'english-speaking'],
    rating: 4.6,
    reviewCount: 189,
    images: ['/images/clinic2-1.jpg'],
    description: {
      en: 'Specialized dermatology clinic offering latest skin treatments and laser procedures.',
      ja: '最新の皮膚治療とレーザー施術を提供する専門皮膚科クリニック。',
      zh: '专业皮肤科诊所，提供最新的皮肤治疗和激光手术。',
    },
    externalReviewLinks: [],
  },
  {
    name: {
      en: 'Myeongdong Beauty Center',
      ja: '明洞ビューティーセンター',
      zh: '明洞美容中心',
    },
    city: 'seoul',
    address: {
      en: '789 Myeongdong-gil, Jung-gu, Seoul',
      ja: 'ソウル市中区明洞ギル789',
      zh: '首尔市中区明洞路789号',
    },
    phone: '+82-2-3456-7890',
    location: {
      type: 'Point',
      coordinates: [126.9857, 37.5636], // Myeongdong
    },
    languages: ['English', 'Chinese', 'Korean'],
    hours: {
      monday: '10:00 - 21:00',
      tuesday: '10:00 - 21:00',
      wednesday: '10:00 - 21:00',
      thursday: '10:00 - 21:00',
      friday: '10:00 - 21:00',
      saturday: '10:00 - 18:00',
      sunday: '12:00 - 18:00',
    },
    tags: ['plastic-surgery', 'facial', 'chinese-speaking', 'weekend-available'],
    rating: 4.5,
    reviewCount: 312,
    images: ['/images/clinic3-1.jpg', '/images/clinic3-2.jpg'],
    description: {
      en: 'Conveniently located in Myeongdong, specializing in facial procedures for Chinese tourists.',
      ja: '明洞に便利な立地。中国からの観光客向けの顔面施術を専門とする。',
      zh: '位于明洞便利位置，专门为中国游客提供面部手术服务。',
    },
    externalReviewLinks: [],
  },
  // Seoul - Sinsa
  {
    name: {
      en: 'Sinsa Premium Clinic',
      ja: '新沙プレミアムクリニック',
      zh: '新沙高级诊所',
    },
    city: 'seoul',
    address: {
      en: '12 Sinsa-dong, Gangnam-gu, Seoul',
      ja: 'ソウル市江南区新沙洞12',
      zh: '首尔市江南区新沙洞12号',
    },
    phone: '+82-2-4567-8901',
    location: {
      type: 'Point',
      coordinates: [127.0214, 37.5168], // Sinsa
    },
    languages: ['English', 'Japanese', 'Korean'],
    hours: {
      monday: '10:00 - 19:00',
      tuesday: '10:00 - 19:00',
      wednesday: '10:00 - 19:00',
      thursday: '10:00 - 21:00',
      friday: '10:00 - 19:00',
      saturday: '10:00 - 16:00',
      sunday: 'Closed',
    },
    tags: ['plastic-surgery', 'nose', 'eyes', 'vip-service'],
    rating: 4.9,
    reviewCount: 156,
    images: ['/images/clinic4-1.jpg'],
    description: {
      en: 'VIP plastic surgery clinic known for natural-looking rhinoplasty and double eyelid surgery.',
      ja: '自然な仕上がりの鼻整形と二重まぶた手術で知られるVIP美容外科クリニック。',
      zh: 'VIP整形诊所，以自然的隆鼻和双眼皮手术闻名。',
    },
    externalReviewLinks: [],
  },
  // Busan
  {
    name: {
      en: 'Busan Ocean Clinic',
      ja: '釜山オーシャンクリニック',
      zh: '釜山海洋诊所',
    },
    city: 'busan',
    address: {
      en: '100 Haeundae Beach-ro, Haeundae-gu, Busan',
      ja: '釜山市海雲台区海雲台ビーチ路100',
      zh: '釜山市海云台区海云台海滩路100号',
    },
    phone: '+82-51-1234-5678',
    location: {
      type: 'Point',
      coordinates: [129.1603, 35.1587], // Haeundae
    },
    languages: ['English', 'Japanese', 'Korean'],
    hours: {
      monday: '09:00 - 18:00',
      tuesday: '09:00 - 18:00',
      wednesday: '09:00 - 18:00',
      thursday: '09:00 - 18:00',
      friday: '09:00 - 18:00',
      saturday: '09:00 - 14:00',
      sunday: 'Closed',
    },
    tags: ['dermatology', 'plastic-surgery', 'body-contouring', 'beach-nearby'],
    rating: 4.7,
    reviewCount: 98,
    images: ['/images/clinic5-1.jpg'],
    description: {
      en: 'Beachside clinic in Haeundae offering comprehensive aesthetic treatments with ocean views.',
      ja: '海雲台のビーチサイドクリニック。オーシャンビューとともに総合的な美容治療を提供。',
      zh: '位于海云台海滨的诊所，提供全面的美容治疗，可欣赏海景。',
    },
    externalReviewLinks: [],
  },
  {
    name: {
      en: 'Seomyeon Beauty Hospital',
      ja: '西面ビューティー病院',
      zh: '西面美容医院',
    },
    city: 'busan',
    address: {
      en: '50 Jungang-daero, Busanjin-gu, Busan',
      ja: '釜山市釜山鎮区中央大路50',
      zh: '釜山市釜山镇区中央大路50号',
    },
    phone: '+82-51-2345-6789',
    location: {
      type: 'Point',
      coordinates: [129.0596, 35.1558], // Seomyeon
    },
    languages: ['English', 'Korean'],
    hours: {
      monday: '09:00 - 19:00',
      tuesday: '09:00 - 19:00',
      wednesday: '09:00 - 19:00',
      thursday: '09:00 - 19:00',
      friday: '09:00 - 19:00',
      saturday: '09:00 - 15:00',
      sunday: 'Closed',
    },
    tags: ['plastic-surgery', 'breast', 'liposuction', 'full-hospital'],
    rating: 4.4,
    reviewCount: 167,
    images: ['/images/clinic6-1.jpg'],
    description: {
      en: 'Full-service beauty hospital in central Busan with surgical and non-surgical treatments.',
      ja: '釜山中心部にあるフルサービスの美容病院。外科的・非外科的治療を提供。',
      zh: '位于釜山市中心的综合美容医院，提供手术和非手术治疗。',
    },
    externalReviewLinks: [],
  },
  // Jeju
  {
    name: {
      en: 'Jeju Island Aesthetic',
      ja: '済州島エステティック',
      zh: '济州岛美容',
    },
    city: 'jeju',
    address: {
      en: '25 Nohyeong-ro, Jeju-si, Jeju',
      ja: '済州市老衡路25',
      zh: '济州市老衡路25号',
    },
    phone: '+82-64-1234-5678',
    location: {
      type: 'Point',
      coordinates: [126.4892, 33.4996], // Jeju City
    },
    languages: ['English', 'Chinese', 'Korean'],
    hours: {
      monday: '10:00 - 18:00',
      tuesday: '10:00 - 18:00',
      wednesday: '10:00 - 18:00',
      thursday: '10:00 - 18:00',
      friday: '10:00 - 18:00',
      saturday: '10:00 - 14:00',
      sunday: 'Closed',
    },
    tags: ['dermatology', 'wellness', 'recovery-friendly', 'resort-area'],
    rating: 4.6,
    reviewCount: 45,
    images: ['/images/clinic7-1.jpg'],
    description: {
      en: 'Relaxing aesthetic clinic in Jeju, perfect for combining treatments with vacation.',
      ja: '済州のリラックスできる美容クリニック。バケーションと施術の両立に最適。',
      zh: '济州岛放松的美容诊所，非常适合将治疗与度假结合。',
    },
    externalReviewLinks: [],
  },
  {
    name: {
      en: 'Seogwipo Skin Clinic',
      ja: '西帰浦スキンクリニック',
      zh: '西归浦皮肤诊所',
    },
    city: 'jeju',
    address: {
      en: '88 Jungjeong-ro, Seogwipo-si, Jeju',
      ja: '西帰浦市中正路88',
      zh: '西归浦市中正路88号',
    },
    phone: '+82-64-2345-6789',
    location: {
      type: 'Point',
      coordinates: [126.5633, 33.2541], // Seogwipo
    },
    languages: ['English', 'Korean'],
    hours: {
      monday: '09:00 - 17:00',
      tuesday: '09:00 - 17:00',
      wednesday: '09:00 - 17:00',
      thursday: '09:00 - 17:00',
      friday: '09:00 - 17:00',
      saturday: 'Closed',
      sunday: 'Closed',
    },
    tags: ['dermatology', 'anti-aging', 'natural-products'],
    rating: 4.3,
    reviewCount: 28,
    images: ['/images/clinic8-1.jpg'],
    description: {
      en: 'Boutique skin clinic in southern Jeju using natural Jeju ingredients.',
      ja: '済州島南部のブティック皮膚科。済州の天然成分を使用。',
      zh: '位于济州岛南部的精品皮肤诊所，使用济州天然成分。',
    },
    externalReviewLinks: [],
  },
  // More Seoul clinics
  {
    name: {
      en: 'Hongdae Youth Clinic',
      ja: '弘大ユースクリニック',
      zh: '弘大青春诊所',
    },
    city: 'seoul',
    address: {
      en: '33 Hongik-ro, Mapo-gu, Seoul',
      ja: 'ソウル市麻浦区弘益路33',
      zh: '首尔市麻浦区弘益路33号',
    },
    phone: '+82-2-5678-9012',
    location: {
      type: 'Point',
      coordinates: [126.9246, 37.5563], // Hongdae
    },
    languages: ['English', 'Korean'],
    hours: {
      monday: '11:00 - 21:00',
      tuesday: '11:00 - 21:00',
      wednesday: '11:00 - 21:00',
      thursday: '11:00 - 21:00',
      friday: '11:00 - 22:00',
      saturday: '11:00 - 20:00',
      sunday: '12:00 - 18:00',
    },
    tags: ['dermatology', 'acne', 'affordable', 'young-crowd'],
    rating: 4.2,
    reviewCount: 421,
    images: ['/images/clinic9-1.jpg'],
    description: {
      en: 'Youth-focused clinic in trendy Hongdae area, specializing in acne and skin troubles.',
      ja: 'トレンディな弘大エリアの若者向けクリニック。ニキビや肌トラブルを専門とする。',
      zh: '位于时尚弘大地区的年轻人诊所，专门治疗痤疮和皮肤问题。',
    },
    externalReviewLinks: [],
  },
  {
    name: {
      en: 'Itaewon Global Medical',
      ja: '梨泰院グローバルメディカル',
      zh: '梨泰院国际医疗',
    },
    city: 'seoul',
    address: {
      en: '77 Itaewon-ro, Yongsan-gu, Seoul',
      ja: 'ソウル市龍山区梨泰院路77',
      zh: '首尔市龙山区梨泰院路77号',
    },
    phone: '+82-2-6789-0123',
    location: {
      type: 'Point',
      coordinates: [126.9947, 37.5345], // Itaewon
    },
    languages: ['English', 'Arabic', 'Russian', 'Korean'],
    hours: {
      monday: '09:00 - 18:00',
      tuesday: '09:00 - 18:00',
      wednesday: '09:00 - 18:00',
      thursday: '09:00 - 18:00',
      friday: '09:00 - 18:00',
      saturday: '10:00 - 15:00',
      sunday: 'Closed',
    },
    tags: ['plastic-surgery', 'dermatology', 'international', 'multi-language'],
    rating: 4.5,
    reviewCount: 203,
    images: ['/images/clinic10-1.jpg'],
    description: {
      en: 'International clinic in Itaewon with staff fluent in multiple languages including Arabic and Russian.',
      ja: '梨泰院の国際クリニック。アラビア語やロシア語を含む多言語対応スタッフ。',
      zh: '位于梨泰院的国际诊所，员工精通多种语言，包括阿拉伯语和俄语。',
    },
    externalReviewLinks: [],
  },
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing clinics...');
    await Clinic.deleteMany({});

    // Insert seed data
    console.log('Inserting seed data...');
    const result = await Clinic.insertMany(clinics);
    console.log(`Inserted ${result.length} clinics`);

    // Create indexes
    console.log('Creating indexes...');
    await Clinic.createIndexes();

    console.log('Seed completed successfully!');
    console.log('\nClinic summary:');
    console.log(`- Seoul: ${clinics.filter((c) => c.city === 'seoul').length} clinics`);
    console.log(`- Busan: ${clinics.filter((c) => c.city === 'busan').length} clinics`);
    console.log(`- Jeju: ${clinics.filter((c) => c.city === 'jeju').length} clinics`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
