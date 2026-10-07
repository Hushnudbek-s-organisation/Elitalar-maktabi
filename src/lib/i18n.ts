// ============================================================================
// SchoolOS Uzbekistan — i18n (uz default; ru keyin qo'shiladi)
// Barcha UI matnlari shu lug'at orqali: t("key")
// ============================================================================

const uz: Record<string, string> = {
  // Umumiy
  "app.name": "SchoolOS",
  "app.tagline": "Maktab boshqaruvining yangi davri",
  "common.search": "Qidirish...",
  "common.save": "Saqlash",
  "common.saved": "Saqlandi",
  "common.saving": "Saqlanmoqda...",
  "common.cancel": "Bekor qilish",
  "common.close": "Yopish",
  "common.add": "Qo'shish",
  "common.all": "Hammasi",
  "common.today": "Bugun",
  "common.tomorrow": "Ertaga",
  "common.demo": "Demo rejim",
  "common.noAccess": "Sizga bu bo'limga ruxsat yo'q",
  "common.notFound": "Topilmadi",
  "common.viewAll": "Hammasini ko'rish",

  // Navigatsiya
  "nav.dashboard": "Boshqaruv paneli",
  "nav.journal": "Jurnal",
  "nav.timetable": "Dars jadvali",
  "nav.students": "O'quvchilar",
  "nav.teachers": "O'qituvchilar",
  "nav.announcements": "E'lonlar",
  "nav.homework": "Uy vazifalari",
  "nav.messages": "Xabarlar",
  "nav.settings": "Sozlamalar",
  "nav.children": "Farzandlarim",
  "nav.logout": "Chiqish",
  "nav.searchPlaceholder": "Qidirish (Ctrl+K)",

  // Login
  "login.title": "Tizimga kirish",
  "login.subtitle": "Demo hisoblardan birini tanlang",
  "login.email": "Email",
  "login.password": "Parol",
  "login.enter": "Kirish",
  "login.demoNote":
    "Bu demo rejim — ma'lumotlar brauzeringizda saqlanadi. Supabase ulanganda real hisoblar ishlaydi.",
  "login.as": "Sifatida kirish",

  // Dashboard
  "dash.hello": "Assalomu alaykum",
  "dash.students": "O'quvchilar",
  "dash.teachers": "O'qituvchilar",
  "dash.classes": "Sinflar",
  "dash.attendanceToday": "Bugungi davomat",
  "dash.riskEvents": "Ogohlantirishlar",
  "dash.todayLessons": "Bugungi darslar",
  "dash.noLessons": "Bugun darslaringiz yo'q",
  "dash.quickActions": "Tezkor amallar",
  "dash.openJournal": "Jurnalni ochish",
  "dash.markAttendance": "Davomatni belgilash",
  "dash.recentGrades": "Oxirgi baholar",
  "dash.avgGrade": "O'rtacha baho",
  "dash.homeworkDue": "Topshirish muddati",
  "dash.myChildren": "Farzandlarim",
  "dash.attendanceRate": "Davomat darajasi",
  "dash.openRisks": "Ochiq ogohlantirishlar",

  // Jurnal
  "journal.attendance": "Davomat",
  "journal.gradebook": "Baholar jurnali",
  "journal.allPresent": "HAMMASI KELDI",
  "journal.marked": "belgilandi",
  "journal.elapsed": "Sarflangan vaqt",
  "journal.quickHint": "Bir marta bosish bilan barchani keldi deb belgilang",
  "journal.student": "O'quvchi",
  "journal.present": "Keldi",
  "journal.late": "Kechikdi",
  "journal.unexcused": "Sababsiz",
  "journal.excused": "Sababli",
  "journal.selectLesson": "Darsni tanlang",
  "journal.period": "dars",
  "journal.topic": "Mavzu",
  "journal.gradeHint": "Tugmalar: ↑↓←→ bilan yuving, 1–10 ball",
  "journal.autosave": "Avtomatik saqlanadi",
  "journal.group": "guruh",

  // Dars jadvali
  "tt.class": "Sinf",
  "tt.room": "Xona",
  "tt.free": "Bo'sh",
  "tt.legend": "1-smena, 6 dars",

  // O'quvchilar
  "students.count": "o'quvchi",
  "students.avg": "O'rtacha",
  "students.attendance": "Davomat",
  "students.info": "Ma'lumot",
  "students.grades": "Baholar",
  "students.parents": "Ota-onalar",
  "students.noResults": "O'quvchi topilmadi",

  // O'qituvchilar
  "teachers.subjects": "Fanlar",
  "teachers.homeroom": "Sinf rahbari",

  // E'lonlar
  "ann.new": "Yangi e'lon",
  "ann.title": "Sarlavha",
  "ann.body": "Matn",
  "ann.publish": "E'lon qilish",
  "ann.pinned": "Muhim",

  // Uy vazifalari
  "hw.new": "Vazifa qo'shish",
  "hw.title": "Sarlavha",
  "hw.description": "Izoh",
  "hw.due": "Muddat",
  "hw.assign": "Berish",
  "hw.subject": "Fan",
  "hw.dueSoon": "Yaqin muddat",

  // Xabarlar
  "msg.type": "Xabar yozing...",
  "msg.send": "Yuborish",

  // Sozlamalar
  "settings.school": "Maktab ma'lumotlari",
  "settings.schoolName": "Maktab nomi",
  "settings.year": "O'quv yili",
  "settings.quarter": "Chorak",
  "settings.features": "Funksiyalar",
  "settings.featuresNote":
    "Bayroqlar maktab darajasida boshqariladi (D3: Telegram/Push birinchi; D7: Wallet o'chirilgan)",
  "settings.on": "Yoniq",
  "settings.off": "O'chiq",
  "settings.demoData": "Demo ma'lumotlar",
  "settings.demoNote":
    "Hozir demo rejim ishlayapti. Supabase ulanganda barcha ma'lumotlar real bo'ladi.",

  // Ogohlantirishlar (risk)
  "risk.title": "Ogohlantirish",
  "risk.reasons": "Sabablari",
  "risk.acknowledge": "Tan olindi",
  "risk.high": "Yuqori",
  "risk.medium": "O'rtacha",
  "risk.explainable": "Har bir ogohlantirish sabablari bilan izohlanadi",
};

export function t(key: string): string {
  return uz[key] ?? key;
}
