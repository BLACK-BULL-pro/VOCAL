(() => {
  const { levels, topics, lessons } = VOCAL_DATA;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem('vocal.' + k)) ?? d; } catch { return d; } },
    set: (k, v) => localStorage.setItem('vocal.' + k, JSON.stringify(v))
  };
  const state = { user: null, partner: null, mode: 'login', topic: null, receivedRatings: [], givenRatings: [], ratingRoomId: null, current: null, currentSubtopic: null, stream: null, localMediaReady: false, t0: 0, tick: 0, hint: 0, minutes: 1, studyType: 'all', studyLevel: 'all', studyQuery: '', communityType: 'all', communityQuery: '', communityPanels: { mine: false, create: false }, currentLesson: null, quizIndex: 0, quizScore: 0, quizAnswered: false, settingsTab: 'profile', questionIndex: 0, questionT0: 0, questionTick: 0, questionStarted: false, roomId: null, chatUnread: 0, finishing: false, localRoleIsA: true, language: 'es', roomLanguage: 'en', signaling: null, matchSubscription: null, roomSubscription: null, peer: null, pendingIce: [], searching: false, roomReady: false, roomOfferSent: false };
  let serverProfileKey = '';

  /* ---------- Utilidades ---------- */
  const show = (id) => {
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    document.body.classList.toggle('in-call', id === 'room');
    if (id === 'room') setRoomLanguage('en'); else scheduleLocalization();
  };
  const escapeHTML = (value) => { const node = document.createElement('span'); node.textContent = String(value ?? ''); return node.innerHTML; };
  const escapeAttr = (value) => escapeHTML(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 2800);
  }
  const localizedTextSources = new WeakMap(), localizedAttrSources = new WeakMap();
  let localizationObserver, localizationTimer = 0, localeRevision = 0, roomLocaleRevision = 0;
  const translationCache = store.get('translationCache', {});
  function protectedLocaleNode(node, room = false) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,textarea,input,option,.chat-message,.settings-user,.quick-account,.member-list,.group-post,.community-card>p,.community-detail>p,.name,.settings-photo-preview,.room-language-toggle,.vocab-word,.hint-translation,.hint-synonyms,.direction-switch,[contenteditable="true"]')) return true;
    return !room && !!parent.closest('#room');
  }
  async function machineTranslate(text, from, to) {
    const key = `${from}|${to}|${text}`;
    if (translationCache[key]) return translationCache[key];
    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
      if (!response.ok) return text;
      const json = await response.json(), result = json.responseData?.translatedText?.replace(/<[^>]*>/g, '');
      if (result) { translationCache[key] = result; return result; }
    } catch { /* If the translation service is unavailable, keep the original text. */ }
    return text;
  }
  async function localizeRoot(root, from, to, room = false) {
    const revision = room ? ++roomLocaleRevision : ++localeRevision;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.trim() && !protectedLocaleNode(node, room)) nodes.push(node);
    }
    const attrs = [];
    root.querySelectorAll('[placeholder],[title],[aria-label]').forEach((element) => {
      if (element.closest('.chat-message,.settings-user,.quick-account,.name,.room-language-toggle,[contenteditable="true"]') || (!room && element.closest('#room'))) return;
      ['placeholder','title','aria-label'].forEach((name) => { if (element.hasAttribute(name)) attrs.push([element, name]); });
    });
    const tasks = [
      ...nodes.map((textNode) => async () => {
        const existing = localizedTextSources.get(textNode);
        const original = existing && textNode.nodeValue === existing.rendered ? existing.original : textNode.nodeValue;
        if (to === 'es' && existing && textNode.nodeValue === existing.rendered && existing.originalLanguage === 'es') { textNode.nodeValue = original; localizedTextSources.set(textNode, { original, rendered: original, originalLanguage: 'es' }); return; }
        localizedTextSources.set(textNode, { original, rendered: textNode.nodeValue, originalLanguage: existing?.originalLanguage || from });
        const studentName = state.user?.name;
        const safeOriginal = studentName ? original.replace(studentName, 'VOCALSTUDENT') : original;
        const translated = (await machineTranslate(safeOriginal, from, to)).replace('VOCALSTUDENT', studentName || '');
        if ((room ? roomLocaleRevision : localeRevision) !== revision) return;
        textNode.nodeValue = translated;
        localizedTextSources.set(textNode, { original, rendered: translated, originalLanguage: existing?.originalLanguage || from });
      }),
      ...attrs.map(([element, name]) => async () => {
        const existingMap = localizedAttrSources.get(element) || new Map();
        const oldValue = element.getAttribute(name), existing = existingMap.get(name);
        const original = existing && oldValue === existing.rendered ? existing.original : oldValue;
        if (to === 'es' && existing && oldValue === existing.rendered && existing.originalLanguage === 'es') { element.setAttribute(name, original); existingMap.set(name, { original, rendered: original, originalLanguage: 'es' }); localizedAttrSources.set(element, existingMap); return; }
        const translated = await machineTranslate(original, from, to);
        if ((room ? roomLocaleRevision : localeRevision) !== revision) return;
        element.setAttribute(name, translated); existingMap.set(name, { original, rendered: translated, originalLanguage: existing?.originalLanguage || from }); localizedAttrSources.set(element, existingMap);
      })
    ];
    let index = 0;
    const workers = Array.from({ length: 5 }, async () => { while (index < tasks.length) { const task = tasks[index++]; await task(); } });
    await Promise.all(workers);
    try { store.set('translationCache', Object.fromEntries(Object.entries(translationCache).slice(-350))); } catch { /* Translation cache is optional. */ }
  }
  function restoreRoot(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) {
      const saved = localizedTextSources.get(node);
      if (saved && node.nodeValue === saved.rendered) { node.nodeValue = saved.original; localizedTextSources.set(node, { ...saved, rendered: saved.original }); }
    }
    root.querySelectorAll('[placeholder],[title],[aria-label]').forEach((element) => {
      const saved = localizedAttrSources.get(element); if (!saved) return;
      saved.forEach((value, name) => { if (element.getAttribute(name) === value.rendered) { element.setAttribute(name, value.original); saved.set(name, { ...value, rendered: value.original }); } });
    });
  }
  function applyLanguage(language) {
    state.language = language === 'en' ? 'en' : 'es';
    document.documentElement.lang = state.language;
    document.body.dataset.language = state.language;
    store.set('language', state.language);
    const active = document.querySelector('.screen.active');
    if (active && active.id !== 'room') {
      if (state.language === 'en') void localizeRoot(active, 'es', 'en'); else restoreRoot(active);
    }
  }
  function scheduleLocalization() {
    clearTimeout(localizationTimer);
    localizationTimer = setTimeout(() => {
      const active = document.querySelector('.screen.active');
      if (active && active.id !== 'room') {
        if (state.language === 'en') void localizeRoot(active, 'es', 'en');
        else restoreRoot(active);
      }
      if (active?.id === 'room' && state.roomLanguage === 'es') void localizeRoot(active, 'en', 'es', true);
    }, 180);
  }
  function observeLocalization() {
    if (localizationObserver || !document.body) return;
    localizationObserver = new MutationObserver((records) => {
      if (records.some((record) => [...record.addedNodes].some((node) => node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE))) scheduleLocalization();
    });
    localizationObserver.observe(document.body, { childList: true, subtree: true });
  }
  function setRoomLanguage(language) {
    state.roomLanguage = language === 'es' ? 'es' : 'en';
    const button = $('#roomLanguageToggle');
    if (button) {
      button.textContent = state.roomLanguage === 'en' ? 'ES' : 'EN';
      button.title = state.roomLanguage === 'en' ? 'Switch room to Spanish' : 'Switch room to English';
      button.setAttribute('aria-label', button.title);
    }
    const root = $('#room'); if (!root) return;
    if (state.user && $('#localName')) $('#localName').textContent = state.roomLanguage === 'en' ? `${state.user.name} (You) - ${state.user.level}` : `${state.user.name} (Tú) - ${state.user.level}`;
    if ($('#remoteName')) $('#remoteName').textContent = state.partner
      ? `${state.partner.name} · ${state.partner.level || state.user?.level || ''}`
      : state.roomLanguage === 'en' ? `Waiting for a partner (${state.user?.level || ''})` : `Esperando compañero (${state.user?.level || ''})`;
    if (state.roomLanguage === 'es') void localizeRoot(root, 'en', 'es', true); else restoreRoot(root);
    root.dataset.language = state.roomLanguage;
  }
  function editProfile() { openSettings('profile'); }
  function saveUser() {
    const users = store.get('users', {}); users[state.user.email] = { ...state.user }; delete users[state.user.email].pass; store.set('users', users);
    const profile = { name: state.user.name, username: state.user.username || null, photo: state.user.photo || null, level: state.user.level };
    const profileKey = JSON.stringify(profile);
    if (!state.serverProfileKey || state.serverProfileKey === profileKey) return;
    state.serverProfileKey = profileKey;
    void csrfHeaders().then((headers) => fetch('/api/user/me', {
      method: 'PUT', credentials: 'same-origin', headers: { ...headers, 'Content-Type': 'application/json' }, body: profileKey
    })).then((response) => {
      if (!response.ok) throw new Error('Profile could not be saved to the server.');
    }).catch(() => { state.serverProfileKey = ''; toast('Your profile is saved in this browser, but could not sync with the server.'); });
  }
  async function csrfHeaders() {
    const response = await fetch('/api/csrf', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('Could not retrieve security token.');
    const csrf = await response.json(); return { [csrf.headerName]: csrf.token };
  }

  async function refreshAccountStatistics() {
    if (!state.user) return;
    const headers = { credentials: 'same-origin', cache: 'no-store' };
    const [sessionsResponse, receivedResponse, givenResponse] = await Promise.all([
      fetch('/api/user/sessions', headers),
      fetch('/api/user/ratings/received', headers),
      fetch('/api/user/ratings/given', headers)
    ]);
    if (sessionsResponse.ok) {
      const remote = await sessionsResponse.json();
      const local = state.user.sessions || [];
      const normalized = remote.map((session) => ({ sessionId: session.sessionKey, date: session.startedAt, min: session.durationMinutes, topic: session.topicId }));
      const combined = new Map();
      [...local, ...normalized].forEach((session, index) => {
        const key = session.sessionId || session.sessionKey || `local-${index}-${session.date}-${session.topic}`;
        combined.set(key, session);
      });
      state.user.sessions = [...combined.values()].sort((a, b) => new Date(b.date || b.startedAt) - new Date(a.date || a.startedAt));
      saveUser();
    }
    if (receivedResponse.ok) state.receivedRatings = await receivedResponse.json();
    if (givenResponse.ok) state.givenRatings = await givenResponse.json();
  }
  async function savePracticeSession(session) {
    try {
      const headers = await csrfHeaders();
      const response = await fetch('/api/user/sessions', { method: 'POST', credentials: 'same-origin', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: session.sessionId, date: session.date, minutes: session.min, topic: session.topic }) });
      if (!response.ok) throw new Error('session save failed');
    } catch { toast('La sesión se guardó en este navegador, pero no se pudo sincronizar con tu cuenta.'); }
  }

  /* ---------- 1. Carga ---------- */
  function splash() {
    let p = 0;
    const iv = setInterval(() => {
      p = Math.min(100, p + Math.random() * 18);
      $('#loadBar').style.width = p + '%';
      if (p >= 100) { clearInterval(iv); setTimeout(() => (state.user ? dashboard() : show('login')), 300); }
    }, 220);
  }

  /* ---------- 2. Login / Registro ---------- */
  function setMode(mode) {
    state.mode = mode === 'register' ? 'register' : 'login';
    const registering = state.mode === 'register';
    $('#authForm').hidden = false;
    $('#regName').hidden = !registering;
    $('#regLevel').hidden = !registering;
    $('#regConfirmPassword').hidden = !registering;
    $('#regName').required = registering;
    $('#regConfirmPassword').required = registering;
    $('#password').autocomplete = registering ? 'new-password' : 'current-password';
    $('#password').minLength = registering ? 8 : 1;
    $('[data-action="forgot"]').hidden = registering;
    $('#authSubmit').textContent = registering ? (state.language === 'en' ? 'Create account' : 'Crear cuenta') : (state.language === 'en' ? 'Sign in' : 'Iniciar sesión');
    $('#switchText').innerHTML = registering
      ? `${state.language === 'en' ? 'Already have an account?' : '¿Ya tienes una cuenta?'} <button type="button" class="link auth-switch" data-action="switch">${state.language === 'en' ? 'Sign in' : 'Inicia sesión'}</button>`
      : `${state.language === 'en' ? 'New to V.O.C.A.L.?' : '¿Nuevo en V.O.C.A.L.?'} <button type="button" class="link auth-switch" data-action="switch">${state.language === 'en' ? 'Create an account' : 'Crea una cuenta'}</button>`;
    $('#authError').textContent = '';
    $('#password').value = '';
    $('#regConfirmPassword').value = '';
  }
  $('#regLevel').innerHTML = Object.entries(levels).map(([k, v]) => `<option value="${k}" ${k === 'B1' ? 'selected' : ''}>Mi nivel: ${v} (${k})</option>`).join('');
  async function refreshLevelsCatalog() {
    try {
      const response = await fetch('/api/levels', { credentials:'same-origin', cache:'no-store' });
      if (!response.ok) return;
      const remote = await response.json();
      if (!remote.length) return;
      Object.keys(levels).forEach((key)=>delete levels[key]);
      remote.forEach((level)=>{ levels[level.code]=level.label; });
      $('#regLevel').innerHTML = Object.entries(levels).map(([k, v]) => `<option value="${escapeAttr(k)}" ${k === (state.user?.level||'B1') ? 'selected' : ''}>Mi nivel: ${escapeHTML(v)} (${escapeHTML(k)})</option>`).join('');
      if (state.user) refreshDashboardTopics();
    } catch { /* Se conserva el catálogo local si el servidor no responde. */ }
  }

  $('#authForm').addEventListener('submit', submitAuth);
  async function submitAuth(event) {
    event.preventDefault();
    const registering = state.mode === 'register';
    const name = $('#regName').value.trim(), email = $('#email').value.trim().toLowerCase();
    const password = $('#password').value, confirmPassword = $('#regConfirmPassword').value;
    const error = $('#authError'), button = $('#authSubmit');
    error.textContent = '';
    if (registering && password !== confirmPassword) { error.textContent = 'Las contraseñas no coinciden.'; return; }
    button.disabled = true;
    const label = button.textContent; button.textContent = 'Conectando…';
    try {
      const headers = await csrfHeaders();
      const response = await fetch(`/api/auth/${registering ? 'register' : 'login'}`, {
        method: 'POST', credentials: 'same-origin', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(registering ? { name, email, password, level: $('#regLevel').value } : { email, password })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || payload.message || (response.status === 401 ? 'Correo o contraseña incorrectos.' : 'No se pudo completar el acceso.'));
      const savedUser = store.get('users', {})[payload.email] || {};
      state.user = { ...savedUser, ...payload, sessions: savedUser.sessions || [], interests: savedUser.interests || [], preferences: savedUser.preferences || {}, learning: savedUser.learning || { completed: {}, best: {} } };
      serverProfileKey = JSON.stringify({ name: payload.name, username: payload.username || null, photo: payload.photo || null, level: payload.level });
      await refreshAccountStatistics();
      applyPreferences(); updateAvatar(); dashboard();
    } catch (exception) {
      error.textContent = exception.message || 'No se pudo conectar con el servidor.';
    } finally {
      button.disabled = false; button.textContent = label;
    }
  }

  function updateAvatar() {
    const avatar=$('#avatar');
    avatar.innerHTML=state.user.photo?`<img src="${state.user.photo}" alt="Foto de ${escapeHTML(state.user.name)}">`:escapeHTML(state.user.name.trim()[0]?.toUpperCase()||'?');
    avatar.setAttribute('aria-label',`Abrir perfil de ${state.user.name}`);
  }
  function updateAdminNav() { const nav=$('#adminNav'); if (nav) nav.hidden = state.user?.role !== 'ADMIN'; }
  function applyPreferences() {
    const pref=state.user?.preferences||{};
    document.body.dataset.theme=pref.theme||'light';document.body.dataset.accent=pref.accent||'blue';
    document.body.classList.toggle('reduce-motion',!!pref.reduceMotion);
    applyLanguage(pref.language || store.get('language','es'));
  }
  function openSettings(tab='profile') { state.settingsTab=tab;closeQuickPanel();$$( '.nav' ).forEach((button)=>button.classList.toggle('on',button.textContent.trim()==='AJUSTES/PERFIL'));renderSettings(); }
  function renderSettings() {
    const root=$('#studyDashboard'),u=state.user,p=u.preferences||{}, interests=u.interests||[];
    const tabs=[['profile','Perfil personal'],['app','Aplicación'],['security','Seguridad']];
    const heading=state.settingsTab==='profile'?'Personaliza tu perfil':state.settingsTab==='app'?'Preferencias de la aplicación':'Seguridad de la cuenta';
    let content='';
    if(state.settingsTab==='profile') content=`<form class="settings-form" id="profileSettingsForm"><section class="settings-photo"><div class="settings-photo-preview">${u.photo?`<img src="${u.photo}" alt="Foto de perfil">`:escapeHTML(u.name.trim()[0]?.toUpperCase()||'?')}</div><div><h3>Foto de perfil</h3><p>Elige una imagen JPG, PNG o WEBP. Se ajustará para usarla como avatar.</p><label class="file-button">Elegir foto<input type="file" accept="image/png,image/jpeg,image/webp" data-profile-photo></label>${u.photo?'<button type="button" class="text-button" data-action="remove-photo">Quitar foto</button>':''}</div></section><div class="settings-fields"><label>Nombre completo<input data-setting-name maxlength="70" value="${escapeHTML(u.name)}" required></label><label>Nombre de usuario<input data-setting-username maxlength="24" value="${escapeHTML(u.username||u.email.split('@')[0])}" required><small>Se usará como tu identificador en grupos.</small></label><label>Edad<input data-setting-age type="number" min="13" max="120" value="${u.age||''}" placeholder="Tu edad"></label><label>País o región<input data-setting-country maxlength="50" value="${escapeHTML(u.country||'')}" placeholder="Ej. Colombia"></label><label>Nivel de inglés<select data-setting-level>${Object.entries(levels).map(([key,label])=>`<option value="${key}" ${u.level===key?'selected':''}>${key} · ${label}</option>`).join('')}</select></label><label>Sobre mí<textarea data-setting-bio maxlength="240" rows="3" placeholder="Cuéntale algo a tu comunidad…">${escapeHTML(u.bio||'')}</textarea></label></div><fieldset class="interest-field"><legend>Mis intereses</legend><p>Selecciona los temas que más te gustan.</p><div class="interest-options">${topics.map((topic)=>`<label><input type="checkbox" data-interest="${topic.id}" ${interests.includes(topic.id)?'checked':''}>${escapeHTML(topic.name)}</label>`).join('')}</div></fieldset><button class="btn blue settings-save" type="button" data-action="save-profile">Guardar perfil</button></form>`;
    if(state.settingsTab==='app') content=`<div class="settings-form"><div class="settings-fields"><label>Apariencia<select data-pref-theme><option value="light" ${(p.theme||'light')==='light'?'selected':''}>Clara</option><option value="dark" ${p.theme==='dark'?'selected':''}>Oscura</option></select><small>Elige el aspecto general de V.O.C.A.L.</small></label><label>Color principal<select data-pref-accent><option value="blue" ${(p.accent||'blue')==='blue'?'selected':''}>Azul</option><option value="green" ${p.accent==='green'?'selected':''}>Verde</option><option value="violet" ${p.accent==='violet'?'selected':''}>Violeta</option></select></label><label>Idioma general<select data-pref-language><option value="es" ${(p.language||state.language)==='es'?'selected':''}>Español</option><option value="en" ${(p.language||state.language)==='en'?'selected':''}>English</option></select><small>El idioma se aplica en toda la plataforma.</small></label><label>Meta diaria de estudio<select data-pref-goal>${[5,10,15,30].map((n)=>`<option value="${n}" ${(Number(p.dailyGoal)||10)===n?'selected':''}>${n} minutos</option>`).join('')}</select></label><label class="setting-check"><input type="checkbox" data-pref-notifications ${p.notifications!==false?'checked':''}>Mostrar avisos dentro de la app</label><label class="setting-check"><input type="checkbox" data-pref-motion ${p.reduceMotion?'checked':''}>Reducir animaciones</label></div><button class="btn blue settings-save" data-action="save-preferences">Guardar preferencias</button><button class="text-button reset-preferences" data-action="reset-preferences">Restablecer preferencias</button></div>`;
    if(state.settingsTab==='security') content=`<form class="settings-form" id="changePasswordForm"><div class="security-note"><strong>Seguridad de la cuenta</strong><span>Tu contraseña se guarda protegida en V.O.C.A.L. y nunca se muestra en tu perfil.</span></div><div class="settings-fields"><label>Contraseña actual<input type="password" data-password-current autocomplete="current-password" required></label><label>Nueva contraseña<input type="password" data-password-new autocomplete="new-password" minlength="8" required><small>Usa al menos 8 caracteres.</small></label><label>Confirma la nueva contraseña<input type="password" data-password-confirm autocomplete="new-password" minlength="8" required></label></div><button class="btn blue settings-save" type="button" data-action="change-password">Actualizar contraseña</button></form>`;
    root.innerHTML=`<div class="settings-heading"><div><span class="study-kicker">TU CUENTA</span><h2>Ajustes y perfil</h2><p>Administra tus datos personales y adapta V.O.C.A.L. a tu manera.</p></div><div class="settings-user"><strong>${escapeHTML(u.name)}</strong><span>${escapeHTML(u.email)}</span></div></div><div class="settings-layout"><nav class="settings-tabs">${tabs.map(([id,label])=>`<button class="${state.settingsTab===id?'selected':''}" data-action="settings-tab" data-tab="${id}">${label}</button>`).join('')}</nav><section class="settings-content"><h3>${heading}</h3>${content}</section></div>`;
    $('.hero').hidden=true;$('.row').hidden=true;root.hidden=false;
  }
  function saveProfile() {
    const name=$('[data-setting-name]').value.trim(),username=$('[data-setting-username]').value.trim().replace(/^@/,''),age=$('[data-setting-age]').value,country=$('[data-setting-country]').value.trim(),level=$('[data-setting-level]').value,bio=$('[data-setting-bio]').value.trim();
    if(name.length<2)return toast('Escribe un nombre de al menos dos caracteres.');
    if(!/^[a-zA-Z0-9._-]{3,24}$/.test(username))return toast('El usuario debe tener entre 3 y 24 letras, números, puntos o guiones.');
    const users=store.get('users',{}),collision=Object.values(users).some((user)=>user.email!==state.user.email&&(user.username||'').toLowerCase()===username.toLowerCase());
    if(collision)return toast('Ese nombre de usuario ya está ocupado.');
    if(age&&(Number(age)<13||Number(age)>120))return toast('Ingresa una edad válida entre 13 y 120.');
    state.user.name=name;state.user.username=username;state.user.age=age?Number(age):null;state.user.country=country;state.user.level=level;state.user.bio=bio;state.user.interests=$$('[data-interest]:checked').map((input)=>input.dataset.interest);saveUser();$('#hello').textContent='Hola, '+name;updateAvatar();refreshDashboardTopics();renderSettings();toast('Perfil guardado.');
  }
  function savePreferences() {
    state.user.preferences={theme:$('[data-pref-theme]').value,accent:$('[data-pref-accent]').value,language:$('[data-pref-language]').value,dailyGoal:Number($('[data-pref-goal]').value),notifications:$('[data-pref-notifications]').checked,reduceMotion:$('[data-pref-motion]').checked};saveUser();applyPreferences();renderSettings();scheduleLocalization();toast(state.language==='en'?'Preferences saved.':'Preferencias guardadas.');
  }
  function resetPreferences() { state.user.preferences={theme:'light',accent:'blue',language:'es',dailyGoal:10,notifications:true,reduceMotion:false};saveUser();applyPreferences();renderSettings();scheduleLocalization();toast(state.language==='en'?'Preferences restored.':'Preferencias restablecidas.'); }
  function changePassword() {
    const current=$('[data-password-current]').value,next=$('[data-password-new]').value,confirmPass=$('[data-password-confirm]').value;
    if(next.length<8)return toast('La nueva contraseña debe tener al menos 8 caracteres.');
    if(next!==confirmPass)return toast('Las contraseñas nuevas no coinciden.');
    void (async()=>{try{const headers=await csrfHeaders();const response=await fetch('/api/user/password',{method:'PUT',credentials:'same-origin',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({currentPassword:current,newPassword:next})});if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.detail||'No se pudo cambiar la contraseña.');}renderSettings();toast('Contraseña actualizada.');}catch(error){toast(error.message||'No se pudo cambiar la contraseña.');}})();
  }
  async function setProfilePhoto(file) {
    if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type))return toast('Elige una imagen JPG, PNG o WEBP.');
    if(file.size>8*1024*1024)return toast('La imagen debe pesar menos de 8 MB.');
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const image=new Image();image.onload=()=>{const scale=Math.min(1,512/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.82));};image.onerror=reject;image.src=reader.result;};reader.onerror=reject;reader.readAsDataURL(file);}).catch(()=>null);
    if(!data)return toast('No se pudo abrir esa imagen.');state.user.photo=data;saveUser();updateAvatar();renderSettings();toast('Foto de perfil actualizada.');
  }
  function closeQuickPanel() { const panel=$('#quickPanel');if(panel){panel.hidden=true;panel.innerHTML='';delete panel.dataset.kind;} }
  function toggleQuickPanel(kind,anchor) {
    const panel=$('#quickPanel');if(!panel)return;
    if(!panel.hidden&&panel.dataset.kind===kind){closeQuickPanel();return;}
    const contents={
      notifications:`<div class="quick-panel-title"><strong>Notificaciones</strong><button aria-label="Cerrar" data-action="close-panel">×</button></div><div class="quick-empty"><span>🔔</span><strong>No tienes notificaciones nuevas</strong><p>Los avisos de práctica y estudio aparecerán aquí.</p></div><button class="quick-panel-link" data-action="settings-app">Configurar notificaciones →</button>`,
      account:`<div class="quick-account"><div class="quick-avatar">${state.user.photo?`<img src="${state.user.photo}" alt="">`:escapeHTML(state.user.name[0].toUpperCase())}</div><div><strong>${escapeHTML(state.user.name)}</strong><span>@${escapeHTML(state.user.username||state.user.email.split('@')[0])}</span></div></div><button data-action="profile">Mi perfil</button><button data-action="settings-app">Preferencias de la app</button><button class="quick-logout" data-action="logout">Cerrar sesión</button>`,
      help:`<div class="quick-panel-title"><strong>Ayuda rápida</strong><button aria-label="Cerrar" data-action="close-panel">×</button></div><p class="quick-help-copy">Elige un tema en Inicio, inicia la práctica y permite el acceso a cámara y micrófono cuando el navegador lo solicite.</p><button data-action="nav-study">Ir a Material de estudio</button><button data-action="go-community">Explorar comunidades</button>`
    };
    panel.innerHTML=contents[kind];panel.dataset.kind=kind;panel.hidden=false;
    const rect=anchor.getBoundingClientRect(),width=280;
    const left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12));
    const top=rect.top>window.innerHeight-230?Math.max(12,rect.top-220):Math.min(window.innerHeight-220,rect.bottom+8);
    panel.style.left=`${left}px`;panel.style.top=`${top}px`;
  }

  /* ---------- 3. Dashboard ---------- */
  function refreshDashboardTopics() {
    const availableTopics = topics.filter((topic) => topic.levels?.includes(state.user.level));
    if (state.topic && !availableTopics.some((topic) => topic.id === state.topic)) state.topic = null;
    $('#levelChip').textContent = `Nivel actual: ${levels[state.user.level]} (${state.user.level})`;
    $('#topics').innerHTML = availableTopics.map((topic) => `<button data-action="topic" data-id="${topic.id}" class="${state.topic === topic.id ? 'on' : ''}">${topic.icon} ${topic.name}</button>`).join('');
  }
  function dashboard() {
    const u = state.user;
    $('#hello').textContent = 'Hola, ' + u.name;
    updateAvatar();
    updateAdminNav();
    refreshDashboardTopics();
    const min = u.sessions.reduce((a, s) => a + s.min, 0);
    $('#hours').textContent = min < 60 ? min + ' min' : (min / 60).toFixed(1).replace('.0', '') + 'h';
    show('dashboard');
    applyPreferences();
    $('#studyDashboard').hidden = true;
    $('.hero').hidden = false; $('.row').hidden = false;
    $('.hero h3').textContent = 'Comienza a practicar sin miedo al qué dirán';
    $('.hero p').textContent = 'Conéctate de forma segura con un compañero de tu mismo nivel y rompe el hielo con temas guiados.';
    $('.hero [data-action="start"]').hidden = false;
    $('#topics').closest('.box').hidden = false;
    $$('.nav').forEach((button) => button.classList.toggle('on', button.textContent.trim() === 'INICIO'));
  }

  /* ---------- 4. Búsqueda de compañero (simulada) ---------- */
  function renderStudy() {
    const root = $('#studyDashboard'), progress = state.user.learning || { completed: {}, best: {} };
    const done = Object.keys(progress.completed || {}).length, query = state.studyQuery.trim().toLowerCase();
    const list = lessons.filter((l) => (state.studyType === 'all' || l.type === state.studyType) && (state.studyLevel === 'all' || l.level === state.studyLevel) && (!query || `${l.title} ${l.description} ${l.level}`.toLowerCase().includes(query)));
    root.innerHTML = `<div class="study-heading"><div><span class="study-kicker">AULA VOCAL</span><h2>Aprende a tu ritmo</h2><p>Lecciones breves de gramática y vocabulario con ejemplos y ejercicios interactivos.</p></div><div class="study-summary"><strong>${done}/${lessons.length}</strong><span>lecciones completadas</span></div></div><div class="study-progress"><span style="width:${Math.round(done / lessons.length * 100)}%"></span></div><div class="study-toolbar"><div class="study-tabs"><button class="${state.studyType==='all'?'selected':''}" data-action="study-type" data-type="all">Todo</button><button class="${state.studyType==='grammar'?'selected':''}" data-action="study-type" data-type="grammar">Gramática</button><button class="${state.studyType==='vocabulary'?'selected':''}" data-action="study-type" data-type="vocabulary">Vocabulario</button></div><label class="study-level">Nivel <select data-study-level><option value="all">Todos</option>${Object.keys(levels).map((v)=>`<option value="${v}" ${state.studyLevel===v?'selected':''}>${v}</option>`).join('')}</select></label><input class="study-search" data-study-search type="search" value="${state.studyQuery.replaceAll('"','&quot;')}" placeholder="Buscar una lección…" aria-label="Buscar lecciones"></div><div class="lesson-grid">${list.length?list.map((l)=>{const complete=!!progress.completed?.[l.id],score=progress.best?.[l.id];return `<button class="lesson-card" data-action="open-lesson" data-id="${l.id}"><span class="lesson-card-top"><span class="lesson-kind ${l.type}">${l.type==='grammar'?'GRAMÁTICA':'VOCABULARIO'}</span><span class="lesson-level">${l.level}</span></span><strong>${l.title}</strong><span class="lesson-description">${l.description}</span><span class="lesson-card-bottom"><span>${l.duration} min · ${l.quiz.length} preguntas</span><span>${complete?`✓ Completada · ${score}%`:'Comenzar →'}</span></span></button>`}).join(''):'<p class="study-empty">No encontramos lecciones con esos filtros.</p>'}</div>`;
    $('.hero').hidden=true;$('.row').hidden=true;root.hidden=false;
  }
  function openLesson(id) { state.currentLesson=lessons.find((l)=>l.id===id);if(!state.currentLesson)return;state.quizIndex=0;state.quizScore=0;state.quizAnswered=false;renderLesson(); }
  function renderLesson() {
    const l=state.currentLesson,q=l.quiz[state.quizIndex],chosen=Number($('#studyDashboard').dataset.chosen),progress=Math.round(state.quizIndex/l.quiz.length*100);
    $('#studyDashboard').innerHTML=`<button class="study-back" data-action="study-back">← Todas las lecciones</button><div class="lesson-detail-head"><span class="lesson-kind ${l.type}">${l.type==='grammar'?'GRAMÁTICA':'VOCABULARIO'} · ${l.level}</span><h2>${l.title}</h2><p>${l.description}</p></div><article class="lesson-explanation"><h3>La idea clave</h3><p>${l.lesson}</p><h4>Ejemplos</h4><ul>${l.examples.map((x)=>`<li>${x}</li>`).join('')}</ul></article><section class="quiz-card"><div class="quiz-meta"><span>Pregunta ${state.quizIndex+1} de ${l.quiz.length}</span><span>${state.quizScore} correctas</span></div><div class="study-progress"><span style="width:${progress}%"></span></div><h3>${q.q}</h3><div class="quiz-options">${q.options.map((x,i)=>`<button data-action="quiz-answer" data-index="${i}" class="quiz-option ${state.quizAnswered&&i===q.answer?'correct':''} ${state.quizAnswered&&i===chosen&&i!==q.answer?'incorrect':''}" ${state.quizAnswered?'disabled':''}>${x}</button>`).join('')}</div>${state.quizAnswered?`<p class="quiz-feedback">${q.explanation}</p><button class="btn blue quiz-next" data-action="quiz-next">${state.quizIndex===l.quiz.length-1?'Ver resultado':'Siguiente pregunta →'}</button>`:'<p class="quiz-hint">Selecciona una respuesta para ver la explicación.</p>'}</section>`;
  }
  function answerQuestion(index) { if(state.quizAnswered)return;state.quizAnswered=true;$('#studyDashboard').dataset.chosen=String(index);if(index===state.currentLesson.quiz[state.quizIndex].answer)state.quizScore++;renderLesson(); }
  function completeQuizQuestion() {
    if(state.quizIndex<state.currentLesson.quiz.length-1){state.quizIndex++;state.quizAnswered=false;renderLesson();return;}
    const l=state.currentLesson,score=Math.round(state.quizScore/l.quiz.length*100);state.user.learning||={completed:{},best:{}};state.user.learning.completed[l.id]=true;state.user.learning.best[l.id]=Math.max(state.user.learning.best[l.id]||0,score);saveUser();
    $('#studyDashboard').innerHTML=`<section class="lesson-result"><div class="result-icon">${score>=67?'✓':'↻'}</div><span class="study-kicker">LECCIÓN FINALIZADA</span><h2>${score>=67?'¡Buen trabajo!':'Sigue practicando'}</h2><p>Respondiste correctamente <strong>${state.quizScore} de ${l.quiz.length}</strong> preguntas en <strong>${l.title}</strong>.</p><div class="result-score">${score}%</div><div class="result-actions"><button class="btn blue" data-action="study-retry" data-id="${l.id}">Repetir lección</button><button class="btn green" data-action="study-list">Ver todas las lecciones</button></div></section>`;
  }
  async function refreshStatistics() {
    try { await refreshAccountStatistics(); }
    catch { toast('Could not refresh your statistics.'); }
    renderStatistics();
  }
  function renderStatistics() {
    const root=$('#studyDashboard'), sessions=state.user.sessions||[], learning=state.user.learning||{completed:{},best:{}};
    const ratings=(state.givenRatings?.length?state.givenRatings.map((rating)=>Number(rating.score)):sessions.map((session)=>Number(session.ratingGiven ?? session.rating))).filter((rating)=>rating>0&&rating<=5);
    const received=(state.receivedRatings||[]).map((rating)=>Number(rating.score)).filter((rating)=>rating>0&&rating<=5);
    const totalMinutes=sessions.reduce((sum,session)=>sum+(Number(session.min)||0),0), average=ratings.length?(ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1):'—';
    const completed=Object.keys(learning.completed||{}).length;
    const counts=new Map();sessions.forEach((session)=>{const topic=topics.find((item)=>item.id===session.topic);if(topic)counts.set(topic.name,(counts.get(topic.name)||0)+1);});
    const maxTopic=Math.max(1,...counts.values());
    const today=new Date();const week=Array.from({length:7},(_,index)=>{const date=new Date(today);date.setDate(today.getDate()-6+index);const key=date.toDateString();const mins=sessions.filter((session)=>session.date&&new Date(session.date).toDateString()===key).reduce((sum,session)=>sum+(Number(session.min)||0),0);return {label:date.toLocaleDateString('es',{weekday:'short'}),mins};});
    const maxWeek=Math.max(1,...week.map((item)=>item.mins));
    const receivedPeople=(state.receivedRatings||[]).filter((rating)=>Number(rating.score)>0&&Number(rating.score)<=5);
    const receivedPeopleMarkup=receivedPeople.length?`<div class="received-rating-list">${receivedPeople.map((rating)=>`<div class="received-rating-item"><span>${escapeHTML(rating.personName||rating.raterName||'Compañero de práctica')}</span><strong>${rating.score}/5</strong></div>`).join('')}</div>`:'<div class="received-rating-list empty">Aún no hay personas registradas.</div>';
    root.innerHTML=`<div class="analytics-heading"><div><span class="study-kicker">TU ACTIVIDAD</span><h2>Estadísticas</h2><p>Revisa tus prácticas, el progreso de estudio y las valoraciones guardadas.</p></div><button class="analytics-refresh" data-action="refresh-stats">Actualizar datos</button></div>
      <div class="analytics-grid"><article class="analytics-card"><span>Sesiones completadas</span><strong>${sessions.length}</strong><small>Prácticas registradas</small></article><article class="analytics-card"><span>Tiempo de práctica</span><strong>${totalMinutes<60?`${totalMinutes} min`:`${(totalMinutes/60).toFixed(1)} h`}</strong><small>Duración acumulada</small></article><article class="analytics-card"><span>Calificación que diste</span><strong>${average}<em>/5</em></strong><small>${ratings.length} valoración${ratings.length===1?'':'es'} a compañeros</small></article><article class="analytics-card received-card"><span>Calificaciones recibidas</span><strong>${received.length?`${(received.reduce((a,b)=>a+b,0)/received.length).toFixed(1)}/5`:'—'}</strong><small>${received.length?`${received.length} valoración${received.length===1?'':'es'} de compañeros`:'Aún no hay valoraciones recibidas'}</small>${receivedPeopleMarkup}</article></div>
      <div class="analytics-panels"><article class="analytics-panel"><div class="analytics-panel-title"><div><h3>Práctica esta semana</h3><p>Minutos por día · últimos siete días</p></div><strong>${week.reduce((sum,item)=>sum+item.mins,0)} min</strong></div><div class="week-chart">${week.map((day)=>`<div class="week-day"><div class="week-bar-wrap"><span style="height:${Math.max(day.mins?8:2,Math.round(day.mins/maxWeek*100))}%" title="${day.mins} min"></span></div><b>${day.mins}</b><small>${escapeHTML(day.label)}</small></div>`).join('')}</div></article>
      <article class="analytics-panel"><div class="analytics-panel-title"><div><h3>Tu aprendizaje</h3><p>Lecciones terminadas</p></div><strong>${completed}/${lessons.length}</strong></div><div class="learning-meter"><span style="width:${Math.min(100,completed/lessons.length*100)}%"></span></div><p class="analytics-note">${completed?`Has completado ${completed} de ${lessons.length} lecciones.`:'Aún no has completado lecciones.'}</p><button class="analytics-link" data-action="nav-study">Continuar aprendiendo →</button></article></div>
      <article class="analytics-panel topic-panel"><div class="analytics-panel-title"><div><h3>Temas de conversación</h3><p>Sesiones por tema</p></div><strong>${counts.size} temas</strong></div>${counts.size?[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([name,count])=>`<div class="topic-stat"><span>${escapeHTML(name)}</span><div><i style="width:${Math.round(count/maxTopic*100)}%"></i></div><b>${count}</b></div>`).join(''):'<p class="analytics-note">Tus temas aparecerán aquí después de completar prácticas.</p>'}</article>
      <p class="analytics-footnote">Las calificaciones recibidas se sincronizan con tu cuenta y se reflejan en estas estadísticas.</p>`;
    $('.hero').hidden=true;$('.row').hidden=true;root.hidden=false;
  }

  async function adminRequest(url, options={}) {
    const headers = options.method ? { ...await csrfHeaders(), 'Content-Type': 'application/json' } : {};
    const response = await fetch(url, { ...options, credentials:'same-origin', headers:{ ...headers, ...(options.headers||{}) } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.detail || payload?.message || 'No se pudo completar la operación administrativa.');
    return payload;
  }
  async function renderAdmin() {
    if (state.user?.role !== 'ADMIN') return dashboard();
    const root=$('#studyDashboard'); $('.hero').hidden=true;$('.row').hidden=true;root.hidden=false;
    root.innerHTML='<section class="admin-loading">Cargando panel de administración…</section>';
    try {
      const [users, levelRows, gamifications] = await Promise.all([adminRequest('/api/admin/users'), adminRequest('/api/admin/levels'), adminRequest('/api/admin/gamifications')]);
      const levelOptions = levelRows.map((level)=>`<option value="${escapeAttr(level.code)}">${escapeHTML(level.code)} · ${escapeHTML(level.label)}</option>`).join('');
      root.innerHTML=`<div class="admin-heading"><div><span class="study-kicker">CONTROL DE LA PLATAFORMA</span><h2>Administración</h2><p>Audita usuarios, alimenta niveles y crea reglas de gamificación.</p></div><span class="admin-role">SUPER USUARIO</span></div>
        <div class="admin-grid"><section class="admin-panel admin-users"><div class="admin-panel-title"><div><h3>Auditoría de usuarios</h3><p>${users.length} cuenta${users.length===1?'':'s'} registradas</p></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Usuario</th><th>Nivel</th><th>Sesiones</th><th>Valoraciones</th></tr></thead><tbody>${users.map((user)=>`<tr><td><strong>${escapeHTML(user.name)}</strong><small>${escapeHTML(user.email)}</small></td><td><select data-admin-user-level data-email="${escapeAttr(user.email)}">${levelRows.map((level)=>`<option value="${escapeAttr(level.code)}" ${level.code===user.level?'selected':''}>${escapeHTML(level.code)}</option>`).join('')}</select></td><td>${user.sessions}</td><td>${user.receivedRatings}</td></tr>`).join('')}</tbody></table></div></section>
        <section class="admin-panel"><div class="admin-panel-title"><div><h3>Niveles de inglés</h3><p>Catálogo usado para clasificar usuarios.</p></div></div><div class="admin-list">${levelRows.map((level)=>`<article class="admin-list-item"><div><strong>${escapeHTML(level.code)} · ${escapeHTML(level.label)}</strong><small>${escapeHTML(level.description||'Sin descripción')}</small></div><span class="admin-status ${level.active?'active':''}">${level.active?'Activo':'Inactivo'}</span></article>`).join('')}</div><form class="admin-form" data-admin-level-form><label>Código<input name="code" maxlength="10" placeholder="B2" required></label><label>Nombre<input name="label" maxlength="80" placeholder="Intermedio alto" required></label><label class="admin-full">Descripción<input name="description" maxlength="240" placeholder="Descripción del nivel"></label><button class="btn blue admin-full" data-action="admin-save-level">Agregar nivel</button></form></section>
        <section class="admin-panel"><div class="admin-panel-title"><div><h3>Gamificaciones</h3><p>Reglas que pueden convertirse en logros y puntos.</p></div></div><div class="admin-list">${gamifications.length?gamifications.map((item)=>`<article class="admin-list-item"><div><strong>${escapeHTML(item.name)} · ${item.points} puntos</strong><small>${escapeHTML(item.description)} · Regla: ${escapeHTML(item.rule)}</small></div><button class="admin-delete" data-action="admin-delete-gamification" data-id="${item.id}" aria-label="Eliminar gamificación">×</button></article>`).join(''):'<p class="admin-empty">Aún no hay gamificaciones creadas.</p>'}</div><form class="admin-form" data-admin-gamification-form><label>Nombre<input name="name" maxlength="100" placeholder="Primera conversación" required></label><label>Puntos<input name="points" type="number" min="0" max="10000" value="10" required></label><label class="admin-full">Descripción<input name="description" maxlength="240" placeholder="Completa tu primera práctica"></label><label class="admin-full">Regla<input name="rule" maxlength="80" placeholder="Completar una sesión"></label><button class="btn green admin-full" data-action="admin-save-gamification">Crear gamificación</button></form></section></div>`;
    } catch (error) { root.innerHTML=`<section class="admin-error"><h2>No se pudo abrir la administración</h2><p>${escapeHTML(error.message)}</p><button class="btn blue" data-action="admin-retry">Reintentar</button></section>`; }
  }
  async function adminSaveLevel() {
    const form=$('[data-admin-level-form]'); const body=Object.fromEntries(new FormData(form).entries());
    try { await adminRequest('/api/admin/levels',{method:'POST',body:JSON.stringify(body)}); await refreshLevelsCatalog(); toast('Nivel agregado.'); renderAdmin(); } catch(error) { toast(error.message); }
  }
  async function adminSaveGamification() {
    const form=$('[data-admin-gamification-form]'); const body=Object.fromEntries(new FormData(form).entries()); body.points=Number(body.points);
    try { await adminRequest('/api/admin/gamifications',{method:'POST',body:JSON.stringify(body)}); toast('Gamificación creada.'); renderAdmin(); } catch(error) { toast(error.message); }
  }
  async function adminUpdateUserLevel(el) {
    try { await adminRequest(`/api/admin/users/${encodeURIComponent(el.dataset.email)}/level`,{method:'PUT',body:JSON.stringify({code:el.value})}); toast('Nivel del usuario actualizado.'); } catch(error) { toast(error.message); renderAdmin(); }
  }
  async function adminDeleteGamification(id) {
    if (!confirm('¿Eliminar esta gamificación?')) return;
    try { await adminRequest(`/api/admin/gamifications/${id}`,{method:'DELETE'}); toast('Gamificación eliminada.'); renderAdmin(); } catch(error) { toast(error.message); }
  }

  const defaultCommunities = [
    {id:'country-co',type:'country',country:'Colombia',name:'Comunidad de Colombia',description:'Practica inglés con estudiantes de Colombia.',level:'Todos',createdBy:'V.O.C.A.L.',members:[]},
    {id:'country-mx',type:'country',country:'México',name:'Comunidad de México',description:'Comparte conversaciones y recursos con estudiantes de México.',level:'Todos',createdBy:'V.O.C.A.L.',members:[]},
    {id:'country-es',type:'country',country:'España',name:'Comunidad de España',description:'Un espacio para practicar inglés desde España.',level:'Todos',createdBy:'V.O.C.A.L.',members:[]},
    {id:'country-ar',type:'country',country:'Argentina',name:'Comunidad de Argentina',description:'Conecta con estudiantes de Argentina y practica inglés.',level:'Todos',createdBy:'V.O.C.A.L.',members:[]},
    {id:'study-a2',type:'study',country:'',name:'Conversación en inglés A2',description:'Practica situaciones cotidianas y gana confianza al hablar.',level:'A2',createdBy:'V.O.C.A.L.',members:[]},
    {id:'study-b1',type:'study',country:'',name:'English Conversation B1',description:'Debates, experiencias y conversaciones de nivel intermedio.',level:'B1',createdBy:'V.O.C.A.L.',members:[]},
    {id:'study-grammar',type:'study',country:'',name:'Grammar Lab',description:'Resuelve dudas de gramática con ejercicios y ejemplos.',level:'Todos',createdBy:'V.O.C.A.L.',members:[]},
    {id:'study-travel',type:'study',country:'',name:'Travel English Club',description:'Aprende expresiones útiles para tus próximos viajes.',level:'Todos',createdBy:'V.O.C.A.L.',members:[]}
  ];
  function getCommunities() {
    let groups=store.get('communities',null);
    if(!Array.isArray(groups)){groups=defaultCommunities.map((group)=>({...group,members:[],posts:[]}));store.set('communities',groups);}
    groups.forEach((group)=>{group.members||=[];group.posts||=[];});return groups;
  }
  function toggleCommunityPanel(panel) {
    if (!state.communityPanels) state.communityPanels = { mine: false, create: false };
    state.communityPanels[panel] = !state.communityPanels[panel];
    renderCommunity();
  }
  function renderCommunity() {
    const root=$('#studyDashboard'),groups=getCommunities(),email=state.user.email,query=(state.communityQuery||'').trim().toLowerCase();
    const panels = state.communityPanels || { mine: false, create: false };
    const mine=groups.filter((group)=>group.members.includes(email));
    const visible=groups.filter((group)=>(state.communityType==='all'||group.type===state.communityType)&&(!query||`${group.name} ${group.description} ${group.country} ${group.level}`.toLowerCase().includes(query)));
    root.innerHTML=`<div class="community-heading"><div><span class="study-kicker">APRENDE EN COMPAÑÍA</span><h2>Comunidades</h2><p>Encuentra estudiantes por país o únete a un grupo de estudio para practicar en equipo.</p></div><div class="community-count"><strong>${mine.length}</strong><span>mis grupos</span></div></div>
      <section class="my-communities community-collapsible ${panels.mine?'is-open':''}"><button class="community-collapse-toggle" data-action="toggle-community-panel" data-panel="mine" aria-expanded="${panels.mine}"><span><strong>Mis comunidades</strong><small>Espacios a los que ya perteneces</small></span><span class="community-chevron" aria-hidden="true">⌄</span></button><div class="community-collapsible-content">${mine.length?`<div class="my-group-list">${mine.map((group)=>`<button class="my-group-chip" data-action="open-community" data-id="${group.id}">✓ ${escapeHTML(group.name)}</button>`).join('')}</div>`:'<p class="community-empty compact">Aún no te has unido a un grupo. Explora las comunidades disponibles.</p>'}</div></section>
      <section class="community-create community-collapsible ${panels.create?'is-open':''}"><button class="community-collapse-toggle" data-action="toggle-community-panel" data-panel="create" aria-expanded="${panels.create}"><span><em class="study-kicker">CREA TU ESPACIO</em><strong>Inicia una comunidad</strong><small>Organiza un grupo por país o crea un espacio de estudio.</small></span><span class="community-chevron" aria-hidden="true">⌄</span></button><div class="community-collapsible-content"><div class="community-form"><label>Tipo<select data-community-type><option value="study">Grupo de estudio</option><option value="country">Comunidad por país</option></select></label><label>Nombre<input data-community-name maxlength="60" placeholder="Ej. Inglés para entrevistas"></label><label class="community-country-field" hidden>País<select data-community-country><option>Colombia</option><option>México</option><option>España</option><option>Argentina</option><option>Chile</option><option>Perú</option><option>Otro</option></select></label><label class="community-level-field">Nivel<select data-community-level><option>Todos</option>${Object.keys(levels).map((level)=>`<option>${level}</option>`).join('')}</select></label><label class="community-description-field">Descripción<input data-community-description maxlength="140" placeholder="¿Qué harán en este grupo?"></label><button class="btn blue" data-action="create-community">Crear comunidad</button></div></div></section>
      <div class="community-section-title discover-title"><div><h3>Explorar comunidades</h3><p>${visible.length} espacios disponibles</p></div><input class="study-search" data-community-search type="search" value="${escapeHTML(state.communityQuery||'')}" placeholder="Buscar grupos…" aria-label="Buscar comunidades"></div>
      <div class="study-tabs community-tabs"><button class="${state.communityType==='all'?'selected':''}" data-action="community-filter" data-type="all">Todas</button><button class="${state.communityType==='country'?'selected':''}" data-action="community-filter" data-type="country">Por país</button><button class="${state.communityType==='study'?'selected':''}" data-action="community-filter" data-type="study">Grupos de estudio</button></div>
      <div class="community-grid">${visible.length?visible.map((group)=>{const joined=group.members.includes(email);return `<article class="community-card"><div class="community-card-head"><span class="community-badge ${group.type}">${group.type==='country'?'POR PAÍS':'GRUPO DE ESTUDIO'}</span><span class="community-level">${escapeHTML(group.type==='country'?group.country:group.level)}</span></div><h4>${escapeHTML(group.name)}</h4><p>${escapeHTML(group.description)}</p><div class="community-card-meta"><span>👥 ${group.members.length} miembro${group.members.length===1?'':'s'}</span><span>${escapeHTML(group.createdBy==='V.O.C.A.L.'?'Comunidad V.O.C.A.L.':group.createdBy)}</span></div><div class="community-card-actions"><button class="community-open" data-action="open-community" data-id="${group.id}">Ver grupo</button><button class="${joined?'community-leave':'community-join'}" data-action="${joined?'leave-community':'join-community'}" data-id="${group.id}">${joined?'Salir':'Unirme'}</button></div></article>`;}).join(''):'<p class="community-empty">No encontramos comunidades con esa búsqueda.</p>'}</div>`;
    const exploreTitle = root.querySelector('.discover-title'), exploreTabs = root.querySelector('.community-tabs'), exploreGrid = root.querySelector('.community-grid');
    const minePanel = root.querySelector('.my-communities'), createPanel = root.querySelector('.community-create');
    const heading = root.querySelector('.community-heading');
    if (heading && exploreTitle && exploreTabs && exploreGrid && minePanel && createPanel) heading.after(exploreTitle, exploreTabs, exploreGrid, minePanel, createPanel);
    root.hidden=false;$('.hero').hidden=true;$('.row').hidden=true;
  }
  function openCommunity(id) {
    const group=getCommunities().find((item)=>item.id===id);if(!group)return;
    const members=group.members.map((email)=>{const user=store.get('users',{})[email];return user?.name||email;});
    const joined=group.members.includes(state.user.email),owner=group.createdBy===state.user.email;group.posts||=[];
    $('#studyDashboard').innerHTML=`<button class="study-back" data-action="community-back">← Todas las comunidades</button><section class="community-detail"><span class="community-badge ${group.type}">${group.type==='country'?'COMUNIDAD POR PAÍS':'GRUPO DE ESTUDIO'}</span><h2>${escapeHTML(group.name)}</h2><p>${escapeHTML(group.description)}</p><div class="community-detail-stats"><span><strong>${group.members.length}</strong> miembros</span><span><strong>${escapeHTML(group.type==='country'?group.country:group.level)}</strong> ${group.type==='country'?'País':'Nivel'}</span><span><strong>${escapeHTML(group.createdBy==='V.O.C.A.L.'?'V.O.C.A.L.':group.createdBy)}</strong> creador</span></div><h3>Integrantes</h3>${members.length?`<ul class="member-list">${members.map((name)=>`<li>${escapeHTML(name)}</li>`).join('')}</ul>`:'<p class="community-empty compact">Todavía no hay integrantes. ¡Sé la primera persona en unirte!</p>'}      <section class="group-wall"><h3>Conversación del grupo</h3>${joined?`<div class="group-post-form"><textarea data-community-post rows="3" maxlength="500" placeholder="Comparte una pregunta, idea o recurso…"></textarea><button class="btn blue" data-action="post-community" data-id="${group.id}">Publicar</button></div>`:'<p class="analytics-note">Únete al grupo para compartir publicaciones.</p>'}<div class="group-posts">${group.posts.slice().reverse().map((post)=>{const author=store.get('users',{})[post.email]?.name||post.email;return `<article class="group-post"><div><strong>${escapeHTML(author)}</strong><time>${new Date(post.date).toLocaleDateString('es')}</time></div><p>${escapeHTML(post.body)}</p></article>`;}).join('')||'<p class="community-empty compact">Aún no hay publicaciones. Inicia la conversación.</p>'}</div></section><div class="community-detail-actions">${joined?`<button class="community-leave" data-action="leave-community" data-id="${group.id}">Salir del grupo</button>`:`<button class="btn green" data-action="join-community" data-id="${group.id}">Unirme al grupo</button>`}${owner?`<button class="community-delete" data-action="delete-community" data-id="${group.id}">Eliminar grupo</button>`:''}</div></section>`;
    $('#studyDashboard').hidden=false;
  }
  function joinCommunity(id) { const groups=getCommunities(),group=groups.find((item)=>item.id===id);if(!group)return;if(!group.members.includes(state.user.email))group.members.push(state.user.email);store.set('communities',groups);toast('Te uniste a la comunidad.');openCommunity(id); }
  function leaveCommunity(id) { const groups=getCommunities(),group=groups.find((item)=>item.id===id);if(!group)return;group.members=group.members.filter((email)=>email!==state.user.email);store.set('communities',groups);toast('Saliste de la comunidad.');renderCommunity(); }
  function createCommunity() {
    const name=$('[data-community-name]').value.trim(),description=$('[data-community-description]').value.trim(),type=$('[data-community-type]').value;
    if(name.length<3)return toast('Escribe un nombre de al menos 3 caracteres.');
    const groups=getCommunities(),id=`group-${Date.now()}`,country=type==='country'?$('[data-community-country]').value:'';
    groups.unshift({id,type,country,name,description:description||'Grupo creado por un estudiante de V.O.C.A.L.',level:type==='study'?$('[data-community-level]').value:'Todos',createdBy:state.user.email,members:[state.user.email]});store.set('communities',groups);state.communityType='all';state.communityQuery='';toast('Comunidad creada. Ya formas parte de ella.');openCommunity(id);
  }
  function addCommunityPost(id) {
    const body=$('[data-community-post]').value.trim();if(!body)return toast('Escribe algo antes de publicar.');
    const groups=getCommunities(),group=groups.find((item)=>item.id===id);if(!group||!group.members.includes(state.user.email))return;
    group.posts.push({email:state.user.email,body,date:new Date().toISOString()});store.set('communities',groups);openCommunity(id);
  }
  function deleteCommunity(id) { const groups=getCommunities(),group=groups.find((item)=>item.id===id);if(!group||group.createdBy!==state.user.email)return;store.set('communities',groups.filter((item)=>item.id!==id));toast('Comunidad eliminada.');renderCommunity(); }
  function search() {
    if (!state.topic) { toast('Choose a conversation topic before starting.'); dashboard(); return; }
    const u = state.user;
    state.finishing = false;
    state.searching = true;
    $('#findAvatar').textContent = u.name[0].toUpperCase();
    $('#findText').textContent = `Connecting to find a conversation partner at your level: ${levels[u.level]} (${u.level})`;
    show('searching');
    ensureSignalingConnection();
  }
  function sendMatchSearch() {
    if (!state.searching || !state.signaling?.connected) return;
    state.signaling.publish({ destination: '/app/matchmaking/search', body: JSON.stringify({ level: state.user.level, topicId: state.topic }) });
    $('#findText').textContent = `Finding a conversation partner at your level: ${levels[state.user.level]} (${state.user.level})`;
  }
  function ensureSignalingConnection() {
    if (!window.StompJs?.Client || !window.SockJS) {
      state.searching = false;
      $('#findText').textContent = 'The secure connection libraries did not load. Check your internet connection and reload.';
      return;
    }
    if (state.signaling) { if (state.signaling.connected) sendMatchSearch(); return; }
    const client = new StompJs.Client({
      webSocketFactory: () => new SockJS(`${window.location.origin}/vocal-signaling`),
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
      onConnect: () => {
        state.matchSubscription?.unsubscribe();
        state.matchSubscription = client.subscribe('/user/queue/match', ({ body }) => {
          let result; try { result = JSON.parse(body); } catch { return; }
          if (result.type === 'WAITING') $('#findText').textContent = 'Waiting for another student at your level…';
          if (result.type === 'ERROR') { state.searching = false; $('#findText').textContent = result.detail || 'Could not start matching.'; }
          if (result.type === 'MATCH_FOUND') {
            if (state.searching) { state.searching = false; void room(result); }
            else client.publish({ destination: `/app/room/${result.roomId}`, body: JSON.stringify({ type: 'LEAVE', payload: null }) });
          }
        });
        sendMatchSearch();
        if (state.roomId) subscribeRoomChannel();
      },
      onStompError: () => { if (state.searching) $('#findText').textContent = 'The server could not complete the connection. You can cancel and try again.'; },
      onWebSocketClose: () => { if (state.searching) $('#findText').textContent = 'Connection lost. Trying to reconnect…'; }
    });
    state.signaling = client;
    client.activate();
  }

  /* ---------- 5. Sala de videollamada ---------- */
  async function room(match) {
    const u = state.user;
    if (!match?.roomId) return;
    state.roomId = match.roomId;
    state.partner = match.partnerName ? { name: match.partnerName, level: match.partnerLevel || u.level } : null;
    state.localRoleIsA = !!match.initiator;
    const availableTopics = topics.filter((topic) => topic.levels?.includes(u.level));
    if (!availableTopics.length) { toast('There are no suggested topics for your level yet.'); dashboard(); return; }
    const seed = [...match.roomId].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
    state.current = availableTopics.find((topic) => topic.id === match.topicId) || availableTopics[seed % availableTopics.length];
    state.currentSubtopic = state.current.subtopics[Math.floor(seed / availableTopics.length) % state.current.subtopics.length];
    const t = state.current;
    const subtopic = state.currentSubtopic;
    $('#topicText').textContent = `${t.roomName}: ${subtopic.name} — ${subtopic.prompt}`;
    state.questionIndex = 0;
    renderCurrentQuestion();
    $('#localName').textContent = `${u.name} (You) - ${u.level}`;
    $('#remoteName').textContent = state.partner ? `${state.partner.name} · ${state.partner.level}` : `Waiting for a partner (${u.level})`;
    $('#micBtn').textContent = '🎤 Microphone on'; $('#camBtn').textContent = '📷 Camera on';
    ['#micBtn', '#camBtn'].forEach((b) => $(b).classList.remove('off'));
    $('#toolBox').hidden = true; state.hint = 0;
    $$('.soft[data-t]').forEach((button) => { button.setAttribute('aria-expanded', 'false'); button.querySelector('.tool-chevron').textContent = '＋'; });
    $('#chatMessages').replaceChildren(); $('#chatBadge').hidden = true; state.chatUnread = 0;
    setRoomTab('guide');
    show('room');
    state.roomReady = false; state.roomOfferSent = false; state.localMediaReady = false;
    createPeerConnection();
    state.t0 = Date.now(); clearInterval(state.tick);
    state.tick = setInterval(() => {
      const s = Math.floor((Date.now() - state.t0) / 1000);
      $('#clock').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }, 1000);
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      toast('Camera or microphone access failed. Check browser permissions; trying audio-only connection.');
      try { state.stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true }); }
      catch { state.stream = null; }
    }
    if (state.finishing || !$('#room').classList.contains('active')) {
      state.stream?.getTracks().forEach((track) => track.stop()); state.stream = null; return;
    }
    const sentKinds = new Set();
    if (state.stream) {
      const cameraTrack = state.stream.getVideoTracks()[0];
      if (cameraTrack) { $('#localVideo').srcObject = state.stream; $('#localTile').classList.add('live'); }
      state.stream.getTracks().forEach((track) => {
        state.peer.addTrack(track, state.stream);
        sentKinds.add(track.kind);
      });
      state.stream.getTracks().forEach((track) => track.addEventListener('ended', () => {
        if (!state.finishing && $('#room').classList.contains('active')) toast(`${track.kind === 'audio' ? 'Your microphone' : 'Your camera'} was disconnected.`);
      }));
    }
    for (const kind of ['audio', 'video']) {
      if (!sentKinds.has(kind)) state.peer.addTransceiver(kind, { direction: 'recvonly' });
    }
    if (state.finishing || !$('#room').classList.contains('active')) return;
    state.localMediaReady = true;
    subscribeRoomChannel();
    maybeCreateOffer();
  }
  function currentQuestions() {
    const t = state.current;
    if (!t) return [];
    const warmUp = new Set(t.phases?.warmUp || [0, 1, 2]);
    const questions = state.currentSubtopic?.questions || t.questions || [];
    return questions.map((question, index) => ({
      ...(typeof question === 'string' ? { text: question, interaction: 'Give a detailed answer, then ask your partner a related follow-up question.' } : question),
      phase: warmUp.has(index) ? 'Warm-up' : 'Deep Dive'
    }));
  }
  function renderCurrentQuestion() {
    const qs = currentQuestions(), index = Math.min(state.questionIndex, qs.length - 1), question = qs[index];
    if (!question) return;
    $('#questions').innerHTML = `<li class="current-question"><p class="question-main">${index + 1}. ${escapeHTML(question.text)}</p><p class="question-interaction">${escapeHTML(question.interaction || 'Give a detailed answer, then ask your partner a related follow-up question.')}</p></li>`;
    $('#questionPhase').textContent = question.phase;
    const roleBadge = $('#questionRoles');
    if (question.roles) {
      const localRole = state.localRoleIsA ? question.roles.a : question.roles.b;
      const partnerRole = state.localRoleIsA ? question.roles.b : question.roles.a;
      roleBadge.textContent = `You are: ${localRole} · Partner: ${partnerRole}`;
      roleBadge.hidden = false;
    } else { roleBadge.textContent = ''; roleBadge.hidden = true; }
    $('#questionCounter').textContent = `Question ${index + 1} of ${qs.length}`;
    $('.next-question').textContent = index === qs.length - 1 ? 'Restart the guide ↻' : 'Next question →';
    state.questionStarted = false;
    $('.start-question').disabled = false;
    $('.next-question').disabled = true;
    $('#questionElapsed').textContent = `Question ${index + 1} · 00:00`;
    $('#questionProgress').style.width = '0%';
    clearInterval(state.questionTick);
  }
  function startQuestionTimer() {
    clearInterval(state.questionTick); state.questionT0 = Date.now(); updateQuestionTimer();
    state.questionTick = setInterval(updateQuestionTimer, 1000);
  }
  function updateQuestionTimer() {
    if (!state.questionStarted) return;
    const elapsed = Math.floor((Date.now() - state.questionT0) / 1000), seconds = elapsed % 60, mins = Math.floor(elapsed / 60);
    $('#questionElapsed').textContent = `Question ${state.questionIndex + 1} · ${String(mins).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
    $('#questionProgress').style.width = `${Math.min(elapsed / 90 * 100, 100)}%`;
  }
  function startQuestion(fromPeer = false) {
    if (state.questionStarted) return;
    state.questionStarted = true;
    $('.start-question').disabled = true;
    $('.next-question').disabled = false;
    startQuestionTimer();
    if (!fromPeer) sendRoomEvent('QUESTION_START', { index: state.questionIndex });
  }
  function nextQuestion(fromPeer = false) {
    const questions = currentQuestions(); if (!questions.length) return;
    if (!state.questionStarted) return;
    state.questionIndex = (state.questionIndex + 1) % questions.length;
    renderCurrentQuestion();
    if (!fromPeer) sendRoomEvent('QUESTION', { index: state.questionIndex });
  }
  function setRoomTab(tab) {
    const chat = tab === 'chat';
    $('#guidePanel').hidden = chat; $('#chatPanel').hidden = !chat;
    $$('.room-tab').forEach((button) => { const active = button.dataset.tab === tab; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); });
    if (chat) { state.chatUnread = 0; $('#chatBadge').hidden = true; $('#chatInput').focus(); }
  }
  function subscribeRoomChannel() {
    if (!state.signaling?.connected || !state.roomId || !state.localMediaReady) return;
    state.roomSubscription?.unsubscribe();
    state.roomSubscription = state.signaling.subscribe(`/topic/room/${state.roomId}`, ({ body }) => {
      let signal; try { signal = JSON.parse(body); } catch { return; }
      if (signal.sender === state.user.email || !$('#room').classList.contains('active')) return;
      void handleRoomSignal(signal);
    });
    $('#chatStatus').textContent = 'Connected to your partner';
    sendRoomEvent('READY');
  }
  function sendRoomEvent(type, payload = null) {
    if (!state.signaling?.connected || !state.roomId) return;
    state.signaling.publish({ destination: `/app/room/${state.roomId}`, body: JSON.stringify({ type, payload }) });
  }
  function maybeCreateOffer() {
    if (state.roomReady && state.localMediaReady && state.localRoleIsA && !state.roomOfferSent && state.peer && state.signaling?.connected) {
      state.roomOfferSent = true;
      void createOffer();
    }
  }
  function createPeerConnection() {
    if (!window.RTCPeerConnection) { toast('This browser does not support WebRTC video calls.'); return; }
    if (state.peer) state.peer.close();
    state.pendingIce = [];
    state.peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] });
    state.peer.onicecandidate = ({ candidate }) => { if (candidate) sendRoomEvent('ICE_CANDIDATE', candidate.toJSON()); };
    state.peer.ontrack = ({ streams, track }) => {
      const video = $('#remoteVideo');
      if (streams[0]) video.srcObject = streams[0];
      else {
        if (!(video.srcObject instanceof MediaStream)) video.srcObject = new MediaStream();
        if (!video.srcObject.getTracks().some((currentTrack) => currentTrack.id === track.id)) video.srcObject.addTrack(track);
      }
      $('#remoteTile').classList.add('live');
      void video.play().catch(() => {});
    };
    state.peer.onconnectionstatechange = () => {
      const status = state.peer?.connectionState;
      if (status === 'failed') toast('The peer-to-peer connection failed. Check your network and camera permissions.');
      if (status === 'disconnected') $('#chatStatus').textContent = 'Partner connection interrupted…';
      if (status === 'connected') $('#chatStatus').textContent = 'Connected to your partner';
    };
  }
  async function createOffer() {
    if (!state.peer || !state.signaling?.connected) return;
    try {
      const offer = await state.peer.createOffer();
      await state.peer.setLocalDescription(offer);
      sendRoomEvent('OFFER', state.peer.localDescription.toJSON());
    } catch { toast('Could not start the video connection.'); }
  }
  async function handleRoomSignal(signal) {
    if (signal.type === 'ROOM_READY') { state.roomReady = true; maybeCreateOffer(); return; }
    if (signal.type === 'CHAT') { appendChatMessage(signal.payload, false); return; }
    if (signal.type === 'QUESTION' && Number.isInteger(signal.payload?.index) && signal.payload.index >= 0 && signal.payload.index < currentQuestions().length) {
      state.questionIndex = signal.payload.index; renderCurrentQuestion(); toast('Your partner moved to the next question.'); return;
    }
    if (signal.type === 'QUESTION_START' && signal.payload?.index === state.questionIndex) { startQuestion(true); return; }
    if (signal.type === 'PARTNER_LEFT') { $('#remoteTile').classList.remove('live'); $('#remoteVideo').srcObject = null; $('#remoteName').textContent = state.partner ? `${state.partner.name} disconnected` : `Partner disconnected (${state.user.level})`; toast('Your partner left the room.'); return; }
    const peer = state.peer; if (!peer) return;
    try {
      if (signal.type === 'OFFER') {
        await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
        for (const candidate of state.pendingIce.splice(0)) await peer.addIceCandidate(new RTCIceCandidate(candidate));
        const answer = await peer.createAnswer(); await peer.setLocalDescription(answer);
        sendRoomEvent('ANSWER', peer.localDescription.toJSON());
      } else if (signal.type === 'ANSWER') {
        await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
        for (const candidate of state.pendingIce.splice(0)) await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } else if (signal.type === 'ICE_CANDIDATE' && signal.payload) {
        if (peer.remoteDescription) await peer.addIceCandidate(new RTCIceCandidate(signal.payload));
        else state.pendingIce.push(signal.payload);
      }
    } catch { toast('A call signal could not be processed. Try leaving and joining again.'); }
  }
  function appendChatMessage(message, own) {
    const item = document.createElement('article'); item.className = `chat-message${own ? ' own' : ''}`;
    const author = document.createElement('strong'); author.textContent = own ? 'You' : (message.author || 'Partner');
    const body = document.createElement('p'); body.textContent = message.text;
    const time = document.createElement('time'); time.textContent = new Date(message.time || Date.now()).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    item.append(author, body, time); $('#chatMessages').append(item); $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
    if (!own && $('#chatPanel').hidden) { state.chatUnread++; $('#chatBadge').textContent = state.chatUnread; $('#chatBadge').hidden = false; }
  }
  function sendChatMessage(event) {
    event.preventDefault(); const input = $('#chatInput'), text = input.value.trim(); if (!text) return;
    const message = { text, author: state.user?.name || 'Student', time: Date.now() };
    appendChatMessage(message, true); sendRoomEvent('CHAT', message); input.value = ''; input.focus();
  }
  function toggleTrack(kind, btn) {
    const tracks = state.stream ? (kind === 'audio' ? state.stream.getAudioTracks() : state.stream.getVideoTracks()) : [];
    if (!tracks.length) return toast('Allow camera and microphone access to use this control.');
    const on = !tracks[0].enabled; tracks.forEach((t) => (t.enabled = on));
    btn.classList.toggle('off', !on);
    btn.textContent = kind === 'audio' ? `🎤 Microphone ${on ? 'on' : 'off'}` : `📷 Camera ${on ? 'on' : 'off'}`;
    if (kind === 'video') $('#localTile').classList.toggle('live', on);
  }
  function tool(name) {
    const box = $('#toolBox'), tr = $('#translator'), hint = $('#hintOut');
    const toggle = $(`.soft[data-t="${name}"]`);
    const isOpen = !box.hidden && (name === 'translator' ? !tr.hidden : !hint.hidden);
    if (isOpen) {
      box.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.querySelector('.tool-chevron').textContent = '＋';
      return;
    }
    box.hidden = false; tr.hidden = name !== 'translator'; hint.hidden = name !== 'hint';
    $$('.soft[data-t]').forEach((button) => {
      const expanded = button.dataset.t === name;
      button.setAttribute('aria-expanded', String(expanded));
      button.querySelector('.tool-chevron').textContent = expanded ? '−' : '＋';
    });
    if (name === 'hint') renderHint();
  }
  function renderHint() {
    const output = $('#hintOut'), words = state.current?.vocab || [];
    if (!words.length) { output.textContent = 'No vocabulary hints are available for this topic yet.'; return; }
    const hint = words[state.hint % words.length];
    state.hint = (state.hint + 1) % words.length;
    output.innerHTML = `<div class="hint-heading"><strong>💡 Pista</strong><button class="hint-next" type="button" data-action="next-hint">Siguiente pista ↻</button></div><div class="hint-term"><button class="vocab-word" data-action="vocab-example" data-word="${escapeAttr(hint.word)}" data-example="${escapeAttr(hint.example)}">${escapeHTML(hint.word)}</button><span class="hint-translation">${escapeHTML(hint.translation)}</span></div><p class="hint-synonyms"><strong>Sinónimos en inglés:</strong> ${escapeHTML(hint.synonyms)}</p><div class="hint-example-wrap"><p class="vocab-example" hidden></p><button class="copy-word" data-action="copy-word" data-word="${escapeAttr(hint.word)}">Copiar palabra</button></div>`;
  }
  async function translate() {
    const q = $('#trIn').value.trim(), out = $('#trOut'), direction = $('#trDirection').dataset.direction || 'es|en';
    if (!q) { out.textContent = 'Enter a phrase to translate.'; out.hidden = false; return; }
    const targetLanguage = direction.split('|')[1] === 'es' ? 'Spanish' : 'English';
    const button = $('[data-action="translate"]'); button.disabled = true; out.hidden = false; out.classList.add('translating'); out.textContent = 'Translating…';
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${direction}`);
      if (!r.ok) throw new Error('translation unavailable');
      const result = await r.json(), translation = result.responseData?.translatedText;
      if (!translation) throw new Error('empty translation');
      out.textContent = translation.replace(/<[^>]*>/g, '');
    } catch { out.textContent = 'Translation failed. Check your connection and try again.'; }
    finally { button.disabled = false; button.textContent = `Translate to ${targetLanguage}`; out.classList.remove('translating'); }
  }
  function updateTranslationDirection() {
    const control = $('#trDirection');
    control.dataset.direction = control.dataset.direction === 'es|en' ? 'en|es' : 'es|en';
    const direction = control.dataset.direction, sourceCode = direction.split('|')[0], targetCode = direction.split('|')[1];
    const source = sourceCode === 'en' ? 'English' : 'Spanish', target = targetCode === 'es' ? 'Spanish' : 'English';
    control.textContent = `${sourceCode.toUpperCase()} → ${targetCode.toUpperCase()}`;
    control.setAttribute('aria-label', `Switch translation direction. Current: ${source} to ${target}`);
    $('#trIn').placeholder = `Type a phrase in ${source}…`;
    $('#translator [data-action="translate"]').textContent = `Translate to ${target}`;
    $('#trOut').textContent = ''; $('#trOut').hidden = true;
  }
  function endCall() {
    if (state.finishing) return;
    state.finishing = true;
    const finishedRoomId = state.roomId;
    state.ratingRoomId = finishedRoomId;
    state.minutes = Math.max(1, Math.floor((Date.now() - state.t0) / 60000));
    try {
      clearInterval(state.tick);
      clearInterval(state.questionTick);
      try { if (finishedRoomId) sendRoomEvent('LEAVE'); } catch (error) { console.warn('Could not notify the partner that the call ended.', error); }
      try { state.roomSubscription?.unsubscribe(); } catch (error) { console.warn('Could not unsubscribe from the room.', error); }
      state.roomSubscription = null;
      try { state.peer?.close(); } catch (error) { console.warn('Could not close the video connection.', error); }
      state.peer = null;
      if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
      state.partner = null;
      state.localMediaReady = false;
      $('#localVideo').srcObject = null;
      $('#remoteVideo').srcObject = null;
      $('#localTile').classList.remove('live');
      $('#remoteTile').classList.remove('live');
      state.roomId = null;
      state.user.sessions ||= [];
      const session = { sessionId: globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }), date: new Date().toISOString(), min: state.minutes, topic: state.current?.id || '', rating: 0, ratingGiven: 0, ratingReceived: null };
      state.user.sessions.push(session);
      void savePracticeSession(session);
      try { saveUser(); } catch (error) { console.warn('Could not save the local session summary.', error); }
      $('#sumMin').textContent = state.minutes + ' MIN';
      $('#sumLvl').textContent = state.user.level;
      rate(0);
    } catch (error) {
      console.error('The practice ended with a cleanup issue.', error);
      toast('The practice ended. Some session details could not be saved.');
    } finally {
      state.roomId = null;
      state.partner = null;
      show('summary');
    }
  }
  function rate(n) {
    $$('#stars button').forEach((b, i) => {
      b.classList.toggle('on', i < n);
      b.setAttribute('aria-pressed', String(i < n));
    });
    if (!n) return;
    const sessions = state.user.sessions, latest = sessions[sessions.length - 1];
    if (latest) { latest.rating = n; latest.ratingGiven = n; saveUser(); }
    const roomId = state.ratingRoomId;
    if (!roomId) { toast('This practice was not matched, so no partner rating was saved.'); return; }
    void (async () => {
      try {
        const headers = await csrfHeaders();
        const response = await fetch('/api/user/ratings', { method: 'POST', credentials: 'same-origin', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, score: n }) });
        if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.message || 'Could not save the partner rating.'); }
        state.ratingRoomId = null;
        state.givenRatings = [{ score: n, createdAt: new Date().toISOString() }, ...(state.givenRatings || [])];
        toast('Thanks! Your partner rating was saved.');
      } catch (error) { toast(error.message || 'Could not save the partner rating.'); }
    })();
  }

  /* ---------- Acciones (delegación de eventos) ---------- */
  const actions = {
    switch: () => setMode(state.mode === 'login' ? 'register' : 'login'),
    forgot: () => toast('Para recuperar la contraseña, crea una cuenta nueva o contacta al administrador de V.O.C.A.L.'),
    nav: (el) => {
      $$('.nav').forEach((button) => button.classList.toggle('on', button === el));
      const key = el.textContent.trim();
      if (key === 'ADMINISTRACIÓN') return renderAdmin();
      if (key === 'AJUSTES/PERFIL') return editProfile();
      if (key === 'MATERIAL DE ESTUDIO') return renderStudy();
      if (key === 'MIS ESTADÍSTICAS') return renderStatistics();
      if (key === 'COMUNIDAD') return renderCommunity();
      $('#studyDashboard').hidden = true; $('.hero').hidden = false;
      const views = {
        'INICIO': ['Comienza a practicar sin miedo al qué dirán', 'Conéctate con un compañero de tu mismo nivel y rompe el hielo con temas guiados.'],
        'MATERIAL DE ESTUDIO': ['Material de estudio', 'Selecciona un tema sugerido y revisa las preguntas guía durante tu próxima práctica.'],
        'MIS ESTADÍSTICAS': ['Métricas de progreso', `Llevas ${$('#hours').textContent} de práctica conversacional acumulada.`],
        'COMUNIDAD': ['Practica en comunidad', 'Inicia una práctica para buscar un compañero de conversación de tu nivel.']
      };
      const [title, description] = views[key] || views.INICIO;
      $('.hero h3').textContent = title;
      $('.hero p').textContent = description;
      $('.hero [data-action="start"]').hidden = key === 'MIS ESTADÍSTICAS';
      $('.row').hidden = false;
      $('#topics').closest('.box').hidden = key === 'MIS ESTADÍSTICAS';
    },
    profile: editProfile,
    'account-menu': (el) => toggleQuickPanel('account',el),
    'settings-app': () => openSettings('app'),
    'settings-tab': (el) => openSettings(el.dataset.tab),
    'save-profile': saveProfile,
    'save-preferences': savePreferences,
    'reset-preferences': resetPreferences,
    'change-password': changePassword,
    'remove-photo': () => { state.user.photo=null; saveUser(); updateAvatar(); renderSettings(); },
    'close-panel': closeQuickPanel,
    'go-community': () => { $$('.nav').forEach((button) => button.classList.toggle('on', button.textContent.trim() === 'COMUNIDAD')); renderCommunity(); },
    'study-type': (el) => { state.studyType = el.dataset.type; renderStudy(); },
    'open-lesson': (el) => openLesson(el.dataset.id),
    'study-back': renderStudy,
    'quiz-answer': (el) => answerQuestion(Number(el.dataset.index)),
    'quiz-next': completeQuizQuestion,
    'study-retry': (el) => openLesson(el.dataset.id),
    'study-list': renderStudy,
    'nav-study': () => { $$('.nav').forEach((button) => button.classList.toggle('on', button.textContent.trim() === 'MATERIAL DE ESTUDIO')); renderStudy(); },
    'refresh-stats': refreshStatistics,
    'admin-save-level': adminSaveLevel,
    'admin-save-gamification': adminSaveGamification,
    'admin-delete-gamification': (el) => adminDeleteGamification(el.dataset.id),
    'admin-retry': renderAdmin,
    'community-filter': (el) => { state.communityType = el.dataset.type; renderCommunity(); },
    'toggle-community-panel': (el) => toggleCommunityPanel(el.dataset.panel),
    'community-back': renderCommunity,
    'open-community': (el) => openCommunity(el.dataset.id),
    'join-community': (el) => joinCommunity(el.dataset.id),
    'leave-community': (el) => leaveCommunity(el.dataset.id),
    'create-community': createCommunity,
    'post-community': (el) => addCommunityPost(el.dataset.id),
    'delete-community': (el) => { if (confirm('¿Eliminar esta comunidad? Esta acción no se puede deshacer.')) deleteCommunity(el.dataset.id); },
    bell: (el) => toggleQuickPanel('notifications',el),
    help: (el) => toggleQuickPanel('help',el),
    logout: async () => {
      closeQuickPanel();
      try { const headers = await csrfHeaders(); await fetch('/logout', { method: 'POST', credentials: 'same-origin', headers }); }
      catch { /* The server session may already be closed. */ }
      await state.signaling?.deactivate();
      state.signaling = null; state.user = null; localStorage.removeItem('vocal.session'); window.location.assign('/');
    },
    topic: (el) => {
      const selected = topics.find((topic) => topic.id === el.dataset.id);
      if (!selected?.levels?.includes(state.user.level)) return toast('Ese tema no está disponible para tu nivel.');
      state.topic = state.topic === selected.id ? null : selected.id; dashboard();
    },
    start: search,
    cancel: () => {
      state.searching = false;
      if (state.signaling?.connected) state.signaling.publish({ destination: '/app/matchmaking/cancel', body: '{}' });
      dashboard();
    },
    mic: (el) => toggleTrack('audio', el),
    cam: (el) => toggleTrack('video', el),
    tool: (el) => tool(el.dataset.t),
    'room-language': () => setRoomLanguage(state.roomLanguage === 'en' ? 'es' : 'en'),
    'room-tab': (el) => setRoomTab(el.dataset.tab),
    'start-question': () => startQuestion(),
    'next-question': () => nextQuestion(),
    'translation-direction': updateTranslationDirection,
    'vocab-example': (el) => { const output = $('#hintOut .vocab-example'); output.hidden = false; output.textContent = el.dataset.example; },
    'copy-word': async (el) => { try { await navigator.clipboard.writeText(el.dataset.word); toast(`“${el.dataset.word}” copied.`); } catch { toast(`Word: ${el.dataset.word}`); } },
    'next-hint': () => renderHint(),
    translate,
    end: endCall,
    rate: (el) => rate(+el.dataset.n),
    home: dashboard
  };
  document.addEventListener('submit', (e) => { if (e.target.matches('.settings-form')) e.preventDefault(); });
  document.addEventListener('submit', (e) => { if (e.target.id === 'chatForm') sendChatMessage(e); });
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-setting-level]')) {
      state.user.level = e.target.value; saveUser(); refreshDashboardTopics();
    }
    if (e.target.matches('[data-study-level]')) { state.studyLevel = e.target.value; renderStudy(); }
    if (e.target.matches('[data-community-type]')) {
      const country = e.target.value === 'country';
      $('.community-country-field').hidden = !country; $('.community-level-field').hidden = country;
    }
    if (e.target.matches('[data-admin-user-level]')) void adminUpdateUserLevel(e.target);
    if (e.target.matches('[data-profile-photo]')) setProfilePhoto(e.target.files[0]);
  });
  document.addEventListener('input', (e) => {
    if (e.target.matches('[data-study-search]')) {
      state.studyQuery = e.target.value; const cursor = e.target.selectionStart; renderStudy();
      const search = $('[data-study-search]'); search.focus(); search.setSelectionRange(cursor, cursor);
    } else if (e.target.matches('[data-community-search]')) {
      state.communityQuery = e.target.value; const cursor = e.target.selectionStart; renderCommunity();
      const search = $('[data-community-search]'); search.focus(); search.setSelectionRange(cursor, cursor);
    }
  });
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]'), panel = $('#quickPanel');
    if (!el) { if (panel && !panel.hidden && !e.target.closest('#quickPanel')) closeQuickPanel(); return; }
    if (panel && !panel.hidden && !e.target.closest('#quickPanel') && !['bell','account-menu','help'].includes(el.dataset.action)) closeQuickPanel();
    if (el.tagName === 'A') e.preventDefault();
    actions[el.dataset.action]?.(el);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeQuickPanel(); });

  /* ---------- Inicio ---------- */
  observeLocalization();
  applyLanguage(store.get('language', 'es'));
  setMode('login');
  async function initializeApp() {
    try {
      await refreshLevelsCatalog();
      const response = await fetch('/api/user/me', { credentials: 'same-origin', cache: 'no-store' });
      if (response.ok) {
        const serverUser = await response.json();
        const localUser = store.get('users', {})[serverUser.email] || {};
        state.user = { ...localUser, ...serverUser, sessions: localUser.sessions || [], interests: localUser.interests || [], preferences: localUser.preferences || {}, learning: localUser.learning || { completed: {}, best: {} } };
        try { await refreshAccountStatistics(); } catch { state.receivedRatings = []; state.givenRatings = []; }
        delete state.user.pass;
        serverProfileKey = JSON.stringify({ name: serverUser.name, username: serverUser.username || null, photo: serverUser.photo || null, level: serverUser.level });
        store.set('users', { ...store.get('users', {}), [state.user.email]: state.user });
      }
    } catch { state.user = null; }
    splash();
  }
  void initializeApp();
})();
