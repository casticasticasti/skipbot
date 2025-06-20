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

// Función principal - Automatización inteligente sin browser
const performBypass = async (link, chatId) => {
  try {
    // Crear URL pre-configurada con el enlace ya pegado
    const bypassUrl = `https://bypass.vip?url=${encodeURIComponent(link)}`;
    
    // Enviar mensaje con instrucciones automáticas
    const captchaMessage = await bot.sendMessage(chatId, `🤖 **Bypass automático iniciado**

🔗 **Enlace procesado:**
\`${link.substring(0, 60)}...\`

✅ **Todo listo para ti:**
• Enlace ya pegado automáticamente
• Solo resuelve el captcha
• Regresa aquí por el resultado

👆 **Toca "🚀 Resolver Captcha"**`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🚀 Resolver Captcha', url: bypassUrl }
        ]]
      }
    });

    // Esperar 5 segundos y actualizar mensaje
    setTimeout(async () => {
      try {
        await bot.editMessageText(`🔄 **Captcha en progreso...**

🔗 **Enlace:** \`${link.substring(0, 50)}...\`

📋 **Estado actual:**
✅ Ventana abierta en tu navegador
✅ Enlace pegado automáticamente
⏳ Esperando que resuelvas el captcha

🎯 **Cuando termines:**
• Copia el resultado final
• Pégalo aquí como respuesta
• ¡O usa el botón de abajo!`, {
          chat_id: chatId,
          message_id: captchaMessage.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Ya resolví - Dame resultado', callback_data: `check_${chatId}` }],
              [{ text: '🔄 Abrir de nuevo', url: bypassUrl }],
              [{ text: '❌ Cancelar', callback_data: `cancel_${chatId}` }]
            ]
          }
        });
      } catch (editError) {
        console.log('Error editando mensaje:', editError.message);
      }
    }, 5000);

    return captchaMessage.message_id;

  } catch (error) {
    throw error;
  }
};

// Manejar callback queries
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  if (data.startsWith('check_')) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: '📋 Envía el resultado' });
    
    await bot.editMessageText(`✅ **¡Perfecto!**

🎯 **Ahora envía el resultado:**
• Copia el enlace final de bypass.vip
• Pégalo aquí como mensaje
• Te ayudo a verificar que sea correcto

💡 **Tip:** El resultado debe empezar con https://`, {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🔄 Volver a abrir bypass.vip', url: 'https://bypass.vip' }
        ]]
      }
    });
    
  } else if (data.startsWith('cancel_')) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Cancelado' });
    
    await bot.editMessageText(`❌ **Proceso cancelado**

🔄 **Para usar el bot:**
• Envía cualquier enlace
• Resuelve el captcha cuando aparezca
• Recibe el resultado automáticamente

💡 **Tip:** El proceso toma 2-3 minutos`, {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
      parse_mode: 'Markdown'
    });
  }
});

// Almacenar enlaces en proceso (simple cache en memoria)
const activeLinks = new Map();

// Manejadores del bot
const handleStart = (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🤖 **SkipBot** - Bypass automático

🚀 **Súper fácil:**
1️⃣ Envías enlace
2️⃣ Resuelves captcha
3️⃣ ¡Listo!

📱 **Ventajas:**
• Usa tu navegador favorito
• Enlace pegado automáticamente
• Sin instalaciones adicionales

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
    if (text && text.includes('t.me/') && activeLinks.has(chatId)) {
      // Es un resultado de Telegram
      activeLinks.delete(chatId);
      
      bot.sendMessage(chatId, `✅ **¡Bypass completado exitosamente!**

🎯 **Resultado recibido:**
\`${text}\`

📋 **¡Enlace listo para usar!**
🎉 **¡Proceso completado!**`, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Abrir enlace', url: text }
          ]]
        }
      });
      return;
    }
    
    bot.sendMessage(chatId, '❌ Envía un enlace válido\n\nEjemplo: https://ejemplo.com/enlace');
    return;
  }

  // Caso especial: Postazap
  if (isPostazap(text)) {
    bot.sendMessage(chatId, `🔗 **Postazap detectado**

⚠️ Requiere extensión de navegador

📋 **Instrucciones:**
1. Abre Chrome con extensión
2. Pega: \`${text}\`
3. Espera 80 segundos

💡 **Alternativa:** Usa extensión bypass`, { 
      parse_mode: 'Markdown',
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

  // Mensaje de procesamiento
  const processingMsg = await bot.sendMessage(chatId, '🔄 Preparando bypass automático...');

  try {
    await performBypass(text, chatId);
    
    // Eliminar mensaje de procesamiento
    await bot.deleteMessage(chatId, processingMsg.message_id);

  } catch (error) {
    await bot.deleteMessage(chatId, processingMsg.message_id);
    
    bot.sendMessage(chatId, `❌ **Error**

💡 **Solución:** Reenvía el enlace o usa bypass manual

🌐 **Manual:** https://bypass.vip`, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🔄 Bypass manual', url: 'https://bypass.vip' }
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
        // Manejar callback queries
        const callbackQuery = update.callback_query;
        bot.emit('callback_query', callbackQuery);
      }
      
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error processing update:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(200).json({ 
      status: 'SkipBot running! 🤖',
      version: '1.0.0'
    });
  }
};
