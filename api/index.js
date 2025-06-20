#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
require('dotenv').config();

// Bloque 1: Configuración inicial
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// Configurar bot según el entorno
const bot = process.env.NODE_ENV === 'production' 
  ? new TelegramBot(BOT_TOKEN)
  : new TelegramBot(BOT_TOKEN, { polling: true });

// Bloque 2: Funciones auxiliares
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

// Bloque 3: Función principal de bypass
const performBypass = async (link, chatId) => {
  let browser;
  
  try {
    // Configuración de Puppeteer para Vercel
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    // Navegar a bypass.vip
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
      // Buscar input alternativo
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

    // Detectar si hay captcha
    await delay(3000);
    
    const hasCaptcha = await page.evaluate(() => {
      const captchaElements = document.querySelectorAll('[class*="captcha"], [id*="captcha"], iframe[src*="recaptcha"], iframe[src*="hcaptcha"]');
      return captchaElements.length > 0;
    });

    if (hasCaptcha) {
      // Tomar screenshot del captcha
      const captchaScreenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 800, height: 600 }
      });

      // Enviar captcha al usuario
      await bot.sendPhoto(chatId, captchaScreenshot, {
        caption: '🤖 Se requiere resolver un captcha. Por favor, visita el enlace manualmente:\nhttps://bypass.vip',
        reply_markup: {
          inline_keyboard: [[
            { text: '🌐 Abrir bypass.vip', url: 'https://bypass.vip' }
          ]]
        }
      });

      return null;
    }

    // Esperar resultado
    await page.waitForSelector('.popup-body', {
      visible: true,
      timeout: 30000
    });

    const result = await page.$eval('.popup-body', el => el.textContent.trim());
    
    await browser.close();
    return result;

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
};

// Bloque 4: Manejadores del bot
bot.onText(/\/start/, (msg) => {
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
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
📖 **Ayuda - SkipBot**

🔧 **Comandos:**
• \`/start\` - Mensaje de bienvenida
• \`/help\` - Esta ayuda
• \`/about\` - Información del bot

🔗 **Uso:**
1. Envía cualquier enlace
2. Espera el procesamiento
3. Recibe el enlace directo

⚠️ **Notas:**
• Algunos enlaces pueden requerir captcha
• El proceso puede tomar 30-60 segundos
• Si hay errores, intenta de nuevo

🆘 **Soporte:** @tu_usuario
  `;
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/about/, (msg) => {
  const chatId = msg.chat.id;
  const aboutMessage = `
ℹ️ **Acerca de SkipBot**

🤖 **Bot:** @paseabot
🔧 **Versión:** 1.0.0
👨‍💻 **Desarrollador:** Tu nombre
🌐 **Hosting:** Vercel

🎯 **Propósito:**
Automatizar el proceso de bypass de enlaces acortados y protegidos.

⚡ **Tecnologías:**
• Node.js + Puppeteer
• Telegram Bot API
• Vercel Serverless

🔒 **Privacidad:**
No almacenamos tus enlaces ni datos personales.
  `;
  
  bot.sendMessage(chatId, aboutMessage, { parse_mode: 'Markdown' });
});

// Manejador principal para enlaces
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Ignorar comandos
  if (text && text.startsWith('/')) return;

  // Verificar si es una URL
  if (!text || !isValidUrl(text)) {
    bot.sendMessage(chatId, '❌ Por favor, envía un enlace válido.\n\nEjemplo: https://ejemplo.com/enlace');
    return;
  }

  // Caso especial: Postazap
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

  // Procesar bypass normal
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
    // Si result es null, significa que se envió captcha

  } catch (error) {
    await bot.deleteMessage(chatId, processingMsg.message_id);
    
    const errorMessage = `
❌ **Error al procesar el enlace**

🔍 **Posibles causas:**
• Enlace no soportado
• Servidor temporalmente no disponible
• Captcha requerido

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
    
    console.error('Error en bypass:', error.message);
  }
});

// Bloque 5: Configuración de webhook para producción
if (process.env.NODE_ENV === 'production') {
  app.post('/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  app.get('/', (req, res) => {
    res.json({ 
      status: 'SkipBot is running! 🤖',
      bot: '@paseabot',
      version: '1.0.0'
    });
  });

  app.listen(PORT, () => {
    console.log(`🚀 SkipBot webhook listening on port ${PORT}`);
    bot.setWebHook(`${WEBHOOK_URL}/webhook`);
  });
} else {
  console.log('🤖 SkipBot iniciado en modo desarrollo (polling)');
}

// Manejo de errores
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
