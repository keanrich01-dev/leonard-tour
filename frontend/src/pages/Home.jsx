import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, Award, CalendarDays, Check,
  ChevronDown, ChevronLeft, ChevronRight, Clock3, Compass, Facebook, Headphones, Instagram,
  Mail, MapPin, Menu, MessageCircle, Mountain, Phone, Play, ShieldCheck, Star, Trees,
  Users, X, Youtube
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');


const LANGUAGE_OPTIONS = [
  { value: 'EN', label: 'English' },
  { value: 'SW', label: 'Kiswahili' },
  { value: 'FR', label: 'Français' },
  { value: 'ZH', label: '中文' },
  { value: 'KO', label: '한국어' },
];

const COPY = {
  EN: {
    language: 'Language', navHome: 'Home', navAbout: 'About Us', navSafaris: 'Safaris', navClimbing: 'Climbing', navIsland: 'Island', navAccommodation: 'Accommodation', navBlog: 'Blog', navContact: 'Contact Us', navCamping: 'Camping Safaris', navMidrange: 'Mid-Range Safaris', navLuxury: 'Luxury Safaris', navMigration: 'Serengeti Migration', navKilimanjaro: 'Mount Kilimanjaro', navMeru: 'Mount Meru', admin: 'Admin', proposal: 'Request a Travel Proposal', planSafari: 'Plan Your Safari',
    heroEyebrow: 'TANZANIA · EAST AFRICA', heroTitle: 'Explore Tanzania', heroConfidence: 'With Confidence.', heroLead: 'Unforgettable safaris, breathtaking landscapes and lifetime memories. Discover the wild beauty of Tanzania with a team that knows it by heart.', skilledGuides: 'Skilled Local Guides', privateTours: 'Private & Custom Tours', quickSupport: '24/7 Quick Response & Support', exploreSafaris: 'Explore Our Safaris', talkExpert: 'Talk to a Safari Expert', heroCaption: 'A JOURNEY BEYOND EXPECTATIONS',
    introEyebrow: 'THE LEONARD TOUR EXPERIENCE', introTitle: 'Experience the', introTitleEm: 'Magic of Tanzania', introText1: 'Tanzania is a land of breathtaking landscapes, incredible wildlife and rich culture. From the sweeping plains of the Serengeti to the pristine beaches of Zanzibar, our tailor-made journeys bring you closer to the places that make this country extraordinary.', introText2: 'Travel with knowledgeable local guides, discover remarkable wildlife and meet the people and traditions that give Tanzania its spirit. Whether you dream of a private safari, a mountain challenge or an island escape, we plan every detail around you.', introLink: 'Discover our story',
    packagesEyebrow: 'HANDPICKED JOURNEYS', packagesTitle: 'Our Signature', packagesTitleEm: 'Safari Experiences', packagesLead: 'Thoughtfully designed journeys. Authentic encounters. Memories that stay with you.', day: 'DAY', days: 'DAYS', allJourneys: 'All Journeys', wildlife: 'Wildlife Safaris', mountainTreks: 'Mountain Treks', islandEscapes: 'Island Escapes', loadingJourneys: 'Loading journeys…', showing: 'Showing', of: 'of', journeys: 'journeys', viewItinerary: 'View Itinerary', perPerson: 'Per person · tailor-made', guestReviewsSoon: 'Guest reviews coming soon', exploreAll: 'Explore All Journeys',
    whyEyebrow: 'THE DIFFERENCE IS IN THE DETAILS', whyTitle: 'Why Travel With', whyTitleEm: 'Leonard Tour?', whyLead: 'Personal attention, local knowledge and a genuine love for Tanzania.', whyLocal: 'Local Safari Experts', whyLocalText: 'Travel with experienced guides who know Tanzania’s landscapes, wildlife and culture.', whySafe: 'Safe & Reliable', whySafeText: 'Your comfort, safety and peace of mind are considered at every stage of the journey.', whyCare: 'Travel With Care', whyCareText: 'We value responsible experiences that respect wildlife, nature and local communities.', whyValue: 'Exceptional Value', whyValueText: 'Thoughtful planning and personal service, with clear pricing and no hidden surprises.',
    videoEyebrow: 'TANZANIA, THROUGH OUR LENS', videoTitle: 'Feel the Spirit of', videoTitleEm: 'Tanzania', videoLead: 'From golden savannahs and extraordinary wildlife to welcoming cultures and turquoise shores, let Tanzania reveal its beauty before your journey even begins.', videoPoint1: 'Wild places, unforgettable encounters', videoPoint2: 'A rich culture and warm hospitality', videoPoint3: 'One destination, endless experiences', videoHint: 'Add your Tanzania showcase video at', videoUnavailable: 'Your Tanzania film will appear here',
    destinationsEyebrow: 'FIND YOUR TANZANIA', destinationsTitle: 'Landscapes That', destinationsTitleEm: 'Take Your Breath Away', destinationsLead: 'From iconic wildlife plains to the Indian Ocean, discover the remarkable diversity of Tanzania.',
    reviewsEyebrow: 'GUEST EXPERIENCES', reviewsTitle: 'What Our', reviewsTitleEm: 'Clients Say', reviewsLead: 'Real stories from travellers who explored Tanzania with Leonard Tour.', guestTraveller: 'Guest traveller', loadingReviews: 'Loading guest experiences…', emptyReviewTitle: 'Your story could be here.', emptyReviewText: 'Be among the first guests to share your Leonard Tour experience.', reviewsHint: 'Browse guest stories using the dots or swipe. Three reviews appear at a time on desktop and one at a time on phones. New reviews appear first, while every review remains saved in our records.',
    journeyMatters: 'YOUR JOURNEY MATTERS', everyAdventure: 'Every adventure', hasStory: 'has a story.', shareReviewText: 'Your experience can help another traveller discover the beauty of Tanzania. Share a few words about your journey with us.', reviewPromise: 'Your review will appear after our team approves it.', shareExperience: 'SHARE YOUR EXPERIENCE', writeReview: 'Write a', review: 'Review', reviewLead: 'We would love to hear how your trip went.', yourRating: 'Your rating', fullName: 'Full name', emailAddress: 'Email address', country: 'Country', profilePhoto: 'Profile photo', optional: '(optional)', yourExperience: 'Your experience', namePlaceholder: 'Your full name', countryPlaceholder: 'Where are you from?', reviewPlaceholder: 'Tell us what made your Tanzania journey special…', uploadHint: 'JPG, PNG or WEBP · maximum 4 MB', submittingReview: 'Submitting review…', submitReview: 'Submit your review', emailPrivate: 'Your email address is kept private and is never displayed with your review.', successReview: 'Thank you! Your review has been submitted and is awaiting approval.',
    experienceEyebrow: 'YOUR ADVENTURE STARTS HERE', experienceTitle: 'More Than a Destination.', experienceTitleEm: 'A Story You’ll Carry Forever.', experienceLead: 'Tell us what inspires you. We’ll help turn your Tanzania dream into a journey made just for you.', planPrivateSafari: 'Plan Your Private Safari',
    footerBrandText: 'Discover Tanzania’s natural beauty with locally guided safaris, mountain adventures and unforgettable island escapes.', quickLinks: 'Quick Links', footerHome: 'Home', footerSafaris: 'Safari Packages', footerDestinations: 'Destinations', topDestinations: 'Top Destinations', contact: 'Contact Us', safeBooking: 'Safe & Secure Booking', peaceMind: 'Your peace of mind matters to us.', privacy: 'Privacy Policy', terms: 'Terms & Conditions', faq: 'FAQ', exploreRemember: 'Explore · Experience · Remember',
    newsletterTitle: 'Stay inspired by Tanzania', newsletterText: 'Get occasional safari inspiration, destination stories and travel updates from Leonard Tour.', newsletterEmail: 'Your email address', newsletterConsent: 'I agree to receive occasional travel updates by email.', newsletterSubmit: 'Subscribe', newsletterSending: 'Subscribing…', newsletterSuccess: 'Thank you. Your email has been added to our travel updates list.', newsletterDuplicate: 'This email is already subscribed.', newsletterError: 'We could not save your subscription. Please try again.',
  },
  SW: {
    language: 'Lugha', navHome: 'Mwanzo', navAbout: 'Kuhusu Sisi', navSafaris: 'Safari', navClimbing: 'Kupanda Milima', navIsland: 'Visiwa', navAccommodation: 'Malazi', navBlog: 'Makala', navContact: 'Wasiliana Nasi', navCamping: 'Safari za Kambi', navMidrange: 'Safari za Kiwango cha Kati', navLuxury: 'Safari za Kifahari', navMigration: 'Uhamaji wa Serengeti', navKilimanjaro: 'Mlima Kilimanjaro', navMeru: 'Mlima Meru', admin: 'Msimamizi', proposal: 'Omba Mpango wa Safari', planSafari: 'Panga Safari Yako',
    heroEyebrow: 'TANZANIA · AFRIKA MASHARIKI', heroTitle: 'Gundua Tanzania', heroConfidence: 'Kwa Uhakika.', heroLead: 'Safari zisizosahaulika, mandhari ya kuvutia na kumbukumbu za maisha. Gundua uzuri wa pori la Tanzania ukiwa na timu inayoifahamu vizuri.', skilledGuides: 'Waongoza Watalii Wenye Uzoefu', privateTours: 'Safari Binafsi na Maalumu', quickSupport: 'Huduma ya Haraka Saa 24/7', exploreSafaris: 'Gundua Safari Zetu', talkExpert: 'Ongea na Mtaalamu wa Safari', heroCaption: 'SAFARI YA KIPEKEE ISIYOSAHAULIKA',
    introEyebrow: 'UZOEFU WA LEONARD TOUR', introTitle: 'Furahia', introTitleEm: 'Uchawi wa Tanzania', introText1: 'Tanzania ni nchi yenye mandhari ya kuvutia, wanyamapori wa ajabu na utamaduni tajiri. Kuanzia nyanda za Serengeti hadi fukwe safi za Zanzibar, safari zetu maalumu zinakuleta karibu na maeneo yanayoifanya nchi hii kuwa ya kipekee.', introText2: 'Safiri na waongoza watalii wenye ujuzi, waone wanyamapori na ufahamu watu pamoja na mila zinazoipa Tanzania utambulisho wake. Iwe unatamani safari binafsi, changamoto ya mlima au mapumziko kisiwani, tunapanga kila kitu kwa ajili yako.', introLink: 'Jifunze kuhusu sisi',
    packagesEyebrow: 'SAFARI TULIZOKUCHAGULIA', packagesTitle: 'Safari Zetu', packagesTitleEm: 'Bora za Kipekee', packagesLead: 'Safari zilizopangwa kwa umakini. Uzoefu halisi. Kumbukumbu zitakazodumu.', day: 'SIKU', days: 'SIKU', allJourneys: 'Safari Zote', wildlife: 'Safari za Wanyamapori', mountainTreks: 'Safari za Milimani', islandEscapes: 'Mapumziko Visiwani', loadingJourneys: 'Inapakia safari…', showing: 'Zinaonyeshwa', of: 'kati ya', journeys: 'safari', viewItinerary: 'Ona Ratiba', perPerson: 'Kwa mtu · safari maalumu', guestReviewsSoon: 'Maoni ya wageni yanakuja', exploreAll: 'Ona Safari Zote',
    whyEyebrow: 'UBORA UPO KWENYE MAELEZO', whyTitle: 'Kwa Nini Usafiri na', whyTitleEm: 'Leonard Tour?', whyLead: 'Huduma binafsi, ujuzi wa eneo na upendo wa kweli kwa Tanzania.', whyLocal: 'Wataalamu wa Safari wa Ndani', whyLocalText: 'Safiri na waongoza watalii wanaozifahamu mandhari, wanyamapori na utamaduni wa Tanzania.', whySafe: 'Salama na Waaminifu', whySafeText: 'Usalama, faraja na amani yako huzingatiwa katika kila hatua ya safari.', whyCare: 'Utalii Wenye Uwajibikaji', whyCareText: 'Tunathamini utalii unaoheshimu wanyamapori, mazingira na jamii za wenyeji.', whyValue: 'Thamani ya Kipekee', whyValueText: 'Mipango makini na huduma binafsi, bei zilizo wazi bila gharama zilizofichwa.',
    videoEyebrow: 'TANZANIA KUPITIA LENZI YETU', videoTitle: 'Hisia za', videoTitleEm: 'Tanzania', videoLead: 'Kuanzia savana za dhahabu na wanyamapori wa ajabu hadi tamaduni zenye ukarimu na fukwe za kuvutia, iruhusu Tanzania ikuonyeshe uzuri wake kabla safari yako haijaanza.', videoPoint1: 'Maeneo ya pori na matukio yasiyosahaulika', videoPoint2: 'Utamaduni tajiri na ukarimu wa watu', videoPoint3: 'Eneo moja, uzoefu usio na kikomo', videoHint: 'Weka video yako ya Tanzania hapa', videoUnavailable: 'Video yako ya Tanzania itaonekana hapa',
    destinationsEyebrow: 'GUNDUA TANZANIA YAKO', destinationsTitle: 'Mandhari Yanayokuvutia', destinationsTitleEm: 'Na Kukukatisha Pumzi', destinationsLead: 'Kuanzia nyanda maarufu za wanyamapori hadi Bahari ya Hindi, gundua utofauti wa kipekee wa Tanzania.',
    reviewsEyebrow: 'UZOEFU WA WAGENI', reviewsTitle: 'Wateja Wetu', reviewsTitleEm: 'Wanasemaje?', reviewsLead: 'Hadithi halisi kutoka kwa wasafiri walioitembelea Tanzania na Leonard Tour.', guestTraveller: 'Msafiri mgeni', loadingReviews: 'Inapakia maoni ya wageni…', emptyReviewTitle: 'Hadithi yako inaweza kuwa hapa.', emptyReviewText: 'Kuwa miongoni mwa wageni wa kwanza kushiriki uzoefu wako wa Leonard Tour.', reviewsHint: 'Tumia nukta au telezesha kuona maoni mengine. Kompyuta huonyesha maoni matatu na simu huonyesha moja kwa wakati. Maoni mapya huonekana kwanza, huku yote yakihifadhiwa kwenye kumbukumbu.',
    journeyMatters: 'SAFARI YAKO NI MUHIMU', everyAdventure: 'Kila safari', hasStory: 'ina hadithi yake.', shareReviewText: 'Uzoefu wako unaweza kumsaidia msafiri mwingine kugundua uzuri wa Tanzania. Shiriki nasi machache kuhusu safari yako.', reviewPromise: 'Maoni yako yataonekana kwenye tovuti baada ya timu yetu kuyaidhinisha.', shareExperience: 'SHIRIKI UZOEFU WAKO', writeReview: 'Andika', review: 'Maoni', reviewLead: 'Tungependa kusikia safari yako ilivyokuwa.', yourRating: 'Kiwango chako', fullName: 'Jina kamili', emailAddress: 'Barua pepe', country: 'Nchi', profilePhoto: 'Picha ya wasifu', optional: '(si lazima)', yourExperience: 'Uzoefu wako', namePlaceholder: 'Jina lako kamili', countryPlaceholder: 'Unatoka nchi gani?', reviewPlaceholder: 'Tuambie nini kilifanya safari yako ya Tanzania iwe ya kipekee…', uploadHint: 'JPG, PNG au WEBP · kiwango cha juu 4 MB', submittingReview: 'Inatuma maoni…', submitReview: 'Tuma maoni yako', emailPrivate: 'Barua pepe yako ni ya siri na haitaonyeshwa pamoja na maoni yako.', successReview: 'Asante! Maoni yako yametumwa na yanasubiri kuidhinishwa.',
    experienceEyebrow: 'SAFARI YAKO INAANZA HAPA', experienceTitle: 'Zaidi ya Eneo la Kutembelea.', experienceTitleEm: 'Ni Hadithi Utakayobeba Maishani.', experienceLead: 'Tuambie kinachokuvutia. Tutakusaidia kubadilisha ndoto yako ya Tanzania kuwa safari iliyotengenezwa kwa ajili yako.', planPrivateSafari: 'Panga Safari Binafsi',
    footerBrandText: 'Gundua uzuri wa Tanzania kupitia safari zinazoongozwa na wenyeji, milima na mapumziko ya visiwani.', quickLinks: 'Viungo vya Haraka', footerHome: 'Mwanzo', footerSafaris: 'Vifurushi vya Safari', footerDestinations: 'Maeneo ya Kutembelea', topDestinations: 'Maeneo Maarufu', contact: 'Wasiliana Nasi', safeBooking: 'Uwekaji Nafasi Salama', peaceMind: 'Amani yako ni muhimu kwetu.', privacy: 'Sera ya Faragha', terms: 'Vigezo na Masharti', faq: 'Maswali', exploreRemember: 'Gundua · Furahia · Kumbuka',
    newsletterTitle: 'Pata hamasa ya Tanzania', newsletterText: 'Pokea mara kwa mara mawazo ya safari, simulizi za maeneo na taarifa za utalii kutoka Leonard Tour.', newsletterEmail: 'Anuani yako ya barua pepe', newsletterConsent: 'Nakubali kupokea taarifa za safari kupitia barua pepe mara kwa mara.', newsletterSubmit: 'Jiunge', newsletterSending: 'Inajiunga…', newsletterSuccess: 'Asante. Barua pepe yako imeongezwa kwenye orodha yetu ya taarifa za safari.', newsletterDuplicate: 'Barua pepe hii tayari imejiunga.', newsletterError: 'Hatukuweza kuhifadhi usajili wako. Tafadhali jaribu tena.',
  },
  FR: {
    language: 'Langue', navHome: 'Accueil', navAbout: 'À propos', navSafaris: 'Safaris', navClimbing: 'Randonnée', navIsland: 'Îles', navAccommodation: 'Hébergement', navBlog: 'Blog', navContact: 'Contact', navCamping: 'Safaris en camping', navMidrange: 'Safaris milieu de gamme', navLuxury: 'Safaris de luxe', navMigration: 'Grande Migration du Serengeti', navKilimanjaro: 'Mont Kilimandjaro', navMeru: 'Mont Meru', admin: 'Admin', proposal: 'Demander un devis de voyage', planSafari: 'Planifier votre safari',
    heroEyebrow: 'TANZANIE · AFRIQUE DE L’EST', heroTitle: 'Explorez la Tanzanie', heroConfidence: 'En Toute Confiance.', heroLead: 'Des safaris inoubliables, des paysages époustouflants et des souvenirs pour la vie. Découvrez la nature sauvage de la Tanzanie avec une équipe qui la connaît parfaitement.', skilledGuides: 'Guides locaux expérimentés', privateTours: 'Circuits privés et sur mesure', quickSupport: 'Assistance rapide 24 h/24', exploreSafaris: 'Découvrir nos safaris', talkExpert: 'Parler à un expert safari', heroCaption: 'UN VOYAGE AU-DELÀ DES ATTENTES',
    introEyebrow: 'L’EXPÉRIENCE LEONARD TOUR', introTitle: 'Découvrez la', introTitleEm: 'Magie de la Tanzanie', introText1: 'La Tanzanie offre des paysages saisissants, une faune incroyable et une culture riche. Des plaines du Serengeti aux plages immaculées de Zanzibar, nos voyages sur mesure vous rapprochent des lieux qui rendent ce pays exceptionnel.', introText2: 'Voyagez avec des guides locaux expérimentés, observez une faune remarquable et découvrez les traditions qui donnent son âme à la Tanzanie. Safari privé, ascension ou escapade insulaire : nous organisons chaque détail pour vous.', introLink: 'Découvrir notre histoire',
    packagesEyebrow: 'VOYAGES SÉLECTIONNÉS', packagesTitle: 'Nos', packagesTitleEm: 'Expériences Safari Signature', packagesLead: 'Des voyages conçus avec soin. Des rencontres authentiques. Des souvenirs durables.', day: 'JOUR', days: 'JOURS', allJourneys: 'Tous les voyages', wildlife: 'Safaris animaliers', mountainTreks: 'Randonnées en montagne', islandEscapes: 'Escapades insulaires', loadingJourneys: 'Chargement des voyages…', showing: 'Affichage de', of: 'sur', journeys: 'voyages', viewItinerary: 'Voir l’itinéraire', perPerson: 'Par personne · sur mesure', guestReviewsSoon: 'Avis des voyageurs bientôt disponibles', exploreAll: 'Explorer tous les voyages',
    whyEyebrow: 'LA DIFFÉRENCE EST DANS LES DÉTAILS', whyTitle: 'Pourquoi voyager avec', whyTitleEm: 'Leonard Tour ?', whyLead: 'Une attention personnelle, une connaissance locale et un véritable amour de la Tanzanie.', whyLocal: 'Experts safari locaux', whyLocalText: 'Voyagez avec des guides qui connaissent les paysages, la faune et la culture de Tanzanie.', whySafe: 'Sûr et fiable', whySafeText: 'Votre confort, votre sécurité et votre tranquillité sont essentiels à chaque étape.', whyCare: 'Voyager avec respect', whyCareText: 'Nous privilégions un tourisme responsable envers la faune, la nature et les communautés.', whyValue: 'Valeur exceptionnelle', whyValueText: 'Une planification réfléchie et un service personnalisé, sans frais cachés.',
    videoEyebrow: 'LA TANZANIE À TRAVERS NOTRE OBJECTIF', videoTitle: 'Ressentez l’esprit de la', videoTitleEm: 'Tanzanie', videoLead: 'Des savanes dorées à la faune extraordinaire, des cultures accueillantes aux plages turquoise, laissez la Tanzanie révéler sa beauté avant même votre départ.', videoPoint1: 'Espaces sauvages et rencontres inoubliables', videoPoint2: 'Culture riche et hospitalité chaleureuse', videoPoint3: 'Une destination, mille expériences', videoHint: 'Ajoutez votre vidéo de Tanzanie ici', videoUnavailable: 'Votre film de Tanzanie apparaîtra ici',
    destinationsEyebrow: 'TROUVEZ VOTRE TANZANIE', destinationsTitle: 'Des paysages qui', destinationsTitleEm: 'Coupent le souffle', destinationsLead: 'Des plaines animalières emblématiques à l’océan Indien, découvrez la diversité de la Tanzanie.',
    reviewsEyebrow: 'EXPÉRIENCES DES VOYAGEURS', reviewsTitle: 'Ce que disent', reviewsTitleEm: 'Nos clients', reviewsLead: 'Des témoignages authentiques de voyageurs ayant découvert la Tanzanie avec Leonard Tour.', guestTraveller: 'Voyageur', loadingReviews: 'Chargement des avis…', emptyReviewTitle: 'Votre histoire pourrait être ici.', emptyReviewText: 'Soyez parmi les premiers à partager votre expérience Leonard Tour.', reviewsHint: 'Parcourez les avis avec les points ou en faisant glisser. Trois avis sur ordinateur et un sur téléphone. Les nouveaux avis apparaissent en premier, tous restent archivés.',
    journeyMatters: 'VOTRE VOYAGE COMPTE', everyAdventure: 'Chaque aventure', hasStory: 'a son histoire.', shareReviewText: 'Votre expérience peut aider un autre voyageur à découvrir la Tanzanie. Partagez quelques mots sur votre voyage.', reviewPromise: 'Votre avis sera publié après validation par notre équipe.', shareExperience: 'PARTAGEZ VOTRE EXPÉRIENCE', writeReview: 'Écrire un', review: 'Avis', reviewLead: 'Nous aimerions savoir comment s’est passé votre voyage.', yourRating: 'Votre note', fullName: 'Nom complet', emailAddress: 'Adresse e-mail', country: 'Pays', profilePhoto: 'Photo de profil', optional: '(facultatif)', yourExperience: 'Votre expérience', namePlaceholder: 'Votre nom complet', countryPlaceholder: 'D’où venez-vous ?', reviewPlaceholder: 'Dites-nous ce qui a rendu votre voyage en Tanzanie spécial…', uploadHint: 'JPG, PNG ou WEBP · 4 Mo maximum', submittingReview: 'Envoi de l’avis…', submitReview: 'Envoyer votre avis', emailPrivate: 'Votre adresse e-mail reste privée et ne sera jamais affichée.', successReview: 'Merci ! Votre avis a été envoyé et attend une validation.',
    experienceEyebrow: 'VOTRE AVENTURE COMMENCE ICI', experienceTitle: 'Bien plus qu’une destination.', experienceTitleEm: 'Une histoire à garder toute sa vie.', experienceLead: 'Dites-nous ce qui vous inspire. Nous transformerons votre rêve de Tanzanie en un voyage conçu pour vous.', planPrivateSafari: 'Planifier un safari privé',
    footerBrandText: 'Découvrez la beauté naturelle de la Tanzanie avec des safaris guidés localement, des aventures en montagne et des escapades insulaires.', quickLinks: 'Liens rapides', footerHome: 'Accueil', footerSafaris: 'Forfaits safari', footerDestinations: 'Destinations', topDestinations: 'Destinations phares', contact: 'Contact', safeBooking: 'Réservation sûre et sécurisée', peaceMind: 'Votre tranquillité compte pour nous.', privacy: 'Confidentialité', terms: 'Conditions générales', faq: 'FAQ', exploreRemember: 'Explorer · Vivre · Se souvenir',
    newsletterTitle: 'Laissez-vous inspirer par la Tanzanie', newsletterText: 'Recevez de temps en temps des idées de safari, des récits de destinations et des actualités de Leonard Tour.', newsletterEmail: 'Votre adresse e-mail', newsletterConsent: 'J’accepte de recevoir occasionnellement des actualités de voyage par e-mail.', newsletterSubmit: 'S’abonner', newsletterSending: 'Inscription…', newsletterSuccess: 'Merci. Votre adresse e-mail a été ajoutée à notre liste d’actualités.', newsletterDuplicate: 'Cette adresse e-mail est déjà abonnée.', newsletterError: 'Impossible d’enregistrer votre inscription. Veuillez réessayer.',
  },
  ZH: {
    language: '语言', navHome: '首页', navAbout: '关于我们', navSafaris: '野生动物之旅', navClimbing: '登山', navIsland: '海岛', navAccommodation: '住宿', navBlog: '博客', navContact: '联系我们', navCamping: '露营 safari', navMidrange: '中档 safari', navLuxury: '豪华 safari', navMigration: '塞伦盖蒂动物大迁徙', navKilimanjaro: '乞力马扎罗山', navMeru: '梅鲁山', admin: '管理', proposal: '获取旅行方案', planSafari: '规划您的 safari',
    heroEyebrow: '坦桑尼亚 · 东非', heroTitle: '探索坦桑尼亚', heroConfidence: '安心出发。', heroLead: '难忘的 safari、壮丽的风景和一生珍藏的回忆。与熟悉这片土地的团队一起探索坦桑尼亚的野性之美。', skilledGuides: '专业本地向导', privateTours: '私人定制行程', quickSupport: '全天候快速支持', exploreSafaris: '探索我们的 safari', talkExpert: '联系 safari 专家', heroCaption: '超越期待的旅程',
    introEyebrow: 'LEONARD TOUR 体验', introTitle: '体验', introTitleEm: '坦桑尼亚的魅力', introText1: '坦桑尼亚拥有令人惊叹的景观、丰富的野生动物和深厚的文化。从塞伦盖蒂平原到桑给巴尔洁白的海滩，我们为您量身定制旅程，带您走近这个国家最精彩的地方。', introText2: '与经验丰富的本地向导同行，发现野生动物，了解赋予坦桑尼亚独特魅力的人们与传统。无论是私人 safari、登山挑战还是海岛度假，我们都会为您安排每个细节。', introLink: '了解我们的故事',
    packagesEyebrow: '精选旅程', packagesTitle: '我们的特色', packagesTitleEm: 'Safari 体验', packagesLead: '精心设计的旅程。真实的相遇。值得珍藏的回忆。', day: '天', days: '天', allJourneys: '全部行程', wildlife: '野生动物 safari', mountainTreks: '登山之旅', islandEscapes: '海岛度假', loadingJourneys: '正在加载行程…', showing: '显示', of: '共', journeys: '个行程', viewItinerary: '查看行程', perPerson: '每人 · 定制', guestReviewsSoon: '游客评价即将推出', exploreAll: '探索全部行程',
    whyEyebrow: '细节成就不同', whyTitle: '为何选择', whyTitleEm: 'Leonard Tour？', whyLead: '贴心服务、本地知识，以及对坦桑尼亚的热爱。', whyLocal: '本地 safari 专家', whyLocalText: '与熟悉坦桑尼亚风景、野生动物和文化的专业向导同行。', whySafe: '安全可靠', whySafeText: '旅程每一步都重视您的舒适、安全与安心。', whyCare: '负责任的旅行', whyCareText: '我们尊重野生动物、自然环境和当地社区。', whyValue: '卓越价值', whyValueText: '周到规划和个性化服务，价格清晰，没有隐藏费用。',
    videoEyebrow: '镜头中的坦桑尼亚', videoTitle: '感受', videoTitleEm: '坦桑尼亚的灵魂', videoLead: '从金色草原和神奇野生动物，到热情文化和碧蓝海岸，在旅程开始前先感受坦桑尼亚的魅力。', videoPoint1: '野外秘境与难忘邂逅', videoPoint2: '丰富文化与热情款待', videoPoint3: '一个目的地，无限体验', videoHint: '请将坦桑尼亚视频放在这里', videoUnavailable: '您的坦桑尼亚影片将在此显示',
    destinationsEyebrow: '发现您的坦桑尼亚', destinationsTitle: '令人屏息的', destinationsTitleEm: '壮丽风景', destinationsLead: '从著名野生动物平原到印度洋，探索坦桑尼亚的多样魅力。',
    reviewsEyebrow: '游客体验', reviewsTitle: '客户', reviewsTitleEm: '怎么说', reviewsLead: '与 Leonard Tour 探索坦桑尼亚的游客真实分享。', guestTraveller: '游客', loadingReviews: '正在加载游客评价…', emptyReviewTitle: '您的故事也可以出现在这里。', emptyReviewText: '成为首批分享 Leonard Tour 体验的游客之一。', reviewsHint: '使用圆点或滑动浏览评价。电脑每次显示三条，手机每次显示一条。最新评价优先显示，所有评价都会保存。',
    journeyMatters: '您的旅程很重要', everyAdventure: '每一次冒险', hasStory: '都有一个故事。', shareReviewText: '您的体验可以帮助其他旅行者发现坦桑尼亚之美。请与我们分享您的旅程。', reviewPromise: '您的评价将在团队审核通过后显示在网站上。', shareExperience: '分享您的体验', writeReview: '写下', review: '评价', reviewLead: '我们很想了解您的旅程体验。', yourRating: '您的评分', fullName: '姓名', emailAddress: '电子邮箱', country: '国家', profilePhoto: '头像照片', optional: '（可选）', yourExperience: '您的体验', namePlaceholder: '您的姓名', countryPlaceholder: '您来自哪里？', reviewPlaceholder: '告诉我们坦桑尼亚之旅特别在哪里…', uploadHint: 'JPG、PNG 或 WEBP · 最大 4 MB', submittingReview: '正在提交…', submitReview: '提交评价', emailPrivate: '您的电子邮箱将保密，不会显示在评价旁。', successReview: '谢谢！您的评价已提交，正在等待审核。',
    experienceEyebrow: '您的冒险从这里开始', experienceTitle: '不止是一个目的地。', experienceTitleEm: '更是一生珍藏的故事。', experienceLead: '告诉我们您的向往，我们将把您的坦桑尼亚梦想变成专属旅程。', planPrivateSafari: '规划私人 safari',
    footerBrandText: '通过本地向导带领的 safari、登山探险和难忘海岛之旅，发现坦桑尼亚的自然之美。', quickLinks: '快速链接', footerHome: '首页', footerSafaris: 'Safari 套餐', footerDestinations: '目的地', topDestinations: '热门目的地', contact: '联系我们', safeBooking: '安全预订', peaceMind: '您的安心对我们很重要。', privacy: '隐私政策', terms: '条款与条件', faq: '常见问题', exploreRemember: '探索 · 体验 · 铭记',
    newsletterTitle: '探索坦桑尼亚的灵感', newsletterText: '不定期接收来自 Leonard Tour 的 safari 灵感、目的地故事和旅行资讯。', newsletterEmail: '您的电子邮箱', newsletterConsent: '我同意通过电子邮件接收不定期旅行资讯。', newsletterSubmit: '订阅', newsletterSending: '正在订阅…', newsletterSuccess: '谢谢。您的邮箱已添加到旅行资讯列表。', newsletterDuplicate: '此邮箱已经订阅。', newsletterError: '无法保存您的订阅，请重试。',
  },
  KO: {
    language: '언어', navHome: '홈', navAbout: '회사 소개', navSafaris: '사파리', navClimbing: '등산', navIsland: '섬 여행', navAccommodation: '숙박', navBlog: '블로그', navContact: '문의하기', navCamping: '캠핑 사파리', navMidrange: '미드레인지 사파리', navLuxury: '럭셔리 사파리', navMigration: '세렝게티 대이동', navKilimanjaro: '킬리만자로 산', navMeru: '메루 산', admin: '관리자', proposal: '여행 제안 요청', planSafari: '사파리 계획하기',
    heroEyebrow: '탄자니아 · 동아프리카', heroTitle: '탄자니아를 탐험하세요', heroConfidence: '안심하고 떠나세요.', heroLead: '잊지 못할 사파리와 아름다운 풍경, 평생 간직할 추억을 만나보세요. 현지를 잘 아는 팀과 함께 탄자니아의 야생을 경험하세요.', skilledGuides: '숙련된 현지 가이드', privateTours: '프라이빗 맞춤 투어', quickSupport: '24시간 신속한 지원', exploreSafaris: '사파리 둘러보기', talkExpert: '사파리 전문가 상담', heroCaption: '기대 그 이상의 여정',
    introEyebrow: 'Leonard Tour 경험', introTitle: '경험하세요', introTitleEm: '탄자니아의 매력', introText1: '탄자니아는 숨 막히는 풍경과 놀라운 야생동물, 풍부한 문화를 자랑합니다. 세렝게티 평원부터 잔지바르의 깨끗한 해변까지, 맞춤 여행으로 이 나라의 특별한 장소를 가까이에서 만나보세요.', introText2: '현지 전문가이드와 함께 야생동물을 만나고 탄자니아의 정신을 담은 사람들과 전통을 알아보세요. 프라이빗 사파리, 산악 도전 또는 섬 휴양 등 모든 세부 일정을 고객에게 맞춰 계획합니다.', introLink: '우리 이야기 보기',
    packagesEyebrow: '엄선된 여행', packagesTitle: '시그니처', packagesTitleEm: '사파리 경험', packagesLead: '세심하게 설계한 여정. 진정한 만남. 오래 남을 추억.', day: '일', days: '일', allJourneys: '모든 여행', wildlife: '야생동물 사파리', mountainTreks: '산악 트레킹', islandEscapes: '섬 휴양', loadingJourneys: '여행 정보를 불러오는 중…', showing: '표시', of: '/', journeys: '개 여행', viewItinerary: '일정 보기', perPerson: '1인 기준 · 맞춤형', guestReviewsSoon: '고객 후기가 곧 제공됩니다', exploreAll: '모든 여행 보기',
    whyEyebrow: '차이는 디테일에 있습니다', whyTitle: '왜', whyTitleEm: 'Leonard Tour와 함께할까요?', whyLead: '세심한 관심, 현지 지식, 탄자니아에 대한 진심 어린 사랑.', whyLocal: '현지 사파리 전문가', whyLocalText: '탄자니아의 풍경과 야생동물, 문화를 잘 아는 가이드와 여행하세요.', whySafe: '안전과 신뢰', whySafeText: '여정의 모든 단계에서 편안함과 안전, 안심을 최우선으로 합니다.', whyCare: '책임 있는 여행', whyCareText: '야생동물과 자연, 지역사회를 존중하는 여행을 소중히 여깁니다.', whyValue: '뛰어난 가치', whyValueText: '숨겨진 비용 없이 명확한 가격과 세심한 계획, 맞춤 서비스를 제공합니다.',
    videoEyebrow: '우리의 렌즈로 본 탄자니아', videoTitle: '느껴보세요', videoTitleEm: '탄자니아의 정신', videoLead: '황금빛 사바나와 놀라운 야생동물부터 따뜻한 문화와 푸른 해변까지, 여행을 시작하기 전에 탄자니아의 아름다움을 만나보세요.', videoPoint1: '야생의 장소와 잊지 못할 만남', videoPoint2: '풍부한 문화와 따뜻한 환대', videoPoint3: '하나의 목적지, 끝없는 경험', videoHint: '탄자니아 소개 영상을 여기에 추가하세요', videoUnavailable: '탄자니아 영상이 여기에 표시됩니다',
    destinationsEyebrow: '나만의 탄자니아 찾기', destinationsTitle: '숨이 멎을 듯한', destinationsTitleEm: '아름다운 풍경', destinationsLead: '상징적인 야생동물 평원부터 인도양까지, 탄자니아의 놀라운 다양성을 만나보세요.',
    reviewsEyebrow: '여행객 경험', reviewsTitle: '고객들의', reviewsTitleEm: '이야기', reviewsLead: 'Leonard Tour와 탄자니아를 여행한 고객들의 실제 이야기입니다.', guestTraveller: '여행객', loadingReviews: '후기를 불러오는 중…', emptyReviewTitle: '여러분의 이야기도 이곳에 소개될 수 있습니다.', emptyReviewText: 'Leonard Tour 경험을 처음으로 공유해 보세요.', reviewsHint: '점이나 스와이프로 후기를 둘러보세요. 데스크톱은 한 번에 세 개, 휴대전화는 한 개씩 표시됩니다. 새 후기가 먼저 나오며 모든 후기는 기록에 보관됩니다.',
    journeyMatters: '여러분의 여정은 소중합니다', everyAdventure: '모든 모험에는', hasStory: '이야기가 있습니다.', shareReviewText: '여러분의 경험은 다른 여행객이 탄자니아의 아름다움을 발견하도록 도울 수 있습니다. 여행 이야기를 들려주세요.', reviewPromise: '후기는 담당 팀의 승인을 받은 후 웹사이트에 표시됩니다.', shareExperience: '경험 공유하기', writeReview: '후기', review: '작성', reviewLead: '여행이 어땠는지 듣고 싶습니다.', yourRating: '평점', fullName: '이름', emailAddress: '이메일 주소', country: '국가', profilePhoto: '프로필 사진', optional: '(선택)', yourExperience: '여행 경험', namePlaceholder: '이름을 입력하세요', countryPlaceholder: '어느 나라에서 오셨나요?', reviewPlaceholder: '탄자니아 여행이 특별했던 이유를 들려주세요…', uploadHint: 'JPG, PNG 또는 WEBP · 최대 4MB', submittingReview: '후기 제출 중…', submitReview: '후기 제출하기', emailPrivate: '이메일 주소는 비공개이며 후기에 표시되지 않습니다.', successReview: '감사합니다! 후기가 제출되었으며 승인을 기다리고 있습니다.',
    experienceEyebrow: '모험은 여기서 시작됩니다', experienceTitle: '단순한 여행지가 아닙니다.', experienceTitleEm: '평생 간직할 이야기입니다.', experienceLead: '원하는 것을 알려주세요. 탄자니아의 꿈을 여러분만을 위한 여정으로 만들어 드립니다.', planPrivateSafari: '프라이빗 사파리 계획',
    footerBrandText: '현지 가이드 사파리와 산악 모험, 잊지 못할 섬 여행으로 탄자니아의 자연을 발견하세요.', quickLinks: '빠른 링크', footerHome: '홈', footerSafaris: '사파리 패키지', footerDestinations: '여행지', topDestinations: '인기 여행지', contact: '문의하기', safeBooking: '안전한 예약', peaceMind: '고객의 안심이 가장 중요합니다.', privacy: '개인정보 보호', terms: '이용 약관', faq: '자주 묻는 질문', exploreRemember: '탐험 · 경험 · 기억',
    newsletterTitle: '탄자니아 여행의 영감을 만나보세요', newsletterText: 'Leonard Tour의 사파리 아이디어, 여행지 이야기와 소식을 가끔 이메일로 받아보세요.', newsletterEmail: '이메일 주소', newsletterConsent: '가끔 여행 소식을 이메일로 받는 데 동의합니다.', newsletterSubmit: '구독하기', newsletterSending: '구독 중…', newsletterSuccess: '감사합니다. 이메일이 여행 소식 목록에 추가되었습니다.', newsletterDuplicate: '이미 구독한 이메일 주소입니다.', newsletterError: '구독 정보를 저장하지 못했습니다. 다시 시도해 주세요.',
  },
};

function t(language, key) {
  return COPY[language]?.[key] || COPY.EN[key] || key;
}

const destinations = [
  { name: 'Serengeti', slug: 'serengeti', note: 'The great migration', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=900&q=85' },
  { name: 'Ngorongoro', slug: 'ngorongoro', note: 'A world within a crater', image: 'https://images.unsplash.com/photo-1535338454770-8be927b5a00b?auto=format&fit=crop&w=900&q=85' },
  { name: 'Kilimanjaro', slug: 'kilimanjaro', note: 'Reach the roof of Africa', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85' },
  { name: 'Zanzibar', slug: 'zanzibar', note: 'The Indian Ocean escape', image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=85' },
  { name: 'Tarangire', slug: 'tarangire', note: 'Land of giants', image: 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=900&q=85' },
  { name: 'Mikumi', slug: 'mikumi', note: 'Wildlife of the southern circuit', image: 'https://www.tanzaniaparks.go.tz/_next/image?q=75&url=%2F_next%2Fstatic%2Fmedia%2Fmikumi-cover%402x.5c5c7e29.jpg&w=1536' },
];

// These are the original homepage visual choices retained as safe fallbacks.
// Live package images always take priority whenever their actual file is available.
const PACKAGE_CARD_FALLBACKS = {
  safari: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=85',
  ngorongoro: 'https://images.unsplash.com/photo-1535338454770-8be927b5a00b?auto=format&fit=crop&w=1200&q=85',
  tarangire: 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=1200&q=85',
  forest: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=85',
  climbing: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85',
  beach: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=85',
};
const MIGRATION_CARD_FALLBACK = 'https://images.pexels.com/photos/12339600/pexels-photo-12339600.jpeg?cs=srgb&dl=pexels-garycohen-12339600.jpg&fm=jpg';
function packageCardFallback(item) {
  const slug = String(item?.slug || '').toLowerCase();
  const marker = `${slug} ${item?.title || ''} ${item?.type || ''}`.toLowerCase();
  if (marker.includes('migration')) return MIGRATION_CARD_FALLBACK;
  if (slug === 'midrange-6days' || marker.includes('tarangire')) return PACKAGE_CARD_FALLBACKS.tarangire;
  if (slug === 'luxury-5days' || marker.includes('ngorongoro')) return PACKAGE_CARD_FALLBACKS.ngorongoro;
  if (categoryIsClimbing(item) || /kilimanjaro|mount-meru|kili-machame|meru-4days/.test(marker)) return PACKAGE_CARD_FALLBACKS.climbing;
  const category = String(item?.category || item?.type || 'safari').toLowerCase();
  if (category.includes('beach') || category.includes('island') || /zanzibar|pemba|mafia|unguja/.test(marker)) return PACKAGE_CARD_FALLBACKS.beach;
  if (slug === 'camping-7days') return PACKAGE_CARD_FALLBACKS.forest;
  return PACKAGE_CARD_FALLBACKS.safari;
}
function categoryIsClimbing(item) {
  const category = String(item?.category || item?.type || '').toLowerCase();
  return category.includes('climb') || category.includes('mountain');
}

function resolvePackageImage(value) {
  if (!value || typeof value !== 'string') return '';
  const image = value.trim().replaceAll('\\', '/');
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  if (image.startsWith('/images/')) return image;
  if (image.startsWith('images/')) return `/${image}`;
  if (image.startsWith('/media/')) return `${API_BASE}${image}`;
  if (image.startsWith('/')) return `${API_BASE}${image}`;
  return `${API_BASE}/media/${image.replace(/^\/+/, '')}`;
}

export function normalizePackage(item) {
  const priceValue = item.price_from?.USD;
  return {
    ...item,
    // Prefer the photograph attached to this live package; use a category-specific visual only if it is missing or unavailable.
    slug: item.slug,
    title: item.title,
    route: item.route || (Array.isArray(item.destinations) ? item.destinations.join(' · ') : ''),
    days: Number(item.days) || 1,
    badge: item.badge || '',
    image: resolvePackageImage(item.image),
    fallbackImage: packageCardFallback(item),
    price: priceValue ? `From $${Number(priceValue).toLocaleString('en-US')}` : 'ASK FOR PRICE',
    rating: item.rating ?? null,
    review_count: item.review_count ?? 0,
  };
}


function categoryLabel(category, language) {
  const labels = {
    safari: t(language, 'wildlife'),
    climbing: t(language, 'mountainTreks'),
    beach: t(language, 'islandEscapes'),
  };
  return labels[category] || (category || 'Tanzania journey').replaceAll('_', ' ');
}

function BrandMark({ href = '#home' }) {
  return (
    <a className="brand" href={href} aria-label="Leonard Tour home">
      <span className="brand-symbol" aria-hidden="true"><Mountain size={34} strokeWidth={1.8} /><Trees size={20} strokeWidth={1.8} /></span>
      <span className="brand-words"><strong>Leonard</strong><em>Tour</em></span>
    </a>
  );
}

function XSocialMark() {
  return <span className="x-social-mark" aria-hidden="true">𝕏</span>;
}

export function Header({ language, onLanguageChange, isInteriorPage = false }) {
  const homeLink = (hash) => isInteriorPage ? `/${hash}` : hash;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const links = [
    { label: t(language, 'navHome'), href: homeLink('#home') },
    { label: t(language, 'navAbout'), href: '/about-us' },
    { label: t(language, 'navSafaris'), href: homeLink('#packages'), children: [
      { label: t(language, 'navCamping'), href: '/safaris/camping' },
      { label: t(language, 'navMidrange'), href: '/safaris/mid-range' },
      { label: t(language, 'navLuxury'), href: '/safaris/luxury' },
      { label: t(language, 'navMigration'), href: '/safaris/serengeti-migration' },
    ] },
    { label: t(language, 'navClimbing'), href: homeLink('#packages'), children: [
      { label: t(language, 'navKilimanjaro'), href: '/climbing/kilimanjaro' },
      { label: t(language, 'navMeru'), href: '/climbing/meru' },
    ] },
    { label: t(language, 'navIsland'), href: '/island-escapes' },
    { label: t(language, 'navAccommodation'), href: '/accommodation' },
    { label: t(language, 'navBlog'), href: '/blogs' },
    { label: t(language, 'navContact'), href: '/contact-us' },
  ];
  const closeMenu = () => {
    setMobileOpen(false);
    setOpenDropdown(null);
  };

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.body.classList.add('mobile-drawer-open');
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('mobile-drawer-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileOpen]);

  const handleNavClick = (event, link) => {
    if (link.children && window.matchMedia('(max-width: 980px)').matches) {
      event.preventDefault();
      setOpenDropdown((current) => current === link.label ? null : link.label);
      return;
    }
    closeMenu();
  };

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-contact">
            <a href="mailto:info@keanrich.com"><Mail size={14} /> info@keanrich.com</a>
            <a href="tel:+255628890211"><Phone size={14} /> +255 628 890 211</a>
          </div>
          <div className="topbar-actions">
            <a className="admin-link" href="/admin">{t(language, 'admin')}</a>
            <a className="proposal-link" href="/plan-your-safari?intent=proposal">{t(language, 'proposal')} <ArrowUpRight size={14} /></a>
            <div className="top-socials" aria-label="Social media">
              <a href="#facebook" aria-label="Facebook"><Facebook size={15} /></a>
              <a href="#instagram" aria-label="Instagram"><Instagram size={15} /></a>
              <a href="#youtube" aria-label="YouTube"><Youtube size={16} /></a>
              <a href="#x" aria-label="X"><XSocialMark /></a>
            </div>
          </div>
        </div>
      </div>

      <nav className="main-nav">
        <button
          className={`mobile-nav-backdrop ${mobileOpen ? 'is-visible' : ''}`}
          type="button"
          aria-label="Close navigation menu"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={closeMenu}
        />
        <div className="nav-inner">
          <BrandMark href={homeLink('#home')} />
          <button className="mobile-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="mobile-navigation-drawer">
            {mobileOpen ? <X size={25} /> : <Menu size={25} />}
          </button>
          <div id="mobile-navigation-drawer" className={`nav-menu ${mobileOpen ? 'is-open' : ''}`} aria-hidden={!mobileOpen && typeof window !== 'undefined' && window.innerWidth <= 980}>
            <div className="mobile-drawer-top">
              <BrandMark href={homeLink('#home')} />
              <button type="button" className="mobile-drawer-close" onClick={closeMenu} aria-label="Close navigation"><X size={21} /></button>
            </div>
            {links.map((link) => (
              <div className={`nav-item ${link.children ? 'has-dropdown' : ''} ${openDropdown === link.label ? 'is-dropdown-open' : ''}`} key={link.label}>
                <a
                  href={link.href}
                  onClick={(event) => handleNavClick(event, link)}
                  className={link.href === '#home' ? 'active' : ''}
                  aria-expanded={link.children ? openDropdown === link.label : undefined}
                >
                  {link.label}{link.children && <ChevronDown size={14} />}
                </a>
                {link.children && <div className="nav-dropdown">{link.children.map((child) => <a href={child.href} key={child.href} onClick={closeMenu}>{child.label}</a>)}</div>}
              </div>
            ))}
            <div className="mobile-nav-extra">
              <label className="mobile-language-picker">
                <span>{t(language, 'language')}</span>
                <select aria-label={t(language, 'language')} value={language} onChange={(event) => onLanguageChange(event.target.value)}>
                  {LANGUAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <a className="mobile-proposal" href="/plan-your-safari?intent=proposal" onClick={closeMenu}>{t(language, 'proposal')} <ArrowRight size={15} /></a>
            </div>
          </div>
          <div className="nav-right">
            <select aria-label={t(language, 'language')} value={language} onChange={(event) => onLanguageChange(event.target.value)}>
              {LANGUAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <a className="nav-book-btn" href="/plan-your-safari?intent=plan">{t(language, 'planSafari')} <ArrowRight size={16} /></a>
          </div>
        </div>
      </nav>
    </header>
  );
}

function Hero({ language }) {
  return (
    <section className="hero" id="home">
      <div className="hero-image" />
      <div className="hero-shade" />
      <div className="hero-content page-shell">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow"><span /> {t(language, 'heroEyebrow')}</span>
          <h1>{t(language, 'heroTitle')}<br /><span>{t(language, 'heroConfidence')}</span></h1>
          <p>{t(language, 'heroLead')}</p>
          <ul className="hero-points">
            <li><Check size={16} /> {t(language, 'skilledGuides')}</li>
            <li><Check size={16} /> {t(language, 'privateTours')}</li>
            <li><Check size={16} /> {t(language, 'quickSupport')}</li>
          </ul>
          <div className="hero-actions">
            <a href="#packages" className="button button-gold">{t(language, 'exploreSafaris')} <ArrowRight size={17} /></a>
            <a href="#contact" className="button button-outline">{t(language, 'talkExpert')}</a>
          </div>
        </div>
        <div className="hero-caption"><span className="caption-line" /> {t(language, 'heroCaption')}</div>
      </div>
      <a href="#about" className="scroll-cue"><span>SCROLL TO DISCOVER</span><ArrowDown size={15} /></a>
    </section>
  );
}

function IntroSection({ language }) {
  return (
    <section className="intro-section section-space" id="about">
      <div className="page-shell intro-grid">
        <div className="intro-photo-wrap">
          <img src="https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=85" alt="Elephants roaming in Tanzania's wilderness" />
          <div className="intro-photo-note"><strong>100%</strong><span>Locally rooted.<br />Globally welcoming.</span></div>
        </div>
        <div className="intro-copy">
          <span className="eyebrow"><span /> {t(language, 'introEyebrow')}</span>
          <h2>{t(language, 'introTitle')}<br /><em>{t(language, 'introTitleEm')}</em></h2>
          <div className="gold-rule" />
          <p>{t(language, 'introText1')}</p>
          <p>{t(language, 'introText2')}</p>
          <a className="text-link" href="/about-us">{t(language, 'introLink')} <ArrowRight size={17} /></a>
        </div>
      </div>
    </section>
  );
}

export function PackageCard({ item, language }) {
  const hasRating = Number.isFinite(Number(item.rating)) && Number(item.review_count) > 0;
  const initialImageState = item.image ? 'primary' : item.fallbackImage ? 'fallback' : 'broken';
  const [imageState, setImageState] = useState(initialImageState);
  useEffect(() => setImageState(item.image ? 'primary' : item.fallbackImage ? 'fallback' : 'broken'), [item.image, item.fallbackImage]);
  const cardImage = imageState === 'primary'
    ? item.image
    : imageState === 'fallback'
      ? item.fallbackImage
      : '';

  const handleImageError = () => {
    if (imageState === 'primary' && item.fallbackImage && item.fallbackImage !== item.image) {
      setImageState('fallback');
    } else {
      setImageState('broken');
    }
  };

  return (
    <article className="package-card">
      <a className="package-image-link" href={`/packages/${item.slug}`} aria-label={`View ${item.title} details`}>
        <div className="package-image-wrap">
          {cardImage ? (
            <img src={cardImage} alt={imageState === 'primary' ? item.title : ''} loading="lazy" onError={handleImageError} />
          ) : (
            <span className="package-image-unavailable" aria-hidden="true" />
          )}
          <div className="ribbon-wrapper-left"><div className="ribbon-text-left">{item.price || 'ASK FOR PRICE'}</div></div>
          <span className="duration-pill"><Clock3 size={13} /> {item.days} {t(language, item.days === 1 ? 'day' : 'days')}</span>
          <span className="package-image-shade" />
          <span className="package-badge">{item.badge || 'FEATURED'}</span>
        </div>
      </a>
      <div className="package-body">
        <div className="package-category">{categoryLabel(item.category, language)}</div>
        <h3>{item.title}</h3>
        <p className="package-route"><MapPin size={15} /> {item.route}</p>
        <div className="package-rating" aria-label={hasRating ? `${item.rating} out of 5 from ${item.review_count} reviews` : t(language, 'guestReviewsSoon')}>
          <span className="rating-stars">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} fill={hasRating && star <= Math.round(item.rating) ? 'currentColor' : 'none'} />)}</span>
          {hasRating ? <span className="rating-copy"><strong>{Number(item.rating).toFixed(1)}</strong> <span>({item.review_count} reviews)</span></span> : <span className="rating-pending">{t(language, 'guestReviewsSoon')}</span>}
        </div>
        <div className="package-footer">
          <span className="package-footnote">{t(language, 'perPerson')}</span>
          <a href={`/packages/${item.slug}`} className="itinerary-link">{t(language, 'viewItinerary')} <ArrowRight size={15} /></a>
        </div>
      </div>
    </article>
  );
}

function PackagesSection({ language }) {
  const [packages, setPackages] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const controller = new AbortController();
    async function loadPackages() {
      try {
        const response = await fetch(`${API_BASE}/api/packages?lang=${language.toLowerCase()}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Packages API returned ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setPackages(data.map(normalizePackage));
          setSource('api');
        } else {
          throw new Error('Packages API response was not a list.');
        }
      } catch (error) {
        if (error.name !== 'AbortError') { setPackages([]); setSource('error'); console.error('Could not load live safari packages:', error); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadPackages();
    return () => controller.abort();
  }, [language]);

  const filteredPackages = useMemo(
    () => filter === 'all' ? packages : packages.filter((item) => item.category === filter),
    [packages, filter],
  );
  const visiblePackages = useMemo(() => filteredPackages.slice(0, 6), [filteredPackages]);

  return (
    <section className="packages-section section-space" id="packages">
      <div className="page-shell">
        <div className="section-heading">
          <span className="eyebrow"><span /> {t(language, 'packagesEyebrow')}</span>
          <h2>{t(language, 'packagesTitle')} <em>{t(language, 'packagesTitleEm')}</em></h2>
          <p>{t(language, 'packagesLead')}</p>
        </div>
        <div className="package-toolbar">
          <div className="package-filters" role="group" aria-label="Filter safari packages">
            {[['all', t(language, 'allJourneys')], ['safari', t(language, 'wildlife')], ['climbing', t(language, 'mountainTreks')], ['beach', t(language, 'islandEscapes')]].map(([value, label]) => (
              <button key={value} className={filter === value ? 'filter-active' : ''} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
          <span className="package-count">{loading ? t(language, 'loadingJourneys') : `${t(language, 'showing')} ${visiblePackages.length} ${t(language, 'of')} ${filteredPackages.length} ${t(language, 'journeys')}`}</span>
        </div>
        <div className="packages-grid">
          {visiblePackages.map((item) => <PackageCard key={item.slug} item={item} language={language} />)}
        </div>
        {source === 'error' && <p className="preview-note">Safari packages are temporarily unavailable. Please refresh or contact our team.</p>}
        <div className="center-action"><a href="/plan-your-safari?intent=plan" className="button button-dark">{t(language, 'exploreAll')} <ArrowRight size={17} /></a></div>
      </div>
    </section>
  );
}

function WhyChooseUs({ language }) {
  const benefits = [
    { icon: <Compass />, title: t(language, 'whyLocal'), body: t(language, 'whyLocalText') },
    { icon: <ShieldCheck />, title: t(language, 'whySafe'), body: t(language, 'whySafeText') },
    { icon: <Trees />, title: t(language, 'whyCare'), body: t(language, 'whyCareText') },
    { icon: <Award />, title: t(language, 'whyValue'), body: t(language, 'whyValueText') },
  ];
  return (
    <section className="why-section section-space">
      <div className="page-shell">
        <div className="section-heading">
          <span className="eyebrow"><span /> {t(language, 'whyEyebrow')}</span>
          <h2>{t(language, 'whyTitle')} <em>{t(language, 'whyTitleEm')}</em></h2>
          <p>{t(language, 'whyLead')}</p>
        </div>
        <div className="benefits-grid">
          {benefits.map((benefit, index) => (
            <article className="benefit-card" key={benefit.title}>
              <div className="benefit-icon">{benefit.icon}</div>
              <span className="benefit-number">0{index + 1}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TanzaniaVideoShowcase({ language }) {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoSource = import.meta.env.VITE_TANZANIA_VIDEO_URL || ''; 

  return (
    <section className="video-showcase-section section-space" id="tanzania-film">
      <div className="page-shell video-showcase-grid">
        <div className="video-showcase-copy">
          <span className="eyebrow"><span /> {t(language, 'videoEyebrow')}</span>
          <h2>{t(language, 'videoTitle')}<br /><em>{t(language, 'videoTitleEm')}</em></h2>
          <div className="gold-rule" />
          <p>{t(language, 'videoLead')}</p>
          <ul className="video-showcase-points">
            <li><Check size={17} /> {t(language, 'videoPoint1')}</li>
            <li><Check size={17} /> {t(language, 'videoPoint2')}</li>
            <li><Check size={17} /> {t(language, 'videoPoint3')}</li>
          </ul>
        </div>
        <div className={`video-showcase-frame ${videoReady ? 'has-video' : ''}`}>
          {videoSource && <video
            controls
            playsInline
            preload="metadata"
            poster="https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1600&q=85"
            onCanPlay={() => { setVideoReady(true); setVideoFailed(false); }}
            onError={() => setVideoFailed(true)}
          >
            <source src={videoSource} type="video/mp4" />
          </video>}
          {!videoReady && (
            <div className="video-showcase-placeholder" aria-live="polite">
              <span className="video-play-mark"><Play size={25} fill="currentColor" /></span>
              <strong>{t(language, 'videoUnavailable')}</strong>
              <small>{videoSource && videoFailed ? 'Video not found or format not supported.' : t(language, 'videoHint')} {videoSource ? <code>VITE_TANZANIA_VIDEO_URL</code> : null}</small>
            </div>
          )}
          <span className="video-frame-caption">TANZANIA · UNTAMED BEAUTY</span>
        </div>
      </div>
    </section>
  );
}

function DestinationsSection({ language }) {
  return (
    <section className="destinations-section section-space" id="destinations">
      <div className="page-shell">
        <div className="destination-heading-row">
          <div className="section-heading section-heading-left">
            <span className="eyebrow"><span /> {t(language, 'destinationsEyebrow')}</span>
            <h2>{t(language, 'destinationsTitle')}<br /><em>{t(language, 'destinationsTitleEm')}</em></h2>
          </div>
          <p>{t(language, 'destinationsLead')}</p>
        </div>
        <div className="destinations-grid">
          {destinations.map((destination, index) => (
            <a className={`destination-card destination-${index + 1}`} href={`/destinations/${destination.slug}`} key={destination.name}>
              <img src={destination.image} alt={destination.name} loading="lazy" />
              <span className="destination-overlay" />
              <span className="destination-copy"><small>{destination.note}</small><strong>{destination.name}</strong></span>
              <span className="destination-arrow"><ArrowUpRight size={18} /></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function getTestimonialsPageSize() {
  if (typeof window === 'undefined') return 3;
  if (window.innerWidth <= 640) return 1;
  if (window.innerWidth <= 980) return 2;
  return 3;
}

function TestimonialAvatar({ name, photoUrl, onOpenPhoto }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = (name || 'Guest')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  if (photoUrl && !imageFailed) {
    return (
      <button
        className="testimonial-avatar testimonial-avatar-button"
        type="button"
        onClick={() => onOpenPhoto?.(photoUrl, name || 'Guest')}
        aria-label={`Enlarge ${name || 'guest'} profile photo`}
        title="View profile photo"
      >
        <img
          src={photoUrl}
          alt={`${name || 'Guest'} profile`}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </button>
    );
  }

  return <div className="testimonial-avatar"><span>{initials}</span></div>;
}

function TestimonialsSection({ language }) {
  const [testimonials, setTestimonials] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [form, setForm] = useState({ name: '', email: '', country: '', message: '' });
  const [photo, setPhoto] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [notice, setNotice] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(getTestimonialsPageSize);
  const [activePage, setActivePage] = useState(0);
  const carouselRef = useRef(null);

  const loadReviews = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/testimonials?limit=100`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Testimonials API returned ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Unexpected testimonials response.');
      setTestimonials(data);
    } catch (error) {
      console.info('Guest testimonials could not be refreshed.', error);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
    const timer = window.setInterval(loadReviews, 15000);
    return () => window.clearInterval(timer);
  }, [loadReviews]);

  useEffect(() => {
    if (!lightbox) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('lightbox-open');
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.classList.remove('lightbox-open');
    };
  }, [lightbox]);

  useEffect(() => {
    const updatePageSize = () => setItemsPerPage(getTestimonialsPageSize());
    window.addEventListener('resize', updatePageSize);
    return () => window.removeEventListener('resize', updatePageSize);
  }, []);

  const pages = useMemo(() => {
    const result = [];
    for (let index = 0; index < testimonials.length; index += itemsPerPage) {
      result.push(testimonials.slice(index, index + itemsPerPage));
    }
    return result;
  }, [testimonials, itemsPerPage]);

  // A newly submitted review is inserted at the front, so return the carousel to its newest page.
  useEffect(() => {
    setActivePage(0);
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [testimonials[0]?.id, itemsPerPage]);

  const handleCarouselScroll = () => {
    const viewport = carouselRef.current;
    if (!viewport || !viewport.clientWidth) return;
    const page = Math.round(viewport.scrollLeft / viewport.clientWidth);
    setActivePage(Math.max(0, Math.min(page, pages.length - 1)));
  };

  const goToPage = (page) => {
    const viewport = carouselRef.current;
    if (!viewport) return;
    const boundedPage = Math.max(0, Math.min(page, pages.length - 1));
    viewport.scrollTo({ left: boundedPage * viewport.clientWidth, behavior: 'smooth' });
    setActivePage(boundedPage);
  };

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setNotice(null);
    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('name', form.name.trim());
      payload.append('email', form.email.trim());
      payload.append('country', form.country.trim());
      payload.append('rating', String(rating));
      payload.append('message', form.message.trim());
      payload.append('lang', String(language || 'EN').toLowerCase());
      if (photo) payload.append('photo', photo);

      const response = await fetch(`${API_BASE}/api/testimonials`, {
        method: 'POST',
        body: payload,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(result.detail) ? result.detail.map((item) => item.msg).join(', ') : result.detail;
        throw new Error(detail || 'Your review could not be submitted. Please try again.');
      }

      // A newly submitted review is pending and must not be displayed publicly yet.
      await loadReviews();

      setForm({ name: '', email: '', country: '', message: '' });
      setRating(5);
      setPhoto(null);
      setFileInputKey((key) => key + 1);
      setNotice({ type: 'success', text: result.message || t(language, 'successReview') });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Unable to submit your review. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="testimonials-section section-space" id="testimonials">
      <div className="page-shell">
        <div className="section-heading testimonials-heading">
          <span className="eyebrow"><span /> {t(language, 'reviewsEyebrow')}</span>
          <h2>{t(language, 'reviewsTitle')} <em>{t(language, 'reviewsTitleEm')}</em></h2>
          <p>{t(language, 'reviewsLead')}</p>
        </div>

        {testimonials.length > 0 ? (
          <>
            <div className="testimonial-carousel" aria-label="Guest reviews">
              <div
                className="testimonial-carousel-viewport"
                ref={carouselRef}
                onScroll={handleCarouselScroll}
                aria-live="polite"
              >
                <div className="testimonial-pages">
                  {pages.map((pageReviews, pageIndex) => (
                    <div className="testimonial-page" key={`testimonial-page-${pageIndex}`}>
                      {pageReviews.map((review) => {
                        const photoUrl = review.photo_url
                          ? (review.photo_url.startsWith('http') ? review.photo_url : `${API_BASE}${review.photo_url}`)
                          : '';
                        const safeRating = Math.max(0, Math.min(5, Number(review.rating) || 0));
                        return (
                          <article className="testimonial-card" key={review.id}>
                            <div className="testimonial-card-top">
                              <span className="testimonial-quote-mark">“</span>
                              <div className="testimonial-stars" aria-label={`${safeRating} out of 5 stars`}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star key={star} size={14} fill={star <= safeRating ? 'currentColor' : 'none'} />
                                ))}
                              </div>
                            </div>
                            <p className="testimonial-message">{review.message}</p>
                            <div className="testimonial-person">
                              <TestimonialAvatar name={review.name} photoUrl={photoUrl} onOpenPhoto={(url, name) => setLightbox({ url, name })} />
                              <div className="testimonial-person-copy">
                                <strong>{review.name}</strong>
                                <span>{review.country || t(language, 'guestTraveller')}</span>
                              </div>
                              <small>
                                {review.created_at
                                  ? new Date(review.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                  : ''}
                              </small>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {pages.length > 1 && (
                <div className="testimonial-carousel-controls">
                  <button
                    className="testimonial-carousel-arrow"
                    type="button"
                    onClick={() => goToPage(activePage - 1)}
                    disabled={activePage === 0}
                    aria-label="Previous guest reviews"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="testimonial-pagination" role="group" aria-label="Guest review pages">
                    {Array.from(new Set(
                      pages.length <= 3
                        ? pages.map((_, index) => index)
                        : [0, Math.round((pages.length - 1) / 2), pages.length - 1]
                    )).map((targetPage, dotIndex, dotTargets) => {
                      const activeDot = dotTargets.reduce((closest, candidate, index) =>
                        Math.abs(candidate - activePage) < Math.abs(dotTargets[closest] - activePage) ? index : closest, 0);
                      return (
                        <button
                          key={targetPage}
                          type="button"
                          className={`testimonial-pagination-dot ${activeDot === dotIndex ? 'is-active' : ''}`}
                          onClick={() => goToPage(targetPage)}
                          aria-label={`Jump to guest reviews ${targetPage + 1} of ${pages.length}`}
                          aria-current={activeDot === dotIndex ? 'page' : undefined}
                        />
                      );
                    })}
                  </div>
                  <button
                    className="testimonial-carousel-arrow"
                    type="button"
                    onClick={() => goToPage(activePage + 1)}
                    disabled={activePage >= pages.length - 1}
                    aria-label="Next guest reviews"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="testimonial-empty" aria-live="polite">
            {loadingReviews ? (
              t(language, 'loadingReviews')
            ) : (
              <>
                <span className="testimonial-empty-stars"><Star /><Star /><Star /><Star /><Star /></span>
                <h3>{t(language, 'emptyReviewTitle')}</h3>
                <p>{t(language, 'emptyReviewText')}</p>
              </>
            )}
          </div>
        )}
        <p className="testimonial-refresh-note">{t(language, 'reviewsHint')}</p>

        <div className="testimonial-form-panel">
          <div className="testimonial-form-story">
            <div className="testimonial-form-story-overlay" />
            <div className="testimonial-form-story-content">
              <span className="eyebrow"><span /> {t(language, 'journeyMatters')}</span>
              <h3>{t(language, 'everyAdventure')}<br /><em>{t(language, 'hasStory')}</em></h3>
              <p>{t(language, 'shareReviewText')}</p>
              <div className="testimonial-promise"><ShieldCheck size={19} /><span>{t(language, 'reviewPromise')}</span></div>
            </div>
          </div>

          <form className="testimonial-form" onSubmit={submitReview}>
            <div className="testimonial-form-heading">
              <span className="eyebrow"><span /> {t(language, 'shareExperience')}</span>
              <h3>{t(language, 'writeReview')} <em>{t(language, 'review')}</em></h3>
              <p>{t(language, 'reviewLead')}</p>
            </div>

            <div className="testimonial-rating-field">
              <span>{t(language, 'yourRating')}</span>
              <div className="testimonial-rating-picker" role="group" aria-label="Choose your rating from one to five stars">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" className={value <= rating ? 'is-selected' : ''} onClick={() => setRating(value)} aria-label={`${value} star${value === 1 ? '' : 's'}`}>
                    <Star size={23} fill={value <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
                <strong>{rating}/5</strong>
              </div>
            </div>

            <div className="testimonial-form-fields">
              <label>{t(language, 'fullName')}<input name="name" value={form.name} onChange={updateField} autoComplete="name" maxLength={160} placeholder={t(language, 'namePlaceholder')} required /></label>
              <label>{t(language, 'emailAddress')}<input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" maxLength={255} placeholder="you@example.com" required /></label>
              <label>{t(language, 'country')}<input name="country" value={form.country} onChange={updateField} maxLength={80} placeholder={t(language, 'countryPlaceholder')} required /></label>
              <label className="testimonial-photo-field">{t(language, 'profilePhoto')} <span>{t(language, 'optional')}</span>
                <input key={fileInputKey} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
                <small>{photo ? photo.name : t(language, 'uploadHint')}</small>
              </label>
              <label className="testimonial-message-field">{t(language, 'yourExperience')}<textarea name="message" value={form.message} onChange={updateField} rows="4" maxLength={2000} placeholder={t(language, 'reviewPlaceholder')} required /></label>
            </div>

            {notice && <div className={`testimonial-form-notice ${notice.type}`} role="status">{notice.text}</div>}
            <button className="testimonial-submit" type="submit" disabled={submitting}>
              {submitting ? t(language, 'submittingReview') : t(language, 'submitReview')} <ArrowRight size={16} />
            </button>
            <p className="testimonial-privacy-note">{t(language, 'emailPrivate')}</p>
          </form>
        </div>
      </div>

      {lightbox && (
        <div className="testimonial-lightbox" role="presentation" onClick={() => setLightbox(null)}>
          <div className="testimonial-lightbox-dialog" role="dialog" aria-modal="true" aria-label={`${lightbox.name} profile photo`} onClick={(event) => event.stopPropagation()}>
            <button className="testimonial-lightbox-close" type="button" onClick={() => setLightbox(null)} aria-label="Close enlarged photo"><X size={22} /></button>
            <img src={lightbox.url} alt={`${lightbox.name} enlarged profile`} />
            <span>{lightbox.name}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function ExperienceBanner({ language }) {
  return (
    <section className="experience-banner" id="experiences">
      <div className="experience-banner-bg" />
      <div className="page-shell experience-banner-content">
        <span className="eyebrow"><span /> {t(language, 'experienceEyebrow')}</span>
        <h2>{t(language, 'experienceTitle')}<br /><em>{t(language, 'experienceTitleEm')}</em></h2>
        <p>{t(language, 'experienceLead')}</p>
        <a href="/plan-your-safari?intent=plan" className="button button-gold">{t(language, 'planPrivateSafari')} <ArrowRight size={17} /></a>
      </div>
    </section>
  );
}

function LegalInfoDialog({ documentType, onClose }) {
  useEffect(() => {
    if (!documentType) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.classList.add('legal-modal-open');
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('legal-modal-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [documentType]);

  if (!documentType) return null;

  const documents = {
    privacy: {
      title: 'Privacy Policy',
      intro: 'Leonard Tour respects your privacy and handles personal information with care.',
      points: [
        'Information we may collect: your name, email address, phone number, country, travel preferences, booking details, newsletter subscription and any review or photo you choose to submit.',
        'How we use it: to respond to enquiries, arrange and manage trips, process payments through our payment partners, provide customer support and send travel updates when you subscribe.',
        'Sharing: we only share information with service providers needed to deliver your trip, operate the website or process a payment, or where required by law. We do not display your private email address with a public review.',
        'Your choices: you may ask us to correct or delete personal information, or request removal from newsletter updates, by contacting info@keanrich.com.',
        'Security and retention: we use reasonable safeguards and keep records only as needed for service delivery, legal, accounting and security purposes.'
      ],
    },
    terms: {
      title: 'Terms & Conditions',
      intro: 'These website terms describe the general conditions for using Leonard Tour online services.',
      points: [
        'Enquiries are not confirmed bookings. A booking is confirmed only after Leonard Tour sends written confirmation and any required deposit has been received.',
        'Prices, itineraries and availability may change due to travel dates, park fees, accommodation availability, supplier costs, weather or safety requirements. Your confirmed booking documents will state the applicable price and arrangements.',
        'Payments must be made using the payment instructions presented during the booking process. Never send card PINs, passwords or one-time security codes to a person claiming to represent us.',
        'Park, airline, accommodation and transport services may be subject to additional third-party rules. Any cancellation, amendment and refund terms applicable to your trip will be provided with your booking confirmation before payment.',
        'Guests are responsible for valid travel documents, appropriate travel insurance, health preparation and following guide and park safety instructions.'
      ],
    },
    faq: {
      title: 'Frequently Asked Questions',
      intro: 'A few helpful answers before you plan your Tanzania journey.',
      points: [
        'How do I start? Browse a journey and send an enquiry with your preferred dates, group size and travel interests. Our team will help tailor the itinerary.',
        'Can a safari be customised? Yes. Dates, accommodation style, destinations and activities can be discussed with our safari team, subject to availability.',
        'When do I pay? Payment options and any deposit requirement are shown during the confirmed booking process. The website does not ask you to share a mobile-money PIN or card security code.',
        'Can I combine safari and Zanzibar? Yes. Wildlife safaris, mountain treks and island stays can often be combined into one itinerary.',
        'How can I contact you? Email info@keanrich.com or call +255 628 890 211.'
      ],
    },
  };
  const content = documents[documentType];
  if (!content) return null;

  return (
    <div className="legal-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="legal-modal" role="dialog" aria-modal="true" aria-labelledby="legal-modal-title">
        <button className="legal-modal-close" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <span className="eyebrow"><span /> LEONARD TOUR</span>
        <h2 id="legal-modal-title">{content.title}</h2>
        <p>{content.intro}</p>
        <ul>{content.points.map((point) => <li key={point}>{point}</li>)}</ul>
        <small>Questions? Contact <a href="mailto:info@keanrich.com">info@keanrich.com</a>. These website summaries should be reviewed and approved by the company before public launch.</small>
      </section>
    </div>
  );
}

export function Footer({ language, isInteriorPage = false }) {
  const homeLink = (hash) => isInteriorPage ? `/${hash}` : hash;
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [newsletterNotice, setNewsletterNotice] = useState(null);
  const [legalDocument, setLegalDocument] = useState(null);

  const submitNewsletter = async (event) => {
    event.preventDefault();
    setNewsletterNotice(null);
    setNewsletterBusy(true);
    try {
      const response = await fetch(`${API_BASE}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: newsletterEmail.trim(), consent: newsletterConsent }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(result.detail) ? result.detail.map((item) => item.msg).join(', ') : result.detail;
        throw new Error(detail || t(language, 'newsletterError'));
      }
      setNewsletterNotice({ type: 'success', text: result.message || t(language, 'newsletterSuccess') });
      setNewsletterEmail('');
      setNewsletterConsent(false);
    } catch (error) {
      setNewsletterNotice({ type: 'error', text: error.message || t(language, 'newsletterError') });
    } finally {
      setNewsletterBusy(false);
    }
  };

  return (
    <footer className="site-footer" id="contact">
      <div className="footer-landscape" />
      <div className="page-shell footer-shell">
        <div className="footer-grid">
          <div className="footer-brand-column">
            <BrandMark href={homeLink('#home')} />
            <p>{t(language, 'footerBrandText')}</p>
          </div>
          <div className="footer-column"><h3>{t(language, 'quickLinks')}</h3><a href={homeLink('#home')}>{t(language, 'footerHome')}</a><a href="/about-us">{t(language, 'navAbout')}</a><a href={homeLink('#packages')}>{t(language, 'footerSafaris')}</a><a href={homeLink('#destinations')}>{t(language, 'footerDestinations')}</a><a href="/accommodation">{t(language, 'navAccommodation')}</a><a href="/blogs">{t(language, 'navBlog')}</a><a href="/contact-us">{t(language, 'navContact')}</a></div>
          <div className="footer-column"><h3>{t(language, 'topDestinations')}</h3><a href="/destinations/serengeti">Serengeti</a><a href="/destinations/ngorongoro">Ngorongoro</a><a href="/destinations/kilimanjaro">Kilimanjaro</a><a href="/destinations/zanzibar">Zanzibar</a><a href="/destinations/tarangire">Tarangire</a><a href="/destinations/mikumi">Mikumi</a></div>
          <div className="footer-column footer-contact-column"><h3>{t(language, 'contact')}</h3><a href="mailto:info@keanrich.com"><Mail /> info@keanrich.com</a><a href="tel:+255628890211"><Phone /> +255 628 890 211</a><span><MapPin /> Tanzania, East Africa</span><span><Clock3 /> Mon – Sat · 8:00 AM – 6:00 PM</span><div className="secure-note"><ShieldCheck /><span><strong>{t(language, 'safeBooking')}</strong><small>{t(language, 'peaceMind')}</small></span></div></div>
        </div>

        <section className="footer-newsletter" aria-labelledby="footer-newsletter-title">
          <div className="footer-newsletter-copy">
            <span className="footer-newsletter-kicker">LEONARD TOUR JOURNAL</span>
            <h3 id="footer-newsletter-title">{t(language, 'newsletterTitle')}</h3>
            <p>{t(language, 'newsletterText')}</p>
          </div>
          <form className="footer-newsletter-form" onSubmit={submitNewsletter}>
            <div className="footer-newsletter-controls">
              <label className="sr-only" htmlFor="footer-newsletter-email">{t(language, 'newsletterEmail')}</label>
              <input id="footer-newsletter-email" type="email" name="email" autoComplete="email" maxLength={255} placeholder={t(language, 'newsletterEmail')} value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} required />
              <button type="submit" disabled={newsletterBusy || !newsletterConsent}>{newsletterBusy ? t(language, 'newsletterSending') : t(language, 'newsletterSubmit')} <ArrowRight size={16} /></button>
            </div>
            <label className="footer-newsletter-consent"><input type="checkbox" checked={newsletterConsent} onChange={(event) => setNewsletterConsent(event.target.checked)} required /> <span>{t(language, 'newsletterConsent')}</span></label>
            {newsletterNotice && <p className={`footer-newsletter-notice ${newsletterNotice.type}`} role="status">{newsletterNotice.text}</p>}
          </form>
        </section>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Leonard Tour. All rights reserved.</span>
          <div>
            <button type="button" onClick={() => setLegalDocument('privacy')}>{t(language, 'privacy')}</button>
            <button type="button" onClick={() => setLegalDocument('terms')}>{t(language, 'terms')}</button>
            <button type="button" onClick={() => setLegalDocument('faq')}>{t(language, 'faq')}</button>
          </div>
          <strong>{t(language, 'exploreRemember')}</strong>
        </div>
        <div className="footer-developer-credit">
          <span>Website Designed &amp; Developed by</span>
          <a className="footer-developer-name" href="https://www.instagram.com/keanrich01/" target="_blank" rel="noopener noreferrer" aria-label="Visit keanrich01 on Instagram">
            <Instagram size={14} aria-hidden="true" />
            <span>keanrich01</span>
            <ArrowUpRight size={12} aria-hidden="true" />
          </a>
          <a className="footer-developer-whatsapp" href="https://wa.me/255628890211" target="_blank" rel="noopener noreferrer" aria-label="Contact keanrich01 on WhatsApp">
            <MessageCircle size={14} aria-hidden="true" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
      <LegalInfoDialog documentType={legalDocument} onClose={() => setLegalDocument(null)} />
    </footer>
  );
}

export default function Home() {
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'EN';
    const saved = window.localStorage.getItem('mangokili-language');
    return LANGUAGE_OPTIONS.some((option) => option.value === saved) ? saved : 'EN';
  });

  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem('mangokili-language', nextLanguage);
    document.documentElement.lang = nextLanguage.toLowerCase();
  };

  useEffect(() => {
    document.documentElement.lang = language.toLowerCase();
  }, [language]);

  return (
    <>
      <Header language={language} onLanguageChange={changeLanguage} />
      <main>
        <Hero language={language} />
        <IntroSection language={language} />
        <PackagesSection language={language} />
        <WhyChooseUs language={language} />
        <TanzaniaVideoShowcase language={language} />
        <DestinationsSection language={language} />
        <TestimonialsSection language={language} />
        <ExperienceBanner language={language} />
      </main>
      <Footer language={language} />
      <a className="whatsapp-float" href="https://wa.me/255628890211" aria-label="Chat with us on WhatsApp" target="_blank" rel="noreferrer"><MessageCircle size={25} strokeWidth={2.3} /><Phone className="whatsapp-phone-mark" size={12} strokeWidth={3} /></a>
    </>
  );
}
