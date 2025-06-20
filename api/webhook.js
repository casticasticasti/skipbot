const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
require('dotenv').config();

const bot = new TelegramBot(process.env.BOT_TOKEN);

// Funciones auxiliares (igual que el CLI)
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

// Función principal de bypass (adaptada del CLI exitoso)
const performBypass = async (link, chatId) => {
  let browser;
  let captchaMessage;

  try {
    // Configuración igual que el CLI pero para Vercel
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Navegar a bypass.vip (igual que CLI)
    await page.goto('https://bypass.vip', {
      waitUntil: 'networkidle0'
    });

    console.log('🌐 Página cargada: ' + await page.title());

    // Buscar input (lógica del CLI)
    let inputFound = false;
    try {
      await page.waitForSelector('#bypassInput', { timeout: 5000 });
      inputFound = true;
    } catch (error) {
      console.log('⚠️ No se encontró #bypassInput, buscando alternativas...');
      const inputSelector = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const input = inputs.find(i => i.placeholder && i.placeholder.toLowerCase().includes('paste'));
        return input ? input.id || 'input' + inputs.indexOf(input) : null;
      });

      if (inputSelector) {
        console.log(`🔍 Input alternativo encontrado: ${inputSelector}`);
        const finalSelector = inputSelector.startsWith('#') ? inputSelector : '#' + inputSelector;
        const inputHandle = await page.$(finalSelector);
        if (inputHandle) {
          await inputHandle.click({ clickCount: 3 });
          await inputHandle.press('Backspace');
          await inputHandle.type(link);
          inputFound = true;
        }
      }
    }

    // Si el selector original funcionó
    if (inputFound && await page.$('#bypassInput')) {
      await page.evaluate(() => document.querySelector('#bypassInput').value = '');
      await page.type('#bypassInput', link);
      
      const inputValue = await page.$eval('#bypassInput', el => el.value);
      console.log('📝 Link ingresado:', inputValue);
    }

    if (!inputFound) {
      throw new Error('No se pudo encontrar el campo de entrada en bypass.vip');
    }

    await delay(1000);

    // Buscar botón (lógica del CLI)
    let buttonClicked = false;
    try {
      await page.waitForSelector('#submitButton', { timeout: 5000 });
      await page.click('#submitButton');
      buttonClicked = true;
    } catch (error) {
      console.log('⚠️ No se encontró #submitButton, buscando alternativas...');
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

    // Aquí viene la parte clave: mostrar captcha y esperar (como el CLI)
    await delay(3000);

    // Tomar screenshot del captcha
    const captchaScreenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });

    // Enviar captcha con mensaje minimalista
    captchaMessage = await bot.sendPhoto(chatId, captchaScreenshot, {
      caption: `🔄 **Resuelve el captcha**

🔗 \`${link.substring(0, 60)}...\`

👆 **Toca el botón** → Resuelve el captcha → **Espera aquí**

⏱️ Detectaré automáticamente cuando termines`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🌐 Resolver Captcha', url: 'https://bypass.vip' }
        ]]
      }
    });

    // Esperar resultado (igual que el CLI - 50 segundos)
    await page.waitForSelector('.popup-body', {
      visible: true,
      timeout: 50000
    });

    // Obtener resultado
    const result = await page.$eval('.popup-body', el => el.textContent.trim());
    console.log('\n✅ Resultado:', result);

    await browser.close();

    // Verificar si es URL válida (igual que CLI)
    const isValidResult = (urlString) => {
      try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch (e) {
        return false;
      }
    };

    if (isValidResult(result)) {
      // Editar mensaje con resultado exitoso
      await bot.editMessageCaption(`✅ **¡Completado!**

🎯 **Resultado:**
\`${result}\`

📋 **Copiado automáticamente**`, {
        chat_id: chatId,
        message_id: captchaMessage.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Abrir enlace', url: result }
          ]]
        }
      });

      return result;
    } else {
      throw new Error('El resultado no es una URL válida: ' + result);
    }

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    
    // Si hay captchaMessage, editarlo con error
    if (captchaMessage) {
      try {
        await bot.editMessageCaption(`⏰ **Tiempo agotado o error**

🔄 **Opciones:**
• Envía el enlace de nuevo
• Usa bypass.vip manualmente

💡 **Tip:** Resuelve el captcha más rápido`, {
          chat_id: chatId,
          message_id: captchaMessage.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🌐 Bypass manual', url: 'https://bypass.vip' }
            ]]
          }
        });
      } catch (editError) {
        console.log('Error editando mensaje de error:', editError.message);
      }
    }
    
    throw error;
  }
};

// Manejadores simples
const handleStart = (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🤖 **SkipBot** - Bypass automático

📝 **Uso:** Envía cualquier enlace
⚡ **Proceso:** 2-3 minutos máximo
🔄 **Flujo:** Enlace → Captcha → Resultado

¡Envía tu enlace! 🚀`, { parse_mode: 'Markdown' });
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

  // Caso especial: Postazap (igual que CLI)
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

  // Mensaje de procesamiento minimalista
  const processingMsg = await bot.sendMessage(chatId, '🔄 Iniciando bypass...');

  try {
    const result = await performBypass(text, chatId);
    
    // Eliminar mensaje de procesamiento
    await bot.deleteMessage(chatId, processingMsg.message_id);

    // Si llegamos aquí, el resultado ya se envió en performBypass

  } catch (error) {
    await bot.deleteMessage(chatId, processingMsg.message_id);
    
    // Solo mostrar error si no es el error esperado
    if (!error.message.includes('libnss3.so') && !error.message.includes('Failed to launch')) {
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
      status: 'SkipBot running! 🤖',
      version: '1.0.0'
    });
  }
};
