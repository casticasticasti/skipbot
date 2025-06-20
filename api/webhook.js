const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const bot = new TelegramBot(process.env.BOT_TOKEN);

// Funciones auxiliares
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const isValidUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

const isPostazap = (url) => {
  return (
    url.startsWith('https://go.postazap.com/') ||
    url.startsWith('http://go.postazap.com/') ||
    url.startsWith('go.postazap.com')
  );
};

// Función principal simplificada
const performBypass = async (link, chatId) => {
  // Crear URL con el enlace pre-llenado
  const bypassUrl = `https://bypass.vip?url=${encodeURIComponent(link)}`;
  
  const instructionMessage = `🚀 **Bypass automático iniciado**

🔗 **Tu enlace:**
\`${link}\`

📋 **Pasos súper simples:**

1️⃣ **Toca "🌐 Abrir Bypass"** (se abre en tu navegador)
2️⃣ **Resuelve el captcha** (2-3 minutos máximo)  
3️⃣ **Copia el resultado** que aparece
4️⃣ **¡Listo!** 

⚡ **Ventajas:**
• Tu navegador (más rápido)
• Sin errores de servidor
• Funciona siempre

💡 **Tip:** Mantén esta conversación abierta para más enlaces`;

  await bot.sendMessage(chatId, instructionMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🌐 Abrir Bypass', url: bypassUrl }],
        [{ text: '📋 Copiar enlace original', callback_data: `copy_${link.substring(0, 50)}` }],
        [{ text: '❓ Ayuda', callback_data: 'help' }]
      ]
    }
  });

  return null; // No esperamos resultado automático
};

// Manejar callback queries
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  if (data.startsWith('copy_')) {
    await bot.answerCallbackQuery(callbackQuery.id, { 
      text: '📋 Enlace copiado al portapapeles',
      show_alert: false 
    });
    
    const originalLink = data.replace('copy_', '');
    await bot.sendMessage(chatId, `📋 **Enlace para copiar:**

\`${originalLink}\`

💡 **Instrucciones:**
1. Selecciona el texto de arriba
2. Copia (Ctrl+C / Cmd+C)
3. Pega en bypass.vip`, { parse_mode: 'Markdown' });
    
  } else if (data === 'help') {
    await bot.answerCallbackQuery(callbackQuery.id, { text: '📖 Ayuda enviada' });
    
    const helpMessage = `📖 **Ayuda - SkipBot**

🔧 **¿Cómo funciona?**
1. Envías cualquier enlace
2. Toco "Abrir Bypass" 
3. Resuelves captcha en tu navegador
4. Copias el resultado

✅ **Ventajas:**
• 100% funcional siempre
• Usa tu navegador favorito
• Sin errores de servidor
• Más rápido que automatización

🔗 **Enlaces soportados:**
• bypass.vip compatible
• Acortadores protegidos
• Enlaces con captcha

💡 **Tips:**
• Guarda bypass.vip en favoritos
• Usa extensiones de bypass
• El proceso toma 2-3 minutos máximo

🆘 **¿Problemas?** Reenvía el enlace`;

    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  }
});

// Manejadores principales
const handleStart = (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `🤖 **SkipBot** - Bypass inteligente

🚀 **Súper simple:**
• Envía cualquier enlace
• Toca "Abrir Bypass"  
• Resuelve captcha en tu navegador
• ¡Listo!

✅ **Ventajas:**
• 100% funcional
• Tu navegador (más rápido)
• Sin errores de servidor

💡 **Ejemplo:** Envía https://ejemplo.com/enlace

¡Pruébalo ahora! 🎯`;
  
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
};

const handleMessage = async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text && text.startsWith('/')) {
    if (text === '/start') {
      handleStart(msg);
    }
    return;
  }

  if (!text || !isValidUrl(text)) {
    bot.sendMessage(chatId, '❌ **Enlace no válido**\n\n💡 **Ejemplo:** https://ejemplo.com/enlace', { parse_mode: 'Markdown' });
    return;
  }

  // Caso especial: Postazap
  if (isPostazap(text)) {
    const postazapMessage = `🔗 **Postazap detectado**

⚠️ **Requiere extensión de navegador**

📋 **Mejor opción:**
1. Instala extensión bypass en Chrome
2. Abre el enlace directamente
3. Espera 80 segundos automáticos

🔗 **Tu enlace:** \`${text}\``;
    
    bot.sendMessage(chatId, postazapMessage, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🌐 Abrir enlace', url: text }
        ]]
      }
    });
    return;
  }

  // Procesar bypass normal
  try {
    await performBypass(text, chatId);
  } catch (error) {
    bot.sendMessage(chatId, `❌ **Error procesando enlace**

💡 **Solución:** Usa bypass.vip manualmente

🔗 **Tu enlace:** \`${text}\``, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🌐 Bypass manual', url: 'https://bypass.vip' }
        ]]
      }
    });
    
    console.error('Error:', error.message);
  }
};

// Función principal para Vercel
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      const update = req.body;
      
      if (update.message) {
        await handleMessage(update.message);
      }
      
      if (update.callback_query) {
        await bot.answerCallbackQuery(update.callback_query.id);
      }
      
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error processing update:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(200).json({ 
      status: 'SkipBot running! 🤖',
      version: '2.0.0 - Browser Native'
    });
  }
};
