const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const { URL } = require('url');
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

// Función para hacer bypass automático headless
const performHeadlessBypass = async (link) => {
  return new Promise((resolve, reject) => {
    const bypassUrl = `https://bypass.city/bypass?bypass=${encodeURIComponent(link)}`;
    
    console.log('🔄 Procesando bypass headless:', bypassUrl);
    
    const req = https.get(bypassUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Buscar enlaces de Telegram en la respuesta
          const telegramLinks = data.match(/https:\/\/t\.me\/[^\s"'<>]+/g);
          
          if (telegramLinks && telegramLinks.length > 0) {
            resolve(telegramLinks[0]);
          } else {
            // Buscar cualquier enlace https
            const httpsLinks = data.match(/https:\/\/[^\s"'<>]+/g);
            if (httpsLinks && httpsLinks.length > 0) {
              // Filtrar enlaces que no sean de bypass.city
              const finalLink = httpsLinks.find(url => !url.includes('bypass.city'));
              resolve(finalLink || httpsLinks[0]);
            } else {
              reject(new Error('No se encontró enlace final'));
            }
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout en bypass'));
    });
  });
};

// Función principal - Proceso completamente automático
const performBypass = async (link, chatId) => {
  try {
    console.log('🔄 Iniciando bypass automático headless...');

    // PASO 1: Enviar GIF de carga
    const loadingMsg = await bot.sendAnimation(chatId, 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', {
      caption: `⏳ **Procesando bypass automáticamente...**

🔗 **Enlace:** \`${link.substring(0, 50)}...\`

🤖 **Estado:** Analizando enlace...
⚡ **Tiempo estimado:** 10-15 segundos

💫 **Proceso 100% automático**`,
      parse_mode: 'Markdown'
    });

    // PASO 2: Simular progreso
    await delay(3000);
    await bot.editMessageCaption(`⏳ **Bypass en progreso...**

🔗 **Enlace:** \`${link.substring(0, 50)}...\`

🤖 **Estado:** Conectando con bypass.city...
⚡ **Progreso:** 30%

🔄 **Procesando automáticamente...**`, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });

    // PASO 3: Realizar bypass headless
    await delay(2000);
    await bot.editMessageCaption(`⏳ **Obteniendo resultado...**

🔗 **Enlace:** \`${link.substring(0, 50)}...\`

🤖 **Estado:** Procesando bypass...
⚡ **Progreso:** 70%

🎯 **Casi listo...**`, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });

    // PASO 4: Ejecutar bypass real
    const result = await performHeadlessBypass(link);
    
    if (!result) {
      throw new Error('No se obtuvo resultado del bypass');
    }

    // PASO 5: Mostrar resultado final
    await delay(1000);
    await bot.editMessageCaption(`✅ **¡Bypass completado exitosamente!**

🎯 **Resultado obtenido:**
\`${result}\`

📋 **¡Enlace listo para usar!**
⏰ **Completado en:** ${new Date().toLocaleTimeString('es-ES')}

🚀 **Abriendo automáticamente...**`, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: 'bypass link', url: result }
        ]]
      }
    });

    // PASO 6: Abrir automáticamente después de 2 segundos
    setTimeout(async () => {
      await bot.sendMessage(chatId, `🚀 **Enlace abierto automáticamente**

🔗 **Enlace final:** \`${result}\`

✅ **Proceso completado exitosamente**`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Abrir de nuevo', url: result }
          ]]
        }
      });
    }, 2000);

    return result;

  } catch (error) {
    throw error;
  }
};

// Manejar callback queries
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  if (data.startsWith('copy_')) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: '📋 Enlace listo para copiar' });
    
    // Extraer URL del mensaje
    const messageText = callbackQuery.message.text;
    const urlMatch = messageText.match(/🔗 \*\*Enlace:\*\* \`([^`]+)\`/);
    const originalUrl = urlMatch ? urlMatch[1] : '';
    
    if (originalUrl) {
      const bypassUrl = `https://bypass.city/bypass?bypass=${encodeURIComponent(originalUrl)}`;
      
      await bot.sendMessage(chatId, `📋 **Enlace de bypass para copiar:**

\`${bypassUrl}\`

👆 Toca para seleccionar y copiar`, {
        parse_mode: 'Markdown'
      });
    }
  }
});

// Almacenar enlaces en proceso
const activeLinks = new Map();

// Manejadores del bot
const handleStart = (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🤖 **SkipBot** - Bypass automático headless

⚡ **Proceso súper rápido:**
• Envías enlace
• Ves GIF de carga
• Recibes resultado automático

🚀 **Características:**
• 100% automático
• Sin captchas
• Resultado en 10-15 segundos

¡Envía tu enlace! 🔗`, { parse_mode: 'Markdown' });
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
    bot.sendMessage(chatId, '❌ Envía un enlace válido\n\nEjemplo: https://ejemplo.com/enlace');
    return;
  }

  // Caso especial: Postazap
  if (isPostazap(text)) {
    bot.sendMessage(chatId, `🔗 **Postazap detectado**

⚠️ Requiere proceso manual
📋 Usa extensión de navegador`, {
      reply_markup: {
        inline_keyboard: [[
          { text: 'bypass link', url: text }
        ]]
      }
    });
    return;
  }

  // Proceso principal - SIN mensaje de "procesando"
  try {
    await performBypass(text, chatId);

  } catch (error) {
    await bot.sendMessage(chatId, `❌ **Error en bypass automático**

🔍 **Posibles causas:**
• Enlace no soportado
• Servidor temporalmente no disponible

💡 **Solución:** Reenvía el enlace o usa bypass manual

🌐 **Manual:** https://bypass.city`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: 'bypass link', url: 'https://bypass.city' }
        ]]
      }
    });
    
    console.error('Error en bypass:', error.message);
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
      
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error processing update:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(200).json({ 
      status: 'SkipBot headless running! ⚡',
      version: '2.0.0'
    });
  }
};
