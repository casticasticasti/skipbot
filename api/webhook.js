const TelegramBot = require('node-telegram-bot-api');
const { chromium } = require('playwright-core');
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

// Función principal de bypass
const performBypass = async (link, chatId) => {
  let browser;
  
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    await page.goto('https://bypass.vip', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Buscar y llenar el input
    let inputFound = false;
    try {
      await page.waitForSelector('#bypassInput', { timeout: 5000 });
      await page.evaluate(() => document.querySelector('#bypassInput').value = '');
      await page.type('#bypassInput', link);
      inputFound = true;
    } catch (error) {
      const inputSelector = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const input = inputs.find(i => i.placeholder && i.placeholder.toLowerCase().includes('paste'));
        return input ? (input.id || 'input-alt') : null;
      });

      if (inputSelector) {
        const finalSelector = inputSelector.startsWith('#') ? inputSelector : '#' + inputSelector;
        await page.type(finalSelector, link);
        inputFound = true;
      }
    }

    if (!inputFound) {
      throw new Error('No se pudo encontrar el campo de entrada');
    }

    await delay(1000);

    // Hacer clic en el botón de envío
    let buttonClicked = false;
    try {
      await page.waitForSelector('#submitButton', { timeout: 5000 });
      await page.click('#submitButton');
      buttonClicked = true;
    } catch (error) {
      buttonClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const submitBtn = buttons.find(b =>
          b.textContent.toLowerCase().includes('bypass') ||
          b.textContent.toLowerCase().includes('submit')
        );
        if (submitBtn) {
          submitBtn.click();
          return true;
        }
        return false;
      });
    }

    if (!buttonClicked) {
      throw new Error('No se pudo encontrar el botón de envío');
    }

    // Mantener el browser abierto y esperar resultado
    try {
      await page.waitForSelector('.popup-body', {
        visible: true,
        timeout: 300000 // 5 minutos
      });

      const result = await page.$eval('.popup-body', el => el.textContent.trim());
      
      await browser.close();
      
      // Editar mensaje con resultado exitoso
      try {
        await bot.editMessageCaption(`✅ **¡Bypass completado exitosamente!**

🔗 **Enlace original:** \`${link.substring(0, 40)}...\`

🎯 **Resultado:**
\`${result}\`

📋 **¡Enlace listo para usar!**
⏰ **Completado:** ${new Date().toLocaleTimeString('es-ES')}`, {
          chat_id: chatId,
          message_id: captchaMessage.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🚀 Abrir enlace final', url: result }
            ]]
          }
        });
      } catch (editError) {
        // Si no se puede editar, enviar mensaje nuevo
        await bot.sendMessage(chatId, `✅ **¡Bypass completado!**

🔗 **Resultado:** \`${result}\``, { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🚀 Abrir enlace', url: result }
            ]]
          }
        });
      }

      return result;

    } catch (timeoutError) {
      await browser.close();
      
      // Editar mensaje con timeout
      try {
        await bot.editMessageCaption(`⏰ **Tiempo agotado**

🔗 **Enlace:** \`${link.substring(0, 50)}...\`

❌ **El captcha no fue resuelto en 5 minutos**

🔄 **Opciones:**
• Envía el enlace de nuevo para reintentar
• Usa bypass.vip manualmente
• Prueba más tarde

💡 **Tip:** Resuelve el captcha más rápido la próxima vez`, {
          chat_id: chatId,
          message_id: captchaMessage.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Reintentar ahora', callback_data: `retry_${link.substring(0, 30)}` }],
              [{ text: '🌐 Bypass manual', url: 'https://bypass.vip' }]
            ]
          }
        });
      } catch (editError) {
        await bot.sendMessage(chatId, '⏰ Tiempo agotado. Envía el enlace de nuevo para reintentar.');
      }

      return null;
    }

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
};

// Manejar callback queries (botones inline)
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  if (data.startsWith('retry_')) {
    const link = data.replace('retry_', '');
    await bot.answerCallbackQuery(callbackQuery.id, { text: '🔄 Reintentando...' });
    
    // Editar mensaje actual para mostrar reintento
    try {
      await bot.editMessageCaption(`🔄 **Reintentando bypass...**

🔗 **Enlace:** \`${link}...\`

⏳ **Preparando nueva sesión...**
🤖 **Estado:** Iniciando proceso`, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '⏳ Procesando...', callback_data: 'processing' }
          ]]
        }
      });
    } catch (editError) {
      console.log('Error editando para reintento:', editError.message);
    }
    
    // Reiniciar proceso
    try {
      await performBypass(link, chatId);
    } catch (error) {
      await bot.sendMessage(chatId, '❌ Error en reintento. Intenta manualmente con bypass.vip');
    }
    
  } else if (data.startsWith('paste_')) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: '📋 Instrucciones enviadas' });
    
    const originalLink = callbackQuery.message.caption.match(/🔗 \*\*Enlace:\*\* \`([^`]+)\`/)?.[1] || 'tu-enlace';
    
    const pasteInstructions = `📋 **Resolución manual:**

1️⃣ **Copia:** \`${originalLink}\`
2️⃣ **Abre:** bypass.vip  
3️⃣ **Pega** el enlace
4️⃣ **Resuelve** el captcha
5️⃣ **Copia** el resultado

⚡ **Proceso rápido:** 2-3 minutos máximo`;
    
    await bot.sendMessage(chatId, pasteInstructions, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🌐 Abrir bypass.vip', url: 'https://bypass.vip' }
        ]]
      }
    });
    
  } else if (data.startsWith('cancel_')) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Cancelado' });
    
    try {
      await bot.editMessageCaption(`❌ **Proceso cancelado**

🔄 **Para usar el bot:**
• Envía cualquier enlace
• Resuelve el captcha cuando aparezca
• Recibe el resultado automáticamente

💡 **Tip:** El proceso toma 2-3 minutos`, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Enviar otro enlace', callback_data: 'new_link' }
          ]]
        }
      });
    } catch (editError) {
      await bot.sendMessage(chatId, '❌ Proceso cancelado. Envía otro enlace cuando quieras.');
    }
  }
});

// Manejadores del bot
const handleStart = (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🤖 ¡Hola! Soy **SkipBot** (@paseabot)

🔗 **¿Cómo usar?**
Simplemente envíame cualquier enlace y yo me encargaré de hacer el bypass automáticamente.

📋 **Enlaces soportados:**
• bypass.vip
• postazap.com
• Y muchos más...

💡 **Ejemplo:**
\`https://ejemplo.com/enlace\`

¡Envía tu enlace y empezamos! 🚀
  `;
  
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
    bot.sendMessage(chatId, '❌ Por favor, envía un enlace válido.\n\nEjemplo: https://ejemplo.com/enlace');
    return;
  }

  if (isPostazap(text)) {
    const postazapMessage = `
🔗 **Enlace de Postazap detectado**

⚠️ Este tipo de enlace requiere extensión de navegador.

📋 **Instrucciones:**
1. Copia este enlace: \`${text}\`
2. Ábrelo en Chrome con extensión
3. Espera 80 segundos
4. El enlace de Telegram aparecerá automáticamente

💡 **Tip:** Instala una extensión de bypass en tu navegador para estos casos.
    `;
    
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

  const processingMsg = await bot.sendMessage(chatId, '🔄 Procesando enlace...\n⏳ Esto puede tomar hasta 60 segundos.');

  try {
    const result = await performBypass(text, chatId);
    
    await bot.deleteMessage(chatId, processingMsg.message_id);

    if (result) {
      const successMessage = `
✅ **¡Bypass completado!**

🔗 **Resultado:**
\`${result}\`

📋 El enlace ha sido copiado. ¡Listo para usar!
      `;
      
      bot.sendMessage(chatId, successMessage, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Abrir enlace', url: result }
          ]]
        }
      });
    }

  } catch (error) {
    await bot.deleteMessage(chatId, processingMsg.message_id);
    
    // Solo mostrar error si no es el error esperado del captcha
    if (!error.message.includes('libnss3.so') && !error.message.includes('Failed to launch')) {
      const errorMessage = `
❌ **Error al procesar el enlace**

🔍 **Posibles causas:**
• Enlace no soportado
• Servidor temporalmente no disponible
• Error de conexión

💡 **Solución:**
Intenta de nuevo en unos minutos o usa el enlace manualmente.

🌐 **Bypass manual:** https://bypass.vip
      `;
      
      bot.sendMessage(chatId, errorMessage, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔄 Intentar manualmente', url: 'https://bypass.vip' }
          ]]
        }
      });
    }
    
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
      status: 'SkipBot Webhook is running! 🤖',
      bot: '@paseabot',
      version: '1.0.0'
    });
  }
};
