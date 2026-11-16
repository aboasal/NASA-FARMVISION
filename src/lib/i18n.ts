export type AppLanguage = "en" | "ar" | "es" | "fr" | "hi";

export interface LanguageMeta {
  id: AppLanguage;
  name: string;
  nativeName: string;
  shortBadge: string;
  speechLang: string;
  dir: "ltr" | "rtl";
}

export const LANGUAGES: Record<AppLanguage, LanguageMeta> = {
  en: {
    id: "en",
    name: "English",
    nativeName: "English",
    shortBadge: "EN",
    speechLang: "en-US",
    dir: "ltr",
  },
  ar: {
    id: "ar",
    name: "Arabic",
    nativeName: "العربية",
    shortBadge: "عربي",
    speechLang: "ar-EG",
    dir: "rtl",
  },
  es: {
    id: "es",
    name: "Spanish",
    nativeName: "Español",
    shortBadge: "ES",
    speechLang: "es-ES",
    dir: "ltr",
  },
  fr: {
    id: "fr",
    name: "French",
    nativeName: "Français",
    shortBadge: "FR",
    speechLang: "fr-FR",
    dir: "ltr",
  },
  hi: {
    id: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    shortBadge: "HI",
    speechLang: "hi-IN",
    dir: "ltr",
  },
};

export const LANGUAGE_LIST: LanguageMeta[] = [
  LANGUAGES.en,
  LANGUAGES.ar,
  LANGUAGES.es,
  LANGUAGES.fr,
  LANGUAGES.hi,
];

export interface UiTranslations {
  signInPortal: string;
  orbitBadge: string;
  missionSubtitle: string;
  farmerNameLabel: string;
  farmerNamePlaceholder: string;
  farmPinLabel: string;
  farmPinPlaceholder: string;
  pinError: string;
  signInBtn: string;
  guestBtn: string;
  voiceHelperBtn: string;
  voiceBannerTitle: string;
  voiceBannerDesc: string;
  voiceBannerCta: string;
  langStudioBtn: string;
  launchingText: string;
  home: string;
  tour: string;
  voice: string;
  voiceOn: string;
  step1Mark: string;
  step2Inputs: string;
  step3Plan: string;
  searchPlaceholder: string;
  go: string;
  saved: string;
  markMyField: string;
  drawingActive: string;
  earth3d: string;
  map2d: string;
  demoField: string;
  step1BannerTitle: string;
  step1BannerDesc: string;
  welcomeSub: string;
  view3dEarthBtn: string;
  backToMap: string;
  listenToPage: string;
  stopReading: string;
  speakAnswers: string;
  markedFarmParcel: string;
  sizeLabel: string;
  tellUs3Things: string;
  tellUs3Sub: string;
  autoFillNasa: string;
  q1WaterTitle: string;
  q1WaterSub: string;
  totalWaterLabel: string;
  q2CropTitle: string;
  q2CropSub: string;
  q3GoalTitle: string;
  redrawBtn: string;
  predictBtn: string;
  choose4Plans: string;
  predictMechanicTitle: string;
  normalYear: string;
  dryYear: string;
  wetYear: string;
  safeHarvest: string;
  waterNeed: string;
  threeYrIncome: string;
  soilForecast: string;
  roadmapTitle: string;
  changeAnswers: string;
  markAnotherField: string;
  printPlan: string;
  downloadGeoJson: string;
}

const EN: UiTranslations = {
  signInPortal: "Sign In • Farmer Portal",
  orbitBadge: "Orbit: 705 km Sun-Sync",
  missionSubtitle: "Satellite Crop Rotation & Soil Resilience Mission",
  farmerNameLabel: "Farmer Name or Plot ID",
  farmerNamePlaceholder: "e.g. Ahmed AboAsal or Nile Farm 01",
  farmPinLabel: "Farm PIN / Passcode (Optional)",
  farmPinPlaceholder: "Enter 4-digit PIN or leave blank",
  pinError: "Farm PIN must be 4 digits (or leave blank).",
  signInBtn: "Sign In to Satellite Dashboard",
  guestBtn: "Enter as Guest Farmer",
  voiceHelperBtn: "Voice Helper",
  voiceBannerTitle: "Voice Guide Available",
  voiceBannerDesc:
    "Hard to read? Tap the glowing yellow Speaker Icon anytime and I will guide you with my voice.",
  voiceBannerCta: "Tap Here for Voice Help",
  langStudioBtn: "Language & Voice",
  launchingText: "Locking NASA Satellite Telemetry...",
  home: "Home",
  tour: "Tour",
  voice: "Voice",
  voiceOn: "Voice ON",
  step1Mark: "1. Mark",
  step2Inputs: "2. Inputs",
  step3Plan: "3. Plan",
  searchPlaceholder: "Search village, region, or farm...",
  go: "Go",
  saved: "Saved",
  markMyField: "Mark My Field",
  drawingActive: "Drawing Active",
  earth3d: "3D Earth",
  map2d: "2D Map",
  demoField: "Demo Field",
  step1BannerTitle: "Step 1 of 3 • Find & Mark Your Land",
  step1BannerDesc:
    "Find your region by search, GPS, or globe—then mark your field.",
  welcomeSub:
    "Mark your farm boundary on the 3D Earth, enter your water supply & last crop, and get personalized NASA-backed crop rotation plans.",
  view3dEarthBtn: "View 3D Earth",
  backToMap: "3D Earth & Map",
  listenToPage: "Listen to Page",
  stopReading: "Stop Reading",
  speakAnswers: "Speak Answers",
  markedFarmParcel: "Marked Farm Parcel",
  sizeLabel: "Size:",
  tellUs3Things: "Tell Us 3 Simple Things About Your Farm",
  tellUs3Sub:
    "Tap the big pictures below, tap Listen to hear options aloud, or tap Auto-Fill from NASA if you are unsure.",
  autoFillNasa: "Auto-Fill Water from NASA",
  q1WaterTitle: "1. How much water does this field have?",
  q1WaterSub: "Pick the picture that best matches how you water crops.",
  totalWaterLabel: "Total Water on Your Land",
  q2CropTitle: "2. What was the last crop planted here?",
  q2CropSub: "Changing crop families naturally breaks pests and feeds tired soil.",
  q3GoalTitle: "3. What matters most to you this year?",
  redrawBtn: "Redraw Land Boundary",
  predictBtn: "Predict My Crop Rotation & 3-Year Forecast",
  choose4Plans: "Choose Any of Your 4 Tailored Crop Plans to Predict",
  predictMechanicTitle: "Interactive 3-Year Predict Mechanic",
  normalYear: "Normal Weather Year",
  dryYear: "Dry / Drought Year",
  wetYear: "Wet / Good Rain Year",
  safeHarvest: "Predicted Safe Harvest",
  waterNeed: "Predicted Water Need",
  threeYrIncome: "Predicted 3-Year Income",
  soilForecast: "3-Year Soil Health Forecast",
  roadmapTitle: "3-Year Crop Rotation Roadmap (Year 1 → Year 2 → Year 3)",
  changeAnswers: "Change Answers",
  markAnotherField: "Mark Another Field",
  printPlan: "Print Plan Sheet",
  downloadGeoJson: "Download GeoJSON",
};

const AR: UiTranslations = {
  signInPortal: "تسجيل الدخول • بوابة المزارع",
  orbitBadge: "المدار: ٧٠٥ كم متزامن مع الشمس",
  missionSubtitle: "مهمة الدورة الزراعية ومرونة التربة بالأقمار الصناعية",
  farmerNameLabel: "اسم المزارع أو رقم الحقل",
  farmerNamePlaceholder: "مثال: Ahmed AboAsal أو مزرعة النيل 01",
  farmPinLabel: "رمز المزرعة من ٤ أرقام (اختياري)",
  farmPinPlaceholder: "أدخل ٤ أرقام أو اتركه فارغاً",
  pinError: "يجب أن يتكون رمز المزرعة من ٤ أرقام (أو اتركه فارغاً).",
  signInBtn: "تسجيل الدخول إلى لوحة الأقمار الصناعية",
  guestBtn: "الدخول كمزارع ضيف",
  voiceHelperBtn: "المساعد الصوتي",
  voiceBannerTitle: "الدليل الصوتي متاح",
  voiceBannerDesc:
    "صعب القراءة؟ اضغط على أيقونة السماعة الصفراء المضيئة في أي وقت وسأرشدك بصوتي.",
  voiceBannerCta: "اضغط هنا للمساعدة الصوتية",
  langStudioBtn: "اللغة والصوت",
  launchingText: "جاري الاتصال بأقمار ناسا الصناعية...",
  home: "الرئيسية",
  tour: "الجولة",
  voice: "الصوت",
  voiceOn: "الصوت مفعل",
  step1Mark: "١. التحديد",
  step2Inputs: "٢. البيانات",
  step3Plan: "٣. التوقع",
  searchPlaceholder: "ابحث عن قريتك أو منطقتك أو مزرعتك...",
  go: "انطلق",
  saved: "المحفوظة",
  markMyField: "حدد أرضي",
  drawingActive: "وضع الرسم نشط",
  earth3d: "أرض ٣D",
  map2d: "خريطة ٢D",
  demoField: "حقل تجريبي",
  step1BannerTitle: "الخطوة ١ من ٣ • ابحث وحدد أرضك",
  step1BannerDesc:
    "ابحث عن قريتك أو استخدم الموقع أو الكرة الأرضية ثم ارسم حدود أرضك.",
  welcomeSub:
    "حدد حدود أرضك على الكرة الأرضية ثلاثية الأبعاد، وأدخل كمية المياه والمحصول السابق للحصول على خطط دورة زراعية مدعومة ببيانات ناسا.",
  view3dEarthBtn: "عرض الأرض ثلاثية الأبعاد",
  backToMap: "الأرض ٣D والخريطة",
  listenToPage: "استمع للصفحة",
  stopReading: "إيقاف القراءة",
  speakAnswers: "تحدث بإجاباتك",
  markedFarmParcel: "الأرض المحددة",
  sizeLabel: "المساحة:",
  tellUs3Things: "أخبرنا ٣ أشياء بسيطة عن أرضك",
  tellUs3Sub:
    "اختر الصور الكبيرة بالأسفل، أو اضغط استماع، أو اضغط التعبئة التلقائية من ناسا.",
  autoFillNasa: "تقدير المياه تلقائياً من ناسا",
  q1WaterTitle: "١. كم كمية المياه المتوفرة لهذه الأرض؟",
  q1WaterSub: "اختر الصورة الأقرب لطريقة ري محصولك.",
  totalWaterLabel: "إجمالي المياه المتاحة لأرضك",
  q2CropTitle: "٢. ما هو آخر محصول تمت زراعته هنا؟",
  q2CropSub: "تبديل المحاصيل يكسر دورة الآفات ويغذي التربة طبيعياً.",
  q3GoalTitle: "٣. ما هو أهم هدف لك هذا العام؟",
  redrawBtn: "إعادة رسم حدود الأرض",
  predictBtn: "توقع الدورة الزراعية وخطة ٣ سنوات",
  choose4Plans: "اختر أي خطة من الخطط الأربع المخصصة لاختبارها",
  predictMechanicTitle: "محاكي التوقع التفاعلي لـ ٣ سنوات",
  normalYear: "سنة طقس عادية",
  dryYear: "سنة جفاف وشح أمطار",
  wetYear: "سنة أمطار وفيرة",
  safeHarvest: "نسبة الحصاد الآمن المتوقعة",
  waterNeed: "الاحتياج المائي المتوقع",
  threeYrIncome: "الدخل المتوقع لـ ٣ سنوات",
  soilForecast: "تطور صحة التربة خلال ٣ سنوات",
  roadmapTitle: "خارطة الدورة الزراعية لـ ٣ سنوات (السنة ١ ← السنة ٢ ← السنة ٣)",
  changeAnswers: "تعديل الإجابات",
  markAnotherField: "تحديد أرض أخرى",
  printPlan: "طباعة الخطة",
  downloadGeoJson: "تنزيل GeoJSON",
};

const ES: UiTranslations = {
  signInPortal: "Iniciar Sesión • Portal Agrícola",
  orbitBadge: "Órbita: 705 km Heliosíncrona",
  missionSubtitle: "Misión Satelital de Rotación de Cultivos y Suelo",
  farmerNameLabel: "Nombre del Agricultor o Parcela",
  farmerNamePlaceholder: "ej. Ahmed AboAsal o Finca Nilo 01",
  farmPinLabel: "PIN de Finca de 4 dígitos (Opcional)",
  farmPinPlaceholder: "4 dígitos o dejar vacío",
  pinError: "El PIN debe tener 4 dígitos (o dejar vacío).",
  signInBtn: "Entrar al Panel Satelital",
  guestBtn: "Entrar como Agricultor Invitado",
  voiceHelperBtn: "Guía por Voz",
  voiceBannerTitle: "Guía de Voz Disponible",
  voiceBannerDesc:
    "¿Difícil leer? Toca el botón amarillo del altavoz cuando quieras y te guiaré paso a paso.",
  voiceBannerCta: "Toca Aquí para Ayuda por Voz",
  langStudioBtn: "Idioma y Voz",
  launchingText: "Conectando con Satélites NASA...",
  home: "Inicio",
  tour: "Guía",
  voice: "Voz",
  voiceOn: "Voz ON",
  step1Mark: "1. Marcar",
  step2Inputs: "2. Datos",
  step3Plan: "3. Plan",
  searchPlaceholder: "Buscar pueblo, región o finca...",
  go: "Ir",
  saved: "Guardados",
  markMyField: "Marcar Mi Tierra",
  drawingActive: "Dibujo Activo",
  earth3d: "Tierra 3D",
  map2d: "Mapa 2D",
  demoField: "Campo Demo",
  step1BannerTitle: "Paso 1 de 3 • Encuentra y Marca tu Tierra",
  step1BannerDesc: "Busca tu zona por nombre o GPS y marca las esquinas.",
  welcomeSub:
    "Marca tu parcela en la Tierra 3D, indica agua y último cultivo, y obtén planes de rotación respaldados por la NASA.",
  view3dEarthBtn: "Ver Tierra 3D",
  backToMap: "Tierra 3D y Mapa",
  listenToPage: "Escuchar Página",
  stopReading: "Detener Audio",
  speakAnswers: "Dictar Respuestas",
  markedFarmParcel: "Parcela Marcada",
  sizeLabel: "Tamaño:",
  tellUs3Things: "Cuéntanos 3 Cosas Simples Sobre Tu Tierra",
  tellUs3Sub:
    "Toca las tarjetas grandes, pulsa Escuchar o usa Auto-Rellenar NASA.",
  autoFillNasa: "Estimar Agua desde NASA",
  q1WaterTitle: "1. ¿Cuánta agua tiene esta parcela?",
  q1WaterSub: "Elige la opción que mejor describa tu riego.",
  totalWaterLabel: "Agua Total de Tu Parcela",
  q2CropTitle: "2. ¿Cuál fue el último cultivo cosechado?",
  q2CropSub: "Rotar familias corta plagas y recupera nutrientes.",
  q3GoalTitle: "3. ¿Qué es lo más importante este año?",
  redrawBtn: "Redibujar Límites",
  predictBtn: "Predecir Rotación y Pronóstico a 3 Años",
  choose4Plans: "Elige Cualquiera de Tus 4 Planes para Simular",
  predictMechanicTitle: "Simulador Interactivo a 3 Años",
  normalYear: "Año Normal",
  dryYear: "Año Seco / Sequía",
  wetYear: "Año Húmedo / Buena Lluvia",
  safeHarvest: "Cosecha Segura Estimada",
  waterNeed: "Agua Necesaria Estimada",
  threeYrIncome: "Ingreso Estimado a 3 Años",
  soilForecast: "Salud del Suelo en 3 Años",
  roadmapTitle: "Plan de Rotación a 3 Años (Año 1 → Año 2 → Año 3)",
  changeAnswers: "Cambiar Respuestas",
  markAnotherField: "Marcar Otra Tierra",
  printPlan: "Imprimir Plan",
  downloadGeoJson: "Descargar GeoJSON",
};

const FR: UiTranslations = {
  signInPortal: "Connexion • Portail Agricole",
  orbitBadge: "Orbite : 705 km Héliosynchrone",
  missionSubtitle: "Mission Satellite de Rotation des Cultures & Sols",
  farmerNameLabel: "Nom de l'Agriculteur ou Parcelle",
  farmerNamePlaceholder: "ex. Ahmed AboAsal ou Ferme Nil 01",
  farmPinLabel: "Code PIN à 4 chiffres (Optionnel)",
  farmPinPlaceholder: "4 chiffres ou laisser vide",
  pinError: "Le code PIN doit contenir 4 chiffres (ou rester vide).",
  signInBtn: "Accéder au Tableau Satellite",
  guestBtn: "Entrer comme Agriculteur Invité",
  voiceHelperBtn: "Assistant Vocal",
  voiceBannerTitle: "Guide Vocal Disponible",
  voiceBannerDesc:
    "Besoin d'aide ? Touchez le bouton jaune haut-parleur à tout moment pour être guidé à la voix.",
  voiceBannerCta: "Activer l'Aide Vocale",
  langStudioBtn: "Langue & Voix",
  launchingText: "Synchronisation Télémétrie NASA...",
  home: "Accueil",
  tour: "Visite",
  voice: "Voix",
  voiceOn: "Voix ON",
  step1Mark: "1. Tracer",
  step2Inputs: "2. Infos",
  step3Plan: "3. Plan",
  searchPlaceholder: "Rechercher village, région ou ferme...",
  go: "Aller",
  saved: "Sauvés",
  markMyField: "Tracer Mon Champ",
  drawingActive: "Tracé Actif",
  earth3d: "Terre 3D",
  map2d: "Carte 2D",
  demoField: "Parcelle Démo",
  step1BannerTitle: "Étape 1 sur 3 • Trouver & Tracer Votre Terre",
  step1BannerDesc: "Cherchez votre région par nom ou GPS, puis tracez votre champ.",
  welcomeSub:
    "Tracez votre parcelle sur la Terre 3D, indiquez votre eau et dernière culture pour recevoir des plans de rotation NASA.",
  view3dEarthBtn: "Voir Terre 3D",
  backToMap: "Terre 3D & Carte",
  listenToPage: "Écouter la Page",
  stopReading: "Arrêter l'Audio",
  speakAnswers: "Dicter Réponses",
  markedFarmParcel: "Parcelle Tracée",
  sizeLabel: "Surface :",
  tellUs3Things: "Dites-nous 3 Choses Simples Sur Votre Champ",
  tellUs3Sub:
    "Touchez les grandes cartes, cliquez sur Écouter ou utilisez l'estimation NASA.",
  autoFillNasa: "Estimer l'Eau via NASA",
  q1WaterTitle: "1. De quelle quantité d'eau disposez-vous ?",
  q1WaterSub: "Choisissez le mode d'irrigation le plus proche.",
  totalWaterLabel: "Eau Totale Disponible",
  q2CropTitle: "2. Quelle était la dernière culture récoltée ?",
  q2CropSub: "Alterner les familles limite les ravageurs et régénère le sol.",
  q3GoalTitle: "3. Quel est votre objectif principal cette année ?",
  redrawBtn: "Redessiner la Parcelle",
  predictBtn: "Prédire Ma Rotation & Prévisions 3 Ans",
  choose4Plans: "Choisissez L'un de Vos 4 Plans à Simuler",
  predictMechanicTitle: "Simulateur Météo & Sol sur 3 Ans",
  normalYear: "Année Météo Normale",
  dryYear: "Année Sèche / Sécheresse",
  wetYear: "Année Humide / Pluvieuse",
  safeHarvest: "Fiabilité de Récolte",
  waterNeed: "Besoin en Eau Estimé",
  threeYrIncome: "Revenu Estimé sur 3 Ans",
  soilForecast: "Santé du Sol sur 3 Ans",
  roadmapTitle: "Feuille de Route 3 Ans (Année 1 → Année 2 → Année 3)",
  changeAnswers: "Modifier Réponses",
  markAnotherField: "Tracer Un Autre Champ",
  printPlan: "Imprimer le Plan",
  downloadGeoJson: "Télécharger GeoJSON",
};

const HI: UiTranslations = {
  signInPortal: "साइन इन • किसान पोर्टल",
  orbitBadge: "कक्षा: 705 किमी सूर्य-समकालिक",
  missionSubtitle: "नासा उपग्रह फसल चक्र और मिट्टी स्वास्थ्य मिशन",
  farmerNameLabel: "किसान का नाम या खेत आईडी",
  farmerNamePlaceholder: "जैसे Ahmed AboAsal या खेत 01",
  farmPinLabel: "4-अंकीय पिन (वैकल्पिक)",
  farmPinPlaceholder: "4 अंक दर्ज करें या खाली छोड़ें",
  pinError: "पिन 4 अंकों का होना चाहिए (या खाली छोड़ें)।",
  signInBtn: "सैटेलाइट डैशबोर्ड खोलें",
  guestBtn: "अतिथि किसान के रूप में प्रवेश करें",
  voiceHelperBtn: "वॉइस गाइड",
  voiceBannerTitle: "आवाज़ सहायता उपलब्ध है",
  voiceBannerDesc:
    "पढ़ने में कठिनाई? चमकते पीले स्पीकर बटन को दबाएं और मैं बोलकर आपकी मदद करूंगा।",
  voiceBannerCta: "आवाज़ मदद के लिए यहाँ दबाएं",
  langStudioBtn: "भाषा और आवाज़",
  launchingText: "नासा उपग्रह डेटा से जुड़ रहा है...",
  home: "होम",
  tour: "गाइड",
  voice: "आवाज़",
  voiceOn: "आवाज़ चालू",
  step1Mark: "1. खेत चुनें",
  step2Inputs: "2. जानकारी",
  step3Plan: "3. योजना",
  searchPlaceholder: "गाँव, शहर या खेत खोजें...",
  go: "खोजें",
  saved: "सहेजे गए",
  markMyField: "खेत चिह्नित करें",
  drawingActive: "सीमा बना रहे हैं",
  earth3d: "3D पृथ्वी",
  map2d: "2D नक्शा",
  demoField: "डेमो खेत",
  step1BannerTitle: "चरण 1 / 3 • अपना खेत खोजें और चिह्नित करें",
  step1BannerDesc: "खोज या GPS से अपना इलाका चुनें, फिर खेत के कोने चिह्नित करें।",
  welcomeSub:
    "3D पृथ्वी पर अपने खेत की सीमा चुनें, पानी और पिछली फसल बताएं, और नासा डेटा आधारित फसल चक्र पाएं।",
  view3dEarthBtn: "3D पृथ्वी देखें",
  backToMap: "3D पृथ्वी और नक्शा",
  listenToPage: "पेज सुनें",
  stopReading: "बोलना रोकें",
  speakAnswers: "बोलकर बताएं",
  markedFarmParcel: "चयनित खेत",
  sizeLabel: "क्षेत्रफल:",
  tellUs3Things: "अपने खेत के बारे में 3 आसान बातें बताएं",
  tellUs3Sub: "नीचे बड़े कार्ड चुनें, सुनें दबाएं, या नासा ऑटो-फिल उपयोग करें।",
  autoFillNasa: "नासा से पानी अनुमान भरें",
  q1WaterTitle: "1. इस खेत में कितना पानी उपलब्ध है?",
  q1WaterSub: "सिंचाई के अनुसार सही विकल्प चुनें।",
  totalWaterLabel: "खेत का कुल पानी",
  q2CropTitle: "2. यहाँ पिछली फसल कौन-सी थी?",
  q2CropSub: "फसल बदलने से कीट रुकते हैं और मिट्टी की ताकत बढ़ती है।",
  q3GoalTitle: "3. इस वर्ष आपकी मुख्य प्राथमिकता क्या है?",
  redrawBtn: "सीमा फिर से बनाएं",
  predictBtn: "फसल चक्र और 3-वर्षीय अनुमान देखें",
  choose4Plans: "जांचने के लिए कोई भी 4 फसल योजना चुनें",
  predictMechanicTitle: "इंटरएक्टिव 3-वर्षीय मौसम व फसल अनुमान",
  normalYear: "सामान्य मौसम वर्ष",
  dryYear: "सूखा / कम बारिश वर्ष",
  wetYear: "अच्छी बारिश वर्ष",
  safeHarvest: "सुरक्षित फसल संभावना",
  waterNeed: "अनुमानित पानी आवश्यकता",
  threeYrIncome: "अनुमानित 3-वर्षीय आय",
  soilForecast: "3-वर्षीय मिट्टी स्वास्थ्य",
  roadmapTitle: "3-वर्षीय फसल चक्र रोडमैप (वर्ष 1 → वर्ष 2 → वर्ष 3)",
  changeAnswers: "उत्तर बदलें",
  markAnotherField: "दूसरा खेत चुनें",
  printPlan: "योजना प्रिंट करें",
  downloadGeoJson: "GeoJSON डाउनलोड करें",
};

const DICTIONARY: Record<AppLanguage, UiTranslations> = {
  en: EN,
  ar: AR,
  es: ES,
  fr: FR,
  hi: HI,
};

export function getTranslations(lang: AppLanguage): UiTranslations {
  return DICTIONARY[lang] ?? EN;
}

export function getWelcomeVoicePrompt(lang: AppLanguage): string {
  switch (lang) {
    case "ar":
      return "مرحباً بك في ناسا فارم فيجن. إذا كانت القراءة صعبة أو أردت المساعدة الصوتية، اضغط على أيقونة السماعة الصفراء المضيئة في أي وقت وسأرشدك خطوة بخطوة.";
    case "es":
      return "Bienvenido a NASA FARMVISION. Si prefiere ayuda por voz, toque el botón amarillo del altavoz en cualquier momento y lo guiaré paso a paso.";
    case "fr":
      return "Bienvenue sur NASA FARMVISION. Si vous préférez être guidé à la voix, touchez le bouton jaune haut-parleur à tout moment.";
    case "hi":
      return "नासा फार्मविज़न में आपका स्वागत है। यदि आपको आवाज़ सहायता चाहिए, तो पीले स्पीकर बटन को दबाएं और मैं कदम-दर-कदम आपकी मदद करूंगा।";
    default:
      return "Welcome to NASA × FARMVISION. If reading is difficult or you want voice help, tap the glowing yellow speaker icon with the sound waves at any time, and I will guide you step by step with my voice.";
  }
}

const PERSONA_LOCALIZED_NAMES: Record<string, Record<AppLanguage, string>> = {
  "friendly-guide": {
    en: "Friendly Farm Guide",
    ar: "المرشد الزراعي الودود",
    es: "Guía Agrícola Amigable",
    fr: "Guide Agricole Convivial",
    hi: "मित्रवत किसान गाइड",
  },
  "slow-clear": {
    en: "Slow & Clear",
    ar: "القراءة البطيئة والواضحة",
    es: "Voz Lenta y Clara",
    fr: "Voix Lente et Claire",
    hi: "धीमी और स्पष्ट आवाज़",
  },
  "nasa-mission": {
    en: "NASA Mission Control",
    ar: "مركز مهمة ناسا",
    es: "Control de Misión NASA",
    fr: "Mission NASA",
    hi: "नासा मिशन कंट्रोल",
  },
  "outdoor-bright": {
    en: "Outdoor High-Clarity",
    ar: "صوت خارجي عالي الوضوح",
    es: "Claridad Exterior",
    fr: "Haute Clarté Extérieure",
    hi: "आउटडोर स्पष्ट आवाज़",
  },
};

function resolveLocalizedPersonaName(
  personaIdOrName: string,
  lang: AppLanguage
): string {
  const direct = PERSONA_LOCALIZED_NAMES[personaIdOrName]?.[lang];
  if (direct) return direct;
  const lower = personaIdOrName.toLowerCase();
  if (lower.includes("slow")) return PERSONA_LOCALIZED_NAMES["slow-clear"][lang];
  if (lower.includes("nasa") || lower.includes("mission")) {
    return PERSONA_LOCALIZED_NAMES["nasa-mission"][lang];
  }
  if (lower.includes("outdoor") || lower.includes("clarity")) {
    return PERSONA_LOCALIZED_NAMES["outdoor-bright"][lang];
  }
  return PERSONA_LOCALIZED_NAMES["friendly-guide"][lang];
}

export function getSampleVoiceSentence(
  lang: AppLanguage,
  personaIdOrName: string
): string {
  const name = resolveLocalizedPersonaName(personaIdOrName, lang);
  switch (lang) {
    case "ar":
      return `مرحباً، أنا ${name}. يمكنني قراءة حالة الطقس من ناسا واقتراح أفضل دورة زراعية لأرضك بصوت واضح.`;
    case "es":
      return `Hola, soy ${name}. Puedo leer los datos climáticos de la NASA y recomendar rotaciones de cultivos para su parcela.`;
    case "fr":
      return `Bonjour, je suis ${name}. Je peux lire les données NASA et vous guider pour choisir votre rotation de cultures.`;
    case "hi":
      return `नमस्ते, मैं ${name} हूँ। मैं आपके खेत के लिए नासा मौसम और सर्वोत्तम फसल चक्र पढ़कर बता सकता हूँ।`;
    default:
      return `Hello, I am ${name}. I can read NASA weather data, rainfall trends, and your 3-year crop rotation plan aloud clearly.`;
  }
}

export interface VoicePrompts {
  voiceHelperLogin: string;
  voiceHelperWelcome: string;
  voiceHelperMap: string;
  fieldMarked: (fieldName: string) => string;
  q1Listen: string;
  q2Listen: string;
  q3Listen: string;
  readInputsPage: (
    fieldName: string,
    areaVal: string,
    areaUnit: string,
    waterM3: number,
    lastCrop: string
  ) => string;
  readPlansPage: (
    planName: string,
    crop1: string,
    crop2: string,
    crop3: string,
    reliabilityPct: number,
    soil1: number,
    soil3: number,
    incomeUsd: number
  ) => string;
  readPlanCard: (
    planName: string,
    crop1: string,
    crop2: string,
    crop3: string,
    soilScore: number,
    resilienceScore: number
  ) => string;
  waterTierSpeech: (tier: "low" | "moderate" | "high", m3: number) => string;
  lastCropSpeech: (cropTranslated: string) => string;
  prioritySpeech: (priority: "profit" | "sustainability" | "water-saving") => string;
  autoFillSpeech: (m3: number) => string;
  predictingSpeech: (planName: string) => string;
  scenarioSpeech: (
    scenarioLabel: string,
    reliabilityPct: number,
    soil3: number
  ) => string;
  climateSpeech: (rainMm: number, dryMonthsCount: number) => string;
}

const VOICE_PROMPTS: Record<AppLanguage, VoicePrompts> = {
  en: {
    voiceHelperLogin:
      "Voice helper is now on. Tap the green Sign In button in the middle of the screen, or tap Enter as Guest Farmer below it to launch the 3D Earth.",
    voiceHelperWelcome:
      "Voice helper is now on. Tap View 3D Earth in the center of your screen, or tap Next on the tour card to begin.",
    voiceHelperMap:
      "Voice helper is now on. Use the search bar, blue microphone, or green GPS target at the top to find your farm, then tap Mark My Field.",
    fieldMarked: (fieldName) =>
      `Field ${fieldName} marked. Flying through the clouds to your farm planner.`,
    q1Listen:
      "Question 1. How much water does this field have? Choose Little Water for mostly rain, Medium Water for canal or well pump, or Plenty of Water for drip or river pump.",
    q2Listen:
      "Question 2. Tap the picture of the last crop you harvested from this field so we protect soil nutrients and stop repeating crop diseases.",
    q3Listen:
      "Question 3. Pick your main goal: More Money, Healthy Land for Years, or Save Water for dry weather.",
    readInputsPage: (fieldName, areaVal, areaUnit, waterM3, lastCrop) =>
      `You are setting up ${fieldName}, measuring ${areaVal} ${areaUnit}. Water supply is ${waterM3} cubic meters per hectare. Your last crop was ${lastCrop}. Tap Predict My Crop Rotation when ready.`,
    readPlansPage: (planName, c1, c2, c3, rel, s1, s3, inc) =>
      `Top recommended plan is ${planName}. First plant ${c1}, then ${c2}, then ${c3}. Safe harvest probability is ${rel} percent, soil health grows from ${s1} to ${s3} percent, and predicted yearly income is ${inc.toLocaleString()} dollars.`,
    readPlanCard: (planName, c1, c2, c3, soilScore, resScore) =>
      `${planName}. First season plant ${c1}, second season plant ${c2}, third season plant ${c3}. Soil health score is ${soilScore} percent and weather resilience is ${resScore} percent.`,
    waterTierSpeech: (tier, m3) =>
      tier === "low"
        ? `Little water selected, around ${m3} cubic meters per hectare, suited for mostly rain-fed drought-hardy crops.`
        : tier === "high"
          ? `Plenty of water selected, around ${m3} cubic meters per hectare, suited for full-year multi-crop rotations.`
          : `Medium water selected, around ${m3} cubic meters per hectare, suited for balanced canal or well irrigation.`,
    lastCropSpeech: (cropTranslated) =>
      `Last harvested crop set to ${cropTranslated}. Rotating to a different plant family restores nutrients and breaks pest cycles.`,
    prioritySpeech: (priority) =>
      priority === "profit"
        ? "Goal set to More Money. Prioritizing high-value market crops."
        : priority === "sustainability"
          ? "Goal set to Healthy Land. Prioritizing legumes and cover crops to rebuild soil fertility."
          : "Goal set to Save Water. Prioritizing drought-tolerant crops with high water efficiency.",
    autoFillSpeech: (m3) =>
      `NASA set your water estimate to ${m3} cubic meters per hectare based on local soil moisture and rainfall.`,
    predictingSpeech: (planName) =>
      `Predicting your crop rotation now. Top recommended plan is ${planName}.`,
    scenarioSpeech: (scenarioLabel, rel, soil3) =>
      `In ${scenarioLabel}, safe harvest probability is ${rel} percent and year-three soil health reaches ${soil3} percent.`,
    climateSpeech: (rainMm, dryMonthsCount) =>
      `NASA satellites report an average of ${rainMm} millimeters of rain per year with ${dryMonthsCount} dry months per year on this field.`,
  },
  ar: {
    voiceHelperLogin:
      "المساعد الصوتي مفعّل الآن. اضغط على زر تسجيل الدخول الأخضر في منتصف الشاشة، أو اضغط على أدخل كضيف مزارع أسفله لفتح الكرة الأرضية ثلاثية الأبعاد.",
    voiceHelperWelcome:
      "المساعد الصوتي مفعّل الآن. اضغط على عرض الأرض ثلاثية الأبعاد في منتصف الشاشة، أو اضغط على التالي في بطاقة الدليل للبدء.",
    voiceHelperMap:
      "المساعد الصوتي مفعّل الآن. استخدم شريط البحث أو الميكروفون أو زر الموقع في الأعلى للعثور على مزرعتك، ثم اضغط على حدد أرضي.",
    fieldMarked: (fieldName) =>
      `تم تحديد أرض ${fieldName}. ننتقل الآن إلى مخطط الدورة الزراعية الخاص بك.`,
    q1Listen:
      "السؤال الأول: ما كمية المياه المتوفرة لهذه الأرض؟ اختر مياه قليلة للاعتماد على الأمطار، أو مياه متوسطة للترعة والبئر، أو مياه وفيرة للري الحديث.",
    q2Listen:
      "السؤال الثاني: اختر آخر محصول حصدته من هذه الأرض حتى نحمي خصوبة التربة ونمنع أمراض المحاصيل المتكررة.",
    q3Listen:
      "السؤال الثالث: اختر هدفك الأساسي هذا العام: أعلى ربح، أو صحة التربة لسنوات، أو توفير المياه لمواجهة الجفاف.",
    readInputsPage: (fieldName, areaVal, areaUnit, waterM3, lastCrop) =>
      `أنت تقوم بإعداد ${fieldName} بمساحة ${areaVal} ${areaUnit}. كمية المياه المتاحة ${waterM3} متر مكعب للهكتار، وكان آخر محصول هو ${lastCrop}. اضغط على توقع الدورة الزراعية عندما تكون جاهزاً.`,
    readPlansPage: (planName, c1, c2, c3, rel, s1, s3, inc) =>
      `الخطة الموصى بها هي ${planName}. ازرع أولاً ${c1}، ثم ${c2}، ثم ${c3}. نسبة أمان المحصول ${rel} في المئة، وتتحسن صحة التربة من ${s1} إلى ${s3} في المئة، والدخل السنوي المتوقع حوالي ${inc} دولار.`,
    readPlanCard: (planName, c1, c2, c3, soilScore, resScore) =>
      `${planName}. الموسم الأول ازرع ${c1}، والموسم الثاني ${c2}، والموسم الثالث ${c3}. تقييم صحة التربة ${soilScore} في المئة والمرونة المناخية ${resScore} في المئة.`,
    waterTierSpeech: (tier, m3) =>
      tier === "low"
        ? `تم اختيار مياه قليلة، حوالي ${m3} متر مكعب للهكتار، مناسبة للمحاصيل المقاومة للجفاف.`
        : tier === "high"
          ? `تم اختيار مياه وفيرة، حوالي ${m3} متر مكعب للهكتار، مناسبة لزراعة ثلاث دورات متتالية طوال العام.`
          : `تم اختيار مياه متوسطة، حوالي ${m3} متر مكعب للهكتار، مناسبة لري الترعة أو البئر المتوازن.`,
    lastCropSpeech: (cropTranslated) =>
      `تم تحديد آخر محصول كالتالي: ${cropTranslated}. تغيير العائلة النباتية يجدد خصوبة التربة ويقلل الآفات.`,
    prioritySpeech: (priority) =>
      priority === "profit"
        ? "الهدف المحدد هو أعلى ربح مالي باختيار محاصيل عالية العائد."
        : priority === "sustainability"
          ? "الهدف المحدد هو صحة التربة لسنوات بإضافة البقوليات والغطاء النباتي."
          : "الهدف المحدد هو توفير المياه باختيار محاصيل تتحمل الجفاف والحرارة.",
    autoFillSpeech: (m3) =>
      `حددت أقمار ناسا تقدير المياه إلى ${m3} متر مكعب للهكتار حسب رطوبة التربة والأمطار في أرضك.`,
    predictingSpeech: (planName) =>
      `جاري حساب توقعات الدورة الزراعية الآن. الخطة الأفضل هي ${planName}.`,
    scenarioSpeech: (scenarioLabel, rel, soil3) =>
      `في سيناريو ${scenarioLabel}، تبلغ احتمالية أمان المحصول ${rel} في المئة وتصل صحة التربة في السنة الثالثة إلى ${soil3} في المئة.`,
    climateSpeech: (rainMm, dryMonthsCount) =>
      `تسجل أقمار ناسا متوسط أمطار سنوي يبلغ ${rainMm} ملليمتر مع ${dryMonthsCount} أشهر جفاف في هذه الأرض.`,
  },
  es: {
    voiceHelperLogin:
      "La ayuda por voz está activada. Pulse el botón verde Iniciar Sesión en el centro o Entrar como Invitado debajo para abrir la Tierra 3D.",
    voiceHelperWelcome:
      "La ayuda por voz está activada. Pulse Ver Tierra 3D en el centro o Siguiente en la guía para comenzar.",
    voiceHelperMap:
      "La ayuda por voz está activada. Use el buscador, el micrófono o el botón GPS arriba para ubicar su finca y luego pulse Marcar Mi Parcela.",
    fieldMarked: (fieldName) =>
      `Parcela ${fieldName} marcada. Volando entre las nubes hacia su planificador agrícola.`,
    q1Listen:
      "Pregunta 1. ¿Cuánta agua tiene esta parcela? Elija Poca Agua para lluvia, Agua Media para canal o pozo, o Agua Abundante para goteo o río.",
    q2Listen:
      "Pregunta 2. Seleccione el último cultivo cosechado aquí para proteger los nutrientes del suelo y cortar plagas.",
    q3Listen:
      "Pregunta 3. Elija su objetivo principal: Más Ganancia, Suelo Sano a Largo Plazo o Ahorrar Agua.",
    readInputsPage: (fieldName, areaVal, areaUnit, waterM3, lastCrop) =>
      `Está configurando ${fieldName}, con ${areaVal} ${areaUnit}. Agua disponible: ${waterM3} metros cúbicos por hectárea. Último cultivo: ${lastCrop}. Pulse Predecir Mi Rotación cuando esté listo.`,
    readPlansPage: (planName, c1, c2, c3, rel, s1, s3, inc) =>
      `El mejor plan es ${planName}. Primero siembre ${c1}, luego ${c2} y después ${c3}. Seguridad de cosecha del ${rel} por ciento, salud del suelo de ${s1} a ${s3} por ciento e ingreso anual estimado de ${inc} dólares.`,
    readPlanCard: (planName, c1, c2, c3, soilScore, resScore) =>
      `${planName}. Primera etapa: ${c1}; segunda etapa: ${c2}; tercera etapa: ${c3}. Salud del suelo: ${soilScore} por ciento y resiliencia climática: ${resScore} por ciento.`,
    waterTierSpeech: (tier, m3) =>
      tier === "low"
        ? `Poca agua seleccionada, unos ${m3} metros cúbicos por hectárea, ideal para cultivos resistentes a la sequía.`
        : tier === "high"
          ? `Agua abundante seleccionada, unos ${m3} metros cúbicos por hectárea, ideal para ciclos completos todo el año.`
          : `Agua media seleccionada, unos ${m3} metros cúbicos por hectárea, ideal para riego equilibrado de canal o pozo.`,
    lastCropSpeech: (cropTranslated) =>
      `Último cultivo seleccionado: ${cropTranslated}. Rotar de familia vegetal recupera nutrientes y frena plagas.`,
    prioritySpeech: (priority) =>
      priority === "profit"
        ? "Objetivo fijado en Más Ganancia con cultivos de mayor valor comercial."
        : priority === "sustainability"
          ? "Objetivo fijado en Suelo Sano priorizando leguminosas y coberturas regenerativas."
          : "Objetivo fijado en Ahorrar Agua priorizando cultivos tolerantes al calor y sequía.",
    autoFillSpeech: (m3) =>
      `La NASA estimó su agua disponible en ${m3} metros cúbicos por hectárea según la humedad local del suelo.`,
    predictingSpeech: (planName) =>
      `Calculando su rotación agrícola ahora. El plan principal recomendado es ${planName}.`,
    scenarioSpeech: (scenarioLabel, rel, soil3) =>
      `En el escenario ${scenarioLabel}, la seguridad de cosecha es del ${rel} por ciento y la salud del suelo sube al ${soil3} por ciento en el año tres.`,
    climateSpeech: (rainMm, dryMonthsCount) =>
      `Los satélites de la NASA indican un promedio de ${rainMm} milímetros de lluvia al año con ${dryMonthsCount} meses secos.`,
  },
  fr: {
    voiceHelperLogin:
      "L'assistant vocal est activé. Appuyez sur le bouton vert Connexion au centre ou sur Entrer en tant qu'Invité pour ouvrir la Terre 3D.",
    voiceHelperWelcome:
      "L'assistant vocal est activé. Touchez Voir Terre 3D au centre ou Suivant dans le guide pour commencer.",
    voiceHelperMap:
      "L'assistant vocal est activé. Utilisez la recherche, le micro ou le GPS en haut pour trouver votre champ puis touchez Tracer Mon Champ.",
    fieldMarked: (fieldName) =>
      `Parcelle ${fieldName} tracée. Passage vers votre planificateur de rotation agricole.`,
    q1Listen:
      "Question 1. Quelle quantité d'eau avez-vous sur ce champ ? Choisissez Eau Limitée, Eau Moyenne ou Eau Abondante.",
    q2Listen:
      "Question 2. Touchez la dernière culture récoltée sur cette parcelle afin de préserver la fertilité du sol.",
    q3Listen:
      "Question 3. Choisissez votre objectif principal : Revenu Maximal, Sol Sain Long Terme ou Économiser l'Eau.",
    readInputsPage: (fieldName, areaVal, areaUnit, waterM3, lastCrop) =>
      `Vous configurez ${fieldName}, mesurant ${areaVal} ${areaUnit}. Apport en eau de ${waterM3} mètres cubes par hectare. Dernière culture : ${lastCrop}. Touchez Prédire Ma Rotation quand vous êtes prêt.`,
    readPlansPage: (planName, c1, c2, c3, rel, s1, s3, inc) =>
      `Le plan recommandé est ${planName}. Plantez d'abord ${c1}, ensuite ${c2}, puis ${c3}. Fiabilité de récolte de ${rel} pour cent, santé du sol de ${s1} à ${s3} pour cent et revenu annuel estimé à ${inc} dollars.`,
    readPlanCard: (planName, c1, c2, c3, soilScore, resScore) =>
      `${planName}. Étape 1 : ${c1}. Étape 2 : ${c2}. Étape 3 : ${c3}. Score santé du sol ${soilScore} pour cent et résilience météo ${resScore} pour cent.`,
    waterTierSpeech: (tier, m3) =>
      tier === "low"
        ? `Eau limitée sélectionnée, environ ${m3} mètres cubes par hectare, adaptée aux cultures sobres.`
        : tier === "high"
          ? `Eau abondante sélectionnée, environ ${m3} mètres cubes par hectare, adaptée aux rotations intensives.`
          : `Eau moyenne sélectionnée, environ ${m3} mètres cubes par hectare, adaptée à une irrigation équilibrée.`,
    lastCropSpeech: (cropTranslated) =>
      `Dernière culture définie sur ${cropTranslated}. Changer de famille végétale régénère le sol.`,
    prioritySpeech: (priority) =>
      priority === "profit"
        ? "Objectif fixé sur Revenu Maximal avec des cultures à forte valeur."
        : priority === "sustainability"
          ? "Objectif fixé sur Sol Sain en privilégiant légumineuses et couverts."
          : "Objectif fixé sur Économiser l'Eau avec des cultures tolérantes à la sécheresse.",
    autoFillSpeech: (m3) =>
      `La NASA a estimé votre eau à ${m3} mètres cubes par hectare selon l'humidité locale.`,
    predictingSpeech: (planName) =>
      `Calcul de votre rotation en cours. Le meilleur plan recommandé est ${planName}.`,
    scenarioSpeech: (scenarioLabel, rel, soil3) =>
      `Pour le scénario ${scenarioLabel}, la fiabilité de récolte est de ${rel} pour cent et la santé du sol atteint ${soil3} pour cent à l'année trois.`,
    climateSpeech: (rainMm, dryMonthsCount) =>
      `Les satellites NASA indiquent ${rainMm} millimètres de pluie par an en moyenne et ${dryMonthsCount} mois secs.`,
  },
  hi: {
    voiceHelperLogin:
      "आवाज़ सहायता चालू है। स्क्रीन के बीच में हरे साइन इन बटन को दबाएं, या नीचे अतिथि किसान बटन दबाकर 3D पृथ्वी खोलें।",
    voiceHelperWelcome:
      "आवाज़ सहायता चालू है। शुरू करने के लिए बीच में 3D पृथ्वी देखें बटन या गाइड में अगला बटन दबाएं।",
    voiceHelperMap:
      "आवाज़ सहायता चालू है। अपना खेत खोजने के लिए ऊपर खोज बॉक्स, माइक या जीपीएस बटन दबाएं, फिर खेत चिह्नित करें।",
    fieldMarked: (fieldName) =>
      `${fieldName} खेत चिह्नित हो गया। अब आपकी फसल योजना तैयार की जा रही है।`,
    q1Listen:
      "पहला प्रश्न: इस खेत में कितना पानी है? बारिश के लिए कम पानी, नहर या ट्यूबवेल के लिए मध्यम पानी, या ड्रिप के लिए भरपूर पानी चुनें।",
    q2Listen:
      "दूसरा प्रश्न: यहाँ पिछली बार कौन-सी फसल उगाई गई थी चुनें ताकि मिट्टी की ताकत बनी रहे और रोग न लगें।",
    q3Listen:
      "तीसरा प्रश्न: अपना मुख्य लक्ष्य चुनें: अधिक कमाई, टिकाऊ स्वस्थ मिट्टी, या सूखे से बचाव के लिए पानी बचाना।",
    readInputsPage: (fieldName, areaVal, areaUnit, waterM3, lastCrop) =>
      `आप ${fieldName} खेत सेट कर रहे हैं, क्षेत्रफल ${areaVal} ${areaUnit} है। पानी ${waterM3} घन मीटर प्रति हेक्टेयर और पिछली फसल ${lastCrop} है। तैयार होने पर फसल चक्र बटन दबाएं।`,
    readPlansPage: (planName, c1, c2, c3, rel, s1, s3, inc) =>
      `सर्वोत्तम योजना ${planName} है। पहले ${c1}, फिर ${c2}, और फिर ${c3} लगाएं। सुरक्षित फसल संभावना ${rel} प्रतिशत, मिट्टी स्वास्थ्य ${s1} से ${s3} प्रतिशत और वार्षिक आय लगभग ${inc} डॉलर है।`,
    readPlanCard: (planName, c1, c2, c3, soilScore, resScore) =>
      `${planName}। पहला मौसम ${c1}, दूसरा मौसम ${c2}, तीसरा मौसम ${c3}। मिट्टी स्वास्थ्य ${soilScore} प्रतिशत और मौसम सहनशक्ति ${resScore} प्रतिशत है।`,
    waterTierSpeech: (tier, m3) =>
      tier === "low"
        ? `कम पानी चुना गया, लगभग ${m3} घन मीटर प्रति हेक्टेयर, सूखा सहनशील फसलों के लिए उपयुक्त।`
        : tier === "high"
          ? `भरपूर पानी चुना गया, लगभग ${m3} घन मीटर प्रति हेक्टेयर, साल भर बहु-फसल चक्र के लिए उपयुक्त।`
          : `मध्यम पानी चुना गया, लगभग ${m3} घन मीटर प्रति हेक्टेयर, संतुलित सिंचाई के लिए उपयुक्त।`,
    lastCropSpeech: (cropTranslated) =>
      `पिछली फसल ${cropTranslated} चुनी गई। फसल परिवार बदलने से मिट्टी मजबूत होती है और कीट कम होते हैं।`,
    prioritySpeech: (priority) =>
      priority === "profit"
        ? "लक्ष्य अधिक कमाई चुना गया। उच्च आय वाली फसलें प्राथमिकता में हैं।"
        : priority === "sustainability"
          ? "लक्ष्य स्वस्थ मिट्टी चुना गया। दलहन और हरी खाद फसलें प्राथमिकता में हैं।"
          : "लक्ष्य पानी बचाना चुना गया। कम पानी वाली मजबूत फसलें प्राथमिकता में हैं।",
    autoFillSpeech: (m3) =>
      `नासा ने स्थानीय मिट्टी की नमी के आधार पर पानी ${m3} घन मीटर प्रति हेक्टेयर सेट किया है।`,
    predictingSpeech: (planName) =>
      `फसल चक्र का अनुमान लगाया जा रहा है। सर्वोत्तम योजना ${planName} है।`,
    scenarioSpeech: (scenarioLabel, rel, soil3) =>
      `${scenarioLabel} में सुरक्षित फसल संभावना ${rel} प्रतिशत और तीसरे वर्ष मिट्टी स्वास्थ्य ${soil3} प्रतिशत रहने का अनुमान है।`,
    climateSpeech: (rainMm, dryMonthsCount) =>
      `नासा उपग्रह डेटा के अनुसार यहाँ औसत वार्षिक वर्षा ${rainMm} मिलीमीटर और ${dryMonthsCount} शुष्क महीने हैं।`,
  },
};

export function getVoicePrompts(lang: AppLanguage): VoicePrompts {
  return VOICE_PROMPTS[lang] ?? VOICE_PROMPTS.en;
}

export interface TutorialStepTranslation {
  id: "welcome" | "location" | "views" | "mark-field" | "plan-steps" | "practice";
  target: string;
  title: string;
  description: string;
  tip: string;
  voiceText: string;
}

export interface TutorialTranslations {
  steps: TutorialStepTranslation[];
  whatEveryIconDoes: string;
  searchTitle: string;
  searchDesc: string;
  micTitle: string;
  micDesc: string;
  micNotice: string;
  tryBtn: string;
  gpsTitle: string;
  gpsDesc: string;
  gpsNotice: string;
  tryGpsBtn: string;
  compassTitle: string;
  compassDesc: string;
  hideBtn: string;
  latLngBtn: string;
  goBtn: string;
  coordError: string;
  coordMovedPrefix: string;
  quickRegionsTitle: string;
  quickRegionsDesc: string;
  flyingToPrefix: string;
  switchedTo2d: string;
  switchedTo3d: string;
  switchTo2d: string;
  switchTo3d: string;
  drawNotice: string;
  drawingActive: string;
  startDrawTool: string;
  tryDemoField: string;
  listen: string;
  listenTitle: string;
  skipTour: string;
  stepOf: (current: number, total: number) => string;
  back: string;
  oneStepAtATime: string;
  next: string;
  finishTour: string;
  quickPracticeHeader: (done: number, total: number) => string;
  item1EnterEarth: string;
  item2FindLocation: string;
  item3MarkField: string;
  item4GeneratePlan: string;
  allCompleted: string;
  startGuidedTour: string;
}

const TUTORIAL_DICTIONARY: Record<AppLanguage, TutorialTranslations> = {
  en: {
    steps: [
      {
        id: "welcome",
        target: "welcome-cta",
        title: "1. Welcome — Enter the 3D Earth",
        description:
          "Welcome to NASA × FARMVISION! Behind this title is a live interactive 3D Earth powered by NASA satellites. Click View 3D Earth or press Next → to begin.",
        tip: "Clicking Next → transitions straight into the 3D Earth and opens Step 2.",
        voiceText:
          "1. Welcome — Enter the 3D Earth. Behind this title is a live interactive 3D Earth powered by NASA satellites. Click View 3D Earth or press Next to begin.",
      },
      {
        id: "location",
        target: "location-search",
        title: "2. Find Your Farm — What Every Icon Does",
        description:
          "Each icon in the top search bar helps you find your land in a different way. Here is what every icon does:",
        tip: "Try any tool above (or tap one below) whenever you like — or press Next → to keep going:",
        voiceText:
          "2. Find Your Farm — What Every Icon Does. 1. Search Bar and Go: type your village or town name and press Go. 2. Voice Mic: tap to speak your village name out loud instead of typing. 3. GPS Target: jumps straight to your device location. 4. Compass: enter latitude and longitude coordinates. 5. Quick Regions: tap a sample farm region to jump right there.",
      },
      {
        id: "views",
        target: "view-switcher",
        title: "3. Switch Between 3D Earth & 2D Satellite Map",
        description:
          "Explore the planet in 3D Earth view, or click 2D Map (or zoom in close) for flat overhead satellite photos of your fields.",
        tip: "In 2D Map view you can also inspect satellite field imagery before marking your plot:",
        voiceText:
          "3. Switch Between 3D Earth and 2D Satellite Map. Explore in 3D Earth view, or click 2D Map for flat overhead satellite photos of your fields.",
      },
      {
        id: "mark-field",
        target: "mark-field-btn",
        title: "4. Mark Your Field Boundary",
        description:
          "Click Mark My Field in the top-right to turn on corner drawing on the map. Tap 3 or 4 corners around your plot and press Finish Land.",
        tip: "Preview drawing mode below, launch a sample farm, or click Next → anytime:",
        voiceText:
          "4. Mark Your Field Boundary. Click Mark My Field in the top-right to draw 3 or 4 corners around your plot and press Finish Land.",
      },
      {
        id: "plan-steps",
        target: "step-progress",
        title: "5. Answer 3 Simple Questions → Get Your Crop Plan",
        description:
          "Once your field is marked, clouds sweep across to your planner where you pick Water Supply, Last Crop, and Goal to get a simple 1-Year Plan & 3-Year Forecast.",
        tip: "Use these 3 top-bar tabs anytime to jump back and adjust your answers.",
        voiceText:
          "5. Answer 3 Simple Questions to Get Your Crop Plan. Choose Water Supply, Last Crop, and Main Goal to see a personalized 1-Year Plan and 3-Year Forecast.",
      },
      {
        id: "practice",
        target: "quick-practice",
        title: '6. Interactive "Quick Practice" Checklist',
        description:
          "Put your new skills into action! This live drawer tracks your 4 steps—entering the 3D Earth, finding your location, marking your land, and generating your crop plan.",
        tip: "You can replay this spotlight tour anytime by clicking Tour in the top bar or Start Guided Tour inside the checklist!",
        voiceText:
          "6. Interactive Quick Practice Checklist. This panel tracks your 4 progress steps from opening the 3D Earth to generating your crop plan.",
      },
    ],
    whatEveryIconDoes: "What Every Icon Does",
    searchTitle: "Search Box & Go",
    searchDesc: "Type your village, town, or farm area above, then tap Go.",
    micTitle: "Voice Mic (Speak)",
    micDesc: "Tap to say your village or region out loud — no typing needed.",
    micNotice: "Voice Mic ready — speak your town or use a sample region!",
    tryBtn: "Try",
    gpsTitle: "GPS Target Icon",
    gpsDesc: "Jumps straight to where you are standing using device GPS.",
    gpsNotice: "Requesting device GPS location!",
    tryGpsBtn: "Try GPS",
    compassTitle: "Compass (Lat / Lng)",
    compassDesc: "Enter exact latitude & longitude numbers for your plot.",
    hideBtn: "Hide",
    latLngBtn: "Lat/Lng",
    goBtn: "Go",
    coordError: "Lat -90..90, Lng -180..180",
    coordMovedPrefix: "Moved to",
    quickRegionsTitle: "Quick Region Shortcuts",
    quickRegionsDesc: "Tap a sample region to jump there immediately:",
    flyingToPrefix: "Flying map to",
    switchedTo2d: "Switched to 2D Satellite Map!",
    switchedTo3d: "Switched to 3D Earth!",
    switchTo2d: "Switch to 2D Map",
    switchTo3d: "Switch to 3D Earth",
    drawNotice: "Draw tool active — tap corners on the map anytime!",
    drawingActive: "Drawing Active ✓",
    startDrawTool: "Start Draw Tool",
    tryDemoField: "Try Demo Field",
    listen: "Listen",
    listenTitle: "Listen to this step read aloud",
    skipTour: "Skip Tour",
    stepOf: (c, tot) => `STEP ${c} OF ${tot}`,
    back: "Back",
    oneStepAtATime: "1 step at a time",
    next: "Next",
    finishTour: "Finish Tour",
    quickPracticeHeader: (done, tot) => `Quick Practice: ${done}/${tot} completed`,
    item1EnterEarth: "Enter the 3D Earth view",
    item2FindLocation: "Find a location (Search, Voice, GPS, or Coords)",
    item3MarkField: "Mark your field corners (or load Demo Field)",
    item4GeneratePlan: "Generate your 1-Year Crop Plan",
    allCompleted: "All 4 steps completed! Ready to farm smarter.",
    startGuidedTour: "Start Guided Tour",
  },
  ar: {
    steps: [
      {
        id: "welcome",
        target: "welcome-cta",
        title: "1. أهلاً بك — ادخل إلى الأرض ثلاثية الأبعاد",
        description:
          "مرحباً بك في ناسا فارم فيجن! خلف هذه الواجهة توجد كرة أرضية تفاعلية مدعومة بأقمار ناسا الصناعية. اضغط على عرض الأرض ثلاثية الأبعاد أو التالي للبدء.",
        tip: "الضغط على التالي ينقلك مباشرة إلى الأرض ثلاثية الأبعاد ويفتح الخطوة الثانية.",
        voiceText:
          "1. أهلاً بك في ناسا فارم فيجن. اضغط على عرض الأرض ثلاثية الأبعاد أو التالي للدخول إلى الكرة الأرضية التفاعلية.",
      },
      {
        id: "location",
        target: "location-search",
        title: "2. ابحث عن مزرعتك — وظيفة كل أيقونة",
        description:
          "كل أيقونة في شريط البحث العلوي تساعدك في الوصول إلى أرضك بطريقة مختلفة. إليك شرح كل أيقونة:",
        tip: "جرّب أي أداة بالأعلى أو اضغط أدناه، أو اضغط التالي للمتابعة:",
        voiceText:
          "2. ابحث عن مزرعتك. 1: شريط البحث لكتابة اسم قريتك أو مدينتك. 2: الميكروفون الصوتي لنطق اسم المنطقة دون كتابة. 3: زر تحديد الموقع للانتقال مباشرة لموقعك الحالي. 4: البوصلة لإدخال خطوط الطول والعرض. 5: مناطق سريعة للتجربة الفورية.",
      },
      {
        id: "views",
        target: "view-switcher",
        title: "3. التبديل بين الأرض 3D وخريطة الأقمار الصناعية 2D",
        description:
          "استكشف الكوكب في العرض ثلاثي الأبعاد، أو اختر خريطة 2D لرؤية صور الأقمار الصناعية المسطحة فوق حقولك.",
        tip: "في عرض 2D يمكنك معاينة صور الحقول بدقة قبل رسم حدود أرضك:",
        voiceText:
          "3. يمكنك التبديل بين الكرة الأرضية ثلاثية الأبعاد وخريطة 2D الفضائية لرؤية أرضك بوضوح من الأعلى قبل التحديد.",
      },
      {
        id: "mark-field",
        target: "mark-field-btn",
        title: "4. حدد حدود أرضك الزراعية",
        description:
          "اضغط على حدد أرضي في أعلى الشاشة لتفعيل الرسم على الخريطة. اضغط على 3 أو 4 أركان حول أرضك ثم اضغط إنهاء التحديد.",
        tip: "جرّب أداة الرسم أدناه أو افتح حقلاً تجريبياً أو اضغط التالي في أي وقت:",
        voiceText:
          "4. حدد حدود أرضك. اضغط على زر حدد أرضي، ثم اختر 3 أو 4 زوايا حول أرضك واضغط إنهاء التحديد.",
      },
      {
        id: "plan-steps",
        target: "step-progress",
        title: "5. أجب عن 3 أسئلة بسيطة ← احصل على خطتك",
        description:
          "بعد تحديد الأرض تنتقل لمخطط الزراعة لاختيار كمية المياه وآخر محصول وهدفك، فتحصل على خطة سنة وتوقعات 3 سنوات.",
        tip: "استخدم أزرار الشريط العلوي الثلاثة في أي وقت للرجوع وتعديل إجاباتك.",
        voiceText:
          "5. أجب عن ثلاثة أسئلة بسيطة عن المياه وآخر محصول وهدفك الزراعي لتحصل على أفضل دورة زراعية وتوقع لثلاث سنوات.",
      },
      {
        id: "practice",
        target: "quick-practice",
        title: "6. قائمة التدريب السريع التفاعلية",
        description:
          "تابع خطواتك الأربع من هنا: دخول الأرض ثلاثية الأبعاد، تحديد الموقع، رسم قطعة الأرض، وإنشاء خطة الزراعة.",
        tip: "يمكنك إعادة تشغيل هذه الجولة في أي وقت من زر الدليل في الأعلى أو من داخل القائمة!",
        voiceText:
          "6. قائمة التدريب السريع التفاعلية تتابع معك إنجاز الخطوات الأربع حتى استخراج خطة المحاصيل.",
      },
    ],
    whatEveryIconDoes: "وظيفة كل أيقونة",
    searchTitle: "مربع البحث وانطلق",
    searchDesc: "اكتب اسم القرية أو المدينة أو المنطقة الزراعية ثم اضغط انطلق.",
    micTitle: "الميكروفون الصوتي (تحدث)",
    micDesc: "اضغط لنطق اسم قريتك بصوتك دون الحاجة للكتابة.",
    micNotice: "الميكروفون جاهز — انطق اسم مدينتك أو اختر منطقة جاهزة!",
    tryBtn: "جرّب",
    gpsTitle: "أيقونة الموقع GPS",
    gpsDesc: "ينقلك مباشرة إلى مكانك الحالي باستخدام موقع الجهاز.",
    gpsNotice: "جاري طلب موقع الجهاز عبر GPS...",
    tryGpsBtn: "جرّب GPS",
    compassTitle: "البوصلة (إحداثيات Lat / Lng)",
    compassDesc: "أدخل خط العرض والطول الدقيق لقطعة أرضك.",
    hideBtn: "إخفاء",
    latLngBtn: "إحداثيات",
    goBtn: "انطلق",
    coordError: "خط العرض -90..90، الطول -180..180",
    coordMovedPrefix: "تم الانتقال إلى",
    quickRegionsTitle: "اختصارات مناطق سريعة",
    quickRegionsDesc: "اختر منطقة نموذجية للانتقال إليها فوراً:",
    flyingToPrefix: "جاري الطيران بالخريطة إلى",
    switchedTo2d: "تم التحويل إلى خريطة الأقمار الصناعية 2D!",
    switchedTo3d: "تم التحويل إلى الأرض 3D!",
    switchTo2d: "التبديل إلى خريطة 2D",
    switchTo3d: "التبديل إلى الأرض 3D",
    drawNotice: "أداة الرسم نشطة — اضغط على أركان أرضك في الخريطة!",
    drawingActive: "الرسم نشط ✓",
    startDrawTool: "بدء أداة الرسم",
    tryDemoField: "تجربة حقل نموذجي",
    listen: "استمع",
    listenTitle: "استمع إلى شرح هذه الخطوة بصوت واضح",
    skipTour: "تخطي الجولة",
    stepOf: (c, tot) => `الخطوة ${c} من ${tot}`,
    back: "رجوع",
    oneStepAtATime: "خطوة بخطوة",
    next: "التالي",
    finishTour: "إنهاء الجولة",
    quickPracticeHeader: (done, tot) => `تدريب سريع: تم إنجاز ${done}/${tot}`,
    item1EnterEarth: "دخول عرض الأرض ثلاثية الأبعاد",
    item2FindLocation: "تحديد موقع (بحث أو صوت أو GPS أو إحداثيات)",
    item3MarkField: "رسم زوايا أرضك (أو تحميل حقل تجريبي)",
    item4GeneratePlan: "إنشاء خطة الدورة الزراعية لسنة و3 سنوات",
    allCompleted: "أحسنت! تم إكمال الخطوات الأربع بنجاح.",
    startGuidedTour: "بدء الجولة الإرشادية",
  },
  es: {
    steps: [
      {
        id: "welcome",
        target: "welcome-cta",
        title: "1. Bienvenido — Entre a la Tierra 3D",
        description:
          "¡Bienvenido a NASA × FARMVISION! Aquí tiene una Tierra 3D interactiva con datos satelitales de la NASA. Pulse Ver Tierra 3D o Siguiente para comenzar.",
        tip: "Pulsar Siguiente entra directo a la Tierra 3D y abre el Paso 2.",
        voiceText:
          "1. Bienvenido a NASA FARMVISION. Pulse Ver Tierra 3D o Siguiente para entrar al globo satelital interactivo.",
      },
      {
        id: "location",
        target: "location-search",
        title: "2. Encuentre Su Finca — Qué Hace Cada Icono",
        description:
          "Cada icono en la barra superior le ayuda a encontrar su terreno de una forma distinta:",
        tip: "Pruebe cualquier herramienta arriba o abajo, o pulse Siguiente para continuar:",
        voiceText:
          "2. Encuentre su finca. 1: Buscador para escribir su pueblo. 2: Micrófono para hablar sin escribir. 3: Botón GPS para ir directo a su ubicación. 4: Brújula para latitud y longitud. 5: Regiones rápidas de ejemplo.",
      },
      {
        id: "views",
        target: "view-switcher",
        title: "3. Cambiar Entre Tierra 3D y Mapa Satelital 2D",
        description:
          "Explore en 3D o pulse Mapa 2D para ver fotos aéreas planas de sus parcelas.",
        tip: "En el Mapa 2D puede inspeccionar sus campos antes de trazarlos:",
        voiceText:
          "3. Cambie entre Tierra 3D y Mapa Satelital 2D para ver fotos aéreas planas de su terreno antes de marcarlo.",
      },
      {
        id: "mark-field",
        target: "mark-field-btn",
        title: "4. Marque los Límites de Su Parcela",
        description:
          "Pulse Marcar Mi Parcela arriba a la derecha para activar el dibujo, marque 3 o 4 esquinas y pulse Finalizar.",
        tip: "Pruebe el modo de dibujo abajo, cargue una finca demo o pulse Siguiente:",
        voiceText:
          "4. Marque su parcela. Pulse Marcar Mi Parcela, toque 3 o 4 esquinas alrededor de su terreno y pulse Finalizar.",
      },
      {
        id: "plan-steps",
        target: "step-progress",
        title: "5. Responda 3 Preguntas → Reciba Su Plan",
        description:
          "Al marcar su parcela elegirá Agua Disponible, Último Cultivo y Objetivo para obtener su plan anual y pronóstico a 3 años.",
        tip: "Use estas 3 pestañas superiores cuando quiera volver y cambiar respuestas.",
        voiceText:
          "5. Responda 3 preguntas sencillas sobre agua, último cultivo y objetivo para generar su rotación y pronóstico a 3 años.",
      },
      {
        id: "practice",
        target: "quick-practice",
        title: "6. Lista Interactiva de Práctica Rápida",
        description:
          "Este panel registra sus 4 pasos: abrir Tierra 3D, ubicar finca, marcar parcela y generar su plan de cultivo.",
        tip: "Puede repetir este tour en cualquier momento desde Guía arriba o aquí mismo.",
        voiceText:
          "6. Lista interactiva de práctica rápida. Aquí se siguen sus cuatro pasos desde entrar a la Tierra 3D hasta crear su plan agrícola.",
      },
    ],
    whatEveryIconDoes: "Qué Hace Cada Icono",
    searchTitle: "Buscador e Ir",
    searchDesc: "Escriba su pueblo, ciudad o zona agrícola arriba y pulse Ir.",
    micTitle: "Micrófono de Voz",
    micDesc: "Toque para decir el nombre de su región sin escribir.",
    micNotice: "Micrófono listo — diga su pueblo o elija una región rápida.",
    tryBtn: "Probar",
    gpsTitle: "Icono GPS",
    gpsDesc: "Va directo al lugar donde está usando el GPS de su dispositivo.",
    gpsNotice: "Solicitando ubicación GPS del dispositivo...",
    tryGpsBtn: "Usar GPS",
    compassTitle: "Brújula (Lat / Lng)",
    compassDesc: "Ingrese la latitud y longitud exactas de su parcela.",
    hideBtn: "Ocultar",
    latLngBtn: "Lat/Lng",
    goBtn: "Ir",
    coordError: "Lat -90..90, Lng -180..180",
    coordMovedPrefix: "Movido a",
    quickRegionsTitle: "Accesos Rápidos",
    quickRegionsDesc: "Pulse una región de ejemplo para volar allá al instante:",
    flyingToPrefix: "Volando mapa hacia",
    switchedTo2d: "¡Cambiado a Mapa Satelital 2D!",
    switchedTo3d: "¡Cambiado a Tierra 3D!",
    switchTo2d: "Cambiar a Mapa 2D",
    switchTo3d: "Cambiar a Tierra 3D",
    drawNotice: "¡Herramienta lista! Toque las esquinas en el mapa.",
    drawingActive: "Dibujo Activo ✓",
    startDrawTool: "Iniciar Dibujo",
    tryDemoField: "Probar Finca Demo",
    listen: "Escuchar",
    listenTitle: "Escuchar este paso en voz alta",
    skipTour: "Omitir Tour",
    stepOf: (c, tot) => `PASO ${c} DE ${tot}`,
    back: "Atrás",
    oneStepAtATime: "1 paso a la vez",
    next: "Siguiente",
    finishTour: "Finalizar Tour",
    quickPracticeHeader: (done, tot) => `Práctica Rápida: ${done}/${tot} listos`,
    item1EnterEarth: "Entrar a la vista Tierra 3D",
    item2FindLocation: "Buscar ubicación (Texto, Voz, GPS o Coordenadas)",
    item3MarkField: "Marcar esquinas de su parcela (o Finca Demo)",
    item4GeneratePlan: "Generar plan agrícola de 1 y 3 años",
    allCompleted: "¡4 de 4 completados! Listo para planificar mejor.",
    startGuidedTour: "Iniciar Tour Guiado",
  },
  fr: {
    steps: [
      {
        id: "welcome",
        target: "welcome-cta",
        title: "1. Bienvenue — Ouvrez la Terre 3D",
        description:
          "Bienvenue sur NASA × FARMVISION ! Un globe 3D interactif animé par les satellites NASA vous attend. Touchez Voir Terre 3D ou Suivant.",
        tip: "Appuyer sur Suivant ouvre directement la Terre 3D et l'étape 2.",
        voiceText:
          "1. Bienvenue sur NASA FARMVISION. Touchez Voir Terre 3D ou Suivant pour explorer le globe interactif.",
      },
      {
        id: "location",
        target: "location-search",
        title: "2. Trouver Votre Parcelle — Rôle des Icônes",
        description:
          "Chaque icône de la barre supérieure vous aide à localiser votre terre facilement :",
        tip: "Essayez un outil ci-dessus ou ci-dessous, ou appuyez sur Suivant :",
        voiceText:
          "2. Trouver votre parcelle. 1 : Recherche par nom de village. 2 : Micro vocal pour parler sans écrire. 3 : Cible GPS. 4 : Boussole latitude et longitude. 5 : Régions rapides.",
      },
      {
        id: "views",
        target: "view-switcher",
        title: "3. Basculer Entre Terre 3D et Carte 2D",
        description:
          "Explorez en 3D ou passez en Carte 2D pour voir vos champs vus du ciel.",
        tip: "En Carte 2D vous observez mieux les limites avant de tracer :",
        voiceText:
          "3. Basculez entre Terre 3D et Carte 2D pour inspecter les images satellites au-dessus de vos champs.",
      },
      {
        id: "mark-field",
        target: "mark-field-btn",
        title: "4. Tracer les Limites du Champ",
        description:
          "Touchez Tracer Mon Champ en haut à droite, cliquez sur 3 ou 4 coins de votre terrain puis terminez.",
        tip: "Testez le tracé ci-dessous, ouvrez un champ démo ou cliquez Suivant :",
        voiceText:
          "4. Tracez votre champ. Cliquez sur Tracer Mon Champ en haut à droite puis placez 3 ou 4 coins autour de votre parcelle.",
      },
      {
        id: "plan-steps",
        target: "step-progress",
        title: "5. 3 Questions Simples → Votre Plan de Culture",
        description:
          "Indiquez Eau Disponible, Dernière Culture et Objectif pour recevoir votre rotation sur 1 et 3 ans.",
        tip: "Ces 3 onglets en haut permettent de modifier vos réponses à tout moment.",
        voiceText:
          "5. Répondez à trois questions simples sur l'eau, la dernière culture et votre objectif pour obtenir votre plan de rotation.",
      },
      {
        id: "practice",
        target: "quick-practice",
        title: "6. Liste Interactive « Pratique Rapide »",
        description:
          "Suivez vos 4 étapes ici : Terre 3D, localisation, tracé de parcelle et création du plan.",
        tip: "Relancez ce guide à tout moment via Guide en haut ou le bouton ci-dessous.",
        voiceText:
          "6. Liste interactive Pratique Rapide. Elle suit vos quatre étapes de la carte 3D jusqu'au plan de culture.",
      },
    ],
    whatEveryIconDoes: "Rôle de Chaque Icône",
    searchTitle: "Recherche & OK",
    searchDesc: "Tapez votre village ou commune ci-dessus puis cliquez OK.",
    micTitle: "Micro Vocal (Parler)",
    micDesc: "Touchez pour prononcer votre région sans rien taper.",
    micNotice: "Micro prêt — dites votre village ou choisissez un raccourci.",
    tryBtn: "Essayer",
    gpsTitle: "Cible GPS",
    gpsDesc: "Vous place directement sur votre position actuelle.",
    gpsNotice: "Demande de position GPS en cours...",
    tryGpsBtn: "Tester GPS",
    compassTitle: "Boussole (Lat / Lng)",
    compassDesc: "Saisissez la latitude et la longitude exactes.",
    hideBtn: "Masquer",
    latLngBtn: "Lat/Lng",
    goBtn: "OK",
    coordError: "Lat -90..90, Lng -180..180",
    coordMovedPrefix: "Déplacé vers",
    quickRegionsTitle: "Raccourcis Régions",
    quickRegionsDesc: "Touchez une région exemple pour y aller aussitôt :",
    flyingToPrefix: "Déplacement vers",
    switchedTo2d: "Affichage Carte Satellite 2D activé !",
    switchedTo3d: "Affichage Terre 3D activé !",
    switchTo2d: "Passer en Carte 2D",
    switchTo3d: "Passer en Terre 3D",
    drawNotice: "Outil actif — touchez les coins de votre parcelle !",
    drawingActive: "Tracé Actif ✓",
    startDrawTool: "Démarrer Tracé",
    tryDemoField: "Champ Démo",
    listen: "Écouter",
    listenTitle: "Écouter cette étape à voix haute",
    skipTour: "Passer Guide",
    stepOf: (c, tot) => `ÉTAPE ${c} SUR ${tot}`,
    back: "Retour",
    oneStepAtATime: "1 étape à la fois",
    next: "Suivant",
    finishTour: "Terminer",
    quickPracticeHeader: (done, tot) => `Pratique Rapide : ${done}/${tot} faites`,
    item1EnterEarth: "Ouvrir la vue Terre 3D",
    item2FindLocation: "Localiser (Recherche, Voix, GPS ou Coords)",
    item3MarkField: "Tracer le champ (ou Champ Démo)",
    item4GeneratePlan: "Générer le plan 1 an & 3 ans",
    allCompleted: "4 étapes terminées ! Prêt pour votre rotation.",
    startGuidedTour: "Lancer Visite Guidée",
  },
  hi: {
    steps: [
      {
        id: "welcome",
        target: "welcome-cta",
        title: "1. स्वागत है — 3D पृथ्वी में प्रवेश करें",
        description:
          "नासा फार्मविज़न में आपका स्वागत है! इसके पीछे नासा उपग्रहों से संचालित 3D पृथ्वी है। शुरू करने के लिए 3D पृथ्वी देखें या अगला दबाएं।",
        tip: "अगला दबाने पर सीधे 3D पृथ्वी खुलेगी और दूसरा चरण शुरू होगा।",
        voiceText:
          "1. नासा फार्मविज़न में स्वागत है। शुरू करने के लिए 3D पृथ्वी देखें या अगला बटन दबाएं।",
      },
      {
        id: "location",
        target: "location-search",
        title: "2. अपना खेत खोजें — हर आइकन का काम",
        description:
          "ऊपर खोज पट्टी का हर बटन आपके खेत तक अलग तरह से पहुँचाता है:",
        tip: "ऊपर या नीचे कोई भी टूल आज़माएं, या आगे बढ़ने के लिए अगला दबाएं:",
        voiceText:
          "2. अपना खेत खोजें। पहला खोज बॉक्स में गाँव लिखें। दूसरा माइक दबाकर गाँव का नाम बोलें। तीसरा जीपीएस बटन सीधे आपके स्थान पर ले जाता है। चौथा अक्षांश और देशांतर के लिए है।",
      },
      {
        id: "views",
        target: "view-switcher",
        title: "3. 3D पृथ्वी और 2D उपग्रह नक्शा बदलें",
        description:
          "3D ग्लोब देखें या ऊपर से खेत की साफ तस्वीर देखने के लिए 2D नक्शा चुनें।",
        tip: "2D नक्शे में खेत की सीमा बनाने से पहले जमीन साफ दिखती है:",
        voiceText:
          "3. खेत की साफ तस्वीर ऊपर से देखने के लिए 3D पृथ्वी से 2D नक्शे में बदल सकते हैं।",
      },
      {
        id: "mark-field",
        target: "mark-field-btn",
        title: "4. अपने खेत की सीमा चिह्नित करें",
        description:
          "ऊपर दाईं ओर खेत चिह्नित करें दबाएं, खेत के 3 या 4 कोने चुनें और पूरा करें दबाएं।",
        tip: "नीचे ड्रॉ टूल आज़माएं, डेमो खेत खोलें या अगला दबाएं:",
        voiceText:
          "4. खेत की सीमा चिह्नित करें दबाएं, नक्शे पर खेत के 3 या 4 कोने दबाएं और पूरा करें।",
      },
      {
        id: "plan-steps",
        target: "step-progress",
        title: "5. 3 आसान सवाल ← आपकी फसल योजना तैयार",
        description:
          "सीमा चुनने के बाद पानी, पिछली फसल और लक्ष्य चुनें और 1-वर्षीय व 3-वर्षीय योजना पाएं।",
        tip: "ऊपर इन 3 टैब से कभी भी वापस जाकर उत्तर बदल सकते हैं।",
        voiceText:
          "5. पानी, पिछली फसल और मुख्य लक्ष्य चुनकर अपनी 1-वर्षीय और 3-वर्षीय फसल योजना प्राप्त करें।",
      },
      {
        id: "practice",
        target: "quick-practice",
        title: "6. त्वरित अभ्यास चेकलिस्ट",
        description:
          "यहाँ आपके 4 चरण दिखते हैं: 3D पृथ्वी खोलना, स्थान खोजना, खेत चिह्नित करना और फसल योजना बनाना।",
        tip: "ऊपर गाइड बटन या नीचे स्टार्ट गाइड से यह टूर फिर कभी भी देख सकते हैं!",
        voiceText:
          "6. त्वरित अभ्यास चेकलिस्ट आपके चार कदमों की प्रगति दिखाती है।",
      },
    ],
    whatEveryIconDoes: "हर बटन का काम",
    searchTitle: "खोज बॉक्स और खोजें",
    searchDesc: "ऊपर गाँव, शहर या इलाके का नाम लिखें और खोजें दबाएं।",
    micTitle: "वॉइस माइक (बोलकर खोजें)",
    micDesc: "बिना टाइप किए अपने गाँव या जिले का नाम बोलने के लिए दबाएं।",
    micNotice: "माइक तैयार है — गाँव का नाम बोलें या नीचे क्षेत्र चुनें!",
    tryBtn: "आज़माएं",
    gpsTitle: "जीपीएस लोकेशन बटन",
    gpsDesc: "आपके फोन या कंप्यूटर के GPS से सीधे आपके स्थान पर जाता है।",
    gpsNotice: "GPS से स्थान प्राप्त किया जा रहा है...",
    tryGpsBtn: "GPS चलाएं",
    compassTitle: "कम्पास (अक्षांश / देशांतर)",
    compassDesc: "अपने खेत के सटीक Lat और Lng नंबर दर्ज करें।",
    hideBtn: "छिपाएं",
    latLngBtn: "Lat/Lng",
    goBtn: "खोजें",
    coordError: "Lat -90..90, Lng -180..180",
    coordMovedPrefix: "स्थान बदला:",
    quickRegionsTitle: "त्वरित क्षेत्र शॉर्टकट",
    quickRegionsDesc: "तुरंत वहाँ जाने के लिए एक उदाहरण क्षेत्र चुनें:",
    flyingToPrefix: "नक्शा ले जा रहे हैं:",
    switchedTo2d: "2D उपग्रह नक्शा खुल गया!",
    switchedTo3d: "3D पृथ्वी दृश्य खुल गया!",
    switchTo2d: "2D नक्शे पर जाएं",
    switchTo3d: "3D पृथ्वी पर जाएं",
    drawNotice: "ड्रॉ टूल चालू — नक्शे पर खेत के कोने दबाएं!",
    drawingActive: "सीमा बन रही है ✓",
    startDrawTool: "ड्रॉ टूल शुरू करें",
    tryDemoField: "डेमो खेत देखें",
    listen: "सुनें",
    listenTitle: "इस चरण को आवाज़ में सुनें",
    skipTour: "गाइड छोड़ें",
    stepOf: (c, tot) => `चरण ${c} / ${tot}`,
    back: "पीछे",
    oneStepAtATime: "एक बार में 1 चरण",
    next: "अगला",
    finishTour: "गाइड पूरा करें",
    quickPracticeHeader: (done, tot) => `त्वरित अभ्यास: ${done}/${tot} पूर्ण`,
    item1EnterEarth: "3D पृथ्वी दृश्य खोलें",
    item2FindLocation: "स्थान खोजें (खोज, आवाज़, GPS या निर्देशांक)",
    item3MarkField: "खेत के कोने चिह्नित करें (या डेमो खेत)",
    item4GeneratePlan: "1-वर्षीय और 3-वर्षीय फसल योजना बनाएं",
    allCompleted: "सभी 4 चरण पूरे हुए! खेती के लिए तैयार।",
    startGuidedTour: "गाइड टूर शुरू करें",
  },
};

export function getTutorialTranslations(lang: AppLanguage): TutorialTranslations {
  return TUTORIAL_DICTIONARY[lang] ?? TUTORIAL_DICTIONARY.en;
}

const CROP_NAME_TRANSLATIONS: Record<string, Partial<Record<AppLanguage, string>>> = {
  Wheat: { ar: "القمح", es: "Trigo", fr: "Blé", hi: "गेहूं" },
  Barley: { ar: "الشعير", es: "Cebada", fr: "Orge", hi: "जौ" },
  "Corn (Maize)": { ar: "الذرة", es: "Maíz", fr: "Maïs", hi: "मक्का" },
  "Grain Sorghum": { ar: "الذرة الرفيعة", es: "Sorgo", fr: "Sorgho", hi: "ज्वार" },
  "Pearl Millet": { ar: "الدخن اللؤلؤي", es: "Mijo Perla", fr: "Millet", hi: "बाजरा" },
  "Winter Rye Cover": { ar: "غطاء الجاودار الشتوي", es: "Centeno de Cobertura", fr: "Seigle d'Hiver", hi: "सर्दियों की राई" },
  "Faba Beans": { ar: "الفول البلدي", es: "Habas", fr: "Fèves", hi: "बाकला" },
  Chickpeas: { ar: "الحمص", es: "Garbanzos", fr: "Pois Chiches", hi: "चना" },
  Lentils: { ar: "العدس", es: "Lentejas", fr: "Lentilles", hi: "मसूर" },
  Soybeans: { ar: "فول الصويا", es: "Soja", fr: "Soja", hi: "सोयाबीन" },
  Cowpeas: { ar: "اللوبيا", es: "Caupí", fr: "Niébé", hi: "लोबिया" },
  "Mung Beans": { ar: "الفاصوليا الذهبية (المانج)", es: "Frijol Mungo", fr: "Haricot Mungo", hi: "मूंग" },
  Sunflower: { ar: "عباد الشمس", es: "Girasol", fr: "Tournesol", hi: "सूरजमुखी" },
  Sesame: { ar: "السمسم", es: "Sésamo", fr: "Sésame", hi: "तिल" },
  "Canola (Rapeseed)": { ar: "الكانولا", es: "Canola", fr: "Colza", hi: "सरसों / कैनोला" },
  Tomatoes: { ar: "الطماطم", es: "Tomates", fr: "Tomates", hi: "टमाटर" },
  Potatoes: { ar: "البطاطس", es: "Papas", fr: "Pommes de Terre", hi: "आलू" },
  Cotton: { ar: "القطن", es: "Algodón", fr: "Coton", hi: "कपास" },
  "Berseem Clover": { ar: "البرسيم المصري", es: "Trébol Berseem", fr: "Trèfle Berseem", hi: "बरसीम" },
  "Vetch & Oat Cover Mix": { ar: "خليط البيقية والشوفان", es: "Mezcla Veza y Avena", fr: "Vesce & Avoine", hi: "वेच और जई मिश्रण" },
  "Sorghum-Sudangrass Cover": { ar: "غطاء سورغم وسودان جراس", es: "Cobertura Sorgo-Sudán", fr: "Sorgho-Soudan", hi: "ज्वार-सूडान घास" },
  "Rest Period + Straw Mulch": { ar: "فترة راحة + تغطية بالقش", es: "Descanso + Mantillo", fr: "Jachère Paillée", hi: "परती + पुआल मल्च" },
};

export function translateCropName(crop: string, lang: AppLanguage): string {
  if (lang === "en") return crop;
  return CROP_NAME_TRANSLATIONS[crop]?.[lang] ?? crop;
}
