import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown,
  ChevronLeft, ChevronRight, Clock3, Compass, CreditCard, Globe2, HelpCircle,
  Mail, MapPin, MessageCircle, Mountain, Phone, ShieldCheck, Star, Users, X,
} from 'lucide-react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Footer, Header } from './Home.jsx';
import '../package-details.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const LANGUAGES = [
  { value: 'EN', label: 'English' },
  { value: 'SW', label: 'Kiswahili' },
  { value: 'FR', label: 'Français' },
  { value: 'ZH', label: '中文' },
  { value: 'KO', label: '한국어' },
];

const WORDS = {
  EN: {
    home: 'Home', safaris: 'Safaris', climbing: 'Mountain Treks', islands: 'Island Escapes', about: 'About Us', contact: 'Contact Us',
    breadcrumb: 'Safari experiences', overview: 'Overview', destinations: 'Destinations covered', itinerary: 'Day by day itinerary',
    pricing: 'Safari pricing', inclusions: 'Price inclusions', exclusions: 'Price exclusions', related: 'You may also like',
    facts: 'Journey at a glance', duration: 'Duration', days: 'days', category: 'Category', experience: 'Experience',
    from: 'From', perPerson: 'per person', adults: 'Adults', children: 'Children', childAge: 'Child age', addChild: 'Add child', remove: 'Remove',
    travelDate: 'Preferred travel date', currency: 'Currency', customerDetails: 'Your details', fullName: 'Full name', email: 'Email address',
    whatsapp: 'WhatsApp number', country: 'Country', notes: 'Special requests (optional)', bookingButton: 'Continue to booking',
    askQuestion: 'Ask a question', bookingTitle: 'Plan this journey', inquiryTitle: 'Ask our safari team',
    inquiryName: 'Your name', inquiryEmail: 'Your email', inquiryWhatsapp: 'WhatsApp (optional)', inquiryMessage: 'How can we help?',
    sendQuestion: 'Send question', quote: 'Your estimated total', adultTotal: 'Adults', childTotal: 'Children', childDiscount: 'Child offer',
    deposit: 'Deposit to start', balance: 'Balance after deposit', estimateNote: 'Indicative estimate. Final child rates and any activity or accommodation charges are subject to the package conditions.',
    perPersonPrice: 'Adult rate per person', loading: 'Loading this journey…', notFound: 'We could not find this safari.', backHome: 'Back to homepage',
    bookingReceived: 'Your booking request is ready', reference: 'Booking reference', paymentChoice: 'Choose how you would like to pay', payDeposit: 'Pay deposit', payFull: 'Pay full amount',
    securePayment: 'Continue to secure payment', paymentNote: 'You will choose an available mobile-money or card option on the secure payment provider page. Your payment is verified by our server.',
    bookingSuccess: 'Your request has been saved. Complete payment to continue. A payment confirmation will be sent after the provider verifies it.',
    questionSent: 'Your question has been received. Our team will get back to you.', requiredAge: 'Enter every child’s age to calculate the family price.',
    itineraryEmpty: 'The itinerary for this journey is being prepared. Please contact our team for details.',
    safe: 'Secure payment', local: 'Local safari experts', tailored: 'Thoughtfully tailored', viewDetails: 'View safari',
    language: 'Language', processing: 'Please wait…', perPersonStart: 'Starting rate per adult',
    sectionJourney: 'THE JOURNEY', sectionDestinations: 'PLACES TO DISCOVER', sectionDayByDay: 'YOUR JOURNEY, DAY BY DAY', sectionTripCosts: 'TRANSPARENT TRIP COSTS', sectionIncluded: 'WHAT IS INCLUDED', sectionExcluded: 'PLAN WITH CLARITY', overviewFallback: 'A carefully planned Tanzania experience, delivered by our local team.', trustLocal: 'Local expertise', trustPersonal: 'Personalised planning', trustClarity: 'Clear trip details', groupSize: 'Group size', currencyLabel: 'Currency', ratePerPerson: 'Rate per person', travellerUnit: 'travellers', destinationLabel: 'DESTINATION', bookingLabel: 'BOOKING', personalAssistance: 'Personal assistance', requestRate: 'Request a quote', tailorMade: 'Tailor-made', sidebarLead: 'Tell us when you would like to travel. Your price updates as you add travellers.', childYears: '0–15 years', chooseAge: 'Select age', year: 'year', years: 'years', liveCalculator: 'LIVE PRICE CALCULATOR', estimateCalculating: 'Calculating your estimate…', child: 'Child', age: 'age', provisionalChild: 'Children’s prices are provisional and need final company confirmation.', namePlaceholder: 'Your full name', emailTitle: 'Enter a valid email address such as name@example.com', phoneHint: '· choose your country first', phonePlaceholder: 'Select country, then enter phone number', notesPlaceholder: 'Tell us about any special requests…', securityCopy: 'Your details are sent securely. No payment is taken until you continue to the payment provider.', inquiryIntro: 'Ask about availability, custom dates, transfers, accommodation or anything else about this journey.', inquirySecurity: 'Your question is saved separately from booking requests.', chooseCountry: 'Choose your country', finalEstimate: 'Final estimates are based on the package rate, group size and the ages of travelling children.'
  },
  SW: {
    home: 'Mwanzo', safaris: 'Safari', climbing: 'Safari za Milimani', islands: 'Mapumziko Visiwani', about: 'Kuhusu Sisi', contact: 'Wasiliana Nasi',
    breadcrumb: 'Safari zetu', overview: 'Muhtasari', destinations: 'Maeneo yatakayotembelewa', itinerary: 'Ratiba ya siku kwa siku',
    pricing: 'Bei za safari', inclusions: 'Vimejumuishwa kwenye bei', exclusions: 'Havijajumuishwa kwenye bei', related: 'Safari nyingine unazoweza kupenda',
    facts: 'Muhtasari wa safari', duration: 'Muda', days: 'siku', category: 'Kundi', experience: 'Aina ya safari',
    from: 'Kuanzia', perPerson: 'kwa mtu', adults: 'Watu wazima', children: 'Watoto', childAge: 'Umri wa mtoto', addChild: 'Ongeza mtoto', remove: 'Ondoa',
    travelDate: 'Tarehe unayopendelea kusafiri', currency: 'Sarafu', customerDetails: 'Taarifa zako', fullName: 'Jina kamili', email: 'Barua pepe',
    whatsapp: 'Namba ya WhatsApp', country: 'Nchi', notes: 'Mahitaji maalumu (si lazima)', bookingButton: 'Endelea kuweka nafasi',
    askQuestion: 'Uliza swali', bookingTitle: 'Panga safari hii', inquiryTitle: 'Uliza timu yetu ya safari',
    inquiryName: 'Jina lako', inquiryEmail: 'Barua pepe yako', inquiryWhatsapp: 'WhatsApp (si lazima)', inquiryMessage: 'Tunaweza kukusaidiaje?',
    sendQuestion: 'Tuma swali', quote: 'Makadirio ya gharama yako', adultTotal: 'Watu wazima', childTotal: 'Watoto', childDiscount: 'Punguzo la watoto',
    deposit: 'Amana ya kuanzia', balance: 'Salio baada ya amana', estimateNote: 'Haya ni makadirio. Bei za mwisho za watoto na gharama za shughuli au malazi zitathibitishwa kulingana na masharti ya package.',
    perPersonPrice: 'Bei ya mtu mzima kwa mtu', loading: 'Inapakia safari…', notFound: 'Safari hii haijapatikana.', backHome: 'Rudi ukurasa wa mwanzo',
    bookingReceived: 'Ombi lako la booking limepokelewa', reference: 'Namba ya booking', paymentChoice: 'Chagua namna unayotaka kulipa', payDeposit: 'Lipa amana', payFull: 'Lipa kiasi chote',
    securePayment: 'Endelea kwenye malipo salama', paymentNote: 'Utachagua njia ya mobile money au kadi kwenye ukurasa salama wa mtoa huduma wa malipo. Mfumo wetu utathibitisha malipo.',
    bookingSuccess: 'Ombi lako limehifadhiwa. Kamilisha malipo ili kuendelea. Ujumbe wa uthibitisho utatumwa baada ya mtoa huduma kuthibitisha malipo.',
    questionSent: 'Swali lako limepokelewa. Timu yetu itakujibu.', requiredAge: 'Weka umri wa kila mtoto ili kupata makadirio sahihi ya familia.',
    itineraryEmpty: 'Ratiba ya safari hii inaandaliwa. Tafadhali wasiliana na timu yetu kwa maelezo.',
    safe: 'Malipo salama', local: 'Wataalamu wa safari wa ndani', tailored: 'Safari iliyopangwa kwa umakini', viewDetails: 'Ona safari',
    language: 'Lugha', processing: 'Tafadhali subiri…', perPersonStart: 'Bei ya kuanzia kwa mtu mzima',
    sectionJourney: 'KUHUSU SAFARI', sectionDestinations: 'MAENEO YA KUTEMBELEA', sectionDayByDay: 'RATIBA YA SAFARI SIKU KWA SIKU', sectionTripCosts: 'GHARAMA ZA SAFARI KWA UWAZI', sectionIncluded: 'KILICHOJUMUISHWA', sectionExcluded: 'PANGA KWA UHAKIKA', overviewFallback: 'Safari ya Tanzania iliyopangwa kwa umakini na timu yetu ya ndani.', trustLocal: 'Ujuzi wa wenyeji', trustPersonal: 'Mipango binafsi', trustClarity: 'Maelezo ya safari yaliyo wazi', groupSize: 'Idadi ya kundi', currencyLabel: 'Sarafu', ratePerPerson: 'Bei kwa mtu', travellerUnit: 'wasafiri', destinationLabel: 'ENEO', bookingLabel: 'BOOKING', personalAssistance: 'Msaada binafsi', requestRate: 'Omba bei', tailorMade: 'Safari maalumu', sidebarLead: 'Tuambie tarehe unazopendelea. Bei itabadilika unapoongeza wasafiri.', childYears: 'Miaka 0–15', chooseAge: 'Chagua umri', year: 'mwaka', years: 'miaka', liveCalculator: 'KIKOKOTOO CHA BEI YA SASA', estimateCalculating: 'Tunafanya makadirio ya gharama…', child: 'Mtoto', age: 'umri', provisionalChild: 'Bei za watoto ni za makadirio na zinahitaji kuthibitishwa na kampuni.', namePlaceholder: 'Jina lako kamili', emailTitle: 'Weka barua pepe sahihi, mfano jina@example.com', phoneHint: '· chagua nchi kwanza', phonePlaceholder: 'Chagua nchi kisha weka namba ya simu', notesPlaceholder: 'Tuambie mahitaji yoyote maalumu…', securityCopy: 'Taarifa zako zitatumwa kwa usalama. Hakuna malipo yatakayochukuliwa mpaka uendelee kwa mtoa huduma wa malipo.', inquiryIntro: 'Uliza kuhusu upatikanaji, tarehe maalumu, usafiri, malazi au jambo lolote kuhusu safari hii.', inquirySecurity: 'Swali lako linahifadhiwa kando na maombi ya booking.', chooseCountry: 'Chagua nchi yako', finalEstimate: 'Makadirio ya mwisho hutegemea bei ya package, idadi ya kundi na umri wa watoto wanaosafiri.'
  },
  FR: {
    home: 'Accueil', safaris: 'Safaris', climbing: 'Randonnées en montagne', islands: 'Séjours insulaires', about: 'À propos', contact: 'Contact',
    breadcrumb: 'Expériences safari', overview: 'Présentation', destinations: 'Destinations visitées', itinerary: 'Programme jour par jour', pricing: 'Tarifs du safari', inclusions: 'Inclus dans le prix', exclusions: 'Non inclus', related: 'Vous aimerez aussi', facts: 'Aperçu du voyage', duration: 'Durée', days: 'jours', category: 'Catégorie', experience: 'Expérience',
    from: 'À partir de', perPerson: 'par personne', adults: 'Adultes', children: 'Enfants', childAge: 'Âge de l’enfant', addChild: 'Ajouter un enfant', remove: 'Retirer', travelDate: 'Date de voyage souhaitée', currency: 'Devise', customerDetails: 'Vos coordonnées', fullName: 'Nom complet', email: 'Adresse e-mail', whatsapp: 'Numéro WhatsApp', country: 'Pays', notes: 'Demandes particulières (facultatif)', bookingButton: 'Continuer la réservation', askQuestion: 'Poser une question', bookingTitle: 'Planifier ce voyage', inquiryTitle: 'Contacter notre équipe safari', inquiryName: 'Votre nom', inquiryEmail: 'Votre e-mail', inquiryWhatsapp: 'WhatsApp (facultatif)', inquiryMessage: 'Comment pouvons-nous vous aider ?', sendQuestion: 'Envoyer la question', quote: 'Estimation totale', adultTotal: 'Adultes', childTotal: 'Enfants', childDiscount: 'Avantage enfant', deposit: 'Acompte initial', balance: 'Solde après acompte', estimateNote: 'Estimation indicative. Les tarifs définitifs pour les enfants et les frais d’activités ou d’hébergement dépendent des conditions du forfait.', perPersonPrice: 'Tarif adulte par personne', loading: 'Chargement du voyage…', notFound: 'Ce safari est introuvable.', backHome: 'Retour à l’accueil', bookingReceived: 'Votre demande de réservation est prête', reference: 'Référence de réservation', paymentChoice: 'Choisissez votre mode de paiement', payDeposit: 'Payer l’acompte', payFull: 'Payer la totalité', securePayment: 'Continuer vers le paiement sécurisé', paymentNote: 'Choisissez une option mobile money ou carte sur la page sécurisée du prestataire. Le paiement sera vérifié par notre serveur.', bookingSuccess: 'Votre demande a été enregistrée. Effectuez le paiement pour continuer. Un e-mail de confirmation sera envoyé après vérification.', questionSent: 'Votre question a été reçue. Notre équipe vous répondra.', requiredAge: 'Indiquez l’âge de chaque enfant pour calculer le tarif familial.', itineraryEmpty: 'Le programme de ce voyage est en préparation. Contactez notre équipe pour plus de détails.', safe: 'Paiement sécurisé', local: 'Experts safari locaux', tailored: 'Voyage soigneusement personnalisé', viewDetails: 'Voir le safari', language: 'Langue', processing: 'Veuillez patienter…', perPersonStart: 'Tarif de départ par adulte',
    sectionJourney: 'LE VOYAGE', sectionDestinations: 'LIEUX À DÉCOUVRIR', sectionDayByDay: 'VOTRE VOYAGE, JOUR APRÈS JOUR', sectionTripCosts: 'TARIFS EN TOUTE TRANSPARENCE', sectionIncluded: 'CE QUI EST INCLUS', sectionExcluded: 'PLANIFIEZ EN TOUTE CLARTÉ', overviewFallback: 'Une expérience tanzanienne soigneusement préparée par notre équipe locale.', trustLocal: 'Expertise locale', trustPersonal: 'Organisation personnalisée', trustClarity: 'Détails transparents', groupSize: 'Taille du groupe', currencyLabel: 'Devise', ratePerPerson: 'Prix par personne', travellerUnit: 'voyageurs', destinationLabel: 'DESTINATION', bookingLabel: 'RÉSERVATION', personalAssistance: 'Accompagnement personnalisé', requestRate: 'Demander un devis', tailorMade: 'Sur mesure', sidebarLead: 'Indiquez votre date de voyage. Le prix se met à jour selon le nombre de voyageurs.', childYears: '0 à 15 ans', chooseAge: 'Choisir l’âge', year: 'an', years: 'ans', liveCalculator: 'CALCUL DU PRIX EN DIRECT', estimateCalculating: 'Calcul de votre estimation…', child: 'Enfant', age: 'âge', provisionalChild: 'Les tarifs enfants sont provisoires et doivent être confirmés par notre équipe.', namePlaceholder: 'Votre nom complet', emailTitle: 'Saisissez une adresse e-mail valide, par exemple nom@example.com', phoneHint: '· choisissez d’abord le pays', phonePlaceholder: 'Choisissez le pays puis saisissez le numéro', notesPlaceholder: 'Indiquez vos demandes particulières…', securityCopy: 'Vos informations sont envoyées en toute sécurité. Aucun paiement ne sera effectué avant votre accès au prestataire.', inquiryIntro: 'Posez vos questions sur les disponibilités, les dates, les transferts, l’hébergement ou ce voyage.', inquirySecurity: 'Votre question est enregistrée séparément des demandes de réservation.', chooseCountry: 'Choisissez votre pays', finalEstimate: 'Le devis final dépend du tarif du circuit, de la taille du groupe et de l’âge des enfants.'
  },
  ZH: {
    home: '首页', safaris: '野生动物 safari', climbing: '登山之旅', islands: '海岛度假', about: '关于我们', contact: '联系我们',
    breadcrumb: 'Safari 体验', overview: '行程概览', destinations: '游览目的地', itinerary: '每日行程', pricing: 'Safari 价格', inclusions: '费用包含', exclusions: '费用不含', related: '您可能还喜欢', facts: '行程速览', duration: '时长', days: '天', category: '类别', experience: '体验',
    from: '起价', perPerson: '每人', adults: '成人', children: '儿童', childAge: '儿童年龄', addChild: '添加儿童', remove: '移除', travelDate: '计划出行日期', currency: '货币', customerDetails: '您的信息', fullName: '姓名', email: '电子邮箱', whatsapp: 'WhatsApp 电话', country: '国家', notes: '特别要求（选填）', bookingButton: '继续预订', askQuestion: '咨询问题', bookingTitle: '规划此行程', inquiryTitle: '咨询我们的 safari 团队', inquiryName: '您的姓名', inquiryEmail: '您的邮箱', inquiryWhatsapp: 'WhatsApp（选填）', inquiryMessage: '我们可以如何帮助您？', sendQuestion: '发送咨询', quote: '预计总价', adultTotal: '成人', childTotal: '儿童', childDiscount: '儿童优惠', deposit: '预付定金', balance: '定金后的余额', estimateNote: '此价格为估算。儿童最终价格以及活动或住宿费用以套餐条款为准。', perPersonPrice: '成人每人价格', loading: '正在加载行程…', notFound: '未找到此 safari。', backHome: '返回首页', bookingReceived: '您的预订申请已准备好', reference: '预订编号', paymentChoice: '请选择付款方式', payDeposit: '支付定金', payFull: '支付全款', securePayment: '前往安全支付', paymentNote: '您将在支付服务商的安全页面选择可用的移动支付或银行卡方式。我们的服务器将验证付款。', bookingSuccess: '您的申请已保存。请完成付款以继续。服务商确认后，我们会发送付款确认邮件。', questionSent: '我们已收到您的问题，团队会回复您。', requiredAge: '请填写每位儿童的年龄，以计算家庭价格。', itineraryEmpty: '此行程安排正在准备中，请联系我们获取详情。', safe: '安全支付', local: '当地 safari 专家', tailored: '精心定制', viewDetails: '查看 safari', language: '语言', processing: '请稍候…', perPersonStart: '成人起价',
    sectionJourney: '旅程介绍', sectionDestinations: '探索地点', sectionDayByDay: '每日行程安排', sectionTripCosts: '透明的旅行费用', sectionIncluded: '费用包含', sectionExcluded: '清晰规划', overviewFallback: '由我们的当地团队精心安排的坦桑尼亚体验。', trustLocal: '当地专业知识', trustPersonal: '个性化规划', trustClarity: '清晰的行程信息', groupSize: '团队人数', currencyLabel: '货币', ratePerPerson: '每人价格', travellerUnit: '位旅客', destinationLabel: '目的地', bookingLabel: '预订', personalAssistance: '专属协助', requestRate: '询价', tailorMade: '定制行程', sidebarLead: '告诉我们您的出行日期。增加旅客人数后，价格会自动更新。', childYears: '0–15 岁', chooseAge: '选择年龄', year: '岁', years: '岁', liveCalculator: '实时价格计算', estimateCalculating: '正在计算预计费用…', child: '儿童', age: '年龄', provisionalChild: '儿童价格为暂估价格，需由公司最终确认。', namePlaceholder: '您的姓名', emailTitle: '请输入有效邮箱，例如 name@example.com', phoneHint: '· 请先选择国家', phonePlaceholder: '先选择国家，再输入电话号码', notesPlaceholder: '请告诉我们您的特别要求…', securityCopy: '您的信息将安全发送。只有进入支付服务商页面后才会进行付款。', inquiryIntro: '欢迎咨询此行程的日期、空房、接送、住宿或其他相关事项。', inquirySecurity: '您的咨询会与预订申请分开保存。', chooseCountry: '选择国家', finalEstimate: '最终费用根据套餐价格、团队人数和随行儿童的年龄计算。'
  },
  KO: {
    home: '홈', safaris: '사파리', climbing: '산악 트레킹', islands: '섬 휴양', about: '회사 소개', contact: '문의하기',
    breadcrumb: '사파리 경험', overview: '여행 개요', destinations: '방문 목적지', itinerary: '일자별 일정', pricing: '사파리 요금', inclusions: '요금 포함 사항', exclusions: '요금 불포함 사항', related: '함께 보면 좋은 여행', facts: '여행 한눈에 보기', duration: '기간', days: '일', category: '분류', experience: '경험',
    from: '시작가', perPerson: '1인 기준', adults: '성인', children: '아동', childAge: '아동 나이', addChild: '아동 추가', remove: '삭제', travelDate: '희망 여행 날짜', currency: '통화', customerDetails: '고객 정보', fullName: '성명', email: '이메일 주소', whatsapp: 'WhatsApp 번호', country: '국가', notes: '특별 요청 (선택)', bookingButton: '예약 계속하기', askQuestion: '질문하기', bookingTitle: '이 여행 계획하기', inquiryTitle: '사파리 팀에 문의하기', inquiryName: '이름', inquiryEmail: '이메일', inquiryWhatsapp: 'WhatsApp (선택)', inquiryMessage: '무엇을 도와드릴까요?', sendQuestion: '질문 보내기', quote: '예상 총액', adultTotal: '성인', childTotal: '아동', childDiscount: '아동 할인', deposit: '예약금', balance: '예약금 납부 후 잔액', estimateNote: '예상 금액입니다. 최종 아동 요금과 활동 또는 숙박 비용은 패키지 조건에 따라 달라집니다.', perPersonPrice: '성인 1인 요금', loading: '여행 정보를 불러오는 중…', notFound: '해당 사파리를 찾을 수 없습니다.', backHome: '홈페이지로 돌아가기', bookingReceived: '예약 요청이 준비되었습니다', reference: '예약 참조 번호', paymentChoice: '결제 방법 선택', payDeposit: '예약금 결제', payFull: '전액 결제', securePayment: '안전 결제로 이동', paymentNote: '결제 업체의 보안 페이지에서 이용 가능한 모바일 결제 또는 카드를 선택할 수 있습니다. 결제는 서버에서 확인됩니다.', bookingSuccess: '요청이 저장되었습니다. 계속하려면 결제를 완료하세요. 결제 업체 확인 후 이메일을 보내드립니다.', questionSent: '질문이 접수되었습니다. 담당 팀이 연락드리겠습니다.', requiredAge: '가족 요금 계산을 위해 모든 아동의 나이를 입력하세요.', itineraryEmpty: '여행 일정이 준비 중입니다. 자세한 내용은 문의해 주세요.', safe: '안전한 결제', local: '현지 사파리 전문가', tailored: '세심한 맞춤 여행', viewDetails: '사파리 보기', language: '언어', processing: '잠시만 기다려 주세요…', perPersonStart: '성인 1인 시작 요금',
    sectionJourney: '여행 소개', sectionDestinations: '방문할 장소', sectionDayByDay: '날짜별 여행 일정', sectionTripCosts: '투명한 여행 비용', sectionIncluded: '포함 사항', sectionExcluded: '명확한 여행 계획', overviewFallback: '현지 여행팀이 세심하게 준비한 탄자니아 여행 경험입니다.', trustLocal: '현지 전문성', trustPersonal: '맞춤 일정 계획', trustClarity: '명확한 여행 정보', groupSize: '그룹 인원', currencyLabel: '통화', ratePerPerson: '1인 요금', travellerUnit: '명', destinationLabel: '목적지', bookingLabel: '예약', personalAssistance: '개별 지원', requestRate: '견적 문의', tailorMade: '맞춤형 여행', sidebarLead: '희망 여행 날짜를 알려주세요. 여행자 수를 추가하면 가격이 업데이트됩니다.', childYears: '0–15세', chooseAge: '나이 선택', year: '세', years: '세', liveCalculator: '실시간 요금 계산기', estimateCalculating: '예상 금액 계산 중…', child: '아동', age: '나이', provisionalChild: '아동 요금은 예상 금액이며 회사의 최종 확인이 필요합니다.', namePlaceholder: '성명', emailTitle: 'name@example.com 형식의 유효한 이메일 주소를 입력하세요', phoneHint: '· 먼저 국가를 선택하세요', phonePlaceholder: '국가 선택 후 전화번호를 입력하세요', notesPlaceholder: '특별 요청 사항을 알려주세요…', securityCopy: '정보는 안전하게 전송됩니다. 결제 서비스 페이지로 이동하기 전에는 결제가 진행되지 않습니다.', inquiryIntro: '여행 가능 날짜, 교통편, 숙박 등 이 여행에 관해 문의해 주세요.', inquirySecurity: '문의 내용은 예약 요청과 별도로 저장됩니다.', chooseCountry: '국가 선택', finalEstimate: '최종 견적은 패키지 요금, 그룹 인원 및 동반 아동의 나이를 기준으로 계산됩니다.'
  },
};


function text(language, key) {
  return WORDS[language]?.[key] || WORDS.EN[key] || key;
}

function todayLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function money(value, currency = 'USD') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: currency === 'TZS' ? 0 : 2,
  }).format(amount);
}

function packageImageSource(image) {
  if (!image || typeof image !== 'string') return null;
  const value = image.trim().replaceAll('\\', '/');
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/images/')) return value;
  if (value.startsWith('images/')) return `/${value}`;
  if (value.startsWith('/media/')) return `${API_BASE}${value}`;
  if (value.startsWith('/')) return `${API_BASE}${value}`;
  return `${API_BASE}/media/${value.replace(/^\/+/, '')}`;
}

const DETAIL_GALLERY_FALLBACKS = {
  safari: [
    'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1800&q=88',
    'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=1100&q=85',
    'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1100&q=85',
  ],
  climbing: [
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=88',
    'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1100&q=85',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1100&q=85',
  ],
  beach: [
    'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=88',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1100&q=85',
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1100&q=85',
  ],
};
const MIGRATION_GALLERY_FALLBACKS = [
  'https://images.pexels.com/photos/12339600/pexels-photo-12339600.jpeg?cs=srgb&dl=pexels-garycohen-12339600.jpg&fm=jpg',
  'https://upload.wikimedia.org/wikipedia/commons/3/3b/Wildebeest_crossing_the_riverbank_during_the_Great_Migration%2C_Serengeti_National_Park.jpg',
  'https://images.pexels.com/photos/33650573/pexels-photo-33650573.jpeg?auto=compress&cs=tinysrgb&w=1600',
];
function packageGalleryFallbacks(pkg) {
  const marker = `${pkg?.type || ''} ${pkg?.slug || ''} ${pkg?.title || ''}`.toLowerCase();
  if (marker.includes('migration')) return MIGRATION_GALLERY_FALLBACKS;
  const category = String(pkg?.category || 'safari').toLowerCase();
  if (category === 'climbing' || marker.includes('kilimanjaro')) return DETAIL_GALLERY_FALLBACKS.climbing;
  if (category === 'beach' || /zanzibar|pemba|mafia|island/.test(marker)) return DETAIL_GALLERY_FALLBACKS.beach;
  return DETAIL_GALLERY_FALLBACKS.safari;
}

function SafeImage({ src, fallback, alt, className, ...props }) {
  const [imageState, setImageState] = useState(src ? 'primary' : fallback ? 'fallback' : 'broken');
  useEffect(() => setImageState(src ? 'primary' : fallback ? 'fallback' : 'broken'), [src, fallback]);

  const currentSource = imageState === 'primary' ? src : imageState === 'fallback' ? fallback : '';
  if (!currentSource) {
    return <span className={`${className || ''} details-image-unavailable`} aria-hidden="true" />;
  }

  const handleError = () => {
    if (imageState === 'primary' && fallback && fallback !== src) {
      setImageState('fallback');
    } else {
      setImageState('broken');
    }
  };

  return (
    <img
      className={className}
      src={currentSource}
      alt={imageState === 'primary' ? alt : ''}
      onError={handleError}
      {...props}
    />
  );
}

function PhotoGallery({ pkg, language }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const fallbackSet = packageGalleryFallbacks(pkg);
  const images = useMemo(() => {
    const raw = [pkg?.image, ...(Array.isArray(pkg?.gallery_images) ? pkg.gallery_images : [])].filter(Boolean);
    const resolved = [...new Set(raw.map((image) => String(image).trim()))].map(packageImageSource).filter(Boolean);
    const items = resolved.slice(0, 3).map((src, index) => ({ src, fallback: fallbackSet[index % fallbackSet.length] }));
    for (const fallback of fallbackSet) {
      if (items.length >= 3) break;
      if (!items.some((item) => item.src === fallback)) items.push({ src: fallback, fallback: '' });
    }
    return items.slice(0, 5);
  }, [pkg?.image, pkg?.gallery_images, fallbackSet]);

  useEffect(() => { setActiveIndex(0); setLightbox(false); }, [pkg?.slug]);
  useEffect(() => {
    if (!lightbox) return undefined;
    const close = (event) => { if (event.key === 'Escape') setLightbox(false); };
    window.addEventListener('keydown', close);
    document.body.classList.add('details-lightbox-open');
    return () => { window.removeEventListener('keydown', close); document.body.classList.remove('details-lightbox-open'); };
  }, [lightbox]);

  const step = (direction) => {
    if (!images.length) return;
    setActiveIndex((current) => (current + direction + images.length) % images.length);
  };

  if (!images.length) {
    return <div className="details-gallery details-gallery-empty"><div className="details-gallery-main details-gallery-placeholder"><Compass size={34} /><span>{language === 'SW' ? 'Picha za safari hazijapatikana' : language === 'FR' ? 'Photos du voyage indisponibles' : language === 'ZH' ? '暂无行程照片' : language === 'KO' ? '여행 사진을 사용할 수 없습니다' : 'Safari photos unavailable'}</span><strong>{pkg.title}</strong></div></div>;
  }

  const imageAt = (offset) => images[(activeIndex + offset) % images.length];
  return (
    <>
      <div className="details-gallery">
        <button className="details-gallery-main" type="button" onClick={() => setLightbox(true)} aria-label="Enlarge safari photograph">
          <SafeImage src={imageAt(0).src} fallback={imageAt(0).fallback} alt={pkg.title} />
          <span className="details-gallery-shade" />
          <span className="details-gallery-title">{pkg.title}</span>
          <span className="details-gallery-zoom">View gallery <ArrowUpRight size={15} /></span>
        </button>
        {images.length > 1 && <button className="details-gallery-side" type="button" onClick={() => { step(1); setLightbox(true); }} aria-label="View next photograph">
          <SafeImage src={imageAt(1).src} fallback={imageAt(1).fallback} alt={`${pkg.title} gallery photograph 2`} />
          <span><ArrowUpRight size={17} /></span>
        </button>}
        {images.length > 2 && <button className="details-gallery-side details-gallery-side-last" type="button" onClick={() => { setActiveIndex((activeIndex + 2) % images.length); setLightbox(true); }} aria-label="View another photograph">
          <SafeImage src={imageAt(2).src} fallback={imageAt(2).fallback} alt={`${pkg.title} gallery photograph 3`} />
          <span><ArrowUpRight size={17} /></span>
        </button>}
        {images.length > 1 && <div className="details-gallery-controls">
          <button type="button" onClick={() => step(-1)} aria-label="Previous photograph"><ChevronLeft size={18} /></button>
          <span>{String(activeIndex + 1).padStart(2, '0')} <i /> {String(images.length).padStart(2, '0')}</span>
          <button type="button" onClick={() => step(1)} aria-label="Next photograph"><ChevronRight size={18} /></button>
        </div>}
      </div>
      {lightbox && <div className="details-image-lightbox" role="presentation" onClick={() => setLightbox(false)}>
        <button className="details-lightbox-close" type="button" onClick={() => setLightbox(false)} aria-label="Close gallery"><X /></button>
        {images.length > 1 && <button className="details-lightbox-prev" type="button" onClick={(event) => { event.stopPropagation(); step(-1); }} aria-label="Previous"><ChevronLeft /></button>}
        <SafeImage src={imageAt(0).src} fallback={imageAt(0).fallback} alt={pkg.title} onClick={(event) => event.stopPropagation()} />
        {images.length > 1 && <button className="details-lightbox-next" type="button" onClick={(event) => { event.stopPropagation(); step(1); }} aria-label="Next"><ChevronRight /></button>}
        <span className="details-lightbox-count">{activeIndex + 1} / {images.length}</span>
      </div>}
    </>
  );
}

function InfoPill({ icon: Icon, label, value }) {
  return <div className="details-info-pill"><span className="details-info-icon"><Icon size={17} /></span><span><small>{label}</small><strong>{value}</strong></span></div>;
}

function SectionTitle({ eyebrow, title }) {
  return <div className="details-section-title"><span>{eyebrow}</span><h2>{title}</h2><i /></div>;
}

function PackageContent({ pkg, language, priceOptions }) {
  const days = Array.isArray(pkg.itinerary) ? pkg.itinerary : [];
  const [openDay, setOpenDay] = useState(days.length ? 0 : -1);
  const destinations = Array.isArray(pkg.destinations) ? pkg.destinations : [];
  const inclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
  const exclusions = Array.isArray(pkg.exclusions) ? pkg.exclusions : [];
  return (
    <div className="details-content-column">
      <section className="details-content-section">
        <SectionTitle eyebrow={text(language, 'sectionJourney')} title={text(language, 'overview')} />
        <p className="details-overview">{pkg.overview || pkg.route || text(language, 'overviewFallback')}</p>
        <div className="details-trust-row"><span><Check size={15} /> {text(language, 'trustLocal')}</span><span><Check size={15} /> {text(language, 'trustPersonal')}</span><span><Check size={15} /> {text(language, 'trustClarity')}</span></div>
      </section>

      {destinations.length > 0 && <section className="details-content-section">
        <SectionTitle eyebrow={text(language, 'sectionDestinations')} title={text(language, 'destinations')} />
        <div className="details-destination-chips">{destinations.map((destination) => <span key={destination}><MapPin size={14} /> {destination}</span>)}</div>
      </section>}

      <section className="details-content-section">
        <SectionTitle eyebrow={text(language, 'sectionDayByDay')} title={text(language, 'itinerary')} />
        {days.length ? <div className="details-itinerary-list">{days.map((day, index) => {
          const isOpen = openDay === index;
          return (
            <article className={`details-itinerary-item ${isOpen ? 'is-open' : ''}`} key={`${day.day}-${index}`}>
              <button type="button" className="details-itinerary-trigger" aria-expanded={isOpen} onClick={() => setOpenDay((current) => current === index ? -1 : index)}>
                <span className="details-day-number">DAY {String(day.day || index + 1).padStart(2, '0')}</span>
                <strong>{day.title || `Day ${index + 1}`}</strong>
                <ChevronDown size={18} />
              </button>
              <div className={`details-itinerary-panel ${isOpen ? 'is-open' : ''}`} aria-hidden={!isOpen}>
                <div className="details-itinerary-panel-inner"><p>{day.description}</p></div>
              </div>
            </article>
          );
        })}</div> : <p className="details-muted-note">{text(language, 'itineraryEmpty')}</p>}
      </section>

      <section className="details-content-section">
        <SectionTitle eyebrow={text(language, 'sectionTripCosts')} title={text(language, 'pricing')} />
        <div className="details-pricing-intro"><div><small>{text(language, 'perPersonStart')}</small><strong>{pkg.price_from?.USD ? money(pkg.price_from.USD, 'USD') : pkg.price_from?.TZS ? money(pkg.price_from.TZS, 'TZS') : text(language, 'requestRate')}</strong><span>{text(language, 'perPerson')}</span></div><p>{text(language, 'finalEstimate')}</p></div>
        {priceOptions?.length > 0 && <div className="details-rate-table-wrap"><table className="details-rate-table"><thead><tr><th>{text(language, 'groupSize')}</th><th>{text(language, 'currencyLabel')}</th><th>{text(language, 'ratePerPerson')}</th></tr></thead><tbody>{priceOptions.map((row, index) => <tr key={index}><td>{row.pax_min}{row.pax_max ? `–${row.pax_max}` : '+'} {text(language, 'travellerUnit')}</td><td>{row.currency}</td><td>{money(row.amount_per_person, row.currency)}</td></tr>)}</tbody></table></div>}
      </section>

      <div className="details-inclusions-grid">
        <section className="details-inclusions-card included"><SectionTitle eyebrow={text(language, 'sectionIncluded')} title={text(language, 'inclusions')} /><ul>{inclusions.map((item, index) => <li key={index}><Check size={16} />{item}</li>)}</ul></section>
        <section className="details-inclusions-card excluded"><SectionTitle eyebrow={text(language, 'sectionExcluded')} title={text(language, 'exclusions')} /><ul>{exclusions.map((item, index) => <li key={index}><X size={16} />{item}</li>)}</ul></section>
      </div>
    </div>
  );
}

function BookingSidebar({ pkg, language, currencyOptions }) {
  const [mode, setMode] = useState('booking');
  const [adults, setAdults] = useState(1);
  const [childAges, setChildAges] = useState([]);
  const [currency, setCurrency] = useState(currencyOptions.includes('USD') ? 'USD' : currencyOptions[0]);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [booking, setBooking] = useState(null);
  const [paymentKind, setPaymentKind] = useState('deposit');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [gatewayReady, setGatewayReady] = useState(false);
  const [gatewayChecked, setGatewayChecked] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    travel_date: '', customer_name: '', customer_email: '', customer_phone: '', country: 'TZ', notes: '',
  });
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', country: 'TZ', whatsapp: '', message: '' });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/payments/availability`, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || 'Payment availability could not be checked.');
        setGatewayReady(Boolean(data.configured));
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setGatewayReady(false);
      })
      .finally(() => {
        if (!controller.signal.aborted) setGatewayChecked(true);
      });
    return () => controller.abort();
  }, []);

  const agesReady = childAges.every((age) => age !== '' && Number.isInteger(Number(age)));
  const quotePayload = useMemo(() => ({
    package_slug: pkg.slug,
    adults,
    children_ages: childAges.map(Number),
    currency,
  }), [pkg.slug, adults, childAges, currency]);

  useEffect(() => {
    setCurrency(currencyOptions.includes('USD') ? 'USD' : currencyOptions[0]);
  }, [pkg.slug, currencyOptions.join('|')]);

  useEffect(() => {
    if (childAges.length && !agesReady) {
      setQuote(null);
      setQuoteError(text(language, 'requiredAge'));
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError('');
      try {
        const response = await fetch(`${API_BASE}/api/pricing/quote`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(quotePayload), signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.detail || 'We could not calculate this package price.');
        setQuote(result);
      } catch (error) {
        if (error.name !== 'AbortError') { setQuote(null); setQuoteError(error.message); }
      } finally {
        if (!controller.signal.aborted) setQuoteLoading(false);
      }
    }, 280);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [quotePayload, language, agesReady, childAges.length]);

  const updateBooking = (event) => setBookingForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateInquiry = (event) => setInquiryForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const addChild = () => { if (childAges.length < 10) setChildAges((current) => [...current, '5']); };
  const removeChild = (index) => setChildAges((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const updateChildAge = (index, value) => setChildAges((current) => current.map((age, itemIndex) => itemIndex === index ? value : age));

  const submitBooking = async (event) => {
    event.preventDefault();
    setNotice(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(bookingForm.customer_email.trim())) {
      setNotice({ type: 'error', message: 'Please enter a valid email address, for example name@example.com.' });
      return;
    }
    if (!bookingForm.customer_phone || !isValidPhoneNumber(bookingForm.customer_phone)) {
      setNotice({ type: 'error', message: 'Please select your country and enter a valid WhatsApp phone number.' });
      return;
    }
    if (!quote || quoteLoading || (childAges.length && !agesReady)) {
      setNotice({ type: 'error', message: quoteError || 'Please wait for the price calculation to finish.' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        package_slug: pkg.slug,
        travel_date: bookingForm.travel_date,
        adults,
        children: childAges.length,
        children_ages: childAges.map(Number),
        currency,
        customer_name: bookingForm.customer_name.trim(),
        customer_email: bookingForm.customer_email.trim(),
        customer_phone: bookingForm.customer_phone.trim() || null,
        country: bookingForm.country || null,
        language: language.toLowerCase(),
        notes: bookingForm.notes.trim() || null,
      };
      const response = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || 'We could not create your booking. Please try again.');
      sessionStorage.setItem(`mangokili-booking-${result.reference}`, result.access_token);
      setBooking(result);
      setNotice({ type: 'success', message: text(language, 'bookingSuccess') });
    } catch (error) {
      setNotice({ type: 'error', message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const startPayment = async () => {
    if (!booking) return;
    setPaymentLoading(true);
    setNotice(null);
    try {
      const token = sessionStorage.getItem(`mangokili-booking-${booking.reference}`);
      const response = await fetch(`${API_BASE}/api/bookings/${booking.reference}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Booking-Token': token || '' },
        body: JSON.stringify({ kind: paymentKind }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || 'Secure checkout could not be started.');
      if (!result.redirect_url) throw new Error('The payment provider did not return a checkout link.');
      window.location.assign(result.redirect_url);
    } catch (error) {
      setNotice({ type: 'error', message: error.message });
      setPaymentLoading(false);
    }
  };

  const submitInquiry = async (event) => {
    event.preventDefault();
    setNotice(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(inquiryForm.email.trim())) {
      setNotice({ type: 'error', message: 'Please enter a valid email address, for example name@example.com.' });
      return;
    }
    if (inquiryForm.whatsapp && !isValidPhoneNumber(inquiryForm.whatsapp)) {
      setNotice({ type: 'error', message: 'Please select your country and enter a valid WhatsApp phone number.' });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/inquiries`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...inquiryForm, whatsapp: inquiryForm.whatsapp.trim() || null, package_slug: pkg.slug, travelers: adults + childAges.length, language: language.toLowerCase() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || 'Your question could not be sent. Please try again.');
      setInquiryForm({ name: '', email: '', country: '', whatsapp: '', message: '' });
      setNotice({ type: 'success', message: result.message || text(language, 'questionSent') });
    } catch (error) {
      setNotice({ type: 'error', message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="details-sidebar" id="booking-panel">
      <div className="details-sidebar-head"><span>{text(language, 'sectionJourney')}</span><h2>{text(language, 'bookingTitle')}</h2><p>{text(language, 'sidebarLead')}</p></div>
      <div className="details-starting-price"><div><small>{text(language, 'from')} · {text(language, 'perPerson')}</small><strong>{pkg.price_from?.USD ? money(pkg.price_from.USD, 'USD') : pkg.price_from?.TZS ? money(pkg.price_from.TZS, 'TZS') : text(language, 'requestRate')}</strong></div><span><Star size={13} fill="currentColor" /> {text(language, 'tailorMade')}</span></div>
      <div className="details-form-tabs"><button type="button" className={mode === 'booking' ? 'active' : ''} onClick={() => { setMode('booking'); setNotice(null); }}>{text(language, 'bookingButton')}</button><button type="button" className={mode === 'inquiry' ? 'active' : ''} onClick={() => { setMode('inquiry'); setNotice(null); }}>{text(language, 'askQuestion')}</button></div>

      {booking ? (
        <div className="details-booking-confirmation">
          <span className="details-confirm-icon"><Check size={22} /></span>
          <h3>{text(language, 'bookingReceived')}</h3>
          <p>{text(language, 'bookingSuccess')}</p>
          <div className="details-reference-box"><small>{text(language, 'reference')}</small><strong>{booking.reference}</strong></div>
          <div className="details-payment-choice"><h4>{text(language, 'paymentChoice')}</h4>
            <label><input type="radio" name="payment-kind" value="deposit" checked={paymentKind === 'deposit'} onChange={() => setPaymentKind('deposit')} /><span><strong>{text(language, 'payDeposit')}</strong><small>{money(booking.deposit, booking.currency)}</small></span></label>
            <label><input type="radio" name="payment-kind" value="full" checked={paymentKind === 'full'} onChange={() => setPaymentKind('full')} /><span><strong>{text(language, 'payFull')}</strong><small>{money(booking.total, booking.currency)}</small></span></label>
            <div className="details-payment-methods" aria-label="Payment methods available through Pesapal checkout">
              <span className="details-payment-method visa">VISA</span>
              <span className="details-payment-method mastercard"><i /><i /> Mastercard</span>
              <span className="details-payment-method mpesa">Vodacom M-Pesa</span>
              <span className="details-payment-method airtel">Airtel Money</span>
            </div>
            {!gatewayReady && gatewayChecked && <p className="details-gateway-unavailable" role="status">Online payments are not active yet. Please contact our safari team while we finish connecting the company payment account.</p>}
            {!gatewayChecked && <p className="details-payment-note">Checking secure payment availability…</p>}
            <button type="button" className="details-submit-button" onClick={startPayment} disabled={paymentLoading || !gatewayChecked || !gatewayReady}>{paymentLoading ? text(language, 'processing') : text(language, 'securePayment')} <ArrowRight size={16} /></button>
            <p className="details-payment-note"><ShieldCheck size={15} /> Choose an available option on Pesapal’s secure checkout page. Visa, Mastercard, Vodacom M-Pesa and Airtel Money depend on activation for the company merchant account. Leonard Tour never asks for your card PIN, CVV or mobile-money PIN.</p>
          </div>
        </div>
      ) : mode === 'booking' ? (
        <form className="details-booking-form" onSubmit={submitBooking}>
          <div className="details-field"><label htmlFor="travel_date"><CalendarDays size={14} /> {text(language, 'travelDate')}</label><input id="travel_date" type="date" name="travel_date" min={todayLocal()} required value={bookingForm.travel_date} onChange={updateBooking} /></div>
          <div className="details-traveller-grid">
            <div className="details-field"><label htmlFor="adult_count"><Users size={14} /> {text(language, 'adults')}</label><input id="adult_count" type="number" min="1" max="30" value={adults} onChange={(event) => setAdults(Math.max(1, Math.min(30, Number(event.target.value) || 1)))} /></div>
            <div className="details-field"><label htmlFor="currency"><Globe2 size={14} /> {text(language, 'currency')}</label><select id="currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>{currencyOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></div>
          </div>
          <div className="details-children-heading"><span>{text(language, 'children')} <small>{text(language, 'childYears')}</small></span><button type="button" onClick={addChild} disabled={childAges.length >= 10}>+ {text(language, 'addChild')}</button></div>
          {childAges.map((age, index) => <div className="details-child-row" key={index}><label>{text(language, 'childAge')} {index + 1}</label><select value={age} onChange={(event) => updateChildAge(index, event.target.value)} required><option value="">{text(language, 'chooseAge')}</option>{Array.from({ length: 16 }, (_, value) => <option value={value} key={value}>{value} {value === 1 ? text(language, 'year') : text(language, 'years')}</option>)}</select><button type="button" onClick={() => removeChild(index)} aria-label={`Remove child ${index + 1}`}><X size={15} /></button></div>)}

          <div className="details-quote-card" aria-live="polite">
            <div className="details-quote-head"><span>{text(language, 'quote')}</span><small>{quoteLoading ? text(language, 'processing') : text(language, 'liveCalculator')}</small></div>
            {quote ? <>
              <div className="details-quote-line"><span>{text(language, 'adultTotal')} · {adults}</span><strong>{money(quote.adults_total, currency)}</strong></div>
              {childAges.length > 0 && <div className="details-quote-line"><span>{text(language, 'childTotal')} · {childAges.length}</span><strong>{money(quote.children_total, currency)}</strong></div>}
              {quote.children?.map((child) => <div className="details-quote-line details-quote-child" key={child.number}><span>{text(language, 'child')} {child.number} · {text(language, 'age')} {child.age} ({Math.round(Number(child.factor) * 100)}%)</span><strong>{money(child.amount, currency)}</strong></div>)}
              {Number(quote.child_discount_total) > 0 && <div className="details-quote-line discount"><span>{text(language, 'childDiscount')}</span><strong>−{money(quote.child_discount_total, currency)}</strong></div>}
              <div className="details-quote-total"><span>{text(language, 'quote')}</span><strong>{money(quote.total, currency)}</strong></div>
              <div className="details-quote-deposit"><span>{text(language, 'deposit')}</span><strong>{money(quote.deposit, currency)}</strong></div>
            </> : <p className="details-quote-error">{quoteError || text(language, 'estimateCalculating')}</p>}
            <p className="details-estimate-note">{text(language, 'estimateNote')}{quote?.requires_manual_confirmation ? ` ${text(language, 'provisionalChild')}` : ''}</p>
          </div>

          <div className="details-form-divider"><span>{text(language, 'customerDetails')}</span></div>
          <div className="details-field"><label htmlFor="customer_name">{text(language, 'fullName')}</label><input id="customer_name" name="customer_name" autoComplete="name" placeholder={text(language, 'namePlaceholder')} minLength="2" maxLength="160" required value={bookingForm.customer_name} onChange={updateBooking} /></div>
          <div className="details-field"><label htmlFor="customer_email">{text(language, 'email')}</label><input id="customer_email" type="email" name="customer_email" autoComplete="email" inputMode="email" spellCheck={false} pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}" title={text(language, 'emailTitle')} placeholder="name@example.com" required value={bookingForm.customer_email} onChange={updateBooking} /></div>
          <div className="details-field"><label htmlFor="customer_phone">{text(language, 'whatsapp')} <span className="details-field-hint">{text(language, 'phoneHint')}</span></label><PhoneInput id="customer_phone" className="details-phone-input" defaultCountry="TZ" international countryCallingCodeEditable={false} countrySelectProps={{ 'aria-label': 'Choose your country' }} autoComplete="tel" inputMode="tel" placeholder={text(language, 'phonePlaceholder')} value={bookingForm.customer_phone || undefined} onCountryChange={(country) => setBookingForm((current) => ({ ...current, country: country || '' }))} onChange={(value) => setBookingForm((current) => ({ ...current, customer_phone: value || '' }))} /></div>
          <div className="details-field"><label htmlFor="booking_notes">{text(language, 'notes')}</label><textarea id="booking_notes" name="notes" rows="3" placeholder={text(language, 'notesPlaceholder')} value={bookingForm.notes} onChange={updateBooking} /></div>
          {notice && <div className={`details-form-notice ${notice.type}`} role="status">{notice.message}</div>}
          <button className="details-submit-button" type="submit" disabled={submitting || quoteLoading || !quote}>{submitting ? text(language, 'processing') : text(language, 'bookingButton')} <ArrowRight size={16} /></button>
          <p className="details-security-copy"><ShieldCheck size={14} /> {text(language, 'securityCopy')}</p>
        </form>
      ) : (
        <form className="details-booking-form" onSubmit={submitInquiry}>
          <p className="details-inquiry-intro">{text(language, 'inquiryIntro')}</p>
          <div className="details-field"><label htmlFor="inquiry_name">{text(language, 'inquiryName')}</label><input id="inquiry_name" name="name" minLength="2" maxLength="160" required value={inquiryForm.name} onChange={updateInquiry} /></div>
          <div className="details-field"><label htmlFor="inquiry_email">{text(language, 'inquiryEmail')}</label><input id="inquiry_email" type="email" name="email" autoComplete="email" inputMode="email" spellCheck={false} pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}" title="Enter a valid email address such as name@example.com" placeholder="name@example.com" required value={inquiryForm.email} onChange={updateInquiry} /></div>
          <div className="details-field"><label htmlFor="inquiry_whatsapp">{text(language, 'inquiryWhatsapp')} <span className="details-field-hint">· choose your country first</span></label><PhoneInput id="inquiry_whatsapp" className="details-phone-input" defaultCountry="TZ" international countryCallingCodeEditable={false} countrySelectProps={{ 'aria-label': 'Choose your country' }} inputMode="tel" placeholder="Select country, then enter phone number" value={inquiryForm.whatsapp || undefined} onCountryChange={(country) => setInquiryForm((current) => ({ ...current, country: country || '' }))} onChange={(value) => setInquiryForm((current) => ({ ...current, whatsapp: value || '' }))} /></div>
          <div className="details-field"><label htmlFor="inquiry_message">{text(language, 'inquiryMessage')}</label><textarea id="inquiry_message" name="message" rows="5" minLength="10" maxLength="3000" required value={inquiryForm.message} onChange={updateInquiry} /></div>
          {notice && <div className={`details-form-notice ${notice.type}`} role="status">{notice.message}</div>}
          <button className="details-submit-button" type="submit" disabled={submitting}>{submitting ? text(language, 'processing') : text(language, 'sendQuestion')} <ArrowRight size={16} /></button>
          <p className="details-security-copy"><Mail size={14} /> {text(language, 'inquirySecurity')}</p>
        </form>
      )}
      <div className="details-sidebar-assurance"><span><ShieldCheck size={17} /> {text(language, 'safe')}</span><span><Compass size={17} /> {text(language, 'local')}</span></div>
    </aside>
  );
}

function RelatedJourneys({ items, language }) {
  if (!items.length) return null;
  return <section className="details-related-section"><div className="details-related-heading"><div><span>KEEP EXPLORING</span><h2>{text(language, 'related')}</h2></div><a href="/#packages">Explore all journeys <ArrowUpRight size={16} /></a></div><div className="details-related-grid">{items.slice(0, 3).map((item) => (
    <a className="details-related-card" href={`/packages/${item.slug}`} key={item.slug}><SafeImage src={packageImageSource(item.image)} fallback={packageGalleryFallbacks(item)[0]} alt={item.title} loading="lazy" /><span className="details-related-card-body"><small>{item.days} DAYS · {item.category?.toUpperCase()}</small><strong>{item.title}</strong><span>View journey <ArrowRight size={14} /></span></span></a>
  ))}</div></section>;
}

export default function PackageDetailsPage({ slug }) {
  const [language, setLanguage] = useState(() => (window.localStorage.getItem('mangokili-language') || 'EN').toUpperCase());
  const [pkg, setPkg] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');

  const changeLanguage = (next) => {
    setLanguage(next);
    window.localStorage.setItem('mangokili-language', next);
    document.documentElement.lang = next.toLowerCase();
  };

  useEffect(() => {
    const controller = new AbortController();
    const lang = language.toLowerCase();
    setLoading(true); setNotFound(false); setLoadError(''); setPkg(null);
    fetch(`${API_BASE}/api/packages/${encodeURIComponent(slug)}?lang=${lang}`, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (response.status === 404) { setNotFound(true); return null; }
        if (!response.ok) throw new Error(data.detail || 'Unable to load safari details.');
        return data;
      })
      .then((data) => { if (data) setPkg(data); })
      .catch((error) => { if (error.name !== 'AbortError') setLoadError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug, language]);

  useEffect(() => {
    if (!pkg?.category) return undefined;
    const controller = new AbortController();
    fetch(`${API_BASE}/api/packages?lang=${language.toLowerCase()}&category=${encodeURIComponent(pkg.category)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setRelated(Array.isArray(data) ? data.filter((item) => item.slug !== pkg.slug) : []))
      .catch(() => setRelated([]));
    return () => controller.abort();
  }, [pkg?.category, pkg?.slug, language]);

  useEffect(() => { document.documentElement.lang = language.toLowerCase(); }, [language]);

  if (loading) return <div className="package-details-page"><Header language={language} onLanguageChange={changeLanguage} isInteriorPage /><div className="details-loading-screen"><div className="details-loading-mark"><Mountain size={28} /></div><span>{text(language, 'loading')}</span></div><Footer language={language} isInteriorPage /></div>;
  if (notFound || !pkg) return <div className="package-details-page"><Header language={language} onLanguageChange={changeLanguage} isInteriorPage /><main className="details-error-screen"><Mountain size={38} /><h1>{text(language, 'notFound')}</h1><p>{loadError || 'The requested journey may be unavailable or unpublished.'}</p><a href="/" className="details-back-home"><ArrowLeft size={16} /> {text(language, 'backHome')}</a></main><Footer language={language} isInteriorPage /></div>;

  const priceOptions = Array.isArray(pkg.pricing_options) ? pkg.pricing_options : [];
  const availableCurrencies = new Set(priceOptions.map((row) => row.currency));
  if (pkg.price_from?.USD) availableCurrencies.add('USD');
  if (pkg.price_from?.TZS) availableCurrencies.add('TZS');
  const currencyOptions = ['USD', 'TZS'].filter((currency) => availableCurrencies.has(currency));
  if (!currencyOptions.length) currencyOptions.push('USD');
  const categoryName = pkg.category === 'climbing' ? 'Mountain Trek' : pkg.category === 'beach' ? 'Island Escape' : 'Wildlife Safari';

  return (
    <div className="package-details-page">
      <Header language={language} onLanguageChange={changeLanguage} isInteriorPage />
      <main>
        <div className="details-breadcrumb"><a href="/">{text(language, 'home')}</a><ChevronRight size={13} /><a href="/#packages">{text(language, 'breadcrumb')}</a><ChevronRight size={13} /><span>{pkg.title}</span></div>
        <section className="details-hero-wrap"><div className="details-page-shell"><PhotoGallery pkg={pkg} language={language} />
          <div className="details-title-row"><div><span className="details-eyebrow">{categoryName.toUpperCase()} · {pkg.type?.replaceAll('_', ' ').toUpperCase()}</span><h1>{pkg.title}</h1><p>{pkg.route}</p></div><div className="details-title-price"><small>{text(language, 'from')}</small><strong>{pkg.price_from?.USD ? money(pkg.price_from.USD, 'USD') : pkg.price_from?.TZS ? money(pkg.price_from.TZS, 'TZS') : 'Request a quote'}</strong><span>{text(language, 'perPerson')}</span></div></div>
          <div className="details-info-strip"><InfoPill icon={Clock3} label={text(language, 'duration')} value={`${pkg.days} ${text(language, 'days')}`} /><InfoPill icon={Compass} label={text(language, 'category')} value={categoryName} /><InfoPill icon={MapPin} label={text(language, 'destinationLabel')} value={pkg.destinations?.[0] || pkg.route || 'Tanzania'} /><InfoPill icon={ShieldCheck} label={text(language, 'bookingLabel')} value={text(language, 'personalAssistance')} /></div>
        </div></section>
        <section className="details-main-section"><div className="details-page-shell details-main-grid">
          <PackageContent pkg={pkg} language={language} priceOptions={priceOptions} />
          <BookingSidebar key={pkg.slug} pkg={pkg} language={language} currencyOptions={currencyOptions} />
        </div></section>
        <div className="details-page-shell"><RelatedJourneys items={related} language={language} /></div>
      </main>
      <Footer language={language} isInteriorPage />
      <a className="details-whatsapp-float" href="https://wa.me/255628890211" target="_blank" rel="noreferrer" aria-label="Chat with Leonard Tour on WhatsApp"><MessageCircle size={24} /></a>
    </div>
  );
}
