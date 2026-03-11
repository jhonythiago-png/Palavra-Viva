// ============================================================
// whatsapp-btn.js — Botão flutuante WhatsApp
// Palavra Viva — Devocional Diário
// Número e mensagens gerenciados pelo painel super.html
// Não é necessário editar este arquivo nunca.
// ============================================================

(async function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  async function init() {
    try { await carregarConfiguracoes(); } catch(e) {}

    var msg = WHATSAPP_MSG_VISITANTE;
    try {
      var session = await getSession();
      if (session) {
        var profile = await getProfile();
        if (profile) {
          var nome = profile.nome ? profile.nome.split(' ')[0] : '';
          msg = 'Olá' + (nome ? ', ' + nome : '') + '! Sou assinante do Palavra Viva e preciso de ajuda.';
        }
      }
    } catch (e) {}

    var url = 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' + encodeURIComponent(msg);

    var style = document.createElement('style');
    style.textContent = [
      '.pv-wa-btn{',
        'position:fixed;bottom:22px;right:22px;z-index:9999;',
        'width:54px;height:54px;border-radius:50%;',
        'background:linear-gradient(135deg,#25D366,#128C7E);',
        'box-shadow:0 4px 18px rgba(37,211,102,.45);',
        'display:flex;align-items:center;justify-content:center;',
        'cursor:pointer;text-decoration:none;',
        'transition:transform .2s,box-shadow .2s;',
        'animation:pv-wa-pop .5s cubic-bezier(.34,1.56,.64,1) both;',
        'animation-delay:.8s;opacity:0;',
      '}',
      '.pv-wa-btn:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(37,211,102,.6);}',
      '.pv-wa-btn svg{width:28px;height:28px;fill:#fff;}',
      '.pv-wa-tooltip{',
        'position:absolute;right:64px;bottom:50%;transform:translateY(50%);',
        'background:#111;color:#e8e0d4;border:1px solid rgba(255,255,255,.08);',
        'padding:6px 12px;border-radius:6px;',
        'font-family:"Inter",sans-serif;font-size:12px;font-weight:500;',
        'white-space:nowrap;pointer-events:none;',
        'opacity:0;transition:opacity .2s;letter-spacing:.03em;',
      '}',
      '.pv-wa-tooltip::after{',
        'content:"";position:absolute;left:100%;top:50%;transform:translateY(-50%);',
        'border:5px solid transparent;border-left-color:#111;',
      '}',
      '.pv-wa-btn:hover .pv-wa-tooltip{opacity:1;}',
      '.pv-wa-pulse{',
        'position:absolute;inset:-4px;border-radius:50%;',
        'background:rgba(37,211,102,.25);',
        'animation:pv-wa-pulse 2.5s ease-out infinite;',
      '}',
      '@keyframes pv-wa-pop{',
        '0%{opacity:0;transform:scale(0)}',
        '100%{opacity:1;transform:scale(1)}',
      '}',
      '@keyframes pv-wa-pulse{',
        '0%{transform:scale(1);opacity:.5}',
        '100%{transform:scale(1.5);opacity:0}',
      '}',
    ].join('');
    document.head.appendChild(style);

    var btn = document.createElement('a');
    btn.href      = url;
    btn.target    = '_blank';
    btn.rel       = 'noopener noreferrer';
    btn.className = 'pv-wa-btn';
    btn.setAttribute('aria-label', 'Falar no WhatsApp');
    btn.innerHTML =
      '<div class="pv-wa-pulse"></div>' +
      '<div class="pv-wa-tooltip">💬 Falar com o suporte</div>' +
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15' +
        '-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475' +
        '-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52' +
        '.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207' +
        '-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372' +
        '-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2' +
        ' 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719' +
        ' 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>' +
        '<path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.525 5.845L.057 23.486' +
        'a.5.5 0 0 0 .609.61l5.703-1.488A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12' +
        'S18.627 0 12 0zm0 21.818a9.814 9.814 0 0 1-5.012-1.374l-.36-.214-3.733.975.998-3.64' +
        '-.235-.374A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57' +
        ' 21.818 12 17.43 21.818 12 21.818z"/>' +
      '</svg>';

    document.body.appendChild(btn);
  }
})();
