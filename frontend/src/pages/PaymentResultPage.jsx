import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, Mail, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import '../package-details.css';
import { Footer, Header } from './Home.jsx';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const COPY = {
  EN: { verifying: 'Verifying your payment', verifyingBody: 'We are checking the payment status securely with the payment provider.', paid: 'Payment received successfully', paidBody: 'Your payment has been verified. Your booking record has been updated.', failed: 'Payment was not completed', failedBody: 'The provider did not confirm this payment. You can try again using the secure checkout.', pending: 'Payment is still being confirmed', pendingBody: 'We have not received a final response yet. Please avoid paying twice while the provider is processing.', missing: 'We need your booking access link', missingBody: 'This browser session does not contain the secure booking token. Please use the booking link from your email or contact our team with your reference.', eyebrow: 'LEONARD TOUR · SECURE CHECKOUT', reference: 'BOOKING REFERENCE', bookingStatus: 'Booking status', received: 'Payment received', balance: 'Balance due', method: 'Payment method', secure: 'Secure verification', email: 'A payment confirmation email will be sent to the email address on your booking.', retry: 'Try payment again', opening: 'Opening secure checkout…', check: 'Check payment status', back: 'Return to Leonard Tour', failedVerify: 'We could not verify this payment yet.', retryFailed: 'A new secure payment session could not be started.', noCheckout: 'The payment provider did not return a checkout link.' },
  SW: { verifying: 'Tunathibitisha malipo yako', verifyingBody: 'Tunakagua hali ya malipo kwa usalama kupitia mtoa huduma wa malipo.', paid: 'Malipo yamepokelewa kikamilifu', paidBody: 'Malipo yako yamethibitishwa na taarifa za booking yako zimesasishwa.', failed: 'Malipo hayajakamilika', failedBody: 'Mtoa huduma hajathibitisha malipo haya. Unaweza kujaribu tena kupitia ukurasa salama wa malipo.', pending: 'Malipo bado yanathibitishwa', pendingBody: 'Bado hatujapata majibu ya mwisho. Tafadhali usilipe mara mbili wakati mtoa huduma anashughulikia malipo.', missing: 'Tunahitaji kiungo chako cha booking', missingBody: 'Kivinjari hiki hakina tokeni salama ya booking. Tumia kiungo cha booking ulichopokea kwa barua pepe au wasiliana nasi kwa kutumia kumbukumbu yako.', eyebrow: 'LEONARD TOUR · MALIPO SALAMA', reference: 'NAMBA YA BOOKING', bookingStatus: 'Hali ya booking', received: 'Malipo yaliyopokelewa', balance: 'Salio linalodaiwa', method: 'Njia ya malipo', secure: 'Uthibitishaji salama', email: 'Ujumbe wa uthibitisho wa malipo utatumwa kwenye barua pepe uliyotumia kuweka booking.', retry: 'Jaribu kulipa tena', opening: 'Inafungua ukurasa salama wa malipo…', check: 'Angalia hali ya malipo', back: 'Rudi Leonard Tour', failedVerify: 'Bado hatujaweza kuthibitisha malipo haya.', retryFailed: 'Imeshindikana kuanzisha kikao kipya cha malipo salama.', noCheckout: 'Mtoa huduma wa malipo hakurudisha kiungo cha malipo.' },
  FR: { verifying: 'Vérification de votre paiement', verifyingBody: 'Nous vérifions en toute sécurité le statut du paiement auprès du prestataire.', paid: 'Paiement reçu avec succès', paidBody: 'Votre paiement a été vérifié et votre réservation mise à jour.', failed: 'Le paiement n’a pas abouti', failedBody: 'Le prestataire n’a pas confirmé ce paiement. Vous pouvez réessayer via le paiement sécurisé.', pending: 'Le paiement est encore en cours de confirmation', pendingBody: 'Nous attendons la réponse finale. Évitez de payer deux fois pendant le traitement.', missing: 'Votre lien d’accès à la réservation est nécessaire', missingBody: 'Cette session ne contient pas le jeton sécurisé. Utilisez le lien reçu par e-mail ou contactez notre équipe avec votre référence.', eyebrow: 'LEONARD TOUR · PAIEMENT SÉCURISÉ', reference: 'RÉFÉRENCE DE RÉSERVATION', bookingStatus: 'État de la réservation', received: 'Paiement reçu', balance: 'Solde dû', method: 'Mode de paiement', secure: 'Vérification sécurisée', email: 'Un e-mail de confirmation sera envoyé à l’adresse utilisée pour la réservation.', retry: 'Réessayer le paiement', opening: 'Ouverture du paiement sécurisé…', check: 'Vérifier le paiement', back: 'Retour à Leonard Tour', failedVerify: 'Nous ne pouvons pas encore vérifier ce paiement.', retryFailed: 'Impossible de démarrer une nouvelle session de paiement.', noCheckout: 'Le prestataire n’a pas fourni de lien de paiement.' },
  ZH: { verifying: '正在验证您的付款', verifyingBody: '我们正在通过支付服务商安全查询付款状态。', paid: '付款已成功收到', paidBody: '您的付款已验证，预订记录已更新。', failed: '付款未完成', failedBody: '支付服务商尚未确认此笔付款。您可以通过安全结账页面重试。', pending: '付款仍在确认中', pendingBody: '我们尚未收到最终结果。处理期间请勿重复付款。', missing: '需要您的预订访问链接', missingBody: '当前浏览器会话中没有安全预订令牌。请使用邮件中的预订链接，或提供参考编号联系我们。', eyebrow: 'LEONARD TOUR · 安全结账', reference: '预订参考编号', bookingStatus: '预订状态', received: '已收款', balance: '待付余额', method: '付款方式', secure: '安全验证', email: '付款确认邮件将发送到您预订时使用的邮箱。', retry: '重新尝试付款', opening: '正在打开安全结账…', check: '检查付款状态', back: '返回 Leonard Tour', failedVerify: '暂时无法验证这笔付款。', retryFailed: '无法启动新的安全付款会话。', noCheckout: '支付服务商未返回结账链接。' },
  KO: { verifying: '결제를 확인하고 있습니다', verifyingBody: '결제 서비스 제공업체를 통해 결제 상태를 안전하게 확인하고 있습니다.', paid: '결제가 정상적으로 접수되었습니다', paidBody: '결제가 확인되었으며 예약 정보가 업데이트되었습니다.', failed: '결제가 완료되지 않았습니다', failedBody: '결제 업체가 결제를 확인하지 못했습니다. 안전한 결제 페이지에서 다시 시도할 수 있습니다.', pending: '결제 확인이 진행 중입니다', pendingBody: '아직 최종 응답을 받지 못했습니다. 처리 중 중복 결제하지 마세요.', missing: '예약 액세스 링크가 필요합니다', missingBody: '이 브라우저 세션에 보안 예약 토큰이 없습니다. 이메일의 예약 링크를 사용하거나 참조 번호로 문의하세요.', eyebrow: 'LEONARD TOUR · 안전 결제', reference: '예약 참조 번호', bookingStatus: '예약 상태', received: '결제 금액', balance: '잔액', method: '결제 방법', secure: '안전 확인', email: '결제 확인 이메일이 예약에 사용한 이메일 주소로 발송됩니다.', retry: '결제 다시 시도', opening: '안전 결제 페이지 여는 중…', check: '결제 상태 확인', back: 'Leonard Tour로 돌아가기', failedVerify: '아직 결제를 확인할 수 없습니다.', retryFailed: '새 보안 결제 세션을 시작할 수 없습니다.', noCheckout: '결제 업체가 체크아웃 링크를 반환하지 않았습니다.' },
};
function tr(language, key) { return COPY[language]?.[key] || COPY.EN[key] || key; }

function money(value, currency = 'USD') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: currency === 'TZS' ? 0 : 2,
  }).format(amount);
}

export default function PaymentResultPage({ reference }) {
  const [language, setLanguage] = useState(() => {
    const saved = (window.localStorage.getItem('mangokili-language') || 'EN').toUpperCase();
    return ['EN', 'SW', 'FR', 'ZH', 'KO'].includes(saved) ? saved : 'EN';
  });
  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem('mangokili-language', nextLanguage);
  };
  const tokenKey = `mangokili-booking-${reference}`;
  const token = useMemo(() => window.sessionStorage.getItem(tokenKey), [tokenKey]);
  const [result, setResult] = useState(null);
  const [state, setState] = useState(token ? 'checking' : 'missing');
  const [attempts, setAttempts] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');

  const checkPayment = useCallback(async (signal) => {
    if (!token) {
      setState('missing');
      return;
    }
    setState((current) => current === 'paid' ? current : 'checking');
    try {
      const response = await fetch(`${API_BASE}/api/bookings/${encodeURIComponent(reference)}/status?refresh=true`, {
        headers: { Accept: 'application/json', 'X-Booking-Token': token },
        signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || tr(language, 'failedVerify'));
      setResult(payload);
      setError('');
      const paidPayments = (payload.payments || []).filter((payment) => payment.status === 'paid');
      const failedPayments = (payload.payments || []).filter((payment) => payment.status === 'failed');
      if (paidPayments.length > 0 && Number(payload.paid) > 0) {
        setState('paid');
      } else if (failedPayments.length > 0 && Number(payload.paid) <= 0) {
        setState('failed');
      } else {
        setState('checking');
      }
      return payload;
    } catch (fetchError) {
      if (fetchError.name !== 'AbortError') {
        setError(fetchError.message);
        setState((current) => current === 'paid' ? current : 'checking');
      }
      return null;
    }
  }, [reference, token]);

  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    let timer;
    let count = 0;
    const poll = async () => {
      const payload = await checkPayment(controller.signal);
      if (controller.signal.aborted) return;
      count += 1;
      setAttempts(count);
      const hasPaid = payload && (payload.payments || []).some((payment) => payment.status === 'paid');
      const hasFailed = payload && (payload.payments || []).some((payment) => payment.status === 'failed');
      if (hasPaid || hasFailed || count >= 15) {
        if (!hasPaid && !hasFailed) setState('pending');
        return;
      }
      timer = window.setTimeout(poll, 4000);
    };
    poll();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [checkPayment, token]);

  const retryPayment = async () => {
    if (!token || !result) return;
    const lastPayment = (result.payments || []).slice(-1)[0];
    const kind = lastPayment?.kind === 'deposit' ? 'deposit' : 'full';
    setRetrying(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/bookings/${encodeURIComponent(reference)}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Booking-Token': token },
        body: JSON.stringify({ kind }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || tr(language, 'retryFailed'));
      if (!payload.redirect_url) throw new Error(tr(language, 'noCheckout'));
      window.location.assign(payload.redirect_url);
    } catch (retryError) {
      setError(retryError.message);
      setRetrying(false);
    }
  };

  const lastPayment = result?.payments?.length ? result.payments[result.payments.length - 1] : null;
  const currency = result?.currency || 'USD';
  const paidAmount = Number(result?.paid || 0);
  const balanceDue = Number(result?.balance_due || 0);

  let heading = tr(language, 'verifying');
  let subheading = tr(language, 'verifyingBody');
  let Icon = Clock3;
  let tone = 'checking';
  if (state === 'paid') {
    heading = tr(language, 'paid'); subheading = tr(language, 'paidBody'); Icon = CheckCircle2; tone = 'success';
  } else if (state === 'failed') {
    heading = tr(language, 'failed'); subheading = tr(language, 'failedBody'); Icon = XCircle; tone = 'failed';
  } else if (state === 'pending') {
    heading = tr(language, 'pending'); subheading = tr(language, 'pendingBody'); Icon = Clock3; tone = 'checking';
  } else if (state === 'missing') {
    heading = tr(language, 'missing'); subheading = tr(language, 'missingBody'); Icon = ShieldCheck; tone = 'checking';
  }

  return (
    <div className="package-details-page payment-result-page">
      <Header language={language} onLanguageChange={changeLanguage} isInteriorPage />
      <main className="payment-result-shell">
        <section className={`payment-result-card ${tone}`} aria-live="polite">
          <span className="payment-result-icon"><Icon size={34} /></span>
          <span className="payment-result-eyebrow">{tr(language, 'eyebrow')}</span>
          <h1>{heading}</h1>
          <p className="payment-result-subheading">{subheading}</p>
          <div className="payment-result-reference"><small>{tr(language, 'reference')}</small><strong>{reference}</strong></div>
          {result && <div className="payment-result-summary">
            <div><span>{tr(language, 'bookingStatus')}</span><strong className="capitalize">{String(result.status || 'pending').replaceAll('_', ' ')}</strong></div>
            <div><span>{tr(language, 'received')}</span><strong>{money(paidAmount, currency)}</strong></div>
            <div><span>{tr(language, 'balance')}</span><strong>{money(balanceDue, currency)}</strong></div>
            {lastPayment?.method && <div><span>{tr(language, 'method')}</span><strong className="capitalize">{String(lastPayment.method).replaceAll('_', ' ')}</strong></div>}
          </div>}
          {state === 'checking' && <div className="payment-result-progress"><span /><small>{tr(language, 'secure')} · {attempts + 1}</small></div>}
          {state === 'paid' && <p className="payment-result-email-note"><Mail size={16} /> {tr(language, 'email')}</p>}
          {state === 'failed' && <button className="details-submit-button payment-result-action" type="button" disabled={retrying} onClick={retryPayment}>{retrying ? tr(language, 'opening') : tr(language, 'retry')} <RefreshCw size={16} /></button>}
          {state === 'pending' && token && <button className="details-submit-button payment-result-action" type="button" onClick={() => { setAttempts(0); setState('checking'); checkPayment(new AbortController().signal); }}>{tr(language, 'check')} <RefreshCw size={16} /></button>}
          {error && <p className="payment-result-error" role="alert">{error}</p>}
          <a href="/" className="payment-result-home"><ArrowLeft size={15} /> {tr(language, 'back')}</a>
        </section>
      </main>
      <Footer language={language} isInteriorPage />
    </div>
  );
}
