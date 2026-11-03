/**
 * Idempotent seed: 15 well-known Persian / translated books, 3 circles, 5 users,
 * a handful of copies, one active loan and one passport entry.
 * ISBNs are synthetic (valid checksum, 978-964-xxxxx) and are NOT the real ones.
 */
import "../src/config"; // side effect: loads the monorepo-root .env
import { PrismaClient } from "@prisma/client";
import { buildSearchText, nationalIdCheckDigit } from "@varaq/shared";
import { hashContact } from "../src/lib/hash";

const prisma = new PrismaClient();
const PEPPER = process.env.CONTACT_HASH_PEPPER ?? "dev-only-pepper";

function syntheticIsbn(seq: number): string {
  const base = `978964${String(seq).padStart(6, "0")}`;
  const sum = [...base].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return base + ((10 - (sum % 10)) % 10);
}

const BOOKS = [
  { title: "بوف کور", authors: ["صادق هدایت"], publisher: "نشر جاویدان", genres: ["رمان", "ادبیات ایران"] },
  { title: "سووشون", authors: ["سیمین دانشور"], publisher: "نشر خوارزمی", genres: ["رمان", "ادبیات ایران"] },
  { title: "کلیدر", authors: ["محمود دولت‌آبادی"], publisher: "نشر فرهنگ معاصر", genres: ["رمان", "ادبیات ایران"] },
  { title: "جای خالی سلوچ", authors: ["محمود دولت‌آبادی"], publisher: "نشر چشمه", genres: ["رمان", "ادبیات ایران"] },
  {
    title: "شازده کوچولو",
    authors: ["آنتوان دو سنت‌اگزوپری", "محمد قاضی (مترجم)"],
    publisher: "نشر امیرکبیر",
    genres: ["داستان", "ادبیات جهان"],
  },
  {
    title: "صد سال تنهایی",
    authors: ["گابریل گارسیا مارکز", "بهمن فرزانه (مترجم)"],
    publisher: "نشر امیرکبیر",
    genres: ["رمان", "ادبیات جهان"],
  },
  { title: "بینوایان", authors: ["ویکتور هوگو", "حسینقلی مستعان (مترجم)"], publisher: "نشر امیرکبیر", genres: ["رمان", "ادبیات جهان"] },
  {
    title: "جنایت و مکافات",
    authors: ["فئودور داستایفسکی", "مهری آهی (مترجم)"],
    publisher: "نشر خوارزمی",
    genres: ["رمان", "ادبیات جهان"],
  },
  { title: "ملت عشق", authors: ["الیف شافاک", "ارسلان فصیحی (مترجم)"], publisher: "نشر مجید", genres: ["رمان", "ادبیات جهان"] },
  { title: "کیمیاگر", authors: ["پائولو کوئلیو", "آرش حجازی (مترجم)"], publisher: "نشر کارنامه", genres: ["رمان", "ادبیات جهان"] },
  { title: "۱۹۸۴", authors: ["جورج اورول", "صالح حسینی (مترجم)"], publisher: "نشر نیلوفر", genres: ["رمان", "ادبیات جهان"] },
  { title: "دنیای سوفی", authors: ["یوستین گاردر", "حسین نیکروش (مترجم)"], publisher: "نشر نیلوفر", genres: ["فلسفه", "نوجوان"] },
  { title: "مسخ", authors: ["فرانتس کافکا", "صادق هدایت (مترجم)"], publisher: "نشر امیرکبیر", genres: ["داستان کوتاه", "ادبیات جهان"] },
  { title: "کوری", authors: ["ژوزه ساراماگو", "مهدی غبرایی (مترجم)"], publisher: "نشر نیلوفر", genres: ["رمان", "ادبیات جهان"] },
  { title: "خسی در میقات", authors: ["جلال آل‌احمد"], publisher: "نشر فردوس", genres: ["تاریخی", "ادبیات ایران"] },
  { title: "انسان خردمند", authors: ["یووال نوح هراری", "نیک گرگین (مترجم)"], publisher: "نشر فرهنگ نو", genres: ["تاریخی", "علمی"] },
  { title: "تاریخ بیهقی", authors: ["ابوالفضل بیهقی"], publisher: "نشر هیرمند", genres: ["تاریخی", "ادبیات ایران"] },
  { title: "تفکر، سریع و کند", authors: ["دانیل کانمن", "امیر توکلی (مترجم)"], publisher: "نشر هنوز", genres: ["روانشناسی", "علمی"] },
  { title: "تاریخچه زمان", authors: ["استیون هاوکینگ", "محمدرضا محجوب (مترجم)"], publisher: "نشر حوض نقره", genres: ["علمی"] },
  {
    title: "انسان در جستجوی معنا",
    authors: ["ویکتور فرانکل", "نهضت صالحیان (مترجم)"],
    publisher: "نشر درسا",
    genres: ["روانشناسی", "فلسفه"],
  },
];

/** Valid-checksum national codes generated from a 9-digit base (demo data only). */
const nid = (base9: string) => base9 + nationalIdCheckDigit(base9);

const USERS = [
  {
    username: "sara_reads",
    firstName: "سارا",
    lastName: "محمدی",
    nationalId: nid("001354241"),
    phone: "09121110001",
    birthDate: "1378/04/15",
    avatarId: 3,
  },
  {
    username: "amir_hosseini",
    firstName: "امیرحسین",
    lastName: "کاظمی",
    nationalId: nid("002345671"),
    phone: "09121110002",
    birthDate: "1375/11/02",
    avatarId: 7,
  },
  {
    username: "negar_n",
    firstName: "نگار",
    lastName: "نوری",
    nationalId: nid("003456781"),
    phone: "09121110003",
    birthDate: "1380/01/23",
    avatarId: 11,
  },
  {
    username: "reza_b",
    firstName: "رضا",
    lastName: "بهرامی",
    nationalId: nid("004567891"),
    phone: "09121110004",
    birthDate: "1372/08/09",
    avatarId: 5,
  },
  {
    username: "mina_m",
    firstName: "مینا",
    lastName: "موسوی",
    nationalId: nid("005678901"),
    phone: "09121110005",
    birthDate: "1376/06/30",
    avatarId: 14,
  },
];

const CIRCLES = [
  { name: "دانشگاه تهران", slug: "tehran-university", city: "تهران", geohash: "tmrjb", isPublic: true, inviteCode: "UTEHRAN1" },
  { name: "کافه نزدیک مترو", slug: "metro-cafe", city: "تهران", geohash: "tmrjc", isPublic: true, inviteCode: "METROCAFE" },
  { name: "حلقه دوستان", slug: "friends-circle", city: "اصفهان", geohash: null, isPublic: false, inviteCode: "FRIENDS24" },
];

async function main() {
  const editions = [];
  for (const [i, b] of BOOKS.entries()) {
    const isbn = syntheticIsbn(i + 1);
    editions.push(
      await prisma.bookEdition.upsert({
        where: { isbn },
        update: {},
        create: { ...b, isbn, searchText: buildSearchText({ ...b, isbn }) },
      }),
    );
  }

  const circles = [];
  for (const c of CIRCLES) {
    circles.push(await prisma.circle.upsert({ where: { slug: c.slug }, update: {}, create: c }));
  }

  const users = [];
  for (const u of USERS) {
    users.push(
      await prisma.user.upsert({
        where: { username: u.username },
        update: {},
        create: {
          username: u.username,
          avatarId: u.avatarId,
          firstName: u.firstName,
          lastName: u.lastName,
          nationalId: u.nationalId,
          phoneNumber: u.phone,
          birthDate: u.birthDate,
          contactHash: hashContact(`+98${u.phone.slice(1)}`, PEPPER),
        },
      }),
    );
  }

  // Memberships: everyone in the university circle; others spread around.
  const membership: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [0, 1],
    [1, 1],
    [3, 1],
    [0, 2],
    [2, 2],
    [4, 2],
  ];
  for (const [u, c] of membership) {
    await prisma.userCircle.upsert({
      where: { userId_circleId: { userId: users[u].id, circleId: circles[c].id } },
      update: {},
      create: { userId: users[u].id, circleId: circles[c].id },
    });
  }

  if ((await prisma.bookCopy.count()) > 0) {
    console.log("Seed: copies already exist, skipping inventory.");
    return;
  }

  // Each user owns 4 books: user i owns editions i, i+5, i+10, i+15.
  const copies = [];
  for (const [ui, user] of users.entries()) {
    for (const ei of [ui, ui + 5, ui + 10, ui + 15]) {
      copies.push(
        await prisma.bookCopy.create({
          data: {
            ownerId: user.id,
            editionId: editions[ei].id,
            condition: (["MINT", "GOOD", "FAIR", "GOOD", "WORN"] as const)[ei % 5],
            ownerNotes: ei % 4 === 0 ? "حاشیه‌نویسی ندارد" : null,
          },
        }),
      );
    }
  }
  await prisma.user.updateMany({ data: { listingBonusGranted: true, karmaTokens: 2 } });

  // A finished loan with a passport entry (copy 0 owned by sara, read by امیرحسین).
  const loan = await prisma.loan.create({
    data: {
      copyId: copies[0].id,
      lenderId: users[0].id,
      borrowerId: users[1].id,
      state: "RETURNED",
      handoverCondition: "MINT",
      returnCondition: "GOOD",
      handoverPin: "1111",
      returnPin: "2222",
      dueDate: new Date(Date.now() - 20 * 864e5),
      handoverAt: new Date(Date.now() - 40 * 864e5),
      returnedAt: new Date(Date.now() - 22 * 864e5),
    },
  });
  await prisma.bookPassportEntry.create({
    data: {
      copyId: copies[0].id,
      loanId: loan.id,
      readerId: users[1].id,
      note: "شبی که تا صبح بیدارم نگه داشت.",
      cityOrCircle: "دانشگاه تهران",
    },
  });
  await prisma.bookCopy.update({ where: { id: copies[0].id }, data: { condition: "GOOD" } });

  // An external loan: negar lent a book to a friend outside Pa-Varaq.
  await prisma.loan.create({
    data: {
      copyId: copies[8].id,
      lenderId: users[2].id,
      externalBorrowerName: "دوست دانشگاهی — علی",
      state: "ACTIVE",
      handoverCondition: "GOOD",
      dueDate: new Date(Date.now() + 10 * 864e5),
      handoverAt: new Date(),
    },
  });
  await prisma.bookCopy.update({ where: { id: copies[8].id }, data: { status: "LOANED_EXTERNAL" } });

  console.log(`Seed done: ${editions.length} books, ${circles.length} circles, ${users.length} users.`);
}

main().finally(() => prisma.$disconnect());
