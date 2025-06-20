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
    
    // Headers más realistas para evitar detección
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    };
    
    const req = https.get(bypassUrl, options, (res) => {
      let data = '';
      
      // Manejar redirecciones
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log('🔄 Siguiendo redirección:', res.headers.location);
        
        // Si la redirección es directamente el enlace final
        if (res.headers.location.includes('t.me/') || 
            (res.headers.location.startsWith('https://') && !res.headers.location.includes('bypass.city'))) {
          resolve(res.headers.location);
          return;
        }
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          console.log('📄 Respuesta recibida, analizando...');
          
          // Buscar enlaces de Telegram primero
          const telegramLinks = data.match(/https:\/\/t\.me\/[^\s"'<>)]+/g);
          
          if (telegramLinks && telegramLinks.length > 0) {
            console.log('✅ Enlace de Telegram encontrado:', telegramLinks[0]);
            resolve(telegramLinks[0]);
            return;
          }
          
          // Buscar otros enlaces válidos
          const allLinks = data.match(/https:\/\/[^\s"'<>)]+/g);
          
          if (allLinks && allLinks.length > 0) {
            // Filtrar enlaces que no sean de bypass.city, ads, etc.
            const validLinks = allLinks.filter(url => 
              !url.includes('bypass.city') &&
              !url.includes('google.com') &&
              !url.includes('facebook.com') &&
              !url.includes('ads') &&
              !url.includes('analytics') &&
              url.length > 20
            );
            
            if (validLinks.length > 0) {
              console.log('✅ Enlace válido encontrado:', validLinks[0]);
              resolve(validLinks[0]);
              return;
            }
          }
          
          // Si no encontramos nada, devolver la URL de bypass para que el usuario la abra manualmente
          console.log('⚠️ No se encontró enlace final, devolviendo URL de bypass');
          resolve(bypassUrl);
          
        } catch (error) {
          console.error('❌ Error analizando respuesta:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Error en request:', error);
      reject(error);
    });
    
    // Más tiempo para procesar
    req.setTimeout(45000, () => {
      req.destroy();
      reject(new Error('Timeout en bypass - proceso muy lento'));
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

🤖 **Estado:** Iniciando proceso...
⚡ **Tiempo estimado:** 20-30 segundos

💫 **Proceso 100% automático**`,
      parse_mode: 'Markdown'
    });

    // PASO 2: Más tiempo de espera
    await delay(5000);
    await bot.editMessageCaption(`⏳ **Conectando con bypass.city...**

🔗 **Enlace:** \`${link.substring(0, 50)}...\`

🤖 **Estado:** Enviando request...
⚡ **Progreso:** 25%

🔄 **Evitando detección anti-bot...**`, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });

    // PASO 3: Más progreso
    await delay(4000);
    await bot.editMessageCaption(`⏳ **Procesando respuesta...**

🔗 **Enlace:** \`${link.substring(0, 50)}...\`

🤖 **Estado:** Analizando contenido...
⚡ **Progreso:** 50%

🎯 **Buscando enlace final...**`, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });

    // PASO 4: Ejecutar bypass real con más tiempo
    await delay(3000);
    await bot.editMessageCaption(`⏳ **Obteniendo resultado final...**

🔗 **Enlace:** \`${link.substring(0, 50)}...\`

🤖 **Estado:** Extrayendo enlace...
⚡ **Progreso:** 80%

⚡ **Casi terminado...**`, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });

    const result = await performHeadlessBypass(link);
    
    if (!result) {
      throw new Error('No se obtuvo resultado del bypass');
    }

    // PASO 5: Verificar si es el enlace final o necesita apertura manual
    const isFinalLink = result.includes('t.me/') || (!result.includes('bypass.city') && result !== `https://bypass.city/bypass?bypass=${encodeURIComponent(link)}`);
    
    if (isFinalLink) {
      // Es el enlace final - proceso completado
      await delay(2000);
      await bot.editMessageCaption(`✅ **¡Bypass completado exitosamente!**

🎯 **Resultado obtenido:**
\`${result}\`

📋 **¡Enlace final listo!**
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

      // Abrir automáticamente
      setTimeout(async () => {
        await bot.sendMessage(chatId, `🚀 **Enlace abierto automáticamente**

✅ **Proceso completado exitosamente**`, {
          reply_markup: {
            inline_keyboard: [[
              { text: '🚀 Abrir de nuevo', url: result }
            ]]
          }
        });
      }, 2000);

    } else {
      // Necesita apertura manual
      await delay(2000);
      await bot.editMessageCaption(`🔄 **Bypass requiere verificación manual**

🔗 **Enlace:** \`${link.substring(0, 50)}...\`

⚠️ **Acción requerida:**
El sitio requiere verificación humana

👆 **Toca "bypass link" para completar**`, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: 'bypass link', url: result }
          ]]
        }
      });
    }

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
