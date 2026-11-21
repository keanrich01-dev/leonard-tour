import { useEffect, useState } from 'react';
import {
  ArrowRight, CheckCircle2, Clock3, Compass, MessageCircle,
  Mountain, ShieldCheck, Sparkles, Trees, Waves, Phone,
} from 'lucide-react';
import { Footer, Header, PackageCard } from './Home.jsx';
import '../category-pages.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const LANGUAGES = [
  { value: 'EN', label: 'English' },
  { value: 'SW', label: 'Kiswahili' },
  { value: 'FR', label: 'Français' },
  { value: 'ZH', label: '中文' },
  { value: 'KO', label: '한국어' },
];

const CATEGORY_UI = {
  EN: { home: 'Home', journeys: 'Journeys', plan: 'Plan Your Safari', explore: 'Explore Journeys', mark: 'EXPLORE · EXPERIENCE · REMEMBER', introEyebrow: 'THE LEONARD TOUR EXPERIENCE', sectionEyebrow: 'THE DETAILS THAT MAKE IT SPECIAL', expect: 'What to', expectAccent: 'Expect', expectBody: 'A closer look at the experiences and practical considerations that shape this kind of journey.', collection: 'EXPLORE OUR COLLECTION', find: 'Find Your', findAccent: 'Journey', findBody: 'Browse the journeys currently available in this collection and choose the experience that feels right for you.', loading: 'Loading available journeys…', loadingShort: 'Loading journeys…', journey: 'journey', journeys: 'journeys', error: 'Journeys could not be loaded right now. Please refresh and try again.', emptyTitle: 'A new journey is taking shape', talk: 'Talk to Our Team', contact: 'Contact Us', trust: 'TRAVEL WITH CONFIDENCE' },
  SW: { home: 'Mwanzo', journeys: 'Safari', plan: 'Panga Safari Yako', explore: 'Ona Safari', mark: 'GUNDUA · FURAHIA · KUMBUKA', introEyebrow: 'UZOEFU WA LEONARD TOUR', sectionEyebrow: 'MAELEZO YANAYOFANYA SAFARI IWE YA KIPEKEE', expect: 'Unachoweza', expectAccent: 'Kutarajia', expectBody: 'Maelezo muhimu ya kukusaidia kuelewa aina ya safari unayochagua.', collection: 'CHUNGUZA SAFARI ZETU', find: 'Tafuta', findAccent: 'Safari Yako', findBody: 'Chunguza safari zilizopo na uchague inayolingana na ndoto na muda wako.', loading: 'Tunapakia safari zilizopo…', loadingShort: 'Inapakia safari…', journey: 'safari', journeys: 'safari', error: 'Imeshindikana kupakia safari kwa sasa. Tafadhali jaribu tena.', emptyTitle: 'Safari zinaandaliwa', talk: 'Wasiliana Nasi', contact: 'Wasiliana Nasi', trust: 'SAFIRI KWA UHAKIKA' },
  FR: { home: 'Accueil', journeys: 'Circuits', plan: 'Planifier votre safari', explore: 'Découvrir les circuits', mark: 'EXPLORER · VIVRE · SE SOUVENIR', introEyebrow: 'L’EXPÉRIENCE LEONARD TOUR', sectionEyebrow: 'LES DÉTAILS QUI FONT LA DIFFÉRENCE', expect: 'À quoi', expectAccent: 's’attendre', expectBody: 'Découvrez les expériences et les points pratiques qui caractérisent ce voyage.', collection: 'DÉCOUVREZ NOS CIRCUITS', find: 'Trouvez votre', findAccent: 'voyage', findBody: 'Parcourez les voyages disponibles et choisissez celui qui vous correspond.', loading: 'Chargement des circuits disponibles…', loadingShort: 'Chargement des circuits…', journey: 'circuit', journeys: 'circuits', error: 'Impossible de charger les circuits. Veuillez réessayer.', emptyTitle: 'Un nouveau voyage se prépare', talk: 'Contacter notre équipe', contact: 'Contact', trust: 'VOYAGEZ EN TOUTE CONFIANCE' },
  ZH: { home: '首页', journeys: '行程', plan: '规划您的 safari', explore: '探索行程', mark: '探索 · 体验 · 铭记', introEyebrow: 'LEONARD TOUR 旅行体验', sectionEyebrow: '让旅程与众不同的细节', expect: '旅程', expectAccent: '体验', expectBody: '了解这类旅程的特色体验与实用信息。', collection: '探索我们的行程', find: '寻找您的', findAccent: '旅程', findBody: '浏览当前可选行程，选择最符合您期待的体验。', loading: '正在加载可选行程…', loadingShort: '正在加载行程…', journey: '条行程', journeys: '条行程', error: '暂时无法加载行程，请刷新后重试。', emptyTitle: '新的旅程正在筹备中', talk: '联系我们的团队', contact: '联系我们', trust: '安心开启旅程' },
  KO: { home: '홈', journeys: '여행 일정', plan: '사파리 계획하기', explore: '여행 일정 살펴보기', mark: '탐험 · 경험 · 기억', introEyebrow: 'LEONARD TOUR 여행 경험', sectionEyebrow: '특별함을 만드는 세부 사항', expect: '기대할', expectAccent: '경험', expectBody: '이 여행 유형의 특별한 경험과 실용적인 정보를 살펴보세요.', collection: '여행 컬렉션 살펴보기', find: '나에게 맞는', findAccent: '여행 찾기', findBody: '현재 이용할 수 있는 여행을 살펴보고 원하는 경험을 선택하세요.', loading: '여행 일정을 불러오는 중…', loadingShort: '여행을 불러오는 중…', journey: '개 여행', journeys: '개 여행', error: '여행 정보를 불러오지 못했습니다. 새로고침 후 다시 시도하세요.', emptyTitle: '새로운 여행을 준비하고 있습니다', talk: '여행팀에 문의하기', contact: '문의하기', trust: '안심하고 여행하세요' },
};

const CATEGORY_NAMES = {
  FR: { camping: ['Safari en', 'camping'], midrange: ['Safari', 'milieu de gamme'], luxury: ['Safari de', 'luxe'], migration: ['Grande Migration du', 'Serengeti'], kilimanjaro: ['Mont', 'Kilimandjaro'], meru: ['Mont', 'Meru'], islands: ['Séjours dans les', 'îles'] },
  ZH: { camping: ['坦桑尼亚', '露营 safari'], midrange: ['中档', '野生动物 safari'], luxury: ['豪华', '野生动物 safari'], migration: ['塞伦盖蒂', '动物大迁徙'], kilimanjaro: ['乞力马扎罗', '登山'], meru: ['梅鲁山', '登山'], islands: ['海岛', '度假'] },
  KO: { camping: ['탄자니아', '캠핑 사파리'], midrange: ['미드레인지', '사파리'], luxury: ['럭셔리', '사파리'], migration: ['세렝게티', '대이동'], kilimanjaro: ['킬리만자로', '등반'], meru: ['메루산', '등반'], islands: ['섬', '휴양'] },
};

function localizedCategoryCopy(categoryKey, language, config) {
  if (config.copy[language]) return config.copy[language];
  const ui = CATEGORY_UI[language] || CATEGORY_UI.EN;
  const names = CATEGORY_NAMES[language]?.[categoryKey] || [config.copy.EN.title, config.copy.EN.accent];
  const localized = {
    FR: { eyebrow: 'UN VOYAGE AU CŒUR DE LA TANZANIE', lead: 'Découvrez la Tanzanie avec un itinéraire préparé selon vos dates, votre confort et les lieux que vous souhaitez explorer.', introTitle: 'Un voyage pensé pour vous', intro: 'Chaque voyage est organisé avec soin par notre équipe locale. Nous vous aidons à choisir un rythme, des expériences et un niveau de confort adaptés à vos attentes.', highlights: ['Conseils de notre équipe locale', 'Itinéraires adaptés à vos dates', 'Expériences privées et personnalisées'], empty: 'Notre sélection de voyages est en cours de préparation. Contactez notre équipe pour organiser votre itinéraire.' },
    ZH: { eyebrow: '探索坦桑尼亚的自然与文化', lead: '根据您的出行日期、舒适度偏好和想去的目的地，体验精心规划的坦桑尼亚之旅。', introTitle: '为您量身规划的旅程', intro: '我们的当地团队会认真安排每段旅程，帮助您选择合适的节奏、体验和住宿舒适度。', highlights: ['当地旅行团队提供建议', '根据出行日期规划路线', '可定制私人旅行体验'], empty: '相关行程正在整理中。欢迎联系我们，为您规划专属路线。' },
    KO: { eyebrow: '탄자니아의 자연과 문화를 만나보세요', lead: '여행 날짜와 선호하는 편안함, 방문하고 싶은 장소에 맞춰 탄자니아 여행을 계획해 드립니다.', introTitle: '여행자에게 맞춘 여정', intro: '현지 여행팀이 여정을 세심하게 준비하고 원하는 일정 속도와 경험, 숙박 수준을 선택하도록 도와드립니다.', highlights: ['현지 여행팀의 전문 안내', '여행 날짜에 맞춘 일정', '개인별 맞춤 여행 경험'], empty: '관련 여행 상품을 준비하고 있습니다. 맞춤 일정을 원하시면 문의해 주세요.' },
  }[language];
  return { eyebrow: localized.eyebrow, title: names[0], accent: names[1], lead: localized.lead, introTitle: localized.introTitle, intro: localized.intro, highlights: localized.highlights, empty: localized.empty };
}

const GENERIC_EXPERIENCE_DETAILS = {
  FR: [['Conseils personnalisés', 'Notre équipe vous aide à choisir les étapes, le rythme et les expériences adaptés à votre voyage.'], ['Expertise locale', 'Profitez des connaissances pratiques de guides et de spécialistes locaux.'], ['Organisation flexible', 'Les détails du voyage peuvent être adaptés à vos dates et à vos préférences.']],
  ZH: [['个性化建议', '我们的团队帮助您选择适合自己的路线、节奏和旅行体验。'], ['当地专业知识', '通过当地向导和旅行专家了解实用信息与目的地特色。'], ['灵活安排', '可根据您的日期和偏好调整旅程细节。']],
  KO: [['맞춤형 안내', '여행팀이 일정과 속도, 원하는 경험을 선택하도록 도와드립니다.'], ['현지 전문성', '현지 가이드와 여행 전문가의 실용적인 정보와 지역 지식을 경험하세요.'], ['유연한 일정', '여행 날짜와 선호도에 맞게 세부 일정을 조정할 수 있습니다.']],
};

const CATEGORY_PAGES = {
  camping: {
    path: '/safaris/camping', icon: Trees,
    match: (p) => p.type === 'camping' || ['camping-6days', 'camping-7days'].includes(p.slug),
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=2000&q=88',
    cardImage: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=85',
    copy: {
      EN: { eyebrow: 'SLEEP CLOSE TO THE WILD', title: 'Tanzania Camping', accent: 'Safaris', lead: 'Experience Tanzania’s wilderness with thoughtfully planned camping journeys, expert local guides and unforgettable days among iconic landscapes.', introTitle: 'A closer connection to nature', intro: 'Camping safaris bring you closer to the sounds, scenery and atmosphere of Tanzania. Choose a journey shaped around your travel dates, comfort preferences and the places you dream of discovering.', highlights: ['Authentic time in the wilderness', 'Knowledgeable local safari guides', 'Flexible private and tailor-made journeys'], empty: 'Camping safari itineraries are being prepared. Contact our team and we will help plan your journey.', },
      SW: { eyebrow: 'KARIBU NA ASILI YA PORI', title: 'Safari za Kambi', accent: 'Tanzania', lead: 'Furahia mandhari ya pori la Tanzania kupitia safari za kambi zilizopangwa kwa umakini, waongoza watalii wenye uzoefu na siku zisizosahaulika.', introTitle: 'Karibu zaidi na asili', intro: 'Safari za kambi zinakuleta karibu na sauti, mandhari na mazingira halisi ya Tanzania. Chagua safari kulingana na tarehe zako, kiwango cha faraja unachopendelea na maeneo unayotamani kutembelea.', highlights: ['Uzoefu halisi wa kukaa karibu na pori', 'Waongoza safari wenye ujuzi wa ndani', 'Safari binafsi zinazoweza kubadilishwa'], empty: 'Ratiba za safari za kambi zinaandaliwa. Wasiliana nasi tukusaidie kupanga safari yako.' },
    },
  },
  midrange: {
    path: '/safaris/mid-range', icon: Compass,
    match: (p) => ['midrange', 'mid-range', 'mid_range'].includes(p.type) || p.slug === 'midrange-6days',
    image: 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=2000&q=88',
    cardImage: 'https://images.unsplash.com/photo-1535338454770-8be927b5a00b?auto=format&fit=crop&w=1200&q=85',
    copy: {
      EN: { eyebrow: 'COMFORT MEETS ADVENTURE', title: 'Mid-Range', accent: 'Safaris', lead: 'Enjoy rewarding wildlife encounters with welcoming lodges, carefully selected camps and the personal service of a locally guided safari.', introTitle: 'The right balance for your journey', intro: 'Mid-range safaris combine the excitement of the African wilderness with comfortable accommodation and well-planned travel days. We help match each itinerary to your pace and interests.', highlights: ['Comfortable lodges and tented camps', 'Well-paced days in the national parks', 'Personal attention from local experts'], empty: 'Our mid-range safari collection is being updated. Contact our team for a tailor-made itinerary.' },
      SW: { eyebrow: 'FARAJA NA MATUKIO YA KIPEKEE', title: 'Safari za Kiwango', accent: 'Cha Kati', lead: 'Furahia kukutana na wanyamapori ukiwa na malazi yenye faraja, kambi zilizochaguliwa kwa umakini na huduma binafsi.', introTitle: 'Uwiano mzuri wa faraja na safari', intro: 'Safari za kiwango cha kati huunganisha msisimko wa pori la Afrika na malazi yenye faraja pamoja na ratiba nzuri za kutembelea hifadhi. Tunakusaidia kuchagua safari inayolingana na muda na mambo unayopenda.', highlights: ['Lodge na kambi zenye faraja', 'Ratiba nzuri za kutembelea hifadhi', 'Huduma binafsi kutoka kwa wataalamu wa ndani'], empty: 'Tunaboresha mkusanyiko wa safari za kiwango cha kati. Wasiliana nasi kwa safari maalumu.' },
    },
  },
  luxury: {
    path: '/safaris/luxury', icon: Sparkles,
    match: (p) => p.type === 'luxury' || p.slug === 'luxury-5days',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=2000&q=88',
    cardImage: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=85',
    copy: {
      EN: { eyebrow: 'EXCEPTIONAL JOURNEYS, PERSONAL SERVICE', title: 'Luxury Tanzania', accent: 'Safaris', lead: 'Discover Tanzania in considered comfort, with beautiful stays, private guiding and experiences shaped around the way you want to travel.', introTitle: 'A safari shaped around you', intro: 'Luxury travel is personal. From the pace of each day to the style of accommodation, our team works with you to create a seamless journey through Tanzania’s remarkable wildlife destinations.', highlights: ['Hand-picked premium accommodation', 'Private guiding and flexible pacing', 'Carefully tailored travel experiences'], empty: 'Our luxury safari collection is being refined. Contact us to design a private journey.' },
      SW: { eyebrow: 'SAFARI ZA KIPEKEE NA HUDUMA BINAFSI', title: 'Safari za Kifahari', accent: 'Tanzania', lead: 'Gundua Tanzania kwa faraja ya kipekee, malazi mazuri, mwongoza safari binafsi na uzoefu unaopangwa kulingana na mapendeleo yako.', introTitle: 'Safari iliyoundwa kwa ajili yako', intro: 'Safari ya kifahari ni ya kipekee kwa kila msafiri. Kuanzia ratiba ya kila siku hadi aina ya malazi, timu yetu itakusaidia kuunda safari yenye urahisi katika maeneo maarufu ya wanyamapori Tanzania.', highlights: ['Malazi bora yaliyochaguliwa kwa umakini', 'Mwongoza safari binafsi na ratiba inayobadilika', 'Uzoefu maalumu kulingana na mapendeleo yako'], empty: 'Mkusanyiko wetu wa safari za kifahari unaandaliwa. Wasiliana nasi kupanga safari binafsi.' },
    },
  },
  migration: {
    path: '/safaris/serengeti-migration', icon: Trees,
    match: (p) => p.type === 'migration' || p.slug === 'migration-7days' || /migration/i.test(`${p.slug} ${p.title}`),
    image: 'https://images.pexels.com/photos/12339600/pexels-photo-12339600.jpeg?cs=srgb&dl=pexels-garycohen-12339600.jpg&fm=jpg',
    cardImage: 'https://images.pexels.com/photos/12339600/pexels-photo-12339600.jpeg?cs=srgb&dl=pexels-garycohen-12339600.jpg&fm=jpg',
    copy: {
      EN: { eyebrow: 'FOLLOW ONE OF NATURE’S GREAT EVENTS', title: 'Serengeti Great', accent: 'Migration', lead: 'Follow the seasonal movement of wildebeest and other wildlife across the Serengeti, with a route planned around the time of year and current migration patterns.', introTitle: 'A remarkable wildlife journey', intro: 'The Great Migration moves through different parts of the Serengeti ecosystem during the year. The best route depends on your travel dates, so our team will help plan a realistic itinerary for the season you visit.', highlights: ['Season-aware route planning', 'Wildlife viewing with experienced guides', 'Flexible travel dates and private options'], empty: 'Migration safari departures are being arranged. Share your travel dates so our team can advise on the most suitable route.' },
      SW: { eyebrow: 'FUATILIA MOJA YA SIFA KUU ZA ASILI', title: 'Uhamaji Mkuu wa', accent: 'Serengeti', lead: 'Fuatilia safari ya msimu ya nyumbu na wanyamapori wengine katika Serengeti, kwa ratiba inayozingatia kipindi cha mwaka na mwenendo wa uhamaji.', introTitle: 'Safari ya kipekee ya wanyamapori', intro: 'Uhamaji Mkuu hupita maeneo tofauti ya mfumo wa ikolojia wa Serengeti katika vipindi mbalimbali vya mwaka. Njia bora hutegemea tarehe zako za safari, hivyo timu yetu itakushauri ratiba inayofaa msimu unaotembelea.', highlights: ['Mipango ya njia kulingana na msimu', 'Kuangalia wanyamapori na waongoza wenye uzoefu', 'Tarehe zinazobadilika na safari binafsi'], empty: 'Safari za uhamaji zinaandaliwa. Tuambie tarehe zako ili tukushauri njia inayofaa.' },
    },
  },
  kilimanjaro: {
    path: '/climbing/kilimanjaro', icon: Mountain,
    match: (p) => p.type === 'kilimanjaro' || p.slug === 'kili-machame' || /kilimanjaro|kili/i.test(`${p.slug} ${p.title}`),
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=88',
    cardImage: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=85',
    copy: {
      EN: { eyebrow: 'STAND ABOVE THE ORDINARY', title: 'Mount', accent: 'Kilimanjaro', lead: 'Take on Africa’s highest mountain with a carefully paced climb, experienced mountain crew and preparation that puts safety first.', introTitle: 'Your journey to the Roof of Africa', intro: 'Every successful climb begins with choosing a route and allowing enough time to acclimatise. We help you compare available routes, understand the daily stages and prepare for the mountain.', highlights: ['Route and duration guidance', 'Experienced mountain guides and crew', 'A safety-conscious climbing plan'], empty: 'Kilimanjaro climbs are being prepared for publication. Contact us to discuss routes, dates and availability.' },
      SW: { eyebrow: 'FIKA JUU YA KAWAIDA', title: 'Mlima', accent: 'Kilimanjaro', lead: 'Panda mlima mrefu kuliko yote Afrika kupitia ratiba iliyopangwa vizuri, timu yenye uzoefu na maandalizi yanayotanguliza usalama.', introTitle: 'Safari yako kuelekea Paa la Afrika', intro: 'Kupanda mlima kwa mafanikio huanza kwa kuchagua njia na kuweka muda wa kutosha wa kuzoea urefu. Tunakusaidia kulinganisha njia, kuelewa ratiba ya kila siku na kujiandaa kwa safari ya mlima.', highlights: ['Ushauri wa njia na idadi ya siku', 'Waongoza milima na timu yenye uzoefu', 'Mpango wa kupanda unaozingatia usalama'], empty: 'Safari za Kilimanjaro zinaandaliwa kuchapishwa. Wasiliana nasi kujadili njia, tarehe na nafasi.' },
    },
  },
  meru: {
    path: '/climbing/meru', icon: Mountain,
    match: (p) => p.type === 'meru' || p.slug === 'meru-4days' || /mount-meru|meru/i.test(`${p.slug} ${p.title}`),
    image: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=2000&q=88',
    cardImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=85',
    copy: {
      EN: { eyebrow: 'A QUIETER MOUNTAIN CHALLENGE', title: 'Mount', accent: 'Meru', lead: 'Discover a rewarding mountain trek through forest and open highland scenery, guided by a team that understands the mountain.', introTitle: 'A beautiful climb in its own right', intro: 'Mount Meru offers a distinctive trekking experience and can also be part of a wider northern Tanzania adventure. We will help you understand the route, preparation and timing before you set out.', highlights: ['A guided trek through varied landscapes', 'Practical preparation and route advice', 'Options to combine with northern Tanzania'], empty: 'The Mount Meru itinerary is currently being prepared. Contact our team for route details and planning.' },
      SW: { eyebrow: 'CHANGAMOTO YA MLIMA YENYE UTULIVU', title: 'Mlima', accent: 'Meru', lead: 'Gundua safari ya kupanda mlima kupitia misitu na mandhari ya nyanda za juu ukiwa na timu inayoifahamu vizuri Meru.', introTitle: 'Safari nzuri ya kupanda mlima', intro: 'Mlima Meru una uzoefu wake wa kipekee na unaweza kuunganishwa na safari nyingine za kaskazini mwa Tanzania. Tutakusaidia kuelewa njia, maandalizi na muda unaofaa kabla ya kuanza.', highlights: ['Kupanda mlima kwa kuongozwa katika mandhari tofauti', 'Maandalizi na ushauri wa njia', 'Uwezekano wa kuunganisha na safari za kaskazini'], empty: 'Ratiba ya Mlima Meru inaandaliwa kwa sasa. Wasiliana nasi kwa maelezo na mipango.' },
    },
  },
  islands: {
    path: '/island-escapes', icon: Waves,
    match: (p) => p.type === 'island' || ['zanzibar-island', 'pemba', 'mafia', 'unguja'].includes(p.slug) || /zanzibar|pemba|mafia|unguja|island/i.test(`${p.slug} ${p.title}`) || ['beach', 'swimming'].includes(p.category),
    image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=2000&q=88',
    cardImage: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=85',
    copy: {
      EN: { eyebrow: 'THE INDIAN OCEAN, YOUR WAY', title: 'Tanzania Island', accent: 'Escapes', lead: 'Slow down along Tanzania’s Indian Ocean coast with island stays, warm hospitality, turquoise water and time to explore at your own pace.', introTitle: 'Discover the islands of Tanzania', intro: 'From Zanzibar and Unguja to Pemba and Mafia, Tanzania’s islands each have their own character. Tell us what kind of escape you have in mind and we will help shape the right stay.', highlights: ['Island stays and coastal experiences', 'Time for beaches, culture and local life', 'Tailor-made combinations and extensions'], empty: 'Island packages are being prepared. Contact our team to plan a Zanzibar, Pemba, Mafia or Unguja escape.' },
      SW: { eyebrow: 'BAHARI YA HINDI KWA NAMNA YAKO', title: 'Mapumziko ya', accent: 'Visiwani Tanzania', lead: 'Pumzika katika pwani ya Bahari ya Hindi ukiwa na malazi visiwani, ukarimu wa wenyeji, maji ya buluu na muda wa kuchunguza kwa utulivu.', introTitle: 'Gundua visiwa vya Tanzania', intro: 'Kuanzia Zanzibar na Unguja hadi Pemba na Mafia, kila kisiwa kina upekee wake. Tuambie aina ya mapumziko unayotamani ili tukusaidie kupanga sehemu na muda unaofaa.', highlights: ['Malazi na shughuli za visiwani', 'Fursa za fukwe, utamaduni na maisha ya wenyeji', 'Safari zinazoweza kuunganishwa na kubinafsishwa'], empty: 'Vifurushi vya visiwani vinaandaliwa. Wasiliana nasi kupanga mapumziko Zanzibar, Pemba, Mafia au Unguja.' },
    },
  },
};

const EXPERIENCE_DETAILS = {
  camping: {
    EN: [
      ['Camp beneath African skies', 'Stay in carefully selected camps close to the landscapes and wildlife areas you came to explore.'],
      ['Wildlife from first light', 'Set out with a local guide when the parks are waking and the day is full of possibility.'],
      ['Simple, memorable evenings', 'Return from the bush to a warm camp atmosphere and stories around the evening meal.'],
    ],
    SW: [
      ['Kambi chini ya anga la Afrika', 'Kaa katika kambi zilizochaguliwa kwa umakini karibu na mandhari na maeneo ya wanyamapori.'],
      ['Wanyamapori tangu alfajiri', 'Anza siku na mwongoza wa ndani wakati hifadhi zinaamka na shughuli za wanyama zinaanza.'],
      ['Jioni zenye kumbukumbu', 'Rudi kambini baada ya siku ya porini na kufurahia mazingira tulivu na simulizi za safari.'],
    ],
  },
  midrange: {
    EN: [
      ['Comfortable places to stay', 'A considered mix of welcoming lodges and quality tented camps, selected around your route.'],
      ['A rewarding pace', 'Balance game drives and travel time so you can enjoy each destination without feeling rushed.'],
      ['Local guidance', 'Travel with guides who know the parks, wildlife patterns and practical details of the north.'],
    ],
    SW: [
      ['Malazi yenye faraja', 'Mchanganyiko wa lodge na kambi bora zilizochaguliwa kulingana na njia ya safari yako.'],
      ['Ratiba yenye uwiano', 'Changanya matembezi ya kuangalia wanyamapori na muda wa kusafiri bila kuharakisha.'],
      ['Uongozi wa wataalamu wa ndani', 'Safiri na waongoza wanaozifahamu hifadhi, tabia za wanyama na mazingira ya kaskazini.'],
    ],
  },
  luxury: {
    EN: [
      ['Exceptional stays', 'Choose refined lodges and intimate tented camps that make the time between game drives part of the experience.'],
      ['Private, flexible travel', 'Shape the day around your interests, preferred pace and the wildlife experiences you value most.'],
      ['Thoughtful personal service', 'Enjoy clear planning and attentive local support from the first conversation to the journey home.'],
    ],
    SW: [
      ['Malazi ya kiwango cha juu', 'Chagua lodge na kambi za kifahari zinazofanya hata muda wa kupumzika kuwa sehemu ya uzoefu.'],
      ['Safari binafsi inayobadilika', 'Panga siku kulingana na mapendeleo yako, kasi unayotaka na wanyamapori unaotamani kuona.'],
      ['Huduma binafsi yenye umakini', 'Pata mipango iliyo wazi na msaada wa karibu kutoka mazungumzo ya kwanza hadi mwisho wa safari.'],
    ],
  },
  migration: {
    EN: [
      ['Plan around the season', 'The migration moves through the ecosystem during the year; route choices should follow your travel dates.'],
      ['Follow the wildlife story', 'Look for large herds, predators and changing landscapes with an experienced safari guide.'],
      ['Choose your focus', 'Discuss calving season, river-crossing areas or a broader Serengeti circuit before selecting dates.'],
    ],
    SW: [
      ['Panga kulingana na msimu', 'Uhamaji hupita maeneo tofauti kwa mwaka; njia bora huchaguliwa kulingana na tarehe zako.'],
      ['Fuatilia maisha ya wanyamapori', 'Tafuta makundi makubwa ya wanyama, wawindaji na mandhari yanayobadilika ukiwa na mwongoza mwenye uzoefu.'],
      ['Chagua unachotamani kuona', 'Jadili msimu wa kuzaa, maeneo ya kuvuka mito au mzunguko mpana wa Serengeti.'],
    ],
  },
  kilimanjaro: {
    EN: [
      ['Compare the routes', 'Explore route length, scenery and challenge level before choosing the climb that suits you.'],
      ['Allow time to acclimatise', 'A sensible itinerary gives your body time to adjust and supports a safer summit attempt.'],
      ['A capable mountain team', 'Your guides and mountain crew help with daily progress, camp routines and on-mountain support.'],
    ],
    SW: [
      ['Linganisha njia za kupanda', 'Chunguza idadi ya siku, mandhari na kiwango cha changamoto kabla ya kuchagua njia inayokufaa.'],
      ['Pata muda wa kuzoea urefu', 'Ratiba nzuri huupa mwili muda wa kuzoea mazingira na kusaidia jaribio salama la kufika kileleni.'],
      ['Timu yenye uzoefu wa mlima', 'Waongoza na wahudumu husaidia maendeleo ya kila siku, kambi na mahitaji ya safari ya mlima.'],
    ],
  },
  meru: {
    EN: [
      ['Forest and open highlands', 'Experience changing scenery as the trail moves from forest into the mountain’s higher landscapes.'],
      ['A rewarding northern trek', 'Meru can stand alone as a mountain journey or complement a wider northern Tanzania itinerary.'],
      ['Prepare with local advice', 'Discuss fitness, timing, route conditions and the current itinerary with our team before booking.'],
    ],
    SW: [
      ['Msitu na nyanda za juu', 'Furahia mandhari yanayobadilika njia inapopanda kutoka msituni kuelekea maeneo ya juu ya mlima.'],
      ['Safari ya kipekee kaskazini', 'Meru inaweza kuwa safari kamili yenyewe au kuunganishwa na ratiba ya kaskazini mwa Tanzania.'],
      ['Jiandae kwa ushauri wa ndani', 'Jadili utimamu wa mwili, muda, hali ya njia na ratiba ya sasa kabla ya kuweka nafasi.'],
    ],
  },
  islands: {
    EN: [
      ['Choose your island mood', 'Compare Zanzibar, Pemba and Mafia for culture, quiet beaches, marine life and the pace you prefer.'],
      ['Ocean and coastal days', 'Make room for swimming, boat trips, snorkelling or simply enjoying the Indian Ocean coastline.'],
      ['Culture beyond the beach', 'Add local food, historic streets and island traditions to create a richer stay.'],
    ],
    SW: [
      ['Chagua aina ya kisiwa', 'Linganisha Zanzibar, Pemba na Mafia kwa utamaduni, fukwe tulivu, viumbe wa baharini na mazingira unayopenda.'],
      ['Siku za baharini na ufukweni', 'Furahia kuogelea, safari za boti, kupiga mbizi kwa barakoa au kupumzika ufukweni.'],
      ['Utamaduni zaidi ya ufukwe', 'Ongeza vyakula vya wenyeji, mitaa ya kihistoria na desturi za visiwani kwenye mapumziko yako.'],
    ],
  },
};

function resolveImage(value) {
  if (!value || typeof value !== 'string') return '';
  const image = value.trim().replaceAll('\\', '/');
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  if (image.startsWith('/images/')) return image;
  if (image.startsWith('images/')) return `/${image}`;
  if (image.startsWith('/media/')) return `${API_BASE}${image}`;
  if (image.startsWith('/')) return `${API_BASE}${image}`;
  return `${API_BASE}/media/${image.replace(/^\/+/, '')}`;
}

function formatPackage(item, categoryKeyForFallback, fallbackImageForCategory) {
  const amount = item.price_from?.USD;
  const image = resolveImage(item.image) || resolveImage(item.gallery_images?.[0]) || '';
  // Keep package-owned imagery first; use a destination-appropriate collection image
  // only when the package has no usable image attached.
  const islandFallbacks = {
    zanzibar: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=82',
    unguja: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=82',
    pemba: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=82',
    mafia: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=82',
  };
  const islandKey = Object.keys(islandFallbacks).find((key) => `${item.slug || ''} ${item.title || ''}`.toLowerCase().includes(key));
  const fallbackImage = categoryKeyForFallback === 'islands' && islandKey
    ? islandFallbacks[islandKey]
    : fallbackImageForCategory;
  return {
    ...item,
    image,
    fallbackImage,
    days: Number(item.days) || 1,
    price: amount ? `From $${Number(amount).toLocaleString('en-US')}` : 'ASK FOR PRICE',
    route: item.route || 'Tanzania · Tailor-made journey',
    badge: item.badge || 'FEATURED',
    rating: null,
    review_count: 0,
  };
}

export default function CategoryPage({ categoryKey }) {
  const config = CATEGORY_PAGES[categoryKey];
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'EN';
    const saved = window.localStorage.getItem('mangokili-language');
    return LANGUAGES.some((option) => option.value === saved) ? saved : 'EN';
  });
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem('mangokili-language', nextLanguage);
    document.documentElement.lang = nextLanguage.toLowerCase();
  };

  useEffect(() => {
    document.documentElement.lang = language.toLowerCase();
  }, [language]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadPackages() {
      setLoading(true);
      setLoadError(false);
      try {
        const response = await fetch(`${API_BASE}/api/packages?lang=${language.toLowerCase()}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Packages API returned ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Unexpected packages response');
        setPackages(data.filter(config.match).slice(0, 6).map((item) => formatPackage(item, categoryKey, config.cardImage)));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setPackages([]);
          setLoadError(true);
          console.error('Could not load category packages:', error);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadPackages();
    return () => controller.abort();
  }, [categoryKey, config, language]);

  const copy = localizedCategoryCopy(categoryKey, language, config);
  const ui = CATEGORY_UI[language] || CATEGORY_UI.EN;
  const Icon = config.icon;
  const countText = loading ? ui.loadingShort : `${packages.length} ${packages.length === 1 ? ui.journey : ui.journeys}`;

  return (
    <>
      <Header language={language} onLanguageChange={changeLanguage} isInteriorPage />
      <main className="category-page">
        <section className="category-hero" style={{ '--category-hero-image': `url("${config.image}")` }}>
          <div className="category-hero-shade" />
          <div className="page-shell category-hero-inner">
            <div className="category-breadcrumb"><a href="/#home">{ui.home}</a><span>/</span><a href="/#packages">{ui.journeys}</a><span>/</span><strong>{copy.title} {copy.accent}</strong></div>
            <div className="category-hero-copy">
              <span className="eyebrow"><span /> {copy.eyebrow}</span>
              <div className="category-icon"><Icon size={25} strokeWidth={1.6} /></div>
              <h1>{copy.title}<br /><em>{copy.accent}</em></h1>
              <p>{copy.lead}</p>
              <div className="category-hero-actions">
                <a className="button button-gold" href="#category-journeys">{ui.explore} <ArrowRight size={16} /></a>
                <a className="button button-outline" href="/plan-your-safari?intent=plan">{ui.plan}</a>
              </div>
            </div>
            <div className="category-hero-caption"><span /> LEONARD TOUR · TANZANIA</div>
          </div>
        </section>

        <section className="category-intro section-space">
          <div className="page-shell category-intro-grid">
            <div className="category-intro-mark"><Icon size={42} strokeWidth={1.2} /><span>{ui.mark}</span></div>
            <div className="category-intro-copy">
              <span className="eyebrow"><span /> {ui.introEyebrow}</span>
              <h2>{copy.introTitle}</h2>
              <div className="gold-rule" />
              <p>{copy.intro}</p>
              <ul>{copy.highlights.map((highlight) => <li key={highlight}><CheckCircle2 size={17} />{highlight}</li>)}</ul>
            </div>
          </div>
        </section>

        <section className="category-experience section-space">
          <div className="page-shell">
            <div className="section-heading">
              <span className="eyebrow"><span /> {ui.sectionEyebrow}</span>
              <h2>{ui.expect} <em>{ui.expectAccent}</em></h2>
              <p>{ui.expectBody}</p>
            </div>
            <div className="category-experience-grid">
              {(EXPERIENCE_DETAILS[categoryKey]?.[language] || GENERIC_EXPERIENCE_DETAILS[language] || EXPERIENCE_DETAILS[categoryKey]?.EN || []).map(([title, description], index) => (
                <article className="category-experience-card" key={title}>
                  <span className="category-experience-number">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="category-journeys section-space" id="category-journeys">
          <div className="page-shell">
            <div className="section-heading">
              <span className="eyebrow"><span /> {ui.collection}</span>
              <h2>{ui.find} <em>{ui.findAccent}</em></h2>
              <p>{ui.findBody}</p>
            </div>
            <div className="category-results-bar"><span><Icon size={17} /> {copy.title} {copy.accent}</span><small>{countText}</small></div>
            {loading ? (
              <div className="category-state"><span className="category-spinner" />{ui.loading}</div>
            ) : loadError ? (
              <div className="category-state category-state-error">{ui.error}</div>
            ) : packages.length ? (
              <div className="packages-grid category-packages-grid">{packages.map((item) => <PackageCard key={item.slug} item={item} language={language} />)}</div>
            ) : (
              <div className="category-empty">
                <div className="category-empty-icon"><Icon size={28} /></div>
                <h3>{ui.emptyTitle}</h3>
                <p>{copy.empty}</p>
                <a className="button button-dark" href="/plan-your-safari?intent=plan">{ui.talk} <ArrowRight size={16} /></a>
              </div>
            )}
          </div>
        </section>

        <section className="category-trust">
          <div className="page-shell category-trust-grid">
            <div><ShieldCheck /><span><strong>{language === 'SW' ? 'Mipango ya kuaminika' : 'Thoughtful planning'}</strong><small>{language === 'SW' ? 'Taarifa zilizo wazi kabla ya safari.' : 'Clear details before you travel.'}</small></span></div>
            <div><Compass /><span><strong>{language === 'SW' ? 'Wataalamu wa ndani' : 'Local knowledge'}</strong><small>{language === 'SW' ? 'Timu inayofahamu Tanzania.' : 'A team that knows Tanzania.'}</small></span></div>
            <div><Clock3 /><span><strong>{language === 'SW' ? 'Huduma binafsi' : 'Personal support'}</strong><small>{language === 'SW' ? 'Msaada katika kupanga safari.' : 'Support while planning your journey.'}</small></span></div>
          </div>
        </section>
      </main>
      <Footer language={language} isInteriorPage />
      <a className="whatsapp-float" href="https://wa.me/255628890211" aria-label="Chat with us on WhatsApp" target="_blank" rel="noreferrer"><MessageCircle size={25} strokeWidth={2.3} /><Phone className="whatsapp-phone-mark" size={12} strokeWidth={3} /></a>
    </>
  );
}
