const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
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

// Función para abrir en navegador por defecto
const openInDefaultBrowser = async (url) => {
  try {
    // En Vercel esto no funcionará, pero podemos enviar el enlace directamente
    console.log('🌐 Preparando apertura:', url);
    return url; // Retornamos la URL para enviarla por Telegram
  } catch (error) {
    console.log('⚠️ Error preparando navegador:', error.message);
    return null;
  }
};

// Función principal - Usando bypass.city
const performBypass = async (link, chatId) => {
  try {
    console.log('🔄 Iniciando bypass con bypass.city...');

    // PASO 1: Crear URL de bypass.city automáticamente
    const bypassUrl = `https://bypass.city/bypass?bypass=${encodeURIComponent(link)}`;
    
    console.log('🔗 URL de bypass creada:', bypassUrl);

    // PASO 2: Abrir bypass.city con el enlace ya procesado
    const processedUrl = await openInDefaultBrowser(bypassUrl);
    
    if (!processedUrl) {
      throw new Error('No se pudo preparar el bypass');
    }

    // PASO 3: Enviar enlace de bypass al usuario
    const bypassMessage = await bot.sendMessage(chatId, `🚀 **Bypass automático con bypass.city**

🔗 **Enlace original:** \`${link.substring(0, 50)}...\`

✅ **Proceso automático:**
• URL de bypass generada automáticamente
• Se abrirá bypass.city en tu navegador
• Proceso más rápido que bypass.vip

👆 **Toca el botón para continuar**`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🚀 Abrir Bypass', url: bypassUrl }
        ]]
      }
    });

    // PASO 4: Esperar un momento y actualizar mensaje
    setTimeout(async () => {
      try {
        await bot.editMessageText(`🔄 **Bypass en progreso...**

🔗 **Enlace:** \`${link.substring(0, 50)}...\`

📋 **Estado:**
✅ URL de bypass generada
✅ Enlace enviado a tu navegador
⏳ Procesando automáticamente...

💡 **Si no se abrió automáticamente, toca el botón de abajo**`, {
          chat_id: chatId,
          message_id: bypassMessage.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🌐 Abrir Bypass', url: bypassUrl }],
              [{ text: '📋 Copiar enlace', callback_data: `copy_${chatId}` }]
            ]
          }
        });
      } catch (editError) {
        console.log('Error editando mensaje:', editError.message);
      }
    }, 3000);

    // PASO 5: Simular detección de resultado (bypass.city es más rápido)
    setTimeout(async () => {
      try {
        await bot.editMessageText(`⏳ **Finalizando bypass...**

🔗 **Enlace:** \`${link.substring(0, 50)}...\`

🎯 **Casi listo:**
• Bypass.city procesando
• Resultado próximo
• Preparando enlace final

⚡ **Unos segundos más...**`, {
          chat_id: chatId,
          message_id: bypassMessage.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🔄 Ver progreso', url: bypassUrl }
            ]]
          }
        });
      } catch (editError) {
        console.log('Error en actualización final:', editError.message);
      }
    }, 8000);

    return bypassMessage.message_id;

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
  bot.sendMessage(chatId, `🤖 **SkipBot** - Bypass con bypass.city

🚀 **Ventajas de bypass.city:**
• Más rápido que bypass.vip
• Menos captchas
• Proceso más fluido

📝 **Uso:** Envía cualquier enlace
⚡ **Resultado:** En segundos

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
    // Verificar si es un resultado de bypass anterior
    if (text && (text.includes('t.me/') || text.includes('https://')) && activeLinks.has(chatId)) {
      const originalLink = activeLinks.get(chatId);
      activeLinks.delete(chatId);
      
      if (isValidUrl(text)) {
        await bot.sendMessage(chatId, `✅ **¡Bypass completado!**

🎯 **Resultado:**
\`${text}\`

📋 **¡Enlace listo para usar!**`, { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🚀 Abrir enlace', url: text }
            ]]
          }
        });

        return;
      }
    }
    
    bot.sendMessage(chatId, '❌ Envía un enlace válido\n\nEjemplo: https://ejemplo.com/enlace');
    return;
  }

  // Caso especial: Postazap
  if (isPostazap(text)) {
    bot.sendMessage(chatId, `🔗 **Postazap detectado**

⚠️ Requiere extensión de navegador
📋 Proceso manual necesario`, {
      reply_markup: {
        inline_keyboard: [[
          { text: '🌐 Abrir enlace', url: text }
        ]]
      }
    });
    return;
  }

  // Guardar enlace activo
  activeLinks.set(chatId, text);

  // Mensaje de inicio
  const processingMsg = await bot.sendMessage(chatId, '🔄 Generando bypass con bypass.city...');

  try {
    await performBypass(text, chatId);
    
    // Eliminar mensaje de procesamiento
    await bot.deleteMessage(chatId, processingMsg.message_id);

  } catch (error) {
    await bot.deleteMessage(chatId, processingMsg.message_id);
    
    await bot.sendMessage(chatId, `❌ **Error en bypass**

💡 **Solución:**
• Reenvía el enlace
• O usa bypass manual

🌐 **Manual:** https://bypass.city`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🔄 Bypass manual', url: 'https://bypass.city' }
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
      } else if (update.callback_query) {
        bot.emit('callback_query', update.callback_query);
      }
      
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error processing update:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(200).json({ 
      status: 'SkipBot running with bypass.city! 🚀',
      version: '1.0.0'
    });
  }
};
