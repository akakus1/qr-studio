/**
 * promo.js — QR Promo Design Pack
 * ─────────────────────────────────────────────────────────────
 * Pricing:  $10 Basic | $15 Recommended | $20 Premium (USD)
 *
 * Flow:
 *  1. Form → POST /api/generate-copy (Claude, server-side)
 *  2. 8 canvas designs rendered with watermark
 *  3. User selects + edits copy/colour
 *  4. Stripe payment link → redirect back with session_id
 *  5. POST /api/verify-payment → signed download token
 *  6. Watermarks removed → PDF (300 DPI, 3mm bleed) + PNG
 * ─────────────────────────────────────────────────────────────
 */

/* ── Stripe Payment Links (USD) ─────────────────────────── */
const STRIPE_LINKS = {
  basic:       'https://buy.stripe.com/6oU28q0OD4sq41rfBj77O04',   // $10
  recommended: 'https://buy.stripe.com/7sYcN48h5e309lL3SB77O03',   // $15 ← MAIN
  premium:     'https://buy.stripe.com/14A3cu40PaQOcxXdtb77O06',   // $20
};

/* ── Print sizes (mm) ───────────────────────────────────── */
const SIZES = {
  a6:      { w: 105, h: 148, bleed: 3 },
  a5:      { w: 148, h: 210, bleed: 3 },
  '10x15': { w: 100, h: 150, bleed: 3 },
  cardoor: { w: 300, h: 400, bleed: 5 },
};
const PX_PER_MM = 2.2; // preview scale

/* ── Colour palettes ────────────────────────────────────── */
const PALETTES = [
  { id:'midnight', name:'Midnight Gold',  bg:'#0D0D14', accent:'#D4AF37', text:'#F0EFE8', sub:'#7A7A8A' },
  { id:'carbon',   name:'Carbon',         bg:'#111111', accent:'#FFFFFF', text:'#FFFFFF', sub:'#999999' },
  { id:'navy',     name:'Navy & Gold',    bg:'#0A1628', accent:'#D4AF37', text:'#FFFFFF', sub:'#8899BB' },
  { id:'forest',   name:'Forest',         bg:'#0D1F16', accent:'#4CAF80', text:'#F0F4F2', sub:'#7A9A84' },
  { id:'crimson',  name:'Crimson',        bg:'#1A0A0A', accent:'#E05555', text:'#F4EEEE', sub:'#9A7070' },
  { id:'purple',   name:'Purple Pro',     bg:'#0E0A1F', accent:'#635BFF', text:'#F0EEF8', sub:'#807AAA' },
  { id:'white',    name:'Ice White',      bg:'#FFFFFF', accent:'#1A1A2E', text:'#1A1A2E', sub:'#666680' },
  { id:'cream',    name:'Warm Cream',     bg:'#FAF6EF', accent:'#8B6914', text:'#2A200A', sub:'#7A6644' },
];

/* ── Translations ───────────────────────────────────────── */
const TR = {
  page_title:       { en:'QR Promo Design Pack — QR Studio',           ar:'حزمة تصاميم QR الترويجية' },
  back:             { en:'Back to QR Generator',                       ar:'العودة إلى منشئ QR' },
  pro_badge:        { en:'QR Promo Design Pack',                       ar:'حزمة تصاميم QR الترويجية' },
  h1_line1:         { en:'Create Stunning',                            ar:'أنشئ تصاميم' },
  h1_line2:         { en:'QR Business Designs',                        ar:'ترويجية مذهلة' },
  h1_line3:         { en:'in Seconds',                                 ar:'في ثوانٍ' },
  subtitle:         { en:'Turn your QR code into a premium marketing tool — AI generates print-ready flyers, car signs, and business cards instantly.',
                      ar:'حوّل رمز QR إلى أداة تسويقية احترافية — الذكاء الاصطناعي يُنشئ تصاميم جاهزة للطباعة فوراً.' },
  step1:            { en:'Business Info',  ar:'بيانات العمل' },
  step2:            { en:'Preferences',    ar:'التفضيلات' },
  step3:            { en:'Designs',        ar:'التصاميم' },
  step4:            { en:'Download',       ar:'التحميل' },
  qr_label:         { en:'Your QR Content',ar:'محتوى رمز QR' },
  qr_edit:          { en:'Edit ↗',         ar:'تعديل ↗' },
  biz_details:      { en:'Business Details',ar:'تفاصيل العمل' },
  biz_desc:         { en:'Fields marked * are required.',ar:'الحقول المعلّمة بـ * إلزامية.' },
  f_name:           { en:'Business Name',  ar:'اسم العمل' },
  f_industry:       { en:'Industry',       ar:'القطاع' },
  f_phone:          { en:'Phone Number',   ar:'رقم الهاتف' },
  f_whatsapp:       { en:'WhatsApp Number',ar:'رقم واتساب' },
  f_website:        { en:'Website',        ar:'الموقع الإلكتروني' },
  f_address:        { en:'Address',        ar:'العنوان' },
  f_social:         { en:'Social Media Handle',ar:'حساب التواصل' },
  f_tagline:        { en:'Custom Tagline', ar:'شعار مخصص' },
  f_logo:           { en:'Business Logo (optional)',ar:'شعار العمل (اختياري)' },
  upload_click:     { en:'Click to upload',ar:'انقر للرفع' },
  upload_or:        { en:'or drag & drop', ar:'أو اسحب وأفلت' },
  prefs:            { en:'Design Preferences',ar:'تفضيلات التصميم' },
  prefs_desc:       { en:'Guide the AI to generate designs that match your brand and goals.',ar:'ساعد الذكاء الاصطناعي في اختيار الأسلوب المناسب.' },
  goal_label:       { en:'Campaign Goal',  ar:'هدف الحملة' },
  style_label:      { en:'Design Style',   ar:'أسلوب التصميم' },
  lang_label:       { en:'Design Language',ar:'لغة التصميم' },
  size_label:       { en:'Print Size',     ar:'حجم الطباعة' },
  goal_calls:       { en:'Get Calls',      ar:'استقبال مكالمات' },
  goal_calls_s:     { en:'Drive phone inquiries',ar:'استقطاب استفسارات' },
  goal_wa:          { en:'Get WhatsApp',   ar:'رسائل واتساب' },
  goal_wa_s:        { en:'Direct messaging',ar:'مراسلة مباشرة' },
  goal_book:        { en:'Get Bookings',   ar:'حجوزات' },
  goal_book_s:      { en:'Appointments',   ar:'مواعيد وحجوزات' },
  goal_web:         { en:'Website Visits', ar:'زيارات الموقع' },
  goal_web_s:       { en:'Drive traffic',  ar:'توجيه الزوار' },
  s_modern:         { en:'Modern',         ar:'عصري' },
  s_modern_s:       { en:'Clean, contemporary',ar:'نظيف ومعاصر' },
  s_bold:           { en:'Bold',           ar:'جريء' },
  s_bold_s:         { en:'High impact',    ar:'تأثير قوي' },
  s_luxury:         { en:'Luxury',         ar:'فاخر' },
  s_luxury_s:       { en:'Premium, elegant',ar:'راقٍ وأنيق' },
  s_minimal:        { en:'Minimal',        ar:'بسيط' },
  s_minimal_s:      { en:'Less is more',   ar:'الأقل هو الأكثر' },
  l_en:             { en:'English',        ar:'الإنجليزية' },
  l_ar:             { en:'Arabic',         ar:'العربية' },
  l_both:           { en:'Bilingual',      ar:'ثنائي اللغة' },
  sz_car:           { en:'Car Door',       ar:'باب السيارة' },
  btn_generate:     { en:'Generate AI Designs',ar:'إنشاء تصاميم بالذكاء الاصطناعي' },
  results_title:    { en:'Your Designs',   ar:'تصاميمك' },
  select_hint:      { en:'Select a design to customise and unlock',ar:'اختر تصميماً للمعاينة' },
  edit_title:       { en:'Customise Selected Design',ar:'تخصيص التصميم المختار' },
  edit_headline:    { en:'Headline',       ar:'العنوان الرئيسي' },
  edit_cta:         { en:'CTA Text',       ar:'نص الدعوة للعمل' },
  edit_sub:         { en:'Sub-copy',       ar:'النص الثانوي' },
  edit_colour:      { en:'Colour Theme',   ar:'نظام الألوان' },
  btn_apply:        { en:'Apply Changes',  ar:'تطبيق التغييرات' },
  pricing_eyebrow:  { en:'Unlock Your Print-Ready Files',ar:'افتح ملفاتك الجاهزة للطباعة' },
  pricing_title:    { en:'Download High-Resolution PDF',ar:'تحميل PDF عالي الدقة' },
  pricing_subtitle: { en:'One-time payment. Instant download. No subscription ever.',ar:'دفعة واحدة. تحميل فوري. بدون اشتراك.' },
  tier_billing:     { en:'One-time · No subscription',ar:'دفعة واحدة · بدون اشتراك' },
  popular_badge:    { en:'Most Popular',   ar:'الأكثر طلباً' },
  tier_basic_name:  { en:'Basic',          ar:'أساسي' },
  basic_f1:         { en:'3 AI design ideas',ar:'٣ تصاميم AI' },
  basic_f2:         { en:'PNG preview download',ar:'تحميل PNG' },
  basic_f3:         { en:'Standard quality',ar:'جودة قياسية' },
  basic_f4:         { en:'Instant delivery',ar:'تسليم فوري' },
  tier_basic_cta:   { en:'Get My Design',  ar:'احصل على تصميمي' },
  tier_rec_name:    { en:'Recommended',    ar:'موصى به' },
  rec_f1:           { en:'8 AI-generated designs',ar:'٨ تصاميم AI' },
  rec_f2:           { en:'Print-ready PDF at 300 DPI',ar:'PDF بدقة 300 DPI' },
  rec_f3:           { en:'PNG high-resolution download',ar:'PNG عالي الدقة' },
  rec_f4:           { en:'3mm bleed + crop marks',ar:'هامش 3mm وعلامات قص' },
  rec_f5:           { en:'Best value',     ar:'أفضل قيمة' },
  tier_rec_cta:     { en:'Unlock Designs — $15',ar:'افتح التصاميم — $15' },
  tier_prem_name:   { en:'Premium',        ar:'بريميوم' },
  prem_f1:          { en:'Everything in Recommended',ar:'كل ما في الموصى به' },
  prem_f2:          { en:'Extra premium templates',ar:'قوالب إضافية' },
  prem_f3:          { en:'Higher design quality',ar:'جودة أعلى' },
  prem_f4:          { en:'Priority output',ar:'إخراج أولوية' },
  tier_prem_cta:    { en:'Download My Design Pack',ar:'حمّل حزمة تصاميمي' },
  sec_stripe:       { en:'Powered by Stripe',ar:'مدعوم بـ Stripe' },
  sec_onetime:      { en:'One-time charge',ar:'رسوم لمرة واحدة' },
  sec_instant:      { en:'Instant download',ar:'تحميل فوري' },
  already_paid:     { en:'Already paid? Enter your email to restore access.',ar:'دفعت مسبقاً؟ أدخل بريدك.' },
  restore_btn:      { en:'Restore Access', ar:'استعادة الوصول' },
  dl_title:         { en:'Download Your Design Pack',ar:'تحميل حزمة تصاميمك' },
  dl_desc:          { en:'Your print-ready files are prepared at 300 DPI with 3mm bleed and crop marks.',ar:'ملفاتك جاهزة للطباعة بدقة 300 DPI وهامش 3mm.' },
  dl_pdf:           { en:'Download PDF (Print-Ready)',ar:'تحميل PDF (جاهز للطباعة)' },
  dl_png:           { en:'Download PNG',   ar:'تحميل PNG' },
  dl_specs:         { en:'300 DPI · CMYK-friendly · 3mm bleed · Crop marks · QR min 3cm',ar:'300 DPI · ألوان CMYK · هامش 3mm · علامات قص' },
  overlay_copy:     { en:'Writing your headlines & CTAs…',ar:'جارٍ كتابة العناوين…' },
  overlay_qr:       { en:'Embedding QR code…',ar:'جارٍ تضمين رمز QR…' },
  overlay_render:   { en:'Painting your designs…',ar:'جارٍ رسم تصاميمك…' },
  overlay_verify:   { en:'Verifying payment…',ar:'جارٍ التحقق من الدفع…' },
  toast_fill:       { en:'⚠ Please fill in Business Name, Industry and Phone.',ar:'⚠ يرجى ملء البيانات المطلوبة.' },
  toast_gen_fail:   { en:'⚠ Design generation failed. Please try again.',ar:'⚠ فشل الإنشاء. يرجى المحاولة مرة أخرى.' },
  toast_updated:    { en:'✓ Design updated',ar:'✓ تم تحديث التصميم' },
  toast_pdf:        { en:'✓ PDF downloaded!',ar:'✓ تم تحميل PDF!' },
  toast_png:        { en:'✓ PNG downloaded!',ar:'✓ تم تحميل PNG!' },
  toast_restored:   { en:'✓ Access restored!',ar:'✓ تم استعادة الوصول!' },
  toast_invalid:    { en:'⚠ Token invalid or expired.',ar:'⚠ الرمز غير صالح أو منتهٍ.' },
  toast_pay_fail:   { en:'⚠ Payment verification failed. Contact support.',ar:'⚠ فشل التحقق من الدفع.' },
};

/* ── State ──────────────────────────────────────────────── */
const state = {
  qrValue:      '',
  logoDataUrl:  null,
  logoImg:      null,
  qrCanvas:     null,
  selections:   { goal:'calls', style:'modern', lang:'en', size:'a6' },
  generationId: null,
  copies:       null,
  designs:      [],
  selectedIdx:  null,
  activePalette:0,
  unlocked:     false,
  bizData:      {},
  paidTier:     null,
};

const $ = id => document.getElementById(id);

/* ── Init ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  QRStudio.setLang(QRStudio.getCurrentLang(), TR);
  $('btn-en')?.addEventListener('click', () => QRStudio.setLang('en', TR));
  $('btn-ar')?.addEventListener('click', () => QRStudio.setLang('ar', TR));

  state.qrValue = QRStudio.getLastQR() || 'https://example.com';
  $('qr-value-display').textContent = state.qrValue;

  renderMiniQR();
  setupChips();
  setupLogoUpload();
  setupGenerateBtn();
  setupEditPanel();
  setupPricingButtons();
  setupRestoreBtn();
  renderPalettes();

  await handleStripeReturn();
});

/* ── Mini QR preview ────────────────────────────────────── */
function renderMiniQR() {
  const div = $('qr-mini-render');
  if (!div || !state.qrValue) return;
  new QRCode(div, {
    text: state.qrValue, width: 52, height: 52,
    colorDark: '#000', colorLight: '#fff',
    correctLevel: QRCode.CorrectLevel.H,
  });
}

/* ── Preference chips ───────────────────────────────────── */
function setupChips() {
  ['goal','style','lang','size'].forEach(g => {
    document.getElementById(`${g}-chips`)?.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.getElementById(`${g}-chips`).querySelectorAll('.chip')
          .forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        state.selections[g] = chip.dataset.val;
      });
    });
  });
}

/* ── Logo upload ────────────────────────────────────────── */
function setupLogoUpload() {
  const zone  = $('logo-zone');
  const input = $('logo-file');
  const prev  = $('logo-preview');
  const icon  = $('logo-upload-icon');
  const txt   = $('logo-zone-text');
  if (!zone) return;

  input.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { QRStudio.showToast('⚠ Logo must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      state.logoDataUrl = ev.target.result;
      prev.src = state.logoDataUrl; prev.style.display = 'block';
      icon.style.display = 'none';
      txt.innerHTML = '<span>Logo uploaded ✓</span> — click to change';
    };
    reader.readAsDataURL(file);
  });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag');
    input.files = e.dataTransfer.files;
    input.dispatchEvent(new Event('change'));
  });
}

/* ── Palette swatches ───────────────────────────────────── */
function renderPalettes() {
  const row = $('palette-row'); if (!row) return;
  PALETTES.forEach((p, i) => {
    const sw = document.createElement('div');
    sw.className = 'palette-swatch' + (i === state.activePalette ? ' active' : '');
    sw.title = p.name;
    sw.style.background = `linear-gradient(135deg, ${p.bg} 50%, ${p.accent} 50%)`;
    sw.addEventListener('click', () => {
      state.activePalette = i;
      row.querySelectorAll('.palette-swatch').forEach((s, j) => s.classList.toggle('active', j === i));
      if (state.selectedIdx !== null) rerenderOne(state.selectedIdx);
    });
    row.appendChild(sw);
  });
}

/* ── Generate flow ──────────────────────────────────────── */
function setupGenerateBtn() {
  $('generate-designs-btn')?.addEventListener('click', runGeneration);
}

async function runGeneration() {
  const name     = $('biz-name').value.trim();
  const industry = $('biz-industry').value;
  const phone    = $('biz-phone').value.trim();
  if (!name || !industry || !phone) { QRStudio.showToast(QRStudio.t('toast_fill', TR)); return; }

  state.bizData = {
    name, industry, phone,
    whatsapp: $('biz-whatsapp').value.trim(),
    website:  $('biz-website').value.trim(),
    address:  $('biz-address').value.trim(),
    social:   $('biz-social').value.trim(),
    tagline:  $('biz-tagline').value.trim(),
    ...state.selections,
  };

  showOverlay(QRStudio.t('overlay_copy', TR));
  setStep(2);

  try {
    const res = await fetch('/api/generate-copy', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(state.bizData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const { copies, generationId } = await res.json();
    state.copies       = copies;
    state.generationId = generationId;
    QRStudio.saveSession({ generationId, bizName: name });

    updateOverlay(QRStudio.t('overlay_qr', TR));
    state.qrCanvas = await renderQRCanvas(state.qrValue, 400);
    if (state.logoDataUrl) state.logoImg = await loadImage(state.logoDataUrl);

    updateOverlay(QRStudio.t('overlay_render', TR));
    await renderAllDesigns();

    hideOverlay();
    $('step1-section').style.display   = 'none';
    $('results-section').style.display = 'block';
    setStep(3);
    $('results-section').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    hideOverlay();
    console.error('Generation error:', err);
    QRStudio.showToast(QRStudio.t('toast_gen_fail', TR));
  }
}

/* ── Canvas rendering ───────────────────────────────────── */
async function renderAllDesigns() {
  state.designs = [];
  const grid = $('designs-grid'); grid.innerHTML = '';
  const isRTL = state.selections.lang === 'ar';
  const sz    = SIZES[state.selections.size];
  const W = Math.round(sz.w * PX_PER_MM);
  const H = Math.round(sz.h * PX_PER_MM);

  for (let i = 0; i < TEMPLATES.length; i++) {
    const tpl  = TEMPLATES[i];
    const pal  = PALETTES[i % PALETTES.length];
    const copy = buildCopy(i);
    const canvas  = mkCanvas(W, H);
    tpl.paint(canvas.getContext('2d'), W, H, copy, pal, state.qrCanvas, state.logoImg, isRTL);
    const preview = mkCanvas(W, H);
    const pCtx = preview.getContext('2d');
    pCtx.drawImage(canvas, 0, 0);
    applyWatermark(pCtx, W, H);
    state.designs.push({ tpl, pal, copy, canvas, preview, W, H, sizeKey: state.selections.size });
    grid.appendChild(buildCard(i, preview, tpl));
  }
  $('results-count').textContent = `${TEMPLATES.length} ${QRStudio.getCurrentLang() === 'ar' ? 'تصميم' : 'variations'}`;
}

function buildCopy(idx) {
  const c = state.copies[idx] || state.copies[0];
  return {
    bizName:   state.bizData.name,
    bizNameAr: c.bizNameAr  || state.bizData.name,
    headline:  c.headline   || state.bizData.name,
    headlineAr:c.headlineAr || null,
    cta:       c.cta        || 'Contact Us Today',
    ctaAr:     c.ctaAr      || null,
    sub:       c.sub        || state.bizData.tagline || '',
    subAr:     c.subAr      || null,
    tagline:   c.tagline    || state.bizData.tagline || '',
    taglineAr: c.taglineAr  || null,
    phone:     state.bizData.phone,
    whatsapp:  state.bizData.whatsapp,
    address:   state.bizData.address,
    website:   state.bizData.website,
    social:    state.bizData.social,
  };
}

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function applyWatermark(ctx, W, H) {
  ctx.save();
  ctx.globalAlpha = 0.52; ctx.fillStyle = 'rgba(8,8,10,0.52)'; ctx.fillRect(0,0,W,H); ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(W/2, H/2); ctx.rotate(-Math.PI/5);
  ctx.fillStyle = 'rgba(255,255,255,0.11)'; ctx.font = `bold ${Math.round(W*.055)}px DM Sans,sans-serif`; ctx.textAlign = 'center';
  const step = Math.round(H*.22); for (let y = -H; y < H; y += step) ctx.fillText('PREVIEW ONLY', 0, y);
  ctx.restore();
  const bH = Math.round(H*.1); ctx.fillStyle = 'rgba(8,8,10,0.9)'; ctx.fillRect(0, H-bH, W, bH);
  ctx.fillStyle = '#D4AF37'; ctx.font = `700 ${Math.round(W*.037)}px DM Sans,sans-serif`; ctx.textAlign = 'center';
  ctx.fillText('PREVIEW — UNLOCK TO DOWNLOAD PRINT FILES', W/2, H - Math.round(bH*.32));
  ctx.restore();
}

function buildCard(idx, previewCanvas, tpl) {
  const card  = document.createElement('div'); card.className = 'design-card'; card.dataset.idx = idx;
  const badge = document.createElement('div'); badge.className = 'selected-badge'; badge.textContent = '✓ Selected';
  const wrap  = document.createElement('div'); wrap.className = 'design-canvas-wrap'; wrap.appendChild(previewCanvas);
  const foot  = document.createElement('div'); foot.className = 'design-card-footer';
  foot.innerHTML = `<span class="design-name">${tpl.name}</span><span class="design-style-tag">${tpl.style.toUpperCase()}</span>`;
  card.appendChild(badge); card.appendChild(wrap); card.appendChild(foot);
  card.addEventListener('click', () => selectDesign(idx));
  return card;
}

/* ── Design selection ───────────────────────────────────── */
function selectDesign(idx) {
  state.selectedIdx = idx;
  document.querySelectorAll('.design-card').forEach((c, i) => c.classList.toggle('selected-design', i === idx));
  $('edit-section').style.display = 'block';
  if (!state.unlocked) {
    $('pricing-section').style.display = 'block';
    $('pricing-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  const d = state.designs[idx];
  if (d) { $('edit-headline').value = d.copy.headline || ''; $('edit-cta').value = d.copy.cta || ''; $('edit-sub').value = d.copy.sub || ''; }
}

function setupEditPanel() {
  $('apply-edits-btn')?.addEventListener('click', () => {
    if (state.selectedIdx === null) return;
    const d = state.designs[state.selectedIdx];
    d.copy.headline = $('edit-headline').value || d.copy.headline;
    d.copy.cta      = $('edit-cta').value      || d.copy.cta;
    d.copy.sub      = $('edit-sub').value      || d.copy.sub;
    d.pal           = PALETTES[state.activePalette];
    rerenderOne(state.selectedIdx);
    QRStudio.showToast(QRStudio.t('toast_updated', TR));
  });
}

async function rerenderOne(idx) {
  const d = state.designs[idx]; const isRTL = state.selections.lang === 'ar';
  d.canvas.getContext('2d').clearRect(0,0,d.W,d.H);
  d.tpl.paint(d.canvas.getContext('2d'), d.W, d.H, d.copy, d.pal, state.qrCanvas, state.logoImg, isRTL);
  d.preview.getContext('2d').clearRect(0,0,d.W,d.H);
  const pCtx = d.preview.getContext('2d'); pCtx.drawImage(d.canvas, 0, 0);
  if (!state.unlocked) applyWatermark(pCtx, d.W, d.H);
  const card = document.querySelectorAll('.design-card')[idx];
  if (card) { const w = card.querySelector('.design-canvas-wrap'); w.innerHTML = ''; w.appendChild(state.unlocked ? d.canvas : d.preview); }
}

/* ── Pricing buttons ────────────────────────────────────── */
function setupPricingButtons() {
  ['basic','recommended','premium'].forEach(tier => {
    const btn = document.getElementById(`btn-tier-${tier}`);
    if (!btn) return;
    btn.addEventListener('click', e => {
      e.preventDefault();
      state.paidTier = tier;
      QRStudio.saveSession({ generationId: state.generationId, tier });
      const ref = encodeURIComponent(state.generationId || 'unknown');
      window.location.href = `${STRIPE_LINKS[tier]}?client_reference_id=${ref}`;
    });
  });
}

/* ── Restore access ─────────────────────────────────────── */
function setupRestoreBtn() {
  $('restore-btn')?.addEventListener('click', async () => {
    const email = $('restore-email')?.value?.trim();
    if (!email || !email.includes('@')) { QRStudio.showToast('⚠ Enter a valid email'); return; }
    const token = QRStudio.getDownloadToken();
    if (token) {
      const result = await QRStudio.verifyDownloadToken(token);
      if (result.valid) { unlockDownloads(); QRStudio.showToast(QRStudio.t('toast_restored', TR)); return; }
    }
    QRStudio.showToast(QRStudio.t('toast_invalid', TR));
  });
}

/* ── Stripe return handler ──────────────────────────────── */
async function handleStripeReturn() {
  const params    = new URLSearchParams(window.location.search);
  const paid      = params.get('paid');
  const sessionId = params.get('session_id');
  if (!paid || !sessionId) return;

  window.history.replaceState({}, '', window.location.pathname);
  showOverlay(QRStudio.t('overlay_verify', TR));

  try {
    const session = QRStudio.getSession();
    const res     = await fetch('/api/verify-payment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, generationId: session.generationId || 'unknown' }),
    });
    const data = await res.json();
    hideOverlay();

    if (data.ok && data.token) {
      QRStudio.saveDownloadToken(data.token);
      QRStudio.saveSession({ email: data.email });
      if (state.designs.length > 0) {
        unlockDownloads();
      } else {
        state.unlocked = true;
        QRStudio.showToast('✓ Payment verified! Generate your designs to download.');
      }
    } else {
      QRStudio.showToast(QRStudio.t('toast_pay_fail', TR));
    }
  } catch {
    hideOverlay();
    QRStudio.showToast(QRStudio.t('toast_pay_fail', TR));
  }
}

/* ── Unlock downloads ───────────────────────────────────── */
function unlockDownloads() {
  state.unlocked = true;
  document.querySelectorAll('.design-card').forEach((card, i) => {
    const d = state.designs[i]; if (!d) return;
    const w = card.querySelector('.design-canvas-wrap'); w.innerHTML = ''; w.appendChild(d.canvas);
  });
  $('pricing-section').style.display = 'none';
  $('download-panel').style.display  = 'block';
  setStep(4);
  $('dl-pdf-btn').addEventListener('click', downloadPDF);
  $('dl-png-btn').addEventListener('click', downloadPNG);
  $('download-panel').scrollIntoView({ behavior: 'smooth' });
}

/* ── PDF export (300 DPI, 3mm bleed, crop marks) ────────── */
async function downloadPDF() {
  if (!state.unlocked) return;
  const idx = state.selectedIdx ?? 0;
  const d   = state.designs[idx];
  const sz  = SIZES[d.sizeKey]; const bleed = sz.bleed || 3;
  QRStudio.showToast('Preparing PDF…');
  try {
    const { jsPDF } = window.jspdf;
    const DPI = 300, PPM = DPI / 25.4;
    const docW = sz.w + bleed*2, docH = sz.h + bleed*2;
    const hi   = mkCanvas(Math.round(docW*PPM), Math.round(docH*PPM));
    const hCtx = hi.getContext('2d');
    hCtx.save(); hCtx.translate(bleed*PPM, bleed*PPM);
    d.tpl.paint(hCtx, Math.round(sz.w*PPM), Math.round(sz.h*PPM), d.copy, d.pal, state.qrCanvas, state.logoImg, state.selections.lang==='ar');
    hCtx.restore();
    addCropMarks(hCtx, bleed*PPM, sz.w*PPM, sz.h*PPM);
    const pdf = new jsPDF({ orientation: docW>docH?'landscape':'portrait', unit:'mm', format:[docW,docH] });
    pdf.addImage(hi.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, docW, docH);
    pdf.setProperties({ title: `${state.bizData.name} Promo Design`, creator: 'QR Studio' });
    pdf.save(`${state.bizData.name.replace(/\s+/g,'-')}-promo-${d.tpl.id}.pdf`);
    QRStudio.showToast(QRStudio.t('toast_pdf', TR));
  } catch (err) { console.error('PDF error:', err); QRStudio.showToast('⚠ PDF export failed. Try PNG instead.'); }
}

function addCropMarks(ctx, bleed, cW, cH) {
  ctx.save(); ctx.strokeStyle='rgba(0,0,0,0.45)'; ctx.lineWidth=0.5;
  const m=5, r=bleed+cW, b=bleed+cH;
  [[bleed-m,bleed,bleed-1,bleed],[bleed,bleed-m,bleed,bleed-1],[r+1,bleed,r+m,bleed],[r,bleed-m,r,bleed-1],
   [bleed-m,b,bleed-1,b],[bleed,b+1,bleed,b+m],[r+1,b,r+m,b],[r,b+1,r,b+m]].forEach(([x1,y1,x2,y2])=>{
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); });
  ctx.restore();
}

/* ── PNG export ─────────────────────────────────────────── */
async function downloadPNG() {
  if (!state.unlocked) return;
  const idx = state.selectedIdx ?? 0; const d = state.designs[idx];
  const a = document.createElement('a');
  a.href = d.canvas.toDataURL('image/png');
  a.download = `${state.bizData.name.replace(/\s+/g,'-')}-promo-${d.tpl.id}.png`;
  a.click();
  QRStudio.showToast(QRStudio.t('toast_png', TR));
}

/* ── Helpers ────────────────────────────────────────────── */
function renderQRCanvas(value, size) {
  return new Promise(resolve => {
    const div = document.createElement('div'); div.style.visibility='hidden'; document.body.appendChild(div);
    new QRCode(div, { text:value, width:size, height:size, colorDark:'#000', colorLight:'#fff', correctLevel:QRCode.CorrectLevel.H });
    setTimeout(() => {
      const canvas=div.querySelector('canvas'), img=div.querySelector('img'); document.body.removeChild(div);
      if (canvas) { resolve(canvas); return; }
      if (img) { const off=mkCanvas(size,size),el=new Image(); el.onload=()=>{off.getContext('2d').drawImage(el,0,0,size,size);resolve(off);}; el.src=img.src; return; }
      resolve(null);
    }, 350);
  });
}
function loadImage(src) { return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=rej;img.src=src;}); }

function setStep(active) {
  for (let i=1;i<=4;i++) {
    const el=$(`step-ind-${i}`); if(!el) continue;
    el.classList.remove('active','done');
    if (i<active) el.classList.add('done'); else if(i===active) el.classList.add('active');
  }
}
function showOverlay(msg,sub) { $('ai-overlay').classList.add('visible'); $('ai-loading-text').textContent=msg||''; $('ai-loading-sub').textContent=sub||''; }
function updateOverlay(msg)   { $('ai-loading-text').textContent=msg; }
function hideOverlay()        { $('ai-overlay').classList.remove('visible'); }

/* ── Canvas utilities ───────────────────────────────────── */
function wrapText(ctx,text,x,y,maxW,lh,rtl){if(!text)return y;const words=text.split(' ');let line='',ly=y;for(let i=0;i<words.length;i++){const test=line+words[i]+' ';if(ctx.measureText(test).width>maxW&&i>0){ctx.fillText(line.trim(),x,ly);line=words[i]+' ';ly+=lh;}else line=test;}ctx.fillText(line.trim(),x,ly);return ly+lh;}
function wrapCenter(ctx,text,cx,y,maxW,lh){if(!text)return y;ctx.textAlign='center';const words=text.split(' ');let line='',ly=y;for(let i=0;i<words.length;i++){const test=line+words[i]+' ';if(ctx.measureText(test).width>maxW&&i>0){ctx.fillText(line.trim(),cx,ly);line=words[i]+' ';ly+=lh;}else line=test;}ctx.fillText(line.trim(),cx,ly);return ly+lh;}
function rrect(ctx,x,y,w,h,r){ctx.beginPath();if(ctx.roundRect){ctx.roundRect(x,y,w,h,r);}else{ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}ctx.fill();}
function contrast(hex){if(!hex||hex.length<6)return'#000';const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return(r*299+g*587+b*114)/1000>128?'#08080A':'#FFFFFF';}
function cornerLines(ctx,x,y,len,color,fx=false,fy=false){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(x+(fx?len:0),y);ctx.lineTo(x,y);ctx.lineTo(x,y+(fy?len:0));ctx.stroke();ctx.restore();}

/* ══════════════════════════════════════════════════════════
   8 CANVAS TEMPLATES
   paint(ctx, W, H, copy, pal, qrCanvas, logoImg, isRTL)
══════════════════════════════════════════════════════════ */
const TEMPLATES = [
  { id:'bold-hero',name:'Bold Hero',style:'bold',
    paint(ctx,W,H,copy,pal,qr,logo,rtl){const{bg,accent,text,sub}=pal;ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.save();ctx.rotate(-.04);ctx.fillStyle=accent;ctx.globalAlpha=.07;ctx.fillRect(-W*.1,H*.3,W*1.2,H*.55);ctx.globalAlpha=1;ctx.restore();ctx.fillStyle=accent;ctx.fillRect(0,0,W,5);const aX=rtl?W-44:44;let tY=44;if(logo){ctx.save();ctx.beginPath();ctx.roundRect(rtl?W-44-60:44,tY,60,60,10);ctx.clip();ctx.drawImage(logo,rtl?W-44-60:44,tY,60,60);ctx.restore();tY+=76;}ctx.fillStyle=text;ctx.textAlign=rtl?'right':'left';ctx.font=`800 ${Math.round(W*.09)}px 'Bebas Neue',sans-serif`;wrapText(ctx,copy.headline,aX,tY,W-88,W*.1,rtl);tY+=W*.11;ctx.fillStyle=sub;ctx.font=`400 ${Math.round(W*.036)}px DM Sans,sans-serif`;ctx.fillText(copy.sub,aX,tY);const cW=Math.min(W-88,240),cX=rtl?W-44-cW:44,cY=H*.52;ctx.fillStyle=accent;rrect(ctx,cX,cY,cW,46,23);ctx.fillStyle=contrast(accent);ctx.textAlign='center';ctx.font=`700 ${Math.round(W*.04)}px DM Sans,sans-serif`;ctx.fillText(copy.cta,cX+cW/2,cY+32);if(qr){const qS=Math.round(H*.28),qX=rtl?44:W-qS-44,qY=H-qS-64;ctx.fillStyle='#FFF';rrect(ctx,qX-10,qY-10,qS+20,qS+20,12);ctx.drawImage(qr,qX,qY,qS,qS);}ctx.textAlign=rtl?'right':'left';ctx.fillStyle=sub;ctx.font=`500 ${Math.round(W*.03)}px DM Sans,sans-serif`;ctx.fillText(copy.phone,aX,H-76);if(copy.address)ctx.fillText(copy.address,aX,H-54);ctx.fillStyle=accent;ctx.fillRect(0,H-5,W,5);}},
  { id:'luxury-gold',name:'Luxury Gold',style:'luxury',
    paint(ctx,W,H,copy,pal,qr,logo,rtl){const{bg,accent,text,sub}=pal;ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.strokeStyle=accent;ctx.lineWidth=1.5;ctx.globalAlpha=.45;ctx.strokeRect(14,14,W-28,H-28);ctx.globalAlpha=1;cornerLines(ctx,22,22,28,accent);cornerLines(ctx,W-22,22,28,accent,true,false);cornerLines(ctx,22,H-22,28,accent,false,true);cornerLines(ctx,W-22,H-22,28,accent,true,true);let tY=60;if(logo){const r=32,cx=W/2;ctx.save();ctx.beginPath();ctx.arc(cx,tY,r,0,Math.PI*2);ctx.clip();ctx.drawImage(logo,cx-r,tY-r,r*2,r*2);ctx.restore();tY+=80;}ctx.fillStyle=accent;ctx.font=`700 ${Math.round(W*.058)}px 'Cormorant Garamond',serif`;ctx.textAlign='center';tY=wrapCenter(ctx,copy.headline,W/2,tY,W-80,W*.065)+10;ctx.fillStyle=accent;ctx.globalAlpha=.4;ctx.fillRect(W/2-36,tY,72,1);ctx.globalAlpha=1;tY+=24;ctx.fillStyle=sub;ctx.font=`300 ${Math.round(W*.032)}px DM Sans,sans-serif`;ctx.fillText(copy.sub,W/2,tY);tY+=32;if(qr){const qS=Math.round(H*.3);ctx.fillStyle='#FFF';rrect(ctx,W/2-qS/2-8,tY,qS+16,qS+16,10);ctx.drawImage(qr,W/2-qS/2,tY+8,qS,qS);tY+=qS+32;}ctx.fillStyle=accent;rrect(ctx,W/2-105,tY,210,44,22);ctx.fillStyle=contrast(accent);ctx.font=`600 ${Math.round(W*.034)}px DM Sans,sans-serif`;ctx.fillText(copy.cta,W/2,tY+30);ctx.fillStyle=sub;ctx.font=`400 ${Math.round(W*.027)}px DM Sans,sans-serif`;ctx.fillText(copy.phone,W/2,H-50);if(copy.address)ctx.fillText(copy.address,W/2,H-30);}},
  { id:'modern-split',name:'Modern Split',style:'modern',
    paint(ctx,W,H,copy,pal,qr,logo,rtl){const{bg,accent,text,sub}=pal;const split=W*.42;ctx.fillStyle=accent;ctx.fillRect(0,0,split,H);ctx.fillStyle=bg;ctx.fillRect(split,0,W-split,H);ctx.fillStyle=contrast(accent);ctx.font=`800 ${Math.round(W*.054)}px 'Bebas Neue',sans-serif`;ctx.textAlign='center';wrapCenter(ctx,copy.bizName,split/2,54,split-20,W*.058);if(qr){const qS=Math.round(split*.78),qX=split/2-qS/2,qY=H/2-qS/2;ctx.fillStyle='#FFF';rrect(ctx,qX-8,qY-8,qS+16,qS+16,10);ctx.drawImage(qr,qX,qY,qS,qS);}const rX=rtl?W-36:split+28;ctx.textAlign=rtl?'right':'left';if(logo){ctx.save();ctx.beginPath();ctx.roundRect(rtl?W-36-48:split+20,36,48,48,8);ctx.clip();ctx.drawImage(logo,rtl?W-36-48:split+20,36,48,48);ctx.restore();}ctx.fillStyle=text;ctx.font=`700 ${Math.round(W*.052)}px 'Cormorant Garamond',serif`;wrapText(ctx,copy.headline,rX,logo?106:58,W-split-48,W*.056,rtl);ctx.fillStyle=sub;ctx.font=`400 ${Math.round(W*.030)}px DM Sans,sans-serif`;ctx.fillText(copy.sub,rX,logo?186:138);const cW=W-split-48,cX=rtl?W-36-cW:split+20,cY=H*.65;ctx.fillStyle=accent;rrect(ctx,cX,cY,cW,42,21);ctx.fillStyle=contrast(accent);ctx.textAlign='center';ctx.font=`700 ${Math.round(W*.034)}px DM Sans,sans-serif`;ctx.fillText(copy.cta,cX+cW/2,cY+28);ctx.textAlign=rtl?'right':'left';ctx.fillStyle=sub;ctx.font=`400 ${Math.round(W*.026)}px DM Sans,sans-serif`;ctx.fillText(copy.phone,rX,H-64);if(copy.address)ctx.fillText(copy.address,rX,H-44);}},
  { id:'minimal-clean',name:'Minimal Clean',style:'minimal',
    paint(ctx,W,H,copy,pal,qr,logo,rtl){const{bg,accent,text,sub}=pal;ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);const lX=rtl?W-48:48;ctx.fillStyle=accent;ctx.fillRect(rtl?W-48-3:48,32,3,40);ctx.fillStyle=text;ctx.textAlign=rtl?'right':'left';ctx.font=`300 ${Math.round(W*.04)}px DM Sans,sans-serif`;ctx.fillText(copy.bizName.toUpperCase(),lX,54);ctx.fillStyle=accent;ctx.font=`600 ${Math.round(W*.027)}px DM Sans,sans-serif`;ctx.fillText(copy.tagline||copy.sub,lX,76);if(qr){const qS=Math.round(H*.36),qX=rtl?W-qS-48:48;ctx.fillStyle=accent+'22';rrect(ctx,qX-12,H*.22-12,qS+24,qS+24,12);ctx.fillStyle='#FFF';rrect(ctx,qX-8,H*.22-8,qS+16,qS+16,10);ctx.drawImage(qr,qX,H*.22,qS,qS);const hX=rtl?qX-24:qX+qS+28;ctx.fillStyle=text;ctx.textAlign=rtl?'right':'left';ctx.font=`700 ${Math.round(W*.058)}px 'Cormorant Garamond',serif`;wrapText(ctx,copy.headline,hX,H*.26,W*.38,W*.065,rtl);ctx.fillStyle=sub;ctx.font=`400 ${Math.round(W*.028)}px DM Sans,sans-serif`;ctx.fillText(copy.cta,hX,H*.26+qS*.55);}ctx.fillStyle=accent;ctx.globalAlpha=.18;ctx.fillRect(48,H*.72,W-96,1);ctx.globalAlpha=1;ctx.fillStyle=sub;ctx.font=`400 ${Math.round(W*.027)}px DM Sans,sans-serif`;ctx.textAlign=rtl?'right':'left';ctx.fillText(copy.phone,lX,H*.72+30);if(copy.address){ctx.textAlign=rtl?'left':'right';ctx.fillText(copy.address,rtl?48:W-48,H*.72+30);}if(logo){const lS=38,lx2=rtl?48:W-48-lS,ly2=H-50-lS;ctx.save();ctx.beginPath();ctx.roundRect(lx2,ly2,lS,lS,6);ctx.clip();ctx.drawImage(logo,lx2,ly2,lS,lS);ctx.restore();}}},
  { id:'car-door',name:'Car Door Ad',style:'bold',
    paint(ctx,W,H,copy,pal,qr,logo,rtl){const{bg,accent,text,sub}=pal;ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.save();ctx.fillStyle=accent;ctx.globalAlpha=.1;ctx.beginPath();ctx.moveTo(0,H*.28);ctx.lineTo(W,H*.08);ctx.lineTo(W,H*.58);ctx.lineTo(0,H*.78);ctx.closePath();ctx.fill();ctx.globalAlpha=1;ctx.restore();ctx.fillStyle=accent;ctx.fillRect(0,0,W,8);ctx.fillStyle=text;ctx.textAlign='center';ctx.font=`800 ${Math.round(W*.11)}px 'Bebas Neue',sans-serif`;ctx.fillText(copy.bizName,W/2,82);ctx.fillStyle=accent;ctx.font=`700 ${Math.round(W*.062)}px 'Cormorant Garamond',serif`;wrapCenter(ctx,copy.headline,W/2,120,W-60,W*.068);if(qr){const qS=Math.round(H*.28),qX=rtl?W-qS-40:40,qY=H*.5;ctx.fillStyle='#FFF';rrect(ctx,qX-8,qY-8,qS+16,qS+16,12);ctx.drawImage(qr,qX,qY,qS,qS);const tX=rtl?qX-20:qX+qS+24;ctx.textAlign=rtl?'right':'left';ctx.fillStyle=accent;ctx.font=`700 ${Math.round(W*.04)}px DM Sans,sans-serif`;ctx.fillText(copy.cta,tX,H*.54);ctx.fillStyle=text;ctx.font=`600 ${Math.round(W*.046)}px DM Sans,sans-serif`;ctx.fillText(copy.phone,tX,H*.62);if(copy.whatsapp){ctx.fillStyle='#25D366';ctx.font=`500 ${Math.round(W*.032)}px DM Sans,sans-serif`;ctx.fillText('WhatsApp: '+copy.whatsapp,tX,H*.70);}}ctx.fillStyle=accent;ctx.fillRect(0,H-8,W,8);ctx.textAlign='center';ctx.fillStyle=sub;ctx.font=`400 ${Math.round(W*.027)}px DM Sans,sans-serif`;ctx.fillText(copy.address||copy.website||'',W/2,H-20);}},
  { id:'clean-white',name:'Clean White',style:'minimal',
    paint(ctx,W,H,copy,pal,qr,logo,rtl){const accent=pal.accent;ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,W,H);ctx.fillStyle=accent;ctx.fillRect(0,0,W,H*.26);if(logo){const r=28,cx=W/2,cy=H*.13;ctx.save();ctx.beginPath();ctx.arc(cx,cy,r+3,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();ctx.drawImage(logo,cx-r,cy-r,r*2,r*2);ctx.restore();}ctx.fillStyle=contrast(accent);ctx.font=`700 ${Math.round(W*.056)}px 'Cormorant Garamond',serif`;ctx.textAlign='center';ctx.fillText(copy.bizName,W/2,H*.22);ctx.fillStyle='#333';ctx.font=`300 ${Math.round(W*.034)}px DM Sans,sans-serif`;ctx.fillText(copy.sub,W/2,H*.34);if(qr){const qS=Math.round(H*.28);ctx.shadowColor='rgba(0,0,0,.12)';ctx.shadowBlur=20;ctx.fillStyle='#fff';rrect(ctx,W/2-qS/2-10,H*.4-10,qS+20,qS+20,12);ctx.shadowBlur=0;ctx.drawImage(qr,W/2-qS/2,H*.4,qS,qS);const cY=H*.4+qS+26;ctx.fillStyle=accent;rrect(ctx,W/2-100,cY,200,42,21);ctx.fillStyle=contrast(accent);ctx.font=`600 ${Math.round(W*.033)}px DM Sans,sans-serif`;ctx.fillText(copy.cta,W/2,cY+28);}ctx.fillStyle='#888';ctx.font=`400 ${Math.round(W*.027)}px DM Sans,sans-serif`;ctx.fillText(copy.phone,W/2,H-48);if(copy.address)ctx.fillText(copy.address,W/2,H-28);}},
  { id:'gradient-dark',name:'Gradient Dark',style:'modern',
    paint(ctx,W,H,copy,pal,qr,logo,rtl){const{accent}=pal;const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#0D0D1A');grad.addColorStop(1,'#1A0D2E');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);const glow=ctx.createRadialGradient(W*.7,H*.3,0,W*.7,H*.3,W*.55);glow.addColorStop(0,accent+'22');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);if(qr){const qS=Math.round(H*.3),qX=rtl?W-qS-40:40,qY=H*.16;ctx.fillStyle='#FFF';rrect(ctx,qX-8,qY-8,qS+16,qS+16,12);ctx.drawImage(qr,qX,qY,qS,qS);}const tX=rtl?50:W-40;ctx.textAlign=rtl?'left':'right';if(logo){const lS=46,lx=rtl?50:W-46-40;ctx.save();ctx.beginPath();ctx.roundRect(lx,H*.12,lS,lS,8);ctx.clip();ctx.drawImage(logo,lx,H*.12,lS,lS);ctx.restore();}ctx.fillStyle='#FFF';ctx.font=`700 ${Math.round(W*.068)}px 'Cormorant Garamond',serif`;wrapText(ctx,copy.bizName,tX,H*.16,W*.45,W*.075,!rtl);ctx.fillStyle=accent;ctx.font=`600 ${Math.round(W*.034)}px DM Sans,sans-serif`;ctx.fillText(copy.headline,tX,H*.34);ctx.fillStyle='rgba(255,255,255,.55)';ctx.font=`300 ${Math.round(W*.028)}px DM Sans,sans-serif`;ctx.fillText(copy.sub,tX,H*.44);const cW=192,cX2=rtl?50:W-cW-40;ctx.fillStyle=accent;rrect(ctx,cX2,H*.52,cW,42,21);ctx.fillStyle=contrast(accent);ctx.textAlign='center';ctx.font=`700 ${Math.round(W*.034)}px DM Sans,sans-serif`;ctx.fillText(copy.cta,cX2+cW/2,H*.52+28);ctx.textAlign=rtl?'right':'left';ctx.fillStyle='rgba(255,255,255,.45)';ctx.font=`400 ${Math.round(W*.026)}px DM Sans,sans-serif`;const cntX=rtl?W-40:40;ctx.fillText(copy.phone,cntX,H-54);if(copy.address)ctx.fillText(copy.address,cntX,H-34);}},
  { id:'bilingual',name:'Bilingual',style:'modern',
    paint(ctx,W,H,copy,pal,qr,logo,rtl){const{bg,accent,text,sub}=pal;ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.fillStyle=accent;ctx.fillRect(0,0,W,5);let tY=22;if(logo){const lS=50;ctx.save();ctx.beginPath();ctx.roundRect(W/2-lS/2,tY,lS,lS,8);ctx.clip();ctx.drawImage(logo,W/2-lS/2,tY,lS,lS);ctx.restore();tY+=66;}ctx.fillStyle=text;ctx.font=`700 ${Math.round(W*.056)}px 'Cormorant Garamond',serif`;ctx.textAlign='center';ctx.fillText(copy.bizName,W/2,tY+28);tY+=46;if(copy.bizNameAr){ctx.font=`700 ${Math.round(W*.048)}px 'Cairo',sans-serif`;ctx.fillStyle=accent;ctx.fillText(copy.bizNameAr,W/2,tY);tY+=38;}ctx.fillStyle=accent;ctx.globalAlpha=.3;ctx.fillRect(W/2-44,tY,88,1);ctx.globalAlpha=1;tY+=18;if(qr){const qS=Math.round(H*.26);ctx.fillStyle='#FFF';rrect(ctx,W/2-qS/2-8,tY,qS+16,qS+16,10);ctx.drawImage(qr,W/2-qS/2,tY+8,qS,qS);const midY=tY+8+qS/2;ctx.fillStyle=sub;ctx.font=`400 ${Math.round(W*.028)}px DM Sans,sans-serif`;ctx.textAlign='left';ctx.fillText(copy.cta,40,midY);if(copy.ctaAr){ctx.font=`400 ${Math.round(W*.028)}px 'Cairo',sans-serif`;ctx.textAlign='right';ctx.fillText(copy.ctaAr,W-40,midY);}tY+=qS+28;}ctx.fillStyle=accent;ctx.font=`600 ${Math.round(W*.036)}px DM Sans,sans-serif`;ctx.textAlign='center';ctx.fillText(copy.phone,W/2,H-54);if(copy.address){ctx.fillStyle=sub;ctx.font=`400 ${Math.round(W*.026)}px DM Sans,sans-serif`;ctx.fillText(copy.address,W/2,H-32);}ctx.fillStyle=accent;ctx.fillRect(0,H-5,W,5);}},
];
