#!/usr/bin/env node

/**
 * Performance Test Suite para GomeraWay
 * Ejecuta tests automatizados de performance y genera reportes
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import puppeteer from 'puppeteer';

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

class PerformanceTestSuite {
  constructor() {
    this.baseUrl = 'http://localhost:8080';
    this.testResults = {};
    this.browser = null;
  }

  async init() {
    log('\n🧪 Inicializando Performance Test Suite...', 'cyan');
    log('═'.repeat(50), 'cyan');
    
    // Verificar que el servidor esté corriendo
    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error('Servidor no disponible');
      }
      log('✅ Servidor de desarrollo detectado', 'green');
    } catch (error) {
      log('❌ Error: Inicia el servidor con "npm run dev" primero', 'red');
      process.exit(1);
    }

    // Inicializar Puppeteer
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    log('✅ Browser headless iniciado', 'green');
  }

  async testPageLoad(url, testName) {
    log(`\n🔍 Testing: ${testName}`, 'blue');
    log(`URL: ${url}`, 'blue');
    
    const page = await this.browser.newPage();
    
    // Habilitar métricas de performance
    await page.coverage.startJSCoverage();
    await page.coverage.startCSSCoverage();

    const startTime = Date.now();
    
    try {
      // Navegar a la página
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const loadTime = Date.now() - startTime;

      // Obtener métricas de performance
      const metrics = await page.metrics();
      
      // Obtener tamaño de recursos
      const jsCoverage = await page.coverage.stopJSCoverage();
      const cssCoverage = await page.coverage.stopCSSCoverage();
      
      let totalJSBytes = 0;
      let totalCSSBytes = 0;
      
      jsCoverage.forEach(entry => {
        totalJSBytes += entry.text.length;
      });
      
      cssCoverage.forEach(entry => {
        totalCSSBytes += entry.text.length;
      });

      // Core Web Vitals simulation
      const coreWebVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals = {};
            
            entries.forEach((entry) => {
              if (entry.entryType === 'navigation') {
                vitals.FCP = entry.domContentLoadedEventStart;
                vitals.LCP = entry.loadEventEnd - entry.loadEventStart;
              }
            });
            
            resolve(vitals);
          });
          
          observer.observe({ entryTypes: ['navigation'] });
          
          // Fallback después de 5 segundos
          setTimeout(() => {
            resolve({
              FCP: performance.now(),
              LCP: performance.now()
            });
          }, 5000);
        });
      });

      const result = {
        testName,
        url,
        statusCode: response.status(),
        loadTime,
        jsSize: totalJSBytes,
        cssSize: totalCSSBytes,
        totalSize: totalJSBytes + totalCSSBytes,
        metrics: {
          JSHeapUsedSize: formatBytes(metrics.JSHeapUsedSize),
          JSHeapTotalSize: formatBytes(metrics.JSHeapTotalSize),
          firstContentfulPaint: coreWebVitals.FCP,
          largestContentfulPaint: coreWebVitals.LCP
        }
      };

      this.testResults[testName] = result;
      
      // Mostrar resultados
      log(`  Status: ${response.status()}`, response.status() === 200 ? 'green' : 'red');
      log(`  Load Time: ${loadTime}ms`, loadTime < 3000 ? 'green' : loadTime < 5000 ? 'yellow' : 'red');
      log(`  JS Size: ${formatBytes(totalJSBytes)}`, 'cyan');
      log(`  CSS Size: ${formatBytes(totalCSSBytes)}`, 'cyan');
      log(`  Total Size: ${formatBytes(totalJSBytes + totalCSSBytes)}`, 'cyan');
      log(`  Memory Usage: ${formatBytes(metrics.JSHeapUsedSize)}`, 'magenta');

    } catch (error) {
      log(`  ❌ Error: ${error.message}`, 'red');
      this.testResults[testName] = {
        testName,
        url,
        error: error.message,
        success: false
      };
    } finally {
      await page.close();
    }
  }

  async testLazyLoading() {
    log('\n🔄 Testing Lazy Loading Implementation...', 'blue');
    
    const page = await this.browser.newPage();
    
    // Interceptar requests para ver qué se carga
    const loadedChunks = [];
    
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.js') && url.includes('assets')) {
        const chunkName = url.split('/').pop();
        loadedChunks.push(chunkName);
      }
    });

    await page.goto(`${this.baseUrl}/`, { waitUntil: 'networkidle2' });
    
    const initialChunks = [...loadedChunks];
    log(`  Initial chunks loaded: ${initialChunks.length}`, 'cyan');
    
    // Navegar a una ruta lazy (admin)
    await page.click('a[href*="/admin"]', { timeout: 5000 }).catch(() => {
      log('  ⚠️  Admin link not found, testing manual navigation', 'yellow');
    });
    
    await page.goto(`${this.baseUrl}/admin`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    const finalChunks = [...loadedChunks];
    const lazyChunks = finalChunks.filter(chunk => !initialChunks.includes(chunk));
    
    log(`  Total chunks after navigation: ${finalChunks.length}`, 'cyan');
    log(`  Lazy-loaded chunks: ${lazyChunks.length}`, lazyChunks.length > 0 ? 'green' : 'red');
    
    if (lazyChunks.length > 0) {
      log(`  ✅ Lazy loading working: ${lazyChunks.slice(0, 3).join(', ')}`, 'green');
    } else {
      log(`  ❌ Lazy loading may not be working properly`, 'red');
    }
    
    await page.close();
    
    this.testResults.lazyLoading = {
      initialChunks: initialChunks.length,
      finalChunks: finalChunks.length,
      lazyChunks: lazyChunks.length,
      working: lazyChunks.length > 0
    };
  }

  async testImageOptimization() {
    log('\n🖼️  Testing Image Optimization...', 'blue');
    
    const page = await this.browser.newPage();
    
    // Ir a una página con imágenes
    await page.goto(`${this.baseUrl}/accommodation`, { waitUntil: 'networkidle2' });
    
    // Verificar lazy loading de imágenes
    const images = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map(img => ({
        src: img.src,
        loading: img.loading,
        hasLazySrc: img.src.includes('data:') || img.loading === 'lazy'
      }));
    });
    
    const lazyImages = images.filter(img => img.hasLazySrc);
    
    log(`  Total images found: ${images.length}`, 'cyan');
    log(`  Lazy-loaded images: ${lazyImages.length}`, lazyImages.length > 0 ? 'green' : 'yellow');
    
    await page.close();
    
    this.testResults.imageOptimization = {
      totalImages: images.length,
      lazyImages: lazyImages.length,
      optimized: lazyImages.length > 0
    };
  }

  async testBundleAnalysis() {
    log('\n📦 Testing Bundle Analysis...', 'blue');
    
    try {
      // Ejecutar build
      log('  Building for production...', 'cyan');
      execSync('npm run build', { stdio: 'pipe' });
      
      // Analizar archivos generados
      const distPath = join(__dirname, 'dist', 'assets');
      const files = await fs.readdir(distPath);
      
      const jsFiles = files.filter(f => f.endsWith('.js'));
      const cssFiles = files.filter(f => f.endsWith('.css'));
      
      let totalJsSize = 0;
      let totalCssSize = 0;
      const fileDetails = [];
      
      for (const file of [...jsFiles, ...cssFiles]) {
        const stats = await fs.stat(join(distPath, file));
        const size = stats.size;
        
        fileDetails.push({
          name: file,
          size: size,
          type: file.endsWith('.js') ? 'js' : 'css'
        });
        
        if (file.endsWith('.js')) totalJsSize += size;
        if (file.endsWith('.css')) totalCssSize += size;
      }
      
      const totalSize = totalJsSize + totalCssSize;
      
      log(`  JS files: ${jsFiles.length} (${formatBytes(totalJsSize)})`, 'cyan');
      log(`  CSS files: ${cssFiles.length} (${formatBytes(totalCssSize)})`, 'cyan');
      log(`  Total bundle: ${formatBytes(totalSize)}`, totalSize < 1024 * 1024 ? 'green' : 'yellow');
      
      // Verificar targets
      const jsTarget = 500 * 1024; // 500KB
      const totalTarget = 1024 * 1024; // 1MB
      
      if (totalJsSize <= jsTarget) {
        log(`  ✅ JS size target met (${formatBytes(totalJsSize)} ≤ ${formatBytes(jsTarget)})`, 'green');
      } else {
        log(`  ❌ JS size exceeds target (${formatBytes(totalJsSize)} > ${formatBytes(jsTarget)})`, 'red');
      }
      
      if (totalSize <= totalTarget) {
        log(`  ✅ Total size target met`, 'green');
      } else {
        log(`  ❌ Total size exceeds target`, 'red');
      }
      
      this.testResults.bundleAnalysis = {
        jsFiles: jsFiles.length,
        cssFiles: cssFiles.length,
        totalJsSize,
        totalCssSize,
        totalSize,
        jsTargetMet: totalJsSize <= jsTarget,
        totalTargetMet: totalSize <= totalTarget,
        fileDetails
      };
      
    } catch (error) {
      log(`  ❌ Bundle analysis failed: ${error.message}`, 'red');
      this.testResults.bundleAnalysis = {
        error: error.message,
        success: false
      };
    }
  }

  async runAllTests() {
    await this.init();
    
    // Test critical pages
    await this.testPageLoad(`${this.baseUrl}/`, 'Homepage');
    await this.testPageLoad(`${this.baseUrl}/accommodation`, 'Accommodation Page');
    await this.testPageLoad(`${this.baseUrl}/vehicles`, 'Vehicles Page');
    
    // Test dashboard pages (lazy loaded)
    await this.testPageLoad(`${this.baseUrl}/admin`, 'Admin Dashboard');
    
    // Test specific optimizations
    await this.testLazyLoading();
    await this.testImageOptimization();
    await this.testBundleAnalysis();
    
    await this.generateReport();
    
    if (this.browser) {
      await this.browser.close();
    }
  }

  async generateReport() {
    log('\n📊 Generando Reporte de Performance...', 'magenta');
    log('═'.repeat(50), 'magenta');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: Object.keys(this.testResults).length,
        passed: 0,
        failed: 0
      },
      details: this.testResults
    };
    
    // Calcular resumen
    Object.values(this.testResults).forEach(result => {
      if (result.error) {
        report.summary.failed++;
      } else {
        report.summary.passed++;
      }
    });
    
    // Guardar reporte
    const reportPath = join(__dirname, 'performance-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Mostrar resumen
    log(`\n📈 Resumen de Resultados:`, 'bold');
    log(`  Tests ejecutados: ${report.summary.totalTests}`, 'cyan');
    log(`  Exitosos: ${report.summary.passed}`, 'green');
    log(`  Fallidos: ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'green');
    
    log(`\n📄 Reporte detallado guardado en: ${reportPath}`, 'cyan');
    
    // Mostrar recomendaciones
    this.showRecommendations();
  }

  showRecommendations() {
    log('\n💡 Recomendaciones:', 'yellow');
    log('─'.repeat(20), 'yellow');
    
    const bundle = this.testResults.bundleAnalysis;
    if (bundle && !bundle.jsTargetMet) {
      log('• Considerar más code splitting para reducir bundle JS', 'yellow');
    }
    
    const lazy = this.testResults.lazyLoading;
    if (lazy && !lazy.working) {
      log('• Verificar implementación de lazy loading', 'yellow');
    }
    
    const images = this.testResults.imageOptimization;
    if (images && !images.optimized) {
      log('• Implementar lazy loading de imágenes', 'yellow');
    }
    
    // Verificar tiempos de carga
    Object.values(this.testResults).forEach(result => {
      if (result.loadTime && result.loadTime > 3000) {
        log(`• Optimizar tiempo de carga de ${result.testName} (${result.loadTime}ms)`, 'yellow');
      }
    });
    
    log('\n✅ Suite de tests completada!', 'green');
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const suite = new PerformanceTestSuite();
  suite.runAllTests().catch(console.error);
}

export { PerformanceTestSuite };