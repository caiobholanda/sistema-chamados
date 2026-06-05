const express = require('express');
const router  = express.Router();
const { inserirSpaPerfil, getSpaPerfil, listarSpaPerfis } = require('../db');
const { requireAdmin } = require('../auth');

function san(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').trim();
}

function validarEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

/* POST /api/spa/perfil — público (hóspede preenche sem autenticação) */
router.post('/perfil', async (req, res) => {
  try {
    const b = req.body || {};
    const erros = [];

    if (!b.nome || !String(b.nome).trim())          erros.push('nome');
    if (!b.sobrenome || !String(b.sobrenome).trim()) erros.push('sobrenome');
    if (!b.documento || !String(b.documento).trim()) erros.push('documento');
    if (!validarEmail(b.email))                      erros.push('email');
    if (!b.telefone || String(b.telefone).trim().length < 6) erros.push('telefone');
    if (!b.info_medica || !String(b.info_medica).trim())     erros.push('info_medica');
    if (!b.consentimento_saude)                      erros.push('consentimento_saude');

    if (erros.length) return res.status(400).json({ erro: 'Campos obrigatórios ausentes', campos: erros });

    const assinatura = typeof b.assinatura_data_url === 'string'
      ? b.assinatura_data_url.substring(0, 200000)
      : null;

    const dados = {
      nome:                    san(b.nome),
      sobrenome:               san(b.sobrenome),
      tipo_documento:          san(String(b.tipo_documento || 'cpf')),
      documento:               san(b.documento),
      email:                   san(b.email),
      telefone:                san(b.telefone),
      data_nascimento:         b.data_nascimento ? san(String(b.data_nascimento)) : null,
      rotina_facial:           JSON.stringify(Array.isArray(b.rotina_facial) ? b.rotina_facial.map(s => san(String(s))) : []),
      rotina_corporal:         JSON.stringify(Array.isArray(b.rotina_corporal) ? b.rotina_corporal.map(s => san(String(s))) : []),
      produto_especifico:      b.produto_especifico ? san(String(b.produto_especifico)) : null,
      pressao_massagem:        b.pressao_massagem ? san(String(b.pressao_massagem)) : null,
      info_medica:             san(b.info_medica),
      consentimento_saude:     b.consentimento_saude ? 1 : 0,
      consentimento_marketing: b.consentimento_marketing ? 1 : 0,
      canais_marketing:        JSON.stringify(Array.isArray(b.canais_marketing) ? b.canais_marketing : []),
      assinatura_data_url:     assinatura,
      idioma:                  san(String(b.idioma || 'pt-BR')),
    };

    const id = inserirSpaPerfil(dados);
    console.log(`[Spa] Perfil #${id} registrado — ${dados.nome} ${dados.sobrenome} (${dados.idioma})`);
    res.json({ id, apto: true });
  } catch (err) {
    console.error('[Spa] erro ao salvar perfil:', err);
    res.status(500).json({ erro: 'Erro interno ao salvar perfil' });
  }
});

/* GET /api/spa/perfis — lista resumida (admin) */
router.get('/perfis', requireAdmin, (req, res) => {
  try {
    res.json(listarSpaPerfis());
  } catch (err) {
    console.error('[Spa] erro ao listar perfis:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

/* GET /api/spa/perfil/:id — detalhe completo (admin) */
router.get('/perfil/:id', requireAdmin, (req, res) => {
  try {
    const perfil = getSpaPerfil(parseInt(req.params.id, 10));
    if (!perfil) return res.status(404).json({ erro: 'Perfil não encontrado' });
    res.json(perfil);
  } catch (err) {
    console.error('[Spa] erro ao buscar perfil:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
