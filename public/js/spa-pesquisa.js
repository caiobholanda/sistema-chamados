'use strict';

// ── Translations ───────────────────────────────────────────────────────────────
const T = {
  'pt-BR': {
    pageTitle:   "Spa L'Occitane — Pesquisa de Satisfação",
    coverTitle:  'Sua <em>experiência</em><br>é especial para nós',
    coverInvite: 'Compartilhe sua experiência conosco e ajude-nos a aprimorar cada momento.',
    btnIniciar:  'Avaliar minha experiência',
    lblHospede:  'Hóspede',
    lblServico:  'Serviço',
    lblTerapeuta:'Terapeuta',
    lblTermino:  'Término',
    msgBloqueada:'Sua pesquisa ainda não está disponível. Aguarde a equipe do Spa.',
    msgNaoReal:  'Esta pesquisa já foi encerrada.',
    countdownLbl:'Tempo restante:',
    surveyTitle: 'Como foi sua experiência?',
    surveySub:   'Suas respostas são confidenciais',
    lblGeral:    'Experiência geral',
    lblTerapeut: 'Terapeuta',
    lblAmbiente: 'Ambiente',
    lblCusto:    'Custo-benefício',
    lblRec:      'Você recomendaria o Spa?',
    lblSim:      'Sim', lblNao: 'Não',
    lblComent:   'Comentários e sugestões',
    placeholder: 'Compartilhe sua opinião…',
    btnEnviar:   'Enviar avaliação',
    expiredTitle:'Tempo esgotado',
    expiredMsg:  'O tempo disponível para responder foi esgotado.',
    successTitle:'Avaliação enviada',
    successBody: 'Agradecemos seu retorno. Suas respostas nos ajudam a aprimorar cada detalhe da sua experiência no Spa.',
    errTimeout:  'O tempo esgotou. Não foi possível enviar.',
    errGeneric:  'Erro ao enviar. Tente novamente.',
  },
  'pt-PT': {
    pageTitle:   "Spa L'Occitane — Inquérito de Satisfação",
    coverTitle:  'A sua <em>experiência</em><br>é especial para nós',
    coverInvite: 'Partilhe a sua experiência connosco e ajude-nos a melhorar cada momento.',
    btnIniciar:  'Avaliar a minha experiência',
    lblHospede:  'Hóspede', lblServico:'Serviço', lblTerapeuta:'Terapeuta', lblTermino:'Término',
    msgBloqueada:'O seu inquérito ainda não está disponível. Aguarde a equipa do Spa.',
    msgNaoReal:  'Este inquérito já foi encerrado.',
    countdownLbl:'Tempo restante:',
    surveyTitle: 'Como foi a sua experiência?', surveySub:'As suas respostas são confidenciais',
    lblGeral:'Experiência geral', lblTerapeut:'Terapeuta', lblAmbiente:'Ambiente', lblCusto:'Custo-benefício',
    lblRec:'Recomendaria o Spa?', lblSim:'Sim', lblNao:'Não',
    lblComent:'Comentários e sugestões', placeholder:'Partilhe a sua opinião…',
    btnEnviar:'Enviar avaliação',
    expiredTitle:'Tempo esgotado', expiredMsg:'O tempo disponível para responder foi esgotado.',
    successTitle:'Avaliação enviada', successBody:'Agradecemos o seu retorno. As suas respostas ajudam-nos a melhorar cada detalhe da experiência no Spa.',
    errTimeout:'O tempo esgotou.', errGeneric:'Erro ao enviar.',
  },
  en: {
    pageTitle:   "Spa L'Occitane — Satisfaction Survey",
    coverTitle:  'Your <em>experience</em><br>matters to us',
    coverInvite: 'Share your experience and help us perfect every moment.',
    btnIniciar:  'Rate my experience',
    lblHospede:  'Guest', lblServico:'Service', lblTerapeuta:'Therapist', lblTermino:'End time',
    msgBloqueada:'Your survey is not yet available. Please wait for the Spa team.',
    msgNaoReal:  'This survey has already been closed.',
    countdownLbl:'Time remaining:',
    surveyTitle: 'How was your experience?', surveySub:'Your answers are confidential',
    lblGeral:'Overall experience', lblTerapeut:'Therapist', lblAmbiente:'Atmosphere', lblCusto:'Value for money',
    lblRec:'Would you recommend the Spa?', lblSim:'Yes', lblNao:'No',
    lblComent:'Comments and suggestions', placeholder:'Share your thoughts…',
    btnEnviar:'Submit',
    expiredTitle:'Time is up', expiredMsg:'The time to respond has expired.',
    successTitle:'Thank you!', successBody:'We appreciate your feedback. Your answers help us improve every detail of your Spa experience.',
    errTimeout:'Time expired. Could not submit.', errGeneric:'Submission error. Please try again.',
  },
  fr: {
    pageTitle:   "Spa L'Occitane — Enquête de satisfaction",
    coverTitle:  'Votre <em>expérience</em><br>nous tient à cœur',
    coverInvite: 'Partagez votre expérience et aidez-nous à perfectionner chaque instant.',
    btnIniciar:  'Évaluer mon expérience',
    lblHospede:  'Client', lblServico:'Soin', lblTerapeuta:'Thérapeute', lblTermino:'Fin du soin',
    msgBloqueada:"Votre enquête n'est pas encore disponible. Veuillez patienter.",
    msgNaoReal:  'Cette enquête a déjà été clôturée.',
    countdownLbl:'Temps restant :',
    surveyTitle: 'Comment s'est passée votre expérience ?', surveySub:'Vos réponses sont confidentielles',
    lblGeral:'Expérience générale', lblTerapeut:'Thérapeute', lblAmbiente:'Ambiance', lblCusto:'Rapport qualité-prix',
    lblRec:'Recommanderiez-vous le Spa ?', lblSim:'Oui', lblNao:'Non',
    lblComent:'Commentaires et suggestions', placeholder:'Partagez votre avis…',
    btnEnviar:'Envoyer',
    expiredTitle:'Temps écoulé', expiredMsg:'Le délai de réponse a expiré.',
    successTitle:'Merci !', successBody:'Nous vous remercions de votre retour. Vos réponses nous aident à améliorer chaque détail de votre expérience.',
    errTimeout:'Temps expiré.', errGeneric:'Erreur lors de l\'envoi.',
  },
  es: {
    pageTitle:   "Spa L'Occitane — Encuesta de satisfacción",
    coverTitle:  'Tu <em>experiencia</em><br>nos importa',
    coverInvite: 'Comparte tu experiencia con nosotros y ayúdanos a perfeccionar cada momento.',
    btnIniciar:  'Calificar mi experiencia',
    lblHospede:  'Huésped', lblServico:'Servicio', lblTerapeuta:'Terapeuta', lblTermino:'Hora de fin',
    msgBloqueada:'Tu encuesta aún no está disponible. Por favor espera al equipo del Spa.',
    msgNaoReal:  'Esta encuesta ya ha sido cerrada.',
    countdownLbl:'Tiempo restante:',
    surveyTitle: '¿Cómo fue tu experiencia?', surveySub:'Tus respuestas son confidenciales',
    lblGeral:'Experiencia general', lblTerapeut:'Terapeuta', lblAmbiente:'Ambiente', lblCusto:'Relación calidad-precio',
    lblRec:'¿Recomendarías el Spa?', lblSim:'Sí', lblNao:'No',
    lblComent:'Comentarios y sugerencias', placeholder:'Comparte tu opinión…',
    btnEnviar:'Enviar',
    expiredTitle:'Tiempo agotado', expiredMsg:'El tiempo para responder ha expirado.',
    successTitle:'¡Gracias!', successBody:'Agradecemos tu opinión. Tus respuestas nos ayudan a perfeccionar cada detalle de tu experiencia en el Spa.',
    errTimeout:'El tiempo se agotó.', errGeneric:'Error al enviar.',
  },
  it: {
    pageTitle:   "Spa L'Occitane — Sondaggio di soddisfazione",
    coverTitle:  'La tua <em>esperienza</em><br>è importante per noi',
    coverInvite: 'Condividi la tua esperienza e aiutaci a migliorare ogni momento.',
    btnIniciar:  'Valuta la mia esperienza',
    lblHospede:  'Ospite', lblServico:'Servizio', lblTerapeuta:'Terapista', lblTermino:'Fine trattamento',
    msgBloqueada:'Il tuo sondaggio non è ancora disponibile. Attendi il team della Spa.',
    msgNaoReal:  'Questo sondaggio è già stato chiuso.',
    countdownLbl:'Tempo rimanente:',
    surveyTitle: "Com'è stata la tua esperienza?", surveySub:'Le tue risposte sono riservate',
    lblGeral:'Esperienza generale', lblTerapeut:'Terapista', lblAmbiente:'Atmosfera', lblCusto:'Rapporto qualità-prezzo',
    lblRec:'Consiglieresti la Spa?', lblSim:'Sì', lblNao:'No',
    lblComent:'Commenti e suggerimenti', placeholder:'Condividi la tua opinione…',
    btnEnviar:'Invia',
    expiredTitle:'Tempo scaduto', expiredMsg:'Il tempo per rispondere è scaduto.',
    successTitle:'Grazie!', successBody:'Grazie per il tuo feedback. Le tue risposte ci aiutano a migliorare ogni dettaglio della tua esperienza alla Spa.',
    errTimeout:'Tempo scaduto.', errGeneric:'Errore durante l\'invio.',
  },
  de: {
    pageTitle:   "Spa L'Occitane — Zufriedenheitsumfrage",
    coverTitle:  'Ihre <em>Erfahrung</em><br>liegt uns am Herzen',
    coverInvite: 'Teilen Sie Ihre Erfahrung mit uns und helfen Sie uns, jeden Moment zu perfektionieren.',
    btnIniciar:  'Meine Erfahrung bewerten',
    lblHospede:  'Gast', lblServico:'Behandlung', lblTerapeuta:'Therapeutin', lblTermino:'Ende der Behandlung',
    msgBloqueada:'Ihre Umfrage ist noch nicht verfügbar. Bitte warten Sie auf das Spa-Team.',
    msgNaoReal:  'Diese Umfrage wurde bereits geschlossen.',
    countdownLbl:'Verbleibende Zeit:',
    surveyTitle: 'Wie war Ihre Erfahrung?', surveySub:'Ihre Antworten sind vertraulich',
    lblGeral:'Gesamterfahrung', lblTerapeut:'Therapeutin', lblAmbiente:'Atmosphäre', lblCusto:'Preis-Leistungs-Verhältnis',
    lblRec:'Würden Sie das Spa empfehlen?', lblSim:'Ja', lblNao:'Nein',
    lblComent:'Kommentare und Vorschläge', placeholder:'Teilen Sie Ihre Meinung…',
    btnEnviar:'Absenden',
    expiredTitle:'Zeit abgelaufen', expiredMsg:'Die Zeit zur Beantwortung ist abgelaufen.',
    successTitle:'Vielen Dank!', successBody:'Wir danken Ihnen für Ihr Feedback. Ihre Antworten helfen uns, jeden Detail Ihres Spa-Erlebnisses zu verbessern.',
    errTimeout:'Zeit abgelaufen.', errGeneric:'Fehler beim Senden.',
  },
};

function detectLang() {
  const nav = navigator.language || 'pt-BR';
  const code = nav.toLowerCase();
  if (code.startsWith('pt-pt')) return 'pt-PT';
  if (code.startsWith('pt'))    return 'pt-BR';
  if (code.startsWith('fr'))    return 'fr';
  if (code.startsWith('es'))    return 'es';
  if (code.startsWith('it'))    return 'it';
  if (code.startsWith('de'))    return 'de';
  if (code.startsWith('en'))    return 'en';
  return 'en';
}

// ── State ──────────────────────────────────────────────────────────────────────
let _token   = null;
let _reserva = null;
let _lang    = 'pt-BR';
let L        = T['pt-BR'];
let _scores  = { nota_geral: 0, nota_terapeuta: 0, nota_ambiente: 0, nota_custo_beneficio: 0 };
let _recom   = null;
let _timer   = null;
let _secsLeft= 0;

function getToken() {
  return new URLSearchParams(location.search).get('t');
}

function fmtDT(iso) {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return d.toLocaleString(_lang || 'pt-BR', { timeZone: 'America/Fortaleza', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ── Apply translations ─────────────────────────────────────────────────────────
function applyLang() {
  L = T[_lang] || T.en;
  document.title                                      = L.pageTitle;
  document.getElementById('html-root').lang           = _lang;
  document.getElementById('cover-title').innerHTML    = L.coverTitle;
  document.getElementById('cover-invite').textContent = L.coverInvite;
  document.getElementById('btn-iniciar').textContent  = L.btnIniciar;
  document.getElementById('countdown-label').textContent = L.countdownLbl;
  document.getElementById('survey-title').textContent = L.surveyTitle;
  document.getElementById('survey-sub').textContent   = L.surveySub;
  document.getElementById('lbl-geral').innerHTML      = L.lblGeral + ' <span class="req">*</span>';
  document.getElementById('lbl-terapeuta').innerHTML  = L.lblTerapeut + ' <span class="req">*</span>';
  document.getElementById('lbl-ambiente').innerHTML   = L.lblAmbiente + ' <span class="req">*</span>';
  document.getElementById('lbl-custo').innerHTML      = L.lblCusto + ' <span class="req">*</span>';
  document.getElementById('lbl-recomendar').innerHTML = L.lblRec + ' <span class="req">*</span>';
  document.getElementById('pill-sim').textContent     = L.lblSim;
  document.getElementById('pill-nao').textContent     = L.lblNao;
  document.getElementById('lbl-comentario').textContent = L.lblComent;
  document.getElementById('survey-comentario').placeholder = L.placeholder;
  document.getElementById('btn-submit').textContent   = L.btnEnviar;
  document.getElementById('success-title').textContent= L.successTitle;
  document.getElementById('success-body').textContent = L.successBody;
  document.getElementById('expired-msg').textContent  = L.expiredMsg;

  if (_reserva) renderCoverInfo();
}

function renderCoverInfo() {
  const rows = [];
  if (_reserva.hospede_nome)  rows.push([L.lblHospede,   _reserva.hospede_nome]);
  if (_reserva.servico)        rows.push([L.lblServico,   _reserva.servico]);
  if (_reserva.terapeuta_nome) rows.push([L.lblTerapeuta, _reserva.terapeuta_nome]);
  if (_reserva.data_termino)   rows.push([L.lblTermino,   fmtDT(_reserva.data_termino)]);

  document.getElementById('cover-info').innerHTML = rows.map(([lbl, val]) => `
    <div class="cover-info-row">
      <span class="cover-info-label">${lbl}</span>
      <span class="cover-info-val">${val}</span>
    </div>
  `).join('');
}

// ── Screens ────────────────────────────────────────────────────────────────────
function showScreen(name) {
  ['cover-screen','survey-screen','expired-screen','success-screen'].forEach(id => {
    document.getElementById(id).style.display = id === name ? '' : 'none';
  });
}

// ── Stars ──────────────────────────────────────────────────────────────────────
function initStars() {
  document.querySelectorAll('.stars').forEach(container => {
    const key  = container.dataset.key;
    const stars = container.querySelectorAll('.star');

    stars.forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt(star.dataset.val, 10);
        _scores[key] = val;
        stars.forEach((s, i) => s.classList.toggle('selected', i < val));
        checkSubmitReady();
      });

      star.addEventListener('mouseenter', () => {
        const val = parseInt(star.dataset.val, 10);
        stars.forEach((s, i) => s.classList.toggle('selected', i < val));
      });
    });

    container.addEventListener('mouseleave', () => {
      const cur = _scores[key] || 0;
      stars.forEach((s, i) => s.classList.toggle('selected', i < cur));
    });
  });
}

// ── Recommend ─────────────────────────────────────────────────────────────────
function selecionarRecomendar(val) {
  _recom = val;
  document.getElementById('pill-sim').classList.toggle('sel', val === 1);
  document.getElementById('pill-nao').classList.toggle('sel', val === 0);
  checkSubmitReady();
}
window.selecionarRecomendar = selecionarRecomendar;

// ── Validate submit ────────────────────────────────────────────────────────────
function checkSubmitReady() {
  const allScored = Object.values(_scores).every(v => v > 0);
  const ready     = allScored && _recom !== null && _secsLeft > 0;
  document.getElementById('btn-submit').disabled = !ready;
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function startCountdown(secsLeft) {
  _secsLeft = secsLeft;
  updateCountdownUI();
  clearInterval(_timer);
  _timer = setInterval(() => {
    _secsLeft--;
    if (_secsLeft <= 0) {
      clearInterval(_timer);
      _secsLeft = 0;
      document.getElementById('btn-submit').disabled = true;
      showScreen('expired-screen');
    } else {
      updateCountdownUI();
      checkSubmitReady();
    }
  }, 1000);
}

function updateCountdownUI() {
  const m = Math.floor(_secsLeft / 60);
  const s = _secsLeft % 60;
  document.getElementById('countdown-num').textContent = `${m}:${String(s).padStart(2,'0')}`;
  const bar = document.getElementById('countdown-bar');
  bar.classList.toggle('urgent', _secsLeft <= 60);
}

// ── API calls ──────────────────────────────────────────────────────────────────
async function fetchEstado() {
  const r = await fetch(`/api/spa/pesquisa?t=${encodeURIComponent(_token)}`);
  if (!r.ok) {
    showScreen('expired-screen');
    return null;
  }
  return r.json();
}

async function iniciarPesquisa() {
  const btn = document.getElementById('btn-iniciar');
  btn.disabled = true;
  btn.textContent = '…';

  const r = await fetch('/api/spa/pesquisa/iniciar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: _token }),
  });
  const d = await r.json();

  if (!r.ok) {
    btn.disabled = false;
    btn.textContent = L.btnIniciar;
    const msg = document.getElementById('cover-status-msg');
    msg.style.display = '';
    msg.textContent = d.erro || L.errGeneric;
    return;
  }

  _reserva.iniciada_em = d.iniciada_em;
  showScreen('survey-screen');
  startCountdown(d.segundos_restantes);
}

async function enviarRespostas() {
  const btn = document.getElementById('btn-submit');
  btn.disabled = true;

  const body = {
    token: _token,
    nota_geral:           _scores.nota_geral,
    nota_terapeuta:       _scores.nota_terapeuta,
    nota_ambiente:        _scores.nota_ambiente,
    nota_custo_beneficio: _scores.nota_custo_beneficio,
    recomendaria:         _recom,
    comentario:           document.getElementById('survey-comentario').value.trim() || null,
  };

  const r = await fetch('/api/spa/pesquisa/responder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json();

  if (!r.ok) {
    if (d.expirado) {
      clearInterval(_timer);
      showScreen('expired-screen');
    } else {
      btn.disabled = false;
      alert(d.erro || L.errGeneric);
    }
    return;
  }

  clearInterval(_timer);
  showScreen('success-screen');
}

// ── Init ───────────────────────────────────────────────────────────────────────
async function init() {
  _token = getToken();
  _lang  = detectLang();
  applyLang();

  if (!_token) {
    showScreen('expired-screen');
    document.getElementById('expired-msg').textContent = 'Link inválido.';
    return;
  }

  const estado = await fetchEstado();
  if (!estado) return;
  _reserva = estado;

  renderCoverInfo();
  showScreen('cover-screen');

  const status = estado.status_pesquisa;

  if (status === 'CONCLUIDA') {
    showScreen('success-screen');
    return;
  }

  if (status === 'NAO_REALIZADA') {
    showScreen('expired-screen');
    document.getElementById('expired-msg').textContent = L.msgNaoReal;
    return;
  }

  if (status === 'BLOQUEADA') {
    const msg = document.getElementById('cover-status-msg');
    msg.style.display = '';
    msg.textContent   = L.msgBloqueada;
    return;
  }

  if (status === 'EM_ANDAMENTO') {
    showScreen('survey-screen');
    startCountdown(estado.segundos_restantes || 0);
    return;
  }

  if (status === 'LIBERADA') {
    document.getElementById('btn-iniciar').disabled = false;
    return;
  }
}

// ── Event listeners ────────────────────────────────────────────────────────────
document.getElementById('btn-iniciar').addEventListener('click', iniciarPesquisa);
document.getElementById('btn-submit').addEventListener('click', enviarRespostas);

initStars();
init();
