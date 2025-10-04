#!/usr/bin/env node

/**
 * Bundle Analyzer para GomeraWay
 * Analiza el tamaño del bundle y sugiere optimizaciones
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getSizeStatus(size, thresholds) {
  if (size > thresholds.critical) return { status: 'CRITICAL', color: 'red' };
  if (size > thresholds.warning) return { status: 'WARNING', color: 'yellow' };
  return { status: 'GOOD', color: 'green' };
}

async function analyzeBuild() {
  log('\n🔍 Analizando bundle de GomeraWay...', 'cyan');
  log('═'.repeat(50), 'cyan');

  try {
    // Build para producción
    log('\n📦 Construyendo para producción...', 'blue');
    execSync('npm run build', { stdio: 'inherit' });

    // Analizar archivos del dist
    const distPath = join(__dirname, 'dist');
    const assetsPath = join(distPath, 'assets');
    
    log('\n📊 Análisis de archivos generados:', 'magenta');
    log('─'.repeat(30), 'magenta');

    const files = await fs.readdir(assetsPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    const cssFiles = files.filter(f => f.endsWith('.css'));
    
    let totalJsSize = 0;
    let totalCssSize = 0;

    const thresholds = {
      js: { warning: 500 * 1024, critical: 1 * 1024 * 1024 }, // 500KB, 1MB
      css: { warning: 100 * 1024, critical: 200 * 1024 }      // 100KB, 200KB
    };

    // Analizar archivos JS
    log('\n📄 Archivos JavaScript:', 'bold');
    for (const file of jsFiles) {
      const stats = await fs.stat(join(assetsPath, file));
      const size = stats.size;
      totalJsSize += size;
      
      const { status, color } = getSizeStatus(size, thresholds.js);
      
      log(`  ${file}`, 'white');
      log(`    Tamaño: ${formatBytes(size)} [${status}]`, color);
      
      // Identificar el tipo de chunk
      if (file.includes('index')) {
        log(`    Tipo: Main bundle (crítico)`, 'cyan');
      } else if (file.includes('vendor')) {
        log(`    Tipo: Vendor libraries`, 'blue');
      } else {
        log(`    Tipo: Lazy chunk`, 'green');
      }
    }

    // Analizar archivos CSS
    log('\n🎨 Archivos CSS:', 'bold');
    for (const file of cssFiles) {
      const stats = await fs.stat(join(assetsPath, file));
      const size = stats.size;
      totalCssSize += size;
      
      const { status, color } = getSizeStatus(size, thresholds.css);
      log(`  ${file}: ${formatBytes(size)} [${status}]`, color);
    }

    // Resumen total
    log('\n📈 Resumen Total:', 'bold');
    log('─'.repeat(20), 'magenta');
    
    const totalSize = totalJsSize + totalCssSize;
    const jsStatus = getSizeStatus(totalJsSize, { warning: 800 * 1024, critical: 1.5 * 1024 * 1024 });
    const totalStatus = getSizeStatus(totalSize, { warning: 1 * 1024 * 1024, critical: 2 * 1024 * 1024 });

    log(`JavaScript Total: ${formatBytes(totalJsSize)} [${jsStatus.status}]`, jsStatus.color);
    log(`CSS Total: ${formatBytes(totalCssSize)}`, 'cyan');
    log(`Bundle Total: ${formatBytes(totalSize)} [${totalStatus.status}]`, totalStatus.color);

    // Recomendaciones
    log('\n💡 Recomendaciones de Optimización:', 'yellow');
    log('─'.repeat(35), 'yellow');

    const recommendations = [];

    if (totalJsSize > thresholds.js.warning) {
      recommendations.push('• Implementar más code splitting para reducir el bundle principal');
      recommendations.push('• Verificar que las dependencias están en chunks separados');
    }

    if (jsFiles.length < 3) {
      recommendations.push('• Considerar más lazy loading para mejorar el code splitting');
    }

    if (totalCssSize > thresholds.css.warning) {
      recommendations.push('• Purgar CSS no utilizado con PurgeCSS o similar');
      recommendations.push('• Considerar CSS-in-JS para mejor tree shaking');
    }

    // Analizar si hay archivos grandes específicos
    const largeFiles = jsFiles.filter(f => {
      const stats = fs.statSync(join(assetsPath, f));
      return stats.size > 300 * 1024; // 300KB
    });

    if (largeFiles.length > 1) {
      recommendations.push('• Revisar dependencias pesadas en chunks grandes');
      recommendations.push('• Considerar dynamic imports para bibliotecas grandes');
    }

    if (recommendations.length === 0) {
      log('✅ El bundle está bien optimizado!', 'green');
    } else {
      recommendations.forEach(rec => log(rec, 'yellow'));
    }

    // Performance targets
    log('\n🎯 Targets de Performance:', 'cyan');
    log('─'.repeat(25), 'cyan');
    log('• Main bundle: < 500KB (actual: ' + formatBytes(totalJsSize) + ')', 
         totalJsSize < 500 * 1024 ? 'green' : 'red');
    log('• Total bundle: < 1MB (actual: ' + formatBytes(totalSize) + ')', 
         totalSize < 1 * 1024 * 1024 ? 'green' : 'red');
    log('• CSS total: < 100KB (actual: ' + formatBytes(totalCssSize) + ')', 
         totalCssSize < 100 * 1024 ? 'green' : 'red');

    log('\n✅ Análisis completado!', 'green');

  } catch (error) {
    log(`\n❌ Error durante el análisis: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Ejecutar análisis si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeBuild();
}

export { analyzeBuild };