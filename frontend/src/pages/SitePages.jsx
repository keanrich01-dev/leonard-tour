import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, Compass, Mail, MapPin, MessageCircle, Phone, Send, ShieldCheck, Sparkles, Star, Trees, Mountain, Waves, BookOpen } from 'lucide-react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Footer, Header, PackageCard, normalizePackage } from './Home.jsx';
import '../content-pages.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const LANGS = ['EN', 'SW', 'FR', 'ZH', 'KO'];
const TEXT = {
  EN: {
    about: 'About Us', accommodation: 'Accommodation', blogs: 'Travel Journal', contact: 'Contact Us', planner: 'Plan Your Safari',
    aboutEyebrow: 'THE PEOPLE BEHIND THE JOURNEY', aboutTitle: 'Discover the spirit of', aboutAccent: 'Tanzania with us.', aboutLead: 'Locally guided journeys shaped around the places, people and experiences that make Tanzania extraordinary.',
    story: 'Our Story', storyBody: 'Leonard Tour is here to help travellers discover Tanzania through thoughtful safari, mountain and island journeys. We bring together local knowledge, personal planning and a genuine respect for the places and communities that welcome our guests.',
    mission: 'Our Mission', missionBody: 'To create meaningful, carefully planned travel experiences that connect guests with Tanzania while putting hospitality, safety and responsible tourism first.',
    vision: 'Our Vision', visionBody: 'To be a trusted choice for travellers seeking authentic, welcoming and well-organised journeys across Tanzania.',
    why: 'Why Travel With Us', whyBody: 'Personal planning, local insight and clear communication from your first question to the end of your journey.',
    values: 'Our Values', value1: 'Guest experience', value1Body: 'We listen carefully and shape each journey around your interests and comfort.', value2: 'Responsible tourism', value2Body: 'We encourage respect for wildlife, nature and the communities that make each destination special.', value3: 'Tanzanian culture', value3Body: 'We celebrate local knowledge, heritage, traditions and warm hospitality.',
    destinations: 'Our Destinations', destinationsBody: 'Explore Tanzania’s celebrated northern circuit, mountain landscapes and Indian Ocean islands.',
    plan: 'Plan Your Safari', planBody: 'Tell us what you would love to experience. Our team will help shape the right journey.',
    stayEyebrow: 'REST WELL, TRAVEL FURTHER', stayTitle: 'Choose the stay that', stayAccent: 'suits your journey.', stayLead: 'We help match accommodation style to your route, comfort preferences and travel budget. Specific properties depend on dates and availability.',
    camping: 'Camping Accommodation', midrange: 'Mid-Range Lodges & Tented Camps', luxury: 'Luxury Lodges & Tented Camps', island: 'Zanzibar & Island Resorts',
    campingBody: 'A closer-to-nature safari experience, with nights in campsites and the sounds of the wilderness around you. A good fit for adventurous travellers who enjoy a simple, authentic stay.',
    midrangeBody: 'Comfortable lodges and tented camps that balance welcoming service, practical locations and value. A good fit for couples, families and friends seeking comfort without an ultra-luxury price point.',
    luxuryBody: 'Selected high-comfort lodges and intimate tented camps, with thoughtful service and distinctive settings. A good fit for travellers who value privacy, refined surroundings and a more personalised stay.',
    islandBody: 'Coastal hotels and island resorts for time by the Indian Ocean. A good fit for beach breaks, honeymoons and safari extensions, subject to property availability.',
    exploreStays: 'Explore matching journeys', noHotelBooking: 'Accommodation is arranged as part of the safari enquiry; this page is not a separate hotel booking service.',
    blogEyebrow: 'STORIES, IDEAS & INSPIRATION', blogTitle: 'The Leonard Tour', blogAccent: 'Travel Journal', blogLead: 'Practical guidance, destination stories and inspiration for discovering Tanzania.',
    featured: 'Featured article', allArticles: 'All articles', readArticle: 'Read article', noArticles: 'No articles have been published in this language yet. Please check back soon.', backBlogs: 'Back to all articles', published: 'Published',
    contactEyebrow: 'WE ARE HERE TO HELP', contactTitle: 'Let’s start a', contactAccent: 'conversation.', contactLead: 'Ask a question, tell us what you have in mind or share a few details about your travel plans.',
    email: 'Email address', phone: 'WhatsApp number', name: 'Full name', country: 'Country code', subject: 'What can we help you with?', message: 'Your message', send: 'Send enquiry', sending: 'Sending…', success: 'Thank you. Your enquiry has been received. Our team will contact you using the details you provided.',
    plannerEyebrow: 'YOUR TANZANIA JOURNEY STARTS HERE', plannerTitle: 'Let’s plan a journey', plannerAccent: 'made around you.', plannerPlanTitle: 'Plan your safari', plannerProposalTitle: 'Request a travel proposal', plannerLead: 'Share your preferences. This is an enquiry only, not an instant booking or payment.', destination: 'Destination', chooseDestination: 'Choose a destination', package: 'Package (optional)', choosePackage: 'Select a package, if you have one in mind', dates: 'Preferred travel date', flexible: 'My dates are flexible', adults: 'Adults', children: 'Children', childAges: 'Children’s ages', accommodation: 'Preferred accommodation', chooseStay: 'Choose a stay style', budget: 'Approximate budget per person', special: 'Special requests', contactDetails: 'Your contact details', submitPlan: 'Send my travel request', submitProposal: 'Request my proposal', planSuccess: 'Thank you. Your travel request has been received. Our team will review your details and contact you.',
    namePlaceholder: 'Your full name', emailPlaceholder: 'you@example.com', messagePlaceholder: 'Tell us a little about what you need…', specialPlaceholder: 'Interests, preferred pace, celebrations, accessibility needs or anything else…', phonePlaceholder: 'Choose country and enter number',
    safari: 'Safari & wildlife', kilimanjaro: 'Kilimanjaro', meru: 'Mount Meru', zanzibar: 'Zanzibar', pemba: 'Pemba', mafia: 'Mafia Island', northern: 'Northern Tanzania', tailor: 'Tailor-made / not sure', campingStay: 'Camping', midStay: 'Mid-range', luxuryStay: 'Luxury', islandStay: 'Island resort', budget1: 'Under USD 1,000', budget2: 'USD 1,000–2,500', budget3: 'USD 2,500–5,000', budget4: 'USD 5,000+', budget5: 'To be discussed',
    error: 'We could not send your request. Please try again or contact us directly.', phoneError: 'Please enter a valid WhatsApp number.', required: 'Please complete the required fields.', days: 'days',
    detailsEyebrow: 'THE DIFFERENCE IS IN THE DETAILS', eastAfrica: 'TANZANIA · EAST AFRICA', adventureStarts: 'YOUR ADVENTURE STARTS HERE', loadingArticles: 'Loading articles…', articleNotFound: 'Article not found.', noPayment: 'No immediate payment', requestToTeam: 'Your request goes to our travel team', contactNextSteps: 'We will contact you with the next steps', phoneInvalid: 'Please choose a country and enter a valid WhatsApp number.', agesInvalid: 'Please enter the age of every child (0–15).', subjectGeneral: 'General enquiry', subjectPlanning: 'Safari planning', subjectBooking: 'Existing booking', subjectStay: 'Accommodation', subjectOther: 'Other', assurance: 'Your details are sent securely to our enquiry system.', categorySafari: 'Safari Tips', categoryDestinations: 'Tanzania Destinations', categoryKili: 'Kilimanjaro Adventures', categoryGuides: 'Travel Guides', destinationMeru: 'Mount Meru', destinationMafia: 'Mafia Island', destinationNorthern: 'Northern Tanzania', destinationTailor: 'Tailor-made / not sure',
    serengeti: 'Serengeti', ngorongoro: 'Ngorongoro', tarangire: 'Tarangire', mikumi: 'Mikumi',
    destinationMeru: 'Mount Meru', destinationMafia: 'Mafia Island', destinationNorthern: 'Northern Tanzania', destinationTailor: 'Tailor-made / not sure', stayAccentCamping: 'CLOSE TO THE WILD', stayAccentMidrange: 'COMFORT & VALUE', stayAccentLuxury: 'REFINED EXPERIENCES', stayAccentIsland: 'INDIAN OCEAN STAYS',
    companyLocation: 'Tanzania, East Africa', contactEnquiry: 'Contact enquiry', subjectPrefix: 'Subject', requestType: 'Request type', proposalRequest: 'Travel proposal', planRequest: 'Plan my safari', destinationLabel: 'Destination', openToRecommendations: 'Open to recommendations', packageOfInterest: 'Package of interest', notSelected: 'Not selected', preferredDate: 'Preferred date', flexibleDates: 'Flexible dates', notSpecified: 'Not specified', travellersLabel: 'Travellers', adultsCount: 'adults', childrenCount: 'children', agesLabel: 'ages', accommodationPreference: 'Accommodation preference', budgetPerPerson: 'Approximate budget per person', toDiscuss: 'To be discussed', specialRequests: 'Special requests', noSpecialRequests: 'None',
  },
  SW: {
    about: 'Kuhusu Sisi', accommodation: 'Malazi', blogs: 'Makala za Safari', contact: 'Wasiliana Nasi', planner: 'Panga Safari Yako',
    aboutEyebrow: 'WATU WALIO NYUMA YA SAFARI', aboutTitle: 'Gundua uzuri wa', aboutAccent: 'Tanzania pamoja nasi.', aboutLead: 'Safari zinazoongozwa na wenyeji na kupangwa kulingana na maeneo, watu na uzoefu unaoifanya Tanzania kuwa ya kipekee.',
    story: 'Historia Yetu', storyBody: 'Leonard Tour inalenga kuwasaidia wageni kuigundua Tanzania kupitia safari za wanyamapori, milimani na visiwani zilizopangwa kwa umakini. Tunaunganisha ujuzi wa wenyeji, mipango binafsi na heshima kwa maeneo pamoja na jamii zinazowapokea wageni wetu.',
    mission: 'Dhamira Yetu', missionBody: 'Kuandaa safari zenye maana na mpangilio mzuri zinazowaunganisha wageni na Tanzania huku tukitanguliza ukarimu, usalama na utalii wenye uwajibikaji.',
    vision: 'Maono Yetu', visionBody: 'Kuwa chaguo linaloaminika kwa wageni wanaotafuta safari halisi, zenye ukarimu na mpangilio mzuri kote Tanzania.',
    why: 'Kwa Nini Usafiri Nasi', whyBody: 'Mipango binafsi, uelewa wa maeneo na mawasiliano yaliyo wazi kuanzia swali lako la kwanza hadi mwisho wa safari.',
    values: 'Tunachokithamini', value1: 'Uzoefu wa mgeni', value1Body: 'Tunakusikiliza na kupanga safari kulingana na mambo unayopenda na faraja yako.', value2: 'Utalii wenye uwajibikaji', value2Body: 'Tunasisitiza heshima kwa wanyamapori, mazingira na jamii zinazozifanya sehemu hizi kuwa za kipekee.', value3: 'Utamaduni wa Tanzania', value3Body: 'Tunathamini ujuzi wa wenyeji, urithi, mila na ukarimu wa Kitanzania.',
    destinations: 'Maeneo Yetu', destinationsBody: 'Gundua mzunguko maarufu wa kaskazini mwa Tanzania, milima na visiwa vya Bahari ya Hindi.', plan: 'Panga Safari Yako', planBody: 'Tuambie ungependa kuona na kufanya nini. Timu yetu itakusaidia kupanga safari inayokufaa.',
    stayEyebrow: 'PUMZIKA VIZURI, SAFIRI ZAIDI', stayTitle: 'Chagua malazi', stayAccent: 'yanayokufaa.', stayLead: 'Tunakusaidia kuchagua malazi kulingana na njia ya safari, faraja unayopendelea na bajeti. Eneo mahususi hutegemea tarehe na upatikanaji.',
    camping: 'Malazi ya Kambi', midrange: 'Lodge na Kambi za Kiwango cha Kati', luxury: 'Lodge na Kambi za Kifahari', island: 'Hoteli za Zanzibar na Visiwani',
    campingBody: 'Uzoefu wa safari ulio karibu zaidi na asili, kwa kulala kwenye maeneo ya kambi na kusikia mazingira ya pori. Unafaa kwa wasafiri wanaopenda matukio na malazi rahisi yenye uhalisia.',
    midrangeBody: 'Lodge na kambi zenye faraja, huduma nzuri na thamani inayolingana na gharama. Zinafaa kwa wanandoa, familia na marafiki wanaotaka faraja bila gharama za kifahari kupita kiasi.',
    luxuryBody: 'Lodge na kambi za kiwango cha juu zenye huduma makini na mazingira ya kipekee. Zinafaa kwa wageni wanaopenda faragha, ubora na huduma binafsi.',
    islandBody: 'Hoteli za pwani na visiwani kwa mapumziko ya Bahari ya Hindi. Zinafaa kwa mapumziko ya ufukweni, fungate na kuongeza siku baada ya safari, kulingana na upatikanaji.',
    exploreStays: 'Ona safari zinazohusiana', noHotelBooking: 'Malazi hupangwa kama sehemu ya ombi la safari; ukurasa huu si mfumo tofauti wa booking ya hoteli.',
    blogEyebrow: 'HADITHI, MAWAZO NA HAMASA', blogTitle: 'Makala za', blogAccent: 'Leonard Tour', blogLead: 'Ushauri wa vitendo, simulizi za maeneo na mawazo ya kugundua Tanzania.', featured: 'Makala iliyoangaziwa', allArticles: 'Makala zote', readArticle: 'Soma makala', noArticles: 'Bado hakuna makala zilizochapishwa kwa lugha hii. Tafadhali tembelea tena baadaye.', backBlogs: 'Rudi kwenye makala zote', published: 'Imechapishwa',
    contactEyebrow: 'TUKO HAPA KUKUSAIDIA', contactTitle: 'Tuanze', contactAccent: 'mazungumzo.', contactLead: 'Uliza swali, tueleze unachofikiria au tushirikishe maelezo ya mipango yako ya safari.', email: 'Barua pepe', phone: 'Namba ya WhatsApp', name: 'Jina kamili', country: 'Msimbo wa nchi', subject: 'Tunaweza kukusaidia nini?', message: 'Ujumbe wako', send: 'Tuma ombi', sending: 'Inatumwa…', success: 'Asante. Tumepokea ombi lako. Timu yetu itawasiliana nawe kupitia taarifa ulizotupatia.',
    plannerEyebrow: 'SAFARI YAKO YA TANZANIA INAANZIA HAPA', plannerTitle: 'Tupange safari', plannerAccent: 'inayokufaa.', plannerPlanTitle: 'Panga safari yako', plannerProposalTitle: 'Omba pendekezo la safari', plannerLead: 'Tushirikishe mapendeleo yako. Hili ni ombi la mawasiliano, si booking au malipo ya papo hapo.', destination: 'Unakotaka kwenda', chooseDestination: 'Chagua eneo', package: 'Kifurushi (si lazima)', choosePackage: 'Chagua kifurushi kama unacho akilini', dates: 'Tarehe unayopendelea', flexible: 'Tarehe zangu zinaweza kubadilika', adults: 'Watu wazima', children: 'Watoto', childAges: 'Umri wa watoto', accommodation: 'Aina ya malazi', chooseStay: 'Chagua aina ya malazi', budget: 'Makadirio ya bajeti kwa mtu', special: 'Mahitaji maalumu', contactDetails: 'Taarifa zako za mawasiliano', submitPlan: 'Tuma ombi la safari', submitProposal: 'Omba pendekezo langu', planSuccess: 'Asante. Tumepokea ombi lako la safari. Timu yetu italipitia na kuwasiliana nawe.',
    namePlaceholder: 'Jina lako kamili', emailPlaceholder: 'jina@example.com', messagePlaceholder: 'Tueleze kidogo unachohitaji…', specialPlaceholder: 'Unachopenda, kasi ya safari, sherehe, mahitaji ya ufikivu au jambo jingine…', phonePlaceholder: 'Chagua nchi kisha weka namba',
    safari: 'Safari za wanyamapori', kilimanjaro: 'Kilimanjaro', meru: 'Mlima Meru', zanzibar: 'Zanzibar', pemba: 'Pemba', mafia: 'Kisiwa cha Mafia', northern: 'Kaskazini mwa Tanzania', tailor: 'Safari maalumu / bado sijachagua', campingStay: 'Kambi', midStay: 'Kiwango cha kati', luxuryStay: 'Kifahari', islandStay: 'Hoteli ya kisiwa', budget1: 'Chini ya USD 1,000', budget2: 'USD 1,000–2,500', budget3: 'USD 2,500–5,000', budget4: 'USD 5,000+', budget5: 'Tujadili', error: 'Ombi halikutumwa. Tafadhali jaribu tena au wasiliana nasi moja kwa moja.', phoneError: 'Tafadhali weka namba sahihi ya WhatsApp.', required: 'Tafadhali jaza sehemu zinazohitajika.', days: 'siku',
    detailsEyebrow: 'TOFAUTI IPO KWENYE MAELEZO', eastAfrica: 'TANZANIA · AFRIKA MASHARIKI', adventureStarts: 'SAFARI YAKO INAANZA HAPA', loadingArticles: 'Tunapakia makala…', articleNotFound: 'Makala haijapatikana.', noPayment: 'Hakuna malipo ya papo hapo', requestToTeam: 'Ombi lako litafika kwa timu yetu ya safari', contactNextSteps: 'Tutawasiliana nawe kuhusu hatua zinazofuata', phoneInvalid: 'Chagua nchi na uweke namba sahihi ya WhatsApp.', agesInvalid: 'Weka umri wa kila mtoto (miaka 0–15).', subjectGeneral: 'Swali la jumla', subjectPlanning: 'Mipango ya safari', subjectBooking: 'Booking iliyopo', subjectStay: 'Malazi', subjectOther: 'Nyingine', assurance: 'Taarifa zako zinatumwa kwa usalama kwenye mfumo wetu wa maombi.', categorySafari: 'Ushauri wa Safari', categoryDestinations: 'Maeneo ya Tanzania', categoryKili: 'Matukio ya Kilimanjaro', categoryGuides: 'Miongozo ya Safari',
    serengeti: 'Serengeti', ngorongoro: 'Ngorongoro', tarangire: 'Tarangire',
    destinationMeru: 'Mlima Meru', destinationMafia: 'Kisiwa cha Mafia', destinationNorthern: 'Kaskazini mwa Tanzania', destinationTailor: 'Safari maalumu / bado sijajua', stayAccentCamping: 'KARIBU NA PORI', stayAccentMidrange: 'FARAJA NA THAMANI', stayAccentLuxury: 'UZOEFU WA KIFAHARI', stayAccentIsland: 'MAPUMZIKO BAHARI YA HINDI',
    companyLocation: 'Tanzania, Afrika Mashariki', contactEnquiry: 'Ombi la mawasiliano', subjectPrefix: 'Mada', requestType: 'Aina ya ombi', proposalRequest: 'Ombi la pendekezo la safari', planRequest: 'Panga safari yangu', destinationLabel: 'Eneo la kutembelea', openToRecommendations: 'Niko tayari kupokea mapendekezo', packageOfInterest: 'Kifurushi ninachokipendelea', notSelected: 'Hakijachaguliwa', preferredDate: 'Tarehe inayopendelewa', flexibleDates: 'Tarehe zinaweza kubadilika', notSpecified: 'Haijabainishwa', travellersLabel: 'Wasafiri', adultsCount: 'watu wazima', childrenCount: 'watoto', agesLabel: 'umri', accommodationPreference: 'Aina ya malazi ninayopendelea', budgetPerPerson: 'Bajeti ya makadirio kwa mtu', toDiscuss: 'Tutajadili', specialRequests: 'Mahitaji maalumu', noSpecialRequests: 'Hakuna',
  },
  FR: {
    about: 'À propos', accommodation: 'Hébergement', blogs: 'Carnet de voyage', contact: 'Contact', planner: 'Planifier votre safari',
    aboutEyebrow: 'LES PERSONNES DERRIÈRE LE VOYAGE', aboutTitle: 'Découvrez l’esprit de', aboutAccent: 'la Tanzanie avec nous.', aboutLead: 'Des voyages guidés localement, conçus autour des lieux, des habitants et des expériences qui rendent la Tanzanie exceptionnelle.',
    story: 'Notre histoire', storyBody: 'Leonard Tour aide les voyageurs à découvrir la Tanzanie grâce à des safaris, des ascensions et des séjours insulaires soigneusement organisés. Nous associons connaissance locale, préparation personnalisée et respect des lieux et des communautés qui accueillent nos visiteurs.', mission: 'Notre mission', missionBody: 'Créer des voyages enrichissants et bien préparés qui rapprochent les visiteurs de la Tanzanie, en donnant la priorité à l’accueil, à la sécurité et au tourisme responsable.', vision: 'Notre vision', visionBody: 'Être un choix de confiance pour les voyageurs qui recherchent des expériences authentiques, accueillantes et bien organisées en Tanzanie.', why: 'Pourquoi voyager avec nous', whyBody: 'Une préparation personnalisée, une connaissance locale et une communication claire à chaque étape.', values: 'Nos valeurs', value1: 'Expérience des visiteurs', value1Body: 'Nous écoutons vos attentes et adaptons chaque voyage à vos envies et à votre confort.', value2: 'Tourisme responsable', value2Body: 'Nous encourageons le respect de la faune, de la nature et des communautés locales.', value3: 'Culture tanzanienne', value3Body: 'Nous valorisons le savoir local, le patrimoine, les traditions et l’hospitalité.', destinations: 'Nos destinations', destinationsBody: 'Découvrez le circuit nord, les montagnes et les îles de l’océan Indien.', plan: 'Planifier votre safari', planBody: 'Parlez-nous de vos envies et nous vous aiderons à construire le voyage adapté.',
    stayEyebrow: 'BIEN SE REPOSER, VOYAGER PLUS LOIN', stayTitle: 'Choisissez un hébergement', stayAccent: 'adapté à votre voyage.', stayLead: 'Nous associons le style d’hébergement à votre itinéraire, à votre confort et à votre budget. Les établissements précis dépendent des dates et des disponibilités.', camping: 'Hébergement en camping', midrange: 'Lodges et camps de gamme moyenne', luxury: 'Lodges et camps de luxe', island: 'Hôtels de Zanzibar et des îles', campingBody: 'Une expérience proche de la nature, avec des nuits en campement et les sons de la brousse. Idéal pour les voyageurs aventureux qui apprécient un séjour simple et authentique.', midrangeBody: 'Des lodges et camps confortables offrant un bon équilibre entre accueil, emplacement et budget. Adaptés aux couples, familles et amis.', luxuryBody: 'Des lodges et camps haut de gamme, avec un service attentif et des cadres remarquables. Pour les voyageurs qui privilégient intimité et confort raffiné.', islandBody: 'Des hôtels côtiers et des resorts insulaires pour profiter de l’océan Indien. Idéal pour la plage, les lunes de miel et les prolongations de safari, selon les disponibilités.', exploreStays: 'Voir les safaris associés', noHotelBooking: 'L’hébergement est organisé dans le cadre de la demande de safari ; cette page ne permet pas de réserver un hôtel séparément.',
    blogEyebrow: 'RÉCITS, IDÉES ET INSPIRATION', blogTitle: 'Le carnet de voyage', blogAccent: 'Leonard Tour', blogLead: 'Conseils pratiques, récits de destinations et idées pour découvrir la Tanzanie.', featured: 'Article à la une', allArticles: 'Tous les articles', readArticle: 'Lire l’article', noArticles: 'Aucun article n’est encore publié dans cette langue. Revenez bientôt.', backBlogs: 'Retour aux articles', published: 'Publié',
    contactEyebrow: 'NOUS SOMMES À VOTRE ÉCOUTE', contactTitle: 'Commençons une', contactAccent: 'conversation.', contactLead: 'Posez une question ou partagez quelques détails sur votre projet de voyage.', email: 'Adresse e-mail', phone: 'Numéro WhatsApp', name: 'Nom complet', country: 'Indicatif du pays', subject: 'Comment pouvons-nous vous aider ?', message: 'Votre message', send: 'Envoyer la demande', sending: 'Envoi…', success: 'Merci. Votre demande a été reçue. Notre équipe vous contactera avec les coordonnées fournies.',
    plannerEyebrow: 'VOTRE VOYAGE EN TANZANIE COMMENCE ICI', plannerTitle: 'Créons un voyage', plannerAccent: 'qui vous ressemble.', plannerPlanTitle: 'Planifier votre safari', plannerProposalTitle: 'Demander une proposition de voyage', plannerLead: 'Partagez vos préférences. Il s’agit d’une demande, pas d’une réservation ou d’un paiement immédiat.', destination: 'Destination', chooseDestination: 'Choisir une destination', package: 'Circuit (facultatif)', choosePackage: 'Choisissez un circuit si vous en avez un en tête', dates: 'Date de voyage souhaitée', flexible: 'Mes dates sont flexibles', adults: 'Adultes', children: 'Enfants', childAges: 'Âges des enfants', accommodation: 'Hébergement souhaité', chooseStay: 'Choisir un style', budget: 'Budget approximatif par personne', special: 'Demandes particulières', contactDetails: 'Vos coordonnées', submitPlan: 'Envoyer ma demande', submitProposal: 'Demander ma proposition', planSuccess: 'Merci. Votre demande a été reçue. Notre équipe l’examinera et vous contactera.', namePlaceholder: 'Votre nom complet', emailPlaceholder: 'vous@example.com', messagePlaceholder: 'Dites-nous ce dont vous avez besoin…', specialPlaceholder: 'Centres d’intérêt, rythme, célébration ou autre demande…', phonePlaceholder: 'Choisissez le pays puis entrez le numéro', safari: 'Safari et faune', kilimanjaro: 'Kilimandjaro', meru: 'Mont Meru', zanzibar: 'Zanzibar', pemba: 'Pemba', mafia: 'Île de Mafia', northern: 'Nord de la Tanzanie', tailor: 'Sur mesure / à définir', campingStay: 'Camping', midStay: 'Gamme moyenne', luxuryStay: 'Luxe', islandStay: 'Resort insulaire', budget1: 'Moins de 1 000 USD', budget2: '1 000–2 500 USD', budget3: '2 500–5 000 USD', budget4: '5 000 USD+', budget5: 'À discuter', error: 'Votre demande n’a pas pu être envoyée. Réessayez ou contactez-nous directement.', phoneError: 'Veuillez saisir un numéro WhatsApp valide.', required: 'Veuillez remplir les champs obligatoires.', days: 'jours',
    detailsEyebrow: 'LA DIFFÉRENCE SE JOUE DANS LES DÉTAILS', eastAfrica: 'TANZANIE · AFRIQUE DE L’EST', adventureStarts: 'VOTRE AVENTURE COMMENCE ICI', loadingArticles: 'Chargement des articles…', articleNotFound: 'Article introuvable.', noPayment: 'Aucun paiement immédiat', requestToTeam: 'Votre demande est transmise à notre équipe de voyage', contactNextSteps: 'Nous vous contacterons pour la suite', phoneInvalid: 'Sélectionnez un pays et saisissez un numéro WhatsApp valide.', agesInvalid: 'Indiquez l’âge de chaque enfant (0 à 15 ans).', subjectGeneral: 'Demande générale', subjectPlanning: 'Préparer un safari', subjectBooking: 'Réservation existante', subjectStay: 'Hébergement', subjectOther: 'Autre', assurance: 'Vos coordonnées sont transmises en toute sécurité à notre système de demandes.', categorySafari: 'Conseils safari', categoryDestinations: 'Destinations en Tanzanie', categoryKili: 'Aventures au Kilimandjaro', categoryGuides: 'Guides de voyage',
    serengeti: 'Serengeti', ngorongoro: 'Ngorongoro', tarangire: 'Tarangire',
    destinationMeru: 'Mont Meru', destinationMafia: 'Île de Mafia', destinationNorthern: 'Nord de la Tanzanie', destinationTailor: 'Sur mesure / pas encore décidé', stayAccentCamping: 'AU CŒUR DE LA NATURE', stayAccentMidrange: 'CONFORT ET BON RAPPORT QUALITÉ-PRIX', stayAccentLuxury: 'EXPÉRIENCES RAFFINÉES', stayAccentIsland: 'SÉJOURS DANS L’OCÉAN INDIEN',
    companyLocation: 'Tanzanie, Afrique de l’Est', contactEnquiry: 'Demande de contact', subjectPrefix: 'Sujet', requestType: 'Type de demande', proposalRequest: 'Proposition de voyage', planRequest: 'Planifier mon safari', destinationLabel: 'Destination', openToRecommendations: 'Ouvert aux suggestions', packageOfInterest: 'Circuit souhaité', notSelected: 'Non sélectionné', preferredDate: 'Date souhaitée', flexibleDates: 'Dates flexibles', notSpecified: 'Non précisé', travellersLabel: 'Voyageurs', adultsCount: 'adultes', childrenCount: 'enfants', agesLabel: 'âges', accommodationPreference: 'Hébergement préféré', budgetPerPerson: 'Budget approximatif par personne', toDiscuss: 'À discuter', specialRequests: 'Demandes particulières', noSpecialRequests: 'Aucune',
  },
  ZH: {
    about: '关于我们', accommodation: '住宿', blogs: '旅行日志', contact: '联系我们', planner: '规划您的旅行', aboutEyebrow: '旅程背后的人们', aboutTitle: '与我们一起感受', aboutAccent: '坦桑尼亚的魅力。', aboutLead: '由当地团队带领，根据坦桑尼亚的地点、人民和独特体验精心规划旅程。', story: '我们的故事', storyBody: 'Leonard Tour 希望通过精心安排的野生动物 safari、登山和海岛旅程，帮助游客探索坦桑尼亚。我们结合当地知识、个性化规划，并尊重接待游客的地方与社区。', mission: '我们的使命', missionBody: '打造有意义、规划周到的旅行体验，让游客亲近坦桑尼亚，并重视待客之道、安全和负责任的旅游。', vision: '我们的愿景', visionBody: '成为希望在坦桑尼亚体验真实、友好且组织完善旅程的游客所信赖的选择。', why: '为什么选择我们', whyBody: '从第一次咨询到旅程结束，提供个性化安排、当地见解和清晰沟通。', values: '我们的价值观', value1: '宾客体验', value1Body: '认真聆听您的想法，并根据兴趣和舒适度安排旅程。', value2: '负责任的旅游', value2Body: '尊重野生动物、自然环境和当地社区。', value3: '坦桑尼亚文化', value3Body: '珍视当地知识、遗产、传统和热情好客。', destinations: '我们的目的地', destinationsBody: '探索坦桑尼亚北部线路、山地景观和印度洋海岛。', plan: '规划您的旅行', planBody: '告诉我们您想体验什么，我们将帮助您设计合适的旅程。',
    stayEyebrow: '休息舒适，探索更多', stayTitle: '选择适合旅程的', stayAccent: '住宿方式。', stayLead: '我们根据路线、舒适偏好和预算协助选择住宿。具体住宿取决于日期和房态。', camping: '露营住宿', midrange: '中档旅馆与帐篷营地', luxury: '豪华旅馆与帐篷营地', island: '桑给巴尔及海岛度假村', campingBody: '更贴近自然的 safari 体验，在营地过夜，聆听荒野的声音。适合喜欢冒险和简朴真实住宿的旅客。', midrangeBody: '舒适的旅馆和帐篷营地，兼顾服务、位置和性价比。适合情侣、家庭和朋友。', luxuryBody: '精选高舒适度旅馆和特色帐篷营地，提供贴心服务和独特环境。适合重视私密与精致体验的旅客。', islandBody: '印度洋沿岸酒店和海岛度假村，适合海滩休闲、蜜月和 safari 延伸行程，视房态而定。', exploreStays: '查看相关旅程', noHotelBooking: '住宿作为 safari 咨询的一部分安排；此页面不是独立酒店预订系统。',
    blogEyebrow: '故事、想法与灵感', blogTitle: 'Leonard Tour', blogAccent: '旅行日志', blogLead: '实用建议、目的地故事和探索坦桑尼亚的灵感。', featured: '精选文章', allArticles: '全部文章', readArticle: '阅读文章', noArticles: '目前尚无此语言的已发布文章，请稍后再来。', backBlogs: '返回全部文章', published: '发布于',
    contactEyebrow: '我们随时为您提供帮助', contactTitle: '让我们开始', contactAccent: '交流。', contactLead: '提出问题，告诉我们您的想法，或分享您的旅行计划。', email: '电子邮箱', phone: 'WhatsApp 号码', name: '姓名', country: '国家代码', subject: '我们可以帮您什么？', message: '您的留言', send: '发送咨询', sending: '正在发送…', success: '谢谢，您的咨询已收到。我们的团队将通过您提供的联系方式与您联系。',
    plannerEyebrow: '您的坦桑尼亚之旅从这里开始', plannerTitle: '规划一段', plannerAccent: '专属您的旅程。', plannerPlanTitle: '规划您的 safari', plannerProposalTitle: '申请旅行方案', plannerLead: '请分享您的偏好。这只是咨询申请，不是即时预订或付款。', destination: '目的地', chooseDestination: '选择目的地', package: '行程套餐（可选）', choosePackage: '如有心仪套餐请在此选择', dates: '希望出行日期', flexible: '日期灵活', adults: '成人', children: '儿童', childAges: '儿童年龄', accommodation: '住宿偏好', chooseStay: '选择住宿类型', budget: '人均预算范围', special: '特别要求', contactDetails: '联系方式', submitPlan: '发送旅行申请', submitProposal: '申请旅行方案', planSuccess: '谢谢，您的旅行申请已收到。我们的团队将查看信息并与您联系。', namePlaceholder: '您的姓名', emailPlaceholder: 'you@example.com', messagePlaceholder: '请简单说明您的需求…', specialPlaceholder: '兴趣、行程节奏、庆祝活动或其他需求…', phonePlaceholder: '先选择国家，再输入号码', safari: '野生动物 safari', kilimanjaro: '乞力马扎罗山', meru: '梅鲁山', zanzibar: '桑给巴尔', pemba: '奔巴岛', mafia: '马菲亚岛', northern: '坦桑尼亚北部', tailor: '定制 / 尚未决定', campingStay: '露营', midStay: '中档', luxuryStay: '豪华', islandStay: '海岛度假村', budget1: '低于 1,000 美元', budget2: '1,000–2,500 美元', budget3: '2,500–5,000 美元', budget4: '5,000 美元以上', budget5: '待商议', error: '无法发送申请，请重试或直接联系我们。', phoneError: '请输入有效的 WhatsApp 号码。', required: '请填写必填项目。', days: '天',
    detailsEyebrow: '细节成就不同体验', eastAfrica: '坦桑尼亚 · 东非', adventureStarts: '您的旅程从这里开始', loadingArticles: '正在加载文章…', articleNotFound: '未找到文章。', noPayment: '无需立即付款', requestToTeam: '您的申请将发送给我们的旅行团队', contactNextSteps: '我们将与您联系并说明后续步骤', phoneInvalid: '请选择国家并输入有效的 WhatsApp 号码。', agesInvalid: '请输入每位儿童的年龄（0–15 岁）。', subjectGeneral: '一般咨询', subjectPlanning: 'Safari 规划', subjectBooking: '现有预订', subjectStay: '住宿', subjectOther: '其他', assurance: '您的信息将安全发送至我们的咨询系统。', categorySafari: 'Safari 实用建议', categoryDestinations: '坦桑尼亚目的地', categoryKili: '乞力马扎罗探险', categoryGuides: '旅行指南',
    serengeti: '塞伦盖蒂', ngorongoro: '恩戈罗恩戈罗', tarangire: '塔兰吉雷',
    destinationMeru: '梅鲁山', destinationMafia: '马菲亚岛', destinationNorthern: '坦桑尼亚北部', destinationTailor: '定制行程 / 尚未确定', stayAccentCamping: '亲近自然', stayAccentMidrange: '舒适与价值', stayAccentLuxury: '精致体验', stayAccentIsland: '印度洋海岛住宿',
    companyLocation: '坦桑尼亚，东非', contactEnquiry: '联系咨询', subjectPrefix: '主题', requestType: '申请类型', proposalRequest: '旅行方案申请', planRequest: '规划我的 safari', destinationLabel: '目的地', openToRecommendations: '愿意接受目的地建议', packageOfInterest: '感兴趣的行程', notSelected: '未选择', preferredDate: '期望出行日期', flexibleDates: '日期灵活', notSpecified: '未说明', travellersLabel: '出行人数', adultsCount: '成人', childrenCount: '儿童', agesLabel: '年龄', accommodationPreference: '住宿偏好', budgetPerPerson: '人均预算估计', toDiscuss: '待商议', specialRequests: '特别要求', noSpecialRequests: '无',
  },
  KO: {
    about: '회사 소개', accommodation: '숙박', blogs: '여행 이야기', contact: '문의하기', planner: '사파리 계획하기', aboutEyebrow: '여행을 만드는 사람들', aboutTitle: '저희와 함께', aboutAccent: '탄자니아를 만나보세요.', aboutLead: '탄자니아의 장소와 사람, 특별한 경험을 중심으로 현지에서 세심하게 계획하는 여행입니다.', story: '우리의 이야기', storyBody: 'Leonard Tour는 세심하게 준비한 사파리, 산악 트레킹과 섬 여행을 통해 여행객이 탄자니아를 발견하도록 돕습니다. 현지 지식과 맞춤형 계획, 지역사회와 여행지를 존중하는 마음을 결합합니다.', mission: '우리의 사명', missionBody: '환대와 안전, 책임 있는 관광을 우선으로 하며 탄자니아와 연결되는 의미 있고 잘 준비된 여행을 만드는 것입니다.', vision: '우리의 비전', visionBody: '탄자니아에서 진정성 있고 친절하며 잘 운영되는 여행을 원하는 고객이 신뢰하는 선택이 되는 것입니다.', why: '왜 저희와 여행해야 할까요?', whyBody: '첫 문의부터 여행이 끝날 때까지 맞춤형 계획, 현지 정보와 명확한 소통을 제공합니다.', values: '우리의 가치', value1: '고객 경험', value1Body: '고객의 관심과 편안함을 듣고 그에 맞춰 여행을 계획합니다.', value2: '책임 있는 관광', value2Body: '야생동물, 자연과 지역사회를 존중합니다.', value3: '탄자니아 문화', value3Body: '현지 지식과 유산, 전통과 따뜻한 환대를 소중히 여깁니다.', destinations: '여행 목적지', destinationsBody: '탄자니아 북부 코스와 산악 풍경, 인도양의 섬을 만나보세요.', plan: '사파리 계획하기', planBody: '원하는 경험을 알려주시면 알맞은 여행을 함께 계획하겠습니다.',
    stayEyebrow: '편안히 쉬고 더 멀리 여행하세요', stayTitle: '여행에 맞는', stayAccent: '숙소를 선택하세요.', stayLead: '여행 경로와 선호하는 편안함, 예산에 맞춰 숙소 유형을 안내합니다. 실제 숙소는 날짜와 가능 여부에 따라 달라집니다.', camping: '캠핑 숙박', midrange: '중급 롯지 및 텐트 캠프', luxury: '럭셔리 롯지 및 텐트 캠프', island: '잔지바르 및 섬 리조트', campingBody: '자연에 가까운 사파리 경험으로 캠프장에서 밤을 보내며 야생의 소리를 느낄 수 있습니다. 모험과 소박한 숙박을 좋아하는 여행객에게 적합합니다.', midrangeBody: '서비스와 위치, 비용의 균형을 갖춘 편안한 롯지와 텐트 캠프입니다. 커플과 가족, 친구 여행에 어울립니다.', luxuryBody: '세심한 서비스와 특별한 환경을 갖춘 고급 롯지와 텐트 캠프입니다. 프라이버시와 세련된 편안함을 중시하는 분께 적합합니다.', islandBody: '인도양 해안 호텔과 섬 리조트로 해변 휴식, 허니문과 사파리 연장 여행에 적합하며 객실 상황에 따라 달라집니다.', exploreStays: '관련 여행 보기', noHotelBooking: '숙박은 사파리 문의의 일부로 안내됩니다. 이 페이지는 별도의 호텔 예약 서비스가 아닙니다.',
    blogEyebrow: '이야기와 영감', blogTitle: 'Leonard Tour', blogAccent: '여행 저널', blogLead: '탄자니아 여행을 위한 실용적인 안내와 목적지 이야기, 영감을 만나보세요.', featured: '추천 글', allArticles: '전체 글', readArticle: '글 읽기', noArticles: '이 언어로 게시된 글이 아직 없습니다. 다시 방문해 주세요.', backBlogs: '전체 글로 돌아가기', published: '게시일',
    contactEyebrow: '언제든 도와드리겠습니다', contactTitle: '함께', contactAccent: '이야기를 시작해요.', contactLead: '질문이나 여행 아이디어, 계획에 관한 정보를 보내주세요.', email: '이메일 주소', phone: 'WhatsApp 번호', name: '성명', country: '국가 코드', subject: '무엇을 도와드릴까요?', message: '메시지', send: '문의 보내기', sending: '전송 중…', success: '감사합니다. 문의가 접수되었습니다. 제공하신 연락처로 연락드리겠습니다.',
    plannerEyebrow: '탄자니아 여행은 여기서 시작됩니다', plannerTitle: '나에게 맞는', plannerAccent: '여행을 계획해요.', plannerPlanTitle: '사파리 계획하기', plannerProposalTitle: '여행 제안 요청하기', plannerLead: '원하시는 사항을 알려주세요. 즉시 예약이나 결제가 아닌 문의 양식입니다.', destination: '목적지', chooseDestination: '목적지 선택', package: '패키지 (선택)', choosePackage: '원하는 패키지가 있으면 선택하세요', dates: '희망 여행 날짜', flexible: '날짜는 유동적입니다', adults: '성인', children: '어린이', childAges: '어린이 나이', accommodation: '선호 숙박 유형', chooseStay: '숙박 유형 선택', budget: '1인당 예상 예산', special: '특별 요청', contactDetails: '연락처 정보', submitPlan: '여행 문의 보내기', submitProposal: '제안 요청 보내기', planSuccess: '감사합니다. 여행 문의가 접수되었습니다. 내용을 확인한 후 연락드리겠습니다.', namePlaceholder: '성명', emailPlaceholder: 'you@example.com', messagePlaceholder: '필요한 내용을 간단히 알려주세요…', specialPlaceholder: '관심사, 여행 속도, 기념일 또는 기타 요청…', phonePlaceholder: '국가를 선택한 후 번호를 입력하세요', safari: '야생동물 사파리', kilimanjaro: '킬리만자로', meru: '메루산', zanzibar: '잔지바르', pemba: '펨바', mafia: '마피아 섬', northern: '탄자니아 북부', tailor: '맞춤형 / 미정', campingStay: '캠핑', midStay: '중급', luxuryStay: '고급', islandStay: '섬 리조트', budget1: '미화 1,000달러 미만', budget2: '미화 1,000–2,500달러', budget3: '미화 2,500–5,000달러', budget4: '미화 5,000달러 이상', budget5: '상담 후 결정', error: '문의 전송에 실패했습니다. 다시 시도하거나 직접 연락해 주세요.', phoneError: '유효한 WhatsApp 번호를 입력해 주세요.', required: '필수 항목을 작성해 주세요.', days: '일',
    detailsEyebrow: '세부 사항에서 차이가 만들어집니다', eastAfrica: '탄자니아 · 동아프리카', adventureStarts: '여행은 여기서 시작됩니다', loadingArticles: '글을 불러오는 중…', articleNotFound: '글을 찾을 수 없습니다.', noPayment: '즉시 결제할 필요가 없습니다', requestToTeam: '요청이 여행팀에 전달됩니다', contactNextSteps: '다음 단계에 대해 연락드리겠습니다', phoneInvalid: '국가를 선택하고 유효한 WhatsApp 번호를 입력하세요.', agesInvalid: '모든 아동의 나이를 입력하세요(0–15세).', subjectGeneral: '일반 문의', subjectPlanning: '사파리 계획', subjectBooking: '기존 예약', subjectStay: '숙박', subjectOther: '기타', assurance: '정보가 문의 시스템으로 안전하게 전송됩니다.', categorySafari: '사파리 팁', categoryDestinations: '탄자니아 여행지', categoryKili: '킬리만자로 모험', categoryGuides: '여행 가이드',
    serengeti: '세렝게티', ngorongoro: '응고롱고로', tarangire: '타랑기레',
    destinationMeru: '메루산', destinationMafia: '마피아 섬', destinationNorthern: '탄자니아 북부', destinationTailor: '맞춤 여행 / 미정', stayAccentCamping: '자연 가까이', stayAccentMidrange: '편안함과 가치', stayAccentLuxury: '세련된 경험', stayAccentIsland: '인도양 섬 숙박',
    companyLocation: '탄자니아 동아프리카', contactEnquiry: '연락 문의', subjectPrefix: '제목', requestType: '요청 유형', proposalRequest: '여행 제안 요청', planRequest: '사파리 계획 요청', destinationLabel: '목적지', openToRecommendations: '추천을 원합니다', packageOfInterest: '관심 있는 패키지', notSelected: '선택하지 않음', preferredDate: '희망 여행 날짜', flexibleDates: '날짜 조정 가능', notSpecified: '미정', travellersLabel: '여행 인원', adultsCount: '성인', childrenCount: '어린이', agesLabel: '나이', accommodationPreference: '선호 숙박 유형', budgetPerPerson: '1인당 예상 예산', toDiscuss: '상담 후 결정', specialRequests: '특별 요청', noSpecialRequests: '없음',
  },
};

function tr(language, key) { return TEXT[language]?.[key] || TEXT.EN[key] || key; }
function useSiteLanguage() {
  const [language, setLanguage] = useState(() => {
    const saved = (window.localStorage.getItem('mangokili-language') || 'EN').toUpperCase();
    return LANGS.includes(saved) ? saved : 'EN';
  });
  const changeLanguage = (next) => {
    setLanguage(next);
    window.localStorage.setItem('mangokili-language', next);
    document.documentElement.lang = next.toLowerCase();
  };
  useEffect(() => { document.documentElement.lang = language.toLowerCase(); }, [language]);
  return [language, changeLanguage];
}
function Frame({ language, onLanguageChange, children }) {
  return <div className="site-content-page"><Header language={language} onLanguageChange={onLanguageChange} isInteriorPage />{children}<Footer language={language} isInteriorPage /></div>;
}
function PageHero({ eyebrow, title, accent, lead }) {
  return <section className="content-hero"><div className="content-shell"><span className="eyebrow"><span /> {eyebrow}</span><h1>{title} <em>{accent}</em></h1><p>{lead}</p></div></section>;
}
function ActionLink({ href = '/plan-your-safari?intent=plan', children }) {
  return <a className="content-action" href={href}>{children}<ArrowRight size={17} /></a>;
}

export function AboutPage() {
  const [language, changeLanguage] = useSiteLanguage();
  return <Frame language={language} onLanguageChange={changeLanguage}>
    <PageHero eyebrow={tr(language, 'aboutEyebrow')} title={tr(language, 'aboutTitle')} accent={tr(language, 'aboutAccent')} lead={tr(language, 'aboutLead')} />
    <section className="content-shell content-story-grid"><div className="content-photo content-photo-savanna" /><div><span className="content-kicker">LEONARD TOUR · TANZANIA</span><h2>{tr(language, 'story')}</h2><p>{tr(language, 'storyBody')}</p><ActionLink>{tr(language, 'plan')}</ActionLink></div></section>
    <section className="content-band"><div className="content-shell content-two"><article><span className="content-kicker">01</span><h2>{tr(language, 'mission')}</h2><p>{tr(language, 'missionBody')}</p></article><article><span className="content-kicker">02</span><h2>{tr(language, 'vision')}</h2><p>{tr(language, 'visionBody')}</p></article></div></section>
    <section className="content-shell content-section"><div className="content-heading"><span className="content-kicker">{tr(language, 'detailsEyebrow')}</span><h2>{tr(language, 'why')}</h2><p>{tr(language, 'whyBody')}</p></div><div className="content-value-grid"><article><ShieldCheck /><h3>{tr(language, 'value1')}</h3><p>{tr(language, 'value1Body')}</p></article><article><Trees /><h3>{tr(language, 'value2')}</h3><p>{tr(language, 'value2Body')}</p></article><article><Sparkles /><h3>{tr(language, 'value3')}</h3><p>{tr(language, 'value3Body')}</p></article></div></section>
    <section className="content-band"><div className="content-shell"><div className="content-heading"><span className="content-kicker">{tr(language, 'eastAfrica')}</span><h2>{tr(language, 'destinations')}</h2><p>{tr(language, 'destinationsBody')}</p></div><div className="content-destinations"><a href="/destinations/serengeti">{tr(language, 'serengeti')}</a><a href="/destinations/ngorongoro">{tr(language, 'ngorongoro')}</a><a href="/destinations/kilimanjaro">{tr(language, 'kilimanjaro')}</a><a href="/destinations/zanzibar">{tr(language, 'zanzibar')}</a><a href="/destinations/tarangire">{tr(language, 'tarangire')}</a><a href="/destinations/mikumi">{tr(language, 'mikumi')}</a></div></div></section>
    <section className="content-cta"><div className="content-shell"><div><span className="content-kicker">{tr(language, 'adventureStarts')}</span><h2>{tr(language, 'plan')}</h2><p>{tr(language, 'planBody')}</p></div><ActionLink>{tr(language, 'planner')}</ActionLink></div></section>
  </Frame>;
}

const accommodationCards = [
  { key: 'camping', icon: Trees, accentKey: 'stayAccentCamping' },
  { key: 'midrange', icon: Compass, accentKey: 'stayAccentMidrange' },
  { key: 'luxury', icon: Sparkles, accentKey: 'stayAccentLuxury' },
  { key: 'island', icon: Waves, accentKey: 'stayAccentIsland' },
];

const STAY_LABELS = {
  EN: { galleryTitle: 'Stays by destination', galleryLead: 'Browse examples of accommodation in the places covered by our Tanzania journeys.', all: 'All destinations', visit: 'Visit property', enquire: 'Ask about this stay', propertyNote: 'These are examples to help you explore. The final accommodation recommendation depends on your route, travel dates, availability and confirmed package arrangements.', campingLabel: 'Mountain campsites', typeLodge: 'Safari lodge', typeCamp: 'Tented safari camp', typeHotel: 'Hotel', typeIsland: 'Island resort' },
  SW: { galleryTitle: 'Malazi kulingana na unakoenda', galleryLead: 'Tazama mifano ya malazi katika maeneo yanayohusishwa na safari zetu za Tanzania.', all: 'Maeneo yote', visit: 'Tembelea tovuti ya malazi', enquire: 'Ulizia malazi haya', propertyNote: 'Hii ni mifano ya kukusaidia kuchagua. Pendekezo la mwisho hutegemea njia ya safari, tarehe, nafasi zilizopo na makubaliano ya package yatakayothibitishwa.', campingLabel: 'Kambi za milimani', typeLodge: 'Lodge ya safari', typeCamp: 'Kambi ya hema ya safari', typeHotel: 'Hoteli', typeIsland: 'Resort ya kisiwa' },
  FR: { galleryTitle: 'Hébergements par destination', galleryLead: 'Découvrez des exemples d’hébergements dans les régions de nos voyages en Tanzanie.', all: 'Toutes les destinations', visit: 'Visiter le site', enquire: 'Demander des informations', propertyNote: 'Ces établissements sont présentés à titre indicatif. Le choix final dépend de l’itinéraire, des dates, des disponibilités et des arrangements confirmés.', campingLabel: 'Camps de montagne', typeLodge: 'Lodge safari', typeCamp: 'Camp safari sous tente', typeHotel: 'Hôtel', typeIsland: 'Resort insulaire' },
  ZH: { galleryTitle: '按目的地浏览住宿', galleryLead: '查看坦桑尼亚旅行路线沿线住宿示例。', all: '所有目的地', visit: '访问住宿官网', enquire: '咨询此住宿', propertyNote: '以下住宿仅供参考。最终建议取决于路线、出行日期、房态及确认后的行程安排。', campingLabel: '登山营地', typeLodge: '野生动物园旅舍', typeCamp: '帐篷营地', typeHotel: '酒店', typeIsland: '海岛度假村' },
  KO: { galleryTitle: '목적지별 숙소', galleryLead: '탄자니아 여행 경로에 있는 숙소 예시를 둘러보세요.', all: '모든 목적지', visit: '숙소 웹사이트 방문', enquire: '이 숙소 문의하기', propertyNote: '아래 숙소는 참고 예시입니다. 최종 추천은 경로, 여행 날짜, 객실 상황 및 확정된 여행 일정에 따라 달라집니다.', campingLabel: '산악 캠프', typeLodge: '사파리 롯지', typeCamp: '텐트 사파리 캠프', typeHotel: '호텔', typeIsland: '섬 리조트' },
};

const STAY_PROPERTIES = [
  { name: 'Namiri Plains', destination: 'Serengeti', kind: 'typeCamp', image: 'https://www.asiliaafrica.com/wp-content/smush-webp/2024/04/Asilia_Camp-Lodges_Namiri-Plains_Header-Images.jpg.webp', website: 'https://www.asiliaafrica.com/camps-lodges/namiri-plains/', note: { EN: 'Eastern Serengeti', SW: 'Mashariki mwa Serengeti', FR: 'Serengeti oriental', ZH: '塞伦盖蒂东部', KO: '세렝게티 동부' } },
  { name: 'Ngorongoro Serena Safari Lodge', destination: 'Ngorongoro', kind: 'typeLodge', image: 'https://image-tc.galaxy.tf/wijpeg-bzd9dxrfqnj9kg5lfdg00ajfp/view-of-ngorongoro-crater.jpg?crop=0%2C438%2C1984%2C896&rotate=0&width=2560', website: 'https://www.serenahotels.com/ngorongoro', note: { EN: 'On the Ngorongoro Crater rim', SW: 'Kwenye ukingo wa Kreta ya Ngorongoro', FR: 'Sur le bord du cratère du Ngorongoro', ZH: '位于恩戈罗恩戈罗火山口边缘', KO: '응고롱고로 분화구 가장자리' } },
  { name: 'Tarangire Sopa Lodge', destination: 'Tarangire', kind: 'typeLodge', image: 'https://www.sopalodges.com/images/tarangire/overview.jpg', website: 'https://www.sopalodges.com/tarangire-sopa-lodge/the-lodge', note: { EN: 'Inside Tarangire National Park', SW: 'Ndani ya Hifadhi ya Taifa ya Tarangire', FR: 'Dans le parc national de Tarangire', ZH: '位于塔兰吉雷国家公园内', KO: '타랑기레 국립공원 내' } },
  { name: "Stanley's Kopje", destination: 'Mikumi', kind: 'typeCamp', image: 'https://b-cdn.springnest.com/media/img/xd/whatsapp_image_2025-08-19_at_182102944eb25.jpeg?aspect_ratio=1500%3A750&quality=78&width=1500', website: 'https://www.stanleyskopje.com/', note: { EN: 'Raised tented camp in Mikumi National Park', SW: 'Kambi ya mahema iliyoinuliwa ndani ya Hifadhi ya Taifa ya Mikumi', FR: 'Camp de tentes surélevées dans le parc national de Mikumi', ZH: '米库米国家公园内的高架帐篷营地', KO: '미쿠미 국립공원 내 고지대 텐트 캠프' } },
  { name: 'Machame Route Campsites', destination: 'Kilimanjaro', kind: 'campingLabel', image: 'https://www.mountainguides.com/wordpress/wp-content/uploads/2023/07/Machame-Camp-Day-1-Phunuru-Sherpa-scaled.jpg', website: 'https://www.tanzaniaparks.go.tz/', note: { EN: 'Campsites along the Machame climbing route', SW: 'Kambi zilizopo kwenye njia ya kupanda kupitia Machame', FR: 'Camps le long de la voie d’ascension Machame', ZH: 'Machame 登山路线沿线营地', KO: '마차메 등반 경로의 캠프장' } },
  { name: 'Mount Meru Hotel', destination: 'Mount Meru', kind: 'typeHotel', image: 'https://www.mountmeruhotel.co.tz/images/accommodation-home.jpg', website: 'https://www.mountmeruhotel.co.tz/', note: { EN: 'Arusha · views of Mount Meru', SW: 'Arusha · mandhari ya Mlima Meru', FR: 'Arusha · vue sur le mont Meru', ZH: '阿鲁沙 · 可欣赏梅鲁山景色', KO: '아루샤 · 메루산 전망' } },
  { name: 'Zanzibar Queen Hotel', destination: 'Zanzibar', kind: 'typeIsland', image: 'https://u.profitroom.pl/2017.zanzibarqueen.com/thumb/0x900/uploads/BeachFrontBungalow-2.jpg', website: 'https://www.zanzibarqueen.com/', note: { EN: 'Beachfront stay on Zanzibar Island', SW: 'Malazi kando ya ufukwe wa Kisiwa cha Zanzibar', FR: 'Séjour en bord de mer sur l’île de Zanzibar', ZH: '桑给巴尔岛海滨住宿', KO: '잔지바르 섬 해변 숙소' } },
  { name: 'The Manta Resort', destination: 'Pemba', kind: 'typeIsland', image: 'https://themantaresort.com/wp-content/uploads/2020/03/uwy-photoshopped-scaled.jpg', website: 'https://themantaresort.com/stay/', note: { EN: 'Island resort on Pemba Island', SW: 'Resort ya kisiwa cha Pemba', FR: 'Resort sur l’île de Pemba', ZH: '奔巴岛度假村', KO: '펨바섬 리조트' } },
  { name: 'Butiama Beach Lodge', destination: 'Mafia Island', kind: 'typeIsland', image: 'https://butiamamafiaisland.com/site21/wp-content/uploads/2021/04/Family-Bungalow-01.jpg', website: 'https://butiamamafiaisland.com/butiama-beach-lodge/', note: { EN: 'Beach lodge on Mafia Island', SW: 'Lodge ya ufukweni katika Kisiwa cha Mafia', FR: 'Lodge en bord de mer sur l’île de Mafia', ZH: '马菲亚岛海滨旅馆', KO: '마피아섬 해변 롯지' } },
];

function StayPhoto({ property }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [property.image]);
  return failed
    ? <div className="stay-photo-fallback"><MapPin size={28} /><span>{property.destination}</span></div>
    : <img src={property.image} alt={`${property.name} accommodation in ${property.destination}`} loading="lazy" onError={() => setFailed(true)} />;
}

export function AccommodationPage() {
  const [language, changeLanguage] = useSiteLanguage();
  const [destination, setDestination] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('destination');
    if (!requested) return 'all';
    const normalized = requested.trim().toLowerCase();
    const match = STAY_PROPERTIES.find((property) => {
      const propertyDestination = property.destination.toLowerCase();
      return propertyDestination === normalized || propertyDestination.includes(normalized) || normalized.includes(propertyDestination);
    });
    return match?.destination || 'all';
  });
  const labels = STAY_LABELS[language] || STAY_LABELS.EN;
  const properties = destination === 'all' ? STAY_PROPERTIES : STAY_PROPERTIES.filter((item) => item.destination === destination);
  return <Frame language={language} onLanguageChange={changeLanguage}>
    <PageHero eyebrow={tr(language, 'stayEyebrow')} title={tr(language, 'stayTitle')} accent={tr(language, 'stayAccent')} lead={tr(language, 'stayLead')} />
    <section className="content-shell content-section"><div className="accommodation-grid">{accommodationCards.map(({ key, icon: Icon, accentKey }) => <article className="accommodation-card" key={key}><span className="accommodation-icon"><Icon size={25} /></span><small>{tr(language, accentKey)}</small><h2>{tr(language, key)}</h2><p>{tr(language, `${key}Body`)}</p></article>)}</div>
      <div className="stay-gallery-heading"><span className="content-kicker">LEONARD TOUR · TANZANIA</span><h2>{labels.galleryTitle}</h2><p>{labels.galleryLead}</p></div>
      <div className="stay-destination-filters" aria-label={labels.galleryTitle}><button type="button" className={destination === 'all' ? 'is-active' : ''} onClick={() => setDestination('all')}>{labels.all}</button>{['Serengeti', 'Ngorongoro', 'Tarangire', 'Mikumi', 'Kilimanjaro', 'Mount Meru', 'Zanzibar', 'Pemba', 'Mafia Island'].map((name) => <button type="button" key={name} className={destination === name ? 'is-active' : ''} onClick={() => setDestination(name)}>{name}</button>)}</div>
      <div className="stay-property-grid">{properties.map((property) => <article className="stay-property-card" key={property.name}><a className="stay-property-photo" href={property.website} target="_blank" rel="noreferrer"><StayPhoto property={property} /></a><div className="stay-property-body"><small>{property.destination} · {labels[property.kind] || property.kind}</small><h3>{property.name}</h3><p>{property.note?.[language] || property.note?.EN || property.note}</p><div className="stay-property-actions"><a href={property.website} target="_blank" rel="noreferrer">{labels.visit} <ArrowUpRight size={14} /></a><a href={`/plan-your-safari?intent=plan&destination=${encodeURIComponent(property.destination)}&stay=${encodeURIComponent(property.name)}`}>{labels.enquire} <ArrowRight size={14} /></a></div></div></article>)}</div>
      <p className="content-note"><ShieldCheck size={18} /> {labels.propertyNote} {tr(language, 'noHotelBooking')}</p>
    </section>
    <section className="content-cta"><div className="content-shell"><div><h2>{tr(language, 'planner')}</h2><p>{tr(language, 'stayLead')}</p></div><ActionLink>{tr(language, 'planner')}</ActionLink></div></section>
  </Frame>;
}

const DESTINATION_CONFIG = {
  serengeti: { name: 'Serengeti', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=2000&q=88', keywords: ['serengeti', 'migration', 'camping-6days', 'camping-7days', 'luxury-5days'] },
  ngorongoro: { name: 'Ngorongoro', image: 'https://images.unsplash.com/photo-1535338454770-8be927b5a00b?auto=format&fit=crop&w=2000&q=88', keywords: ['ngorongoro'] },
  kilimanjaro: { name: 'Kilimanjaro', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=88', keywords: ['kilimanjaro', 'kili-machame', 'machame'] },
  zanzibar: { name: 'Zanzibar', image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=2000&q=88', keywords: ['zanzibar', 'unguja'] },
  tarangire: { name: 'Tarangire', image: 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=2000&q=88', keywords: ['tarangire', 'midrange-6days'] },
  mikumi: { name: 'Mikumi', image: 'https://www.tanzaniaparks.go.tz/_next/image?q=75&url=%2F_next%2Fstatic%2Fmedia%2Fmikumi-cover%402x.5c5c7e29.jpg&w=1536', keywords: ['mikumi'] },
};
const DESTINATION_STORIES = {
  EN: {
    serengeti: 'Explore open grasslands, abundant wildlife and the seasonal Great Migration. The best wildlife areas vary through the year, so travel dates help shape the route.',
    ngorongoro: 'Discover the crater highlands, sweeping savanna and the remarkable landscapes of the Ngorongoro Conservation Area.',
    kilimanjaro: 'Prepare for a guided climb through changing mountain zones, with a route and schedule selected around acclimatisation and your readiness.',
    zanzibar: 'Enjoy Indian Ocean beaches, Swahili heritage, spice culture and relaxed island time before or after a mainland safari.',
    tarangire: 'See baobab-dotted scenery and large elephant herds around the Tarangire River, especially during the dry-season wildlife gathering.',
    mikumi: 'Explore the Mkata floodplain, open grasslands and acacia-dotted scenery of Tanzania’s Southern Circuit. Mikumi is also a practical option for shorter safari plans from Dar es Salaam.',
  },
  SW: {
    serengeti: 'Gundua nyanda pana za malisho, wanyamapori wengi na Uhamaji Mkuu wa msimu. Maeneo bora ya kuona wanyamapori hubadilika mwaka mzima, hivyo tarehe zako husaidia kupanga njia.',
    ngorongoro: 'Gundua nyanda za juu za kreta, savanna pana na mandhari ya kipekee ya Eneo la Hifadhi ya Ngorongoro.',
    kilimanjaro: 'Jiandae kwa kupanda mlima kwa kuongozwa kupitia maeneo yenye hali tofauti za mazingira. Njia na ratiba huchaguliwa kwa kuzingatia kuzoea mwinuko na maandalizi yako.',
    zanzibar: 'Furahia fukwe za Bahari ya Hindi, urithi wa Waswahili, utamaduni wa viungo na mapumziko ya kisiwani kabla au baada ya safari ya bara.',
    tarangire: 'Ona mandhari yenye mibuyu na makundi makubwa ya tembo karibu na Mto Tarangire, hasa wakati wa mkusanyiko wa wanyamapori katika kiangazi.',
    mikumi: 'Gundua uwanda wa Mkata, nyanda za wazi na mandhari yenye migunga katika Ukanda wa Kusini wa Tanzania. Mikumi pia inafaa kwa mipango ya safari fupi kutoka Dar es Salaam.',
  },
  FR: {
    serengeti: 'Explorez les grandes plaines, la faune abondante et la Grande Migration saisonnière. Les meilleurs secteurs varient selon la période de l’année.',
    ngorongoro: 'Découvrez les hautes terres du cratère, les savanes et les paysages remarquables de l’aire de conservation du Ngorongoro.',
    kilimanjaro: 'Préparez une ascension guidée à travers plusieurs zones de montagne, avec un itinéraire adapté à l’acclimatation et à votre préparation.',
    zanzibar: 'Profitez des plages de l’océan Indien, du patrimoine swahili, de la culture des épices et d’un séjour insulaire reposant.',
    tarangire: 'Admirez les baobabs et les grands troupeaux d’éléphants autour de la rivière Tarangire, particulièrement pendant la saison sèche.',
    mikumi: 'Découvrez la plaine de Mkata, les prairies ouvertes et les paysages d’acacias du circuit sud de la Tanzanie. Mikumi convient aussi aux courts safaris depuis Dar es Salaam.',
  },
  ZH: {
    serengeti: '探索辽阔草原、丰富野生动物以及季节性的角马大迁徙。最佳观赏区域会随季节变化。',
    ngorongoro: '探索恩戈罗恩戈罗保护区的火山口高地、广阔草原和独特自然景观。',
    kilimanjaro: '在专业向导带领下穿越不同海拔生态带，并根据适应海拔的需要安排登山路线和时间。',
    zanzibar: '享受印度洋海滩、斯瓦希里文化、香料传统以及轻松的海岛时光。',
    tarangire: '欣赏猴面包树景观，并在旱季留意塔兰吉雷河附近聚集的大象群。',
    mikumi: '探索姆卡塔洪泛平原、开阔草地和南部旅游线路的金合欢景观。米库米也适合从达累斯萨拉姆出发的短途 safari。',
  },
  KO: {
    serengeti: '넓은 초원과 풍부한 야생동물, 계절에 따라 이동하는 대이동을 만나보세요. 관찰하기 좋은 지역은 계절에 따라 달라집니다.',
    ngorongoro: '응고롱고로 보호구역의 분화구 고원과 드넓은 사바나, 독특한 자연 경관을 둘러보세요.',
    kilimanjaro: '가이드와 함께 다양한 고도 생태대를 오르며 고도 적응과 준비 상태에 맞는 등반 경로를 선택하세요.',
    zanzibar: '인도양 해변과 스와힐리 유산, 향신료 문화, 여유로운 섬 여행을 즐겨보세요.',
    tarangire: '바오밥나무 풍경과 건기 타랑기레 강 주변에 모이는 대규모 코끼리 무리를 만나보세요.',
    mikumi: '음카타 범람원과 탁 트인 초원, 탄자니아 남부 사파리 코스의 아카시아 풍경을 탐험하세요. 다르에스살람에서 출발하는 짧은 사파리에도 적합합니다.',
  },
};

const DESTINATION_COPY = {
  EN: { eyebrow: 'EXPLORE TANZANIA', lead: 'Discover the landscapes, wildlife and experiences that make this destination special.', packageTitle: 'Journeys for this destination', empty: 'There is no published package for this destination at the moment. Send us an enquiry and our team can discuss a tailor-made route.', ask: 'Plan a journey here', stays: 'Explore accommodation here' },
  SW: { eyebrow: 'GUNDUA TANZANIA', lead: 'Gundua mandhari, wanyamapori na uzoefu unaolifanya eneo hili kuwa la kipekee.', packageTitle: 'Safari za eneo hili', empty: 'Kwa sasa hakuna package iliyochapishwa kwa eneo hili. Tutumie ombi na timu yetu inaweza kujadili safari maalumu.', ask: 'Panga safari ya eneo hili', stays: 'Ona malazi katika eneo hili' },
  FR: { eyebrow: 'DÉCOUVRIR LA TANZANIE', lead: 'Découvrez les paysages, la faune et les expériences qui rendent cette destination unique.', packageTitle: 'Voyages pour cette destination', empty: 'Aucun forfait publié pour le moment. Contactez-nous pour discuter d’un itinéraire personnalisé.', ask: 'Planifier un voyage ici', stays: 'Voir les hébergements ici' },
  ZH: { eyebrow: '探索坦桑尼亚', lead: '探索这片目的地独特的自然景观、野生动物和旅行体验。', packageTitle: '此目的地的行程', empty: '目前没有已发布的相关套餐。欢迎联系我们讨论定制路线。', ask: '规划此地行程', stays: '查看此地住宿' },
  KO: { eyebrow: '탄자니아 탐험', lead: '이 목적지만의 풍경과 야생동물, 특별한 여행 경험을 만나보세요.', packageTitle: '이 목적지 여행', empty: '현재 게시된 패키지가 없습니다. 맞춤 일정을 문의해 주세요.', ask: '이곳 여행 계획하기', stays: '이 지역 숙소 둘러보기' },
};

export function DestinationPage({ slug }) {
  const [language, changeLanguage] = useSiteLanguage();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const config = DESTINATION_CONFIG[slug];
  const copy = DESTINATION_COPY[language] || DESTINATION_COPY.EN;
  useEffect(() => {
    if (!config) { setLoading(false); return undefined; }
    const controller = new AbortController();
    setLoading(true);
    fetch(`${API_BASE}/api/packages?lang=${language.toLowerCase()}`, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : [])
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const matched = list.filter((item) => {
          const destinationText = Array.isArray(item.destinations)
            ? item.destinations.join(' ')
            : String(item.destinations || '');
          const itineraryText = typeof item.itinerary === 'string'
            ? item.itinerary
            : JSON.stringify(item.itinerary || []);
          const searchable = `${item.slug || ''} ${item.title || ''} ${item.route || ''} ${destinationText} ${itineraryText}`.toLowerCase();
          return config.keywords.some((keyword) => searchable.includes(keyword));
        });
        setPackages(matched.map(normalizePackage));
      })
      .catch((error) => { if (error.name !== 'AbortError') setPackages([]); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [config, language, slug]);
  if (!config) return <Frame language={language} onLanguageChange={changeLanguage}><main className="content-shell content-section"><div className="content-empty">Destination not found.</div></main></Frame>;
  return <Frame language={language} onLanguageChange={changeLanguage}>
    <section className="destination-detail-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(10,28,20,.78),rgba(10,28,20,.25)),url("${config.image}")` }}><div className="content-shell"><span className="eyebrow"><span />{copy.eyebrow}</span><h1>{config.name}</h1><p>{copy.lead}</p><div className="destination-hero-actions"><a className="content-action" href={`/plan-your-safari?intent=plan&destination=${encodeURIComponent(config.name)}`}>{copy.ask}<ArrowRight size={17} /></a><a className="destination-stays-action" href={`/accommodation?destination=${encodeURIComponent(config.name)}`}>{copy.stays}<ArrowUpRight size={16} /></a></div></div></section>
    <section className="content-shell content-section"><div className="destination-story"><span className="content-kicker">{config.name} · TANZANIA</span><p>{(DESTINATION_STORIES[language] || DESTINATION_STORIES.EN)[slug]}</p></div><div className="content-heading"><span className="content-kicker">LEONARD TOUR · TANZANIA</span><h2>{copy.packageTitle}</h2></div>
      {loading ? <div className="content-loading">{tr(language, 'loadingArticles')}</div> : packages.length ? <div className="destination-package-grid">{packages.map((item) => <PackageCard key={item.slug} item={item} language={language} />)}</div> : <div className="content-empty">{copy.empty} <a href={`/plan-your-safari?intent=plan&destination=${encodeURIComponent(config.name)}`}>{copy.ask}</a></div>}
    </section>
  </Frame>;
}

const BLOG_CATEGORIES = [{ value: 'Safari Tips', label: 'categorySafari' }, { value: 'Tanzania Destinations', label: 'categoryDestinations' }, { value: 'Kilimanjaro Adventures', label: 'categoryKili' }, { value: 'Travel Guides', label: 'categoryGuides' }];
const blogCategoryLabel = (language, category) => { const item = BLOG_CATEGORIES.find((entry) => entry.value === category); return item ? tr(language, item.label) : category; };
function imageUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/images/')) return value;
  if (value.startsWith('/media/')) return `${API_BASE}${value}`;
  if (value.startsWith('/')) return `${API_BASE}${value}`;
  return `${API_BASE}/media/${value.replace(/^\/+/, '')}`;
}
function ArticleImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(!src);
  useEffect(() => setFailed(!src), [src]);
  return src && !failed ? <img className={className} src={imageUrl(src)} alt={alt} loading="lazy" onError={() => setFailed(true)} /> : <div className={`article-image-placeholder ${className}`} aria-hidden="true"><BookOpen size={27} /></div>;
}
export function BlogsPage() {
  const [language, changeLanguage] = useSiteLanguage();
  const [articles, setArticles] = useState([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`${API_BASE}/api/blogs?lang=${language.toLowerCase()}&limit=60`, { signal: controller.signal })
      .then(async (response) => { const data = await response.json().catch(() => []); if (!response.ok) throw new Error(data.detail || 'Unable to load articles.'); return data; })
      .then((data) => setArticles(Array.isArray(data) ? data : []))
      .catch((e) => { if (e.name !== 'AbortError') { setError(e.message); setArticles([]); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [language]);
  const visible = useMemo(() => category === 'all' ? articles : articles.filter((a) => a.category === category), [articles, category]);
  const featured = visible.find((a) => a.is_featured) || visible[0];
  return <Frame language={language} onLanguageChange={changeLanguage}>
    <PageHero eyebrow={tr(language, 'blogEyebrow')} title={tr(language, 'blogTitle')} accent={tr(language, 'blogAccent')} lead={tr(language, 'blogLead')} />
    <section className="content-shell content-section"><div className="blog-filters"><button className={category === 'all' ? 'is-active' : ''} onClick={() => setCategory('all')}>{tr(language, 'allArticles')}</button>{BLOG_CATEGORIES.map((c) => <button key={c.value} className={category === c.value ? 'is-active' : ''} onClick={() => setCategory(c.value)}>{tr(language, c.label)}</button>)}</div>
      {loading ? <div className="content-loading">{tr(language, 'loadingArticles')}</div> : error ? <div className="content-empty">{error}</div> : !visible.length ? <div className="content-empty">{tr(language, 'noArticles')}</div> : <>
        {featured && <article className="blog-featured"><a href={`/blogs/${featured.slug}`}><ArticleImage src={featured.featured_image} alt={featured.title} /><div className="blog-featured-copy"><span className="content-kicker">{tr(language, 'featured')} · {blogCategoryLabel(language, featured.category)}</span><h2>{featured.title}</h2><p>{featured.excerpt}</p><span className="content-text-link">{tr(language, 'readArticle')} <ArrowUpRight size={16} /></span></div></a></article>}
        <div className="blog-grid">{visible.filter((a) => a.id !== featured?.id).map((article) => <article className="blog-card" key={article.id}><a href={`/blogs/${article.slug}`}><ArticleImage src={article.featured_image} alt={article.title} /><div className="blog-card-copy"><small>{blogCategoryLabel(language, article.category)}</small><h3>{article.title}</h3><p>{article.excerpt}</p><span>{tr(language, 'readArticle')} <ArrowRight size={15} /></span></div></a></article>)}</div>
      </>}
    </section>
  </Frame>;
}
export function BlogArticlePage({ slug }) {
  const [language, changeLanguage] = useSiteLanguage();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    fetch(`${API_BASE}/api/blogs/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.detail || 'Article not found.'); return data; })
      .then(setArticle).catch((e) => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug]);
  useEffect(() => {
    if (!article) return;
    document.title = article.seo_title || `${article.title} | Leonard Tour`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = article.seo_description || article.excerpt || '';
    return () => { document.title = 'Leonard Tour | Tanzania Safaris'; };
  }, [article]);
  return <Frame language={language} onLanguageChange={changeLanguage}>
    <main className="content-shell article-page">{loading ? <div className="content-loading">{tr(language, 'loadingArticles')}</div> : error || !article ? <div className="content-empty">{error || tr(language, 'articleNotFound')}</div> : <>
      <a className="article-back" href="/blogs">← {tr(language, 'backBlogs')}</a><span className="content-kicker">{blogCategoryLabel(language, article.category)} · {article.language?.toUpperCase()}</span><h1>{article.title}</h1><p className="article-excerpt">{article.excerpt}</p><ArticleImage src={article.featured_image} alt={article.title} className="article-cover" />
      <div className="article-content">{String(article.content || '').split(/\n{2,}/).map((paragraph, index) => paragraph.trim() ? <p key={index}>{paragraph.trim()}</p> : null)}</div><a className="article-back" href="/blogs">← {tr(language, 'backBlogs')}</a>
    </>}</main>
  </Frame>;
}

function useInquirySubmit(language, successText) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const submit = async (body) => {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch(`${API_BASE}/api/inquiries`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...body, language: language.toLowerCase() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { const detail = Array.isArray(result.detail) ? result.detail.map((e) => e.msg).join(', ') : result.detail; throw new Error(detail || tr(language, 'error')); }
      setNotice({ type: 'success', text: successText });
      return true;
    } catch (error) { setNotice({ type: 'error', text: error.message || tr(language, 'error') }); return false; }
    finally { setBusy(false); }
  };
  return { busy, notice, submit, setNotice };
}
export function ContactPage() {
  const [language, changeLanguage] = useSiteLanguage();
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', country: 'TZ', subject: 'General enquiry', message: '' });
  const { busy, notice, submit, setNotice } = useInquirySubmit(language, tr(language, 'success'));
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const onSubmit = async (event) => {
    event.preventDefault();
    if (form.whatsapp && !isValidPhoneNumber(form.whatsapp)) { setNotice({ type: 'error', text: tr(language, 'phoneInvalid') }); return; }
    const message = `${tr(language, 'contactEnquiry')}\n${tr(language, 'subjectPrefix')}: ${tr(language, ({ 'General enquiry': 'subjectGeneral', 'Safari planning': 'subjectPlanning', 'Existing booking': 'subjectBooking', Accommodation: 'subjectStay', Other: 'subjectOther' })[form.subject] || 'subjectGeneral')}\n\n${form.message}`;
    const ok = await submit({ name: form.name, email: form.email, whatsapp: form.whatsapp || null, country: form.country, travelers: null, message });
    if (ok) setForm({ name: '', email: '', whatsapp: '', country: 'TZ', subject: 'General enquiry', message: '' });
  };
  return <Frame language={language} onLanguageChange={changeLanguage}>
    <PageHero eyebrow={tr(language, 'contactEyebrow')} title={tr(language, 'contactTitle')} accent={tr(language, 'contactAccent')} lead={tr(language, 'contactLead')} />
    <section className="content-shell contact-layout"><div className="contact-details"><span className="content-kicker">LEONARD TOUR · TANZANIA</span><h2>{tr(language, 'contact')}</h2><a href="mailto:info@keanrich.com"><Mail /> info@keanrich.com</a><a href="tel:+255628890211"><Phone /> +255 628 890 211</a><a href="https://wa.me/255628890211" target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a><p><MapPin /> {tr(language, 'companyLocation')}</p><div className="contact-assurance"><ShieldCheck size={18} /> {tr(language, 'assurance')}</div></div>
      <form className="content-form" onSubmit={onSubmit}><div className="form-grid"><label>{tr(language, 'name')}<input value={form.name} onChange={(e) => set('name', e.target.value)} minLength={2} maxLength={160} required placeholder={tr(language, 'namePlaceholder')} /></label><label>{tr(language, 'email')}<input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required maxLength={255} placeholder={tr(language, 'emailPlaceholder')} /></label><label className="form-wide">{tr(language, 'phone')}<PhoneInput className="content-phone" international defaultCountry="TZ" value={form.whatsapp || undefined} onCountryChange={(c) => set('country', c || '')} onChange={(v) => set('whatsapp', v || '')} placeholder={tr(language, 'phonePlaceholder')} /></label><label className="form-wide">{tr(language, 'subject')}<select value={form.subject} onChange={(e) => set('subject', e.target.value)}><option value="General enquiry">{tr(language, 'subjectGeneral')}</option><option value="Safari planning">{tr(language, 'subjectPlanning')}</option><option value="Existing booking">{tr(language, 'subjectBooking')}</option><option value="Accommodation">{tr(language, 'subjectStay')}</option><option value="Other">{tr(language, 'subjectOther')}</option></select></label><label className="form-wide">{tr(language, 'message')}<textarea rows="5" minLength={10} maxLength={2500} required value={form.message} onChange={(e) => set('message', e.target.value)} placeholder={tr(language, 'messagePlaceholder')} /></label></div>{notice && <div className={`content-notice ${notice.type}`} role="status">{notice.text}</div>}<button className="content-submit" disabled={busy}>{busy ? tr(language, 'sending') : tr(language, 'send')} <Send size={16} /></button></form>
    </section>
  </Frame>;
}

const DESTINATIONS = [{ value: 'Serengeti', key: 'serengeti' }, { value: 'Ngorongoro', key: 'ngorongoro' }, { value: 'Kilimanjaro', key: 'kilimanjaro' }, { value: 'Mount Meru', key: 'destinationMeru' }, { value: 'Zanzibar', key: 'zanzibar' }, { value: 'Pemba', key: 'pemba' }, { value: 'Mafia Island', key: 'destinationMafia' }, { value: 'Tarangire', key: 'tarangire' }, { value: 'Mikumi', key: 'mikumi' }, { value: 'Northern Tanzania', key: 'destinationNorthern' }, { value: 'Tailor-made / not sure', key: 'destinationTailor' }];
export function TripPlannerPage() {
  const [language, changeLanguage] = useSiteLanguage();
  const params = new URLSearchParams(window.location.search);
  const intent = params.get('intent') === 'proposal' ? 'proposal' : 'plan';
  const [packages, setPackages] = useState([]);
  const [country, setCountry] = useState('TZ');
  const [phone, setPhone] = useState('');
  const [ages, setAges] = useState([]);
  const [form, setForm] = useState({ destination: params.get('destination') || '', package_slug: params.get('package') || '', travel_date: '', flexible: true, adults: 2, children: 0, accommodation: '', budget: '', name: '', email: '', special: params.get('stay') ? `Accommodation of interest: ${params.get('stay')}` : '' });
  const { busy, notice, submit, setNotice } = useInquirySubmit(language, tr(language, 'planSuccess'));
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/packages?lang=${language.toLowerCase()}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : []).then((rows) => { if (Array.isArray(rows)) setPackages(rows); }).catch(() => {});
    return () => controller.abort();
  }, [language]);
  const selectedPackage = packages.find((p) => p.slug === form.package_slug);
  const onChildrenChange = (value) => { const count = Math.max(0, Math.min(30, Number(value) || 0)); set('children', count); setAges((old) => Array.from({ length: count }, (_, i) => old[i] ?? '')); };
  const onSubmit = async (event) => {
    event.preventDefault();
    if (phone && !isValidPhoneNumber(phone)) { setNotice({ type: 'error', text: tr(language, 'phoneInvalid') }); return; }
    if (ages.some((age) => age === '' || Number(age) < 0 || Number(age) > 15)) { setNotice({ type: 'error', text: tr(language, 'agesInvalid') }); return; }
    const details = [
      `${tr(language, 'requestType')}: ${intent === 'proposal' ? tr(language, 'proposalRequest') : tr(language, 'planRequest')}`,
      `${tr(language, 'destinationLabel')}: ${form.destination || tr(language, 'openToRecommendations')}`,
      `${tr(language, 'packageOfInterest')}: ${selectedPackage?.title || tr(language, 'notSelected')}`,
      `${tr(language, 'preferredDate')}: ${form.flexible ? tr(language, 'flexibleDates') : (form.travel_date || tr(language, 'notSpecified'))}`,
      `${tr(language, 'travellersLabel')}: ${form.adults} ${tr(language, 'adultsCount')}, ${form.children} ${tr(language, 'childrenCount')}${form.children ? ` (${tr(language, 'agesLabel')}: ${ages.join(', ')})` : ''}`,
      `${tr(language, 'accommodationPreference')}: ${form.accommodation || tr(language, 'notSpecified')}`,
      `${tr(language, 'budgetPerPerson')}: ${form.budget || tr(language, 'toDiscuss')}`,
      `${tr(language, 'specialRequests')}: ${form.special || tr(language, 'noSpecialRequests')}`,
    ].join('\n');
    await submit({ package_slug: form.package_slug || null, name: form.name, email: form.email, country, whatsapp: phone || null, travelers: Number(form.adults) + Number(form.children), message: details });
  };
  return <Frame language={language} onLanguageChange={changeLanguage}>
    <PageHero eyebrow={tr(language, 'plannerEyebrow')} title={intent === 'proposal' ? tr(language, 'plannerProposalTitle') : tr(language, 'plannerTitle')} accent={intent === 'proposal' ? '' : tr(language, 'plannerAccent')} lead={tr(language, 'plannerLead')} />
    <section className="content-shell planner-layout"><div className="planner-intro"><span className="content-kicker">{intent === 'proposal' ? tr(language, 'plannerEyebrow') : tr(language, 'plannerTitle')}</span><h2>{intent === 'proposal' ? tr(language, 'plannerProposalTitle') : tr(language, 'plannerPlanTitle')}</h2><p>{tr(language, 'plannerLead')}</p><ul><li><CheckCircle2 /> {tr(language, 'noPayment')}</li><li><CheckCircle2 /> {tr(language, 'requestToTeam')}</li><li><CheckCircle2 /> {tr(language, 'contactNextSteps')}</li></ul></div>
      <form className="content-form planner-form" onSubmit={onSubmit}><h2>{tr(language, 'plannerPlanTitle')}</h2><div className="form-grid">
        <label>{tr(language, 'destination')}<select required value={form.destination} onChange={(e) => set('destination', e.target.value)}><option value="">{tr(language, 'chooseDestination')}</option>{DESTINATIONS.map((destination) => (<option key={destination.value} value={destination.value}>{tr(language, destination.key)}</option>))}</select></label>
        <label>{tr(language, 'package')}<select value={form.package_slug} onChange={(e) => set('package_slug', e.target.value)}><option value="">{tr(language, 'choosePackage')}</option>{packages.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}</select></label>
        <label>{tr(language, 'dates')}<input type="date" min={new Date().toISOString().slice(0, 10)} value={form.travel_date} disabled={form.flexible} onChange={(e) => set('travel_date', e.target.value)} /></label>
        <label className="checkbox-field"><input type="checkbox" checked={form.flexible} onChange={(e) => set('flexible', e.target.checked)} /> {tr(language, 'flexible')}</label>
        <label>{tr(language, 'adults')}<input type="number" min="1" max="50" required value={form.adults} onChange={(e) => set('adults', e.target.value)} /></label>
        <label>{tr(language, 'children')}<input type="number" min="0" max="30" value={form.children} onChange={(e) => onChildrenChange(e.target.value)} /></label>
        {ages.map((age, index) => <label key={index}>{tr(language, 'childAges')} #{index + 1}<input type="number" min="0" max="15" required value={age} onChange={(e) => setAges((old) => old.map((v, i) => i === index ? e.target.value : v))} /></label>)}
        <label>{tr(language, 'accommodation')}<select value={form.accommodation} onChange={(e) => set('accommodation', e.target.value)}><option value="">{tr(language, 'chooseStay')}</option><option value="Camping">{tr(language, 'campingStay')}</option><option value="Mid-range">{tr(language, 'midStay')}</option><option value="Luxury">{tr(language, 'luxuryStay')}</option><option value="Island resort">{tr(language, 'islandStay')}</option><option value="Flexible">{tr(language, 'tailor')}</option></select></label>
        <label>{tr(language, 'budget')}<select value={form.budget} onChange={(e) => set('budget', e.target.value)}><option value="">—</option><option value="Under USD 1,000">{tr(language, 'budget1')}</option><option value="USD 1,000–2,500">{tr(language, 'budget2')}</option><option value="USD 2,500–5,000">{tr(language, 'budget3')}</option><option value="USD 5,000+">{tr(language, 'budget4')}</option><option value="To be discussed">{tr(language, 'budget5')}</option></select></label>
        <label className="form-wide">{tr(language, 'special')}<textarea rows="3" maxLength="1200" value={form.special} onChange={(e) => set('special', e.target.value)} placeholder={tr(language, 'specialPlaceholder')} /></label>
      </div><div className="planner-contact"><h3>{tr(language, 'contactDetails')}</h3><div className="form-grid"><label>{tr(language, 'name')}<input required minLength="2" maxLength="160" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={tr(language, 'namePlaceholder')} /></label><label>{tr(language, 'email')}<input type="email" required maxLength="255" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder={tr(language, 'emailPlaceholder')} /></label><label className="form-wide">{tr(language, 'phone')}<PhoneInput className="content-phone" international defaultCountry="TZ" value={phone || undefined} onCountryChange={(c) => setCountry(c || '')} onChange={(v) => setPhone(v || '')} placeholder={tr(language, 'phonePlaceholder')} /></label></div></div>
      {notice && <div className={`content-notice ${notice.type}`} role="status">{notice.text}</div>}<button className="content-submit" disabled={busy}>{busy ? tr(language, 'sending') : intent === 'proposal' ? tr(language, 'submitProposal') : tr(language, 'submitPlan')} <Send size={16} /></button><p className="form-disclaimer">{tr(language, 'plannerLead')}</p></form>
    </section>
  </Frame>;
}
