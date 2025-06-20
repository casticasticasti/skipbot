# 🤖 SkipBot (@paseabot)

Bot de Telegram para bypass automático de enlaces

## 🚀 Características

- ✅ Bypass automático de enlaces protegidos
- 🔍 Detección automática de captchas
- 📱 Interfaz simple en Telegram
- ⚡ Respuesta rápida (30-60 segundos)
- 🌐 Soporte para múltiples servicios

## 🛠️ Instalación y Despliegue

### 1. Clonar repositorio

```bash
git clone https://github.com/casticasticasti/skipbot.git
cd skipbot
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env`:

```env
BOT_TOKEN=XXX
WEBHOOK_URL=https://tu-proyecto.vercel.app/webhook
NODE_ENV=production
```

### 3. Desplegar en Vercel

```bash
npm install -g vercel
vercel --prod
```

### 4. Configurar webhook

Después del despliegue, configura las variables de entorno en Vercel Dashboard.

## 📱 Uso del Bot

1. Busca `@paseabot` en Telegram
2. Envía `/start` para comenzar
3. Envía cualquier enlace
4. Espera el resultado automático

## 🔧 Comandos

- `/start` - Iniciar bot
- `/help` - Ayuda
- `/about` - Información

## 🌐 Enlaces Soportados

- bypass.vip
- postazap.com
- Y muchos más...

## 📞 Soporte

- Telegram: @tu_usuario
- Issues: GitHub Issues

## 📄 Licencia

MIT License

```txt

### 6. Archivo .gitignore
```gitignore:.gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# Screenshots and temp files
screenshots/
temp/
```

### 7. Script de configuración inicial

```bash:setup.sh
#!/bin/bash

# Bloque 1: Configuración inicial del proyecto
echo "🚀 Configurando SkipBot..."

# Crear estructura de carpetas
mkdir -p screenshots temp logs

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Verificar variables de entorno
if [ ! -f .env ]; then
    echo "⚠️ Creando archivo .env..."
    cat > .env << EOL
BOT_TOKEN=7244350754:AAGa8lKytE2PXhhT51iD8hoplB3H_zKvA_EI
WEBHOOK_URL=https://tu-proyecto.vercel.app/webhook
NODE_ENV=development
EOL
    echo "✅ Archivo .env creado. ¡Configura tu WEBHOOK_URL!"
fi

# Hacer ejecutable
chmod +x setup.sh

echo "✅ Configuración completada!"
echo "📝 Próximos pasos:"
echo "1. Edita .env con tu WEBHOOK_URL"
echo "2. Ejecuta 'npm run dev' para desarrollo"
echo "3. Ejecuta 'vercel --prod' para producción"
```

### 8. Archivo de utilidades adicionales

```javascript:utils/helpers.js
// Bloque 1: Utilidades para el bot
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const isValidUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

const extractDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return 'unknown';
  }
};

const formatResult = (result, originalUrl) => {
  const domain = extractDomain(originalUrl);
  return `
✅ **¡Bypass completado!**

🔗 **Enlace original:** ${domain}
📋 **Resultado:**
\`${result}\`

⏰ **Procesado:** ${new Date().toLocaleTimeString('es-ES')}
  `;
};

const formatError = (error, originalUrl) => {
  const domain = extractDomain(originalUrl);
  return `
❌ **Error al procesar enlace**

🔗 **Dominio:** ${domain}
⚠️ **Error:** ${error.message}

💡 **Sugerencias:**
• Verifica que el enlace sea válido
• Intenta de nuevo en unos minutos
• Usa bypass manual si persiste

🌐 **Bypass manual:** https://bypass.vip
  `;
};

module.exports = {
  delay,
  isValidUrl,
  extractDomain,
  formatResult,
  formatError
};
```

### 9. Configuración de logging

```javascript:utils/logger.js
// Bloque 1: Sistema de logging
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data
  };

  // Console output
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
  if (data) console.log(data);

  // File output (solo en desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }
};

module.exports = {
  info: (message, data) => log('info', message, data),
  error: (message, data) => log('error', message, data),
  warn: (message, data) => log('warn', message, data),
  debug: (message, data) => log('debug', message, data)
};
```

## 🚀 Pasos para implementar

### 1. Crear repositorio en GitHub

```bash
git init
git add .
git commit -m "🎉 Initial commit - SkipBot"
git branch -M main
git remote add origin https://github.com/casticasticasti/skipbot.git
git push -u origin main
```

### 2. Configurar en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Conecta tu repositorio de GitHub
3. Configura las variables de entorno:
   - `BOT_TOKEN`: `7244350754:AAGa8lKytE2PXhhT51iD8hoplB3H_zKvA_EI`
   - `WEBHOOK_URL`: `https://tu-proyecto.vercel.app/webhook`
   - `NODE_ENV`: `production`

### 3. Configurar el webhook del bot

```bash
curl -X POST "https://api.telegram.org/bot7244350754:AAGa8lKytE2PXhhT51iD8hoplB3H_zKvA_EI/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://tu-proyecto.vercel.app/webhook"}'
````
