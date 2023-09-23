const gulp = require('gulp');
const cheerio = require('gulp-cheerio');
const fs = require('fs');
const path = require('path');
const plumber = require('gulp-plumber');
const cleanCSS = require('gulp-clean-css');
const concat = require('gulp-concat');
const penthouse = require('penthouse');
const puppeteer = require('puppeteer');
const puppeteerExtra = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const purify = require('purify-css');
const merge = require('merge-stream'); // Добавлено для объединения файлов

// Путь к HTML файлам
const htmlPath = './bitrix/html_pages/**/*.html';

puppeteerExtra.use(stealthPlugin());

// Задача для оптимизации HTML страницы кэша
gulp.task('optimize-html', function () {
  return gulp.src(htmlPath)
    .pipe(plumber())
    .pipe(cheerio({
      run: function ($, file) {
        // Получаем путь к HTML файлу
        const htmlFilePath = file.path;

        console.log(`Начало оптимизации HTML файла: ${htmlFilePath}`);

        // Очищаем все CSS файлы в папке с HTML файлом
        const cssDir = path.dirname(htmlFilePath);
        const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));
        let fullPath = path.join(path.dirname(cssDir), path.basename(cssDir));
        fullPath = fullPath.replace(/.*?bitrix/, "./bitrix").replace(/\\/g, "/");

        cssFiles.forEach(cssFile => {
          const cssFilePath = path.join(cssDir, cssFile);
          fs.unlinkSync(cssFilePath);
          console.log(`Удален файл CSS: ${cssFilePath}`);
        });

        // Собираем ссылки на все локальные CSS
        const localCSSLinks = $('link[rel="stylesheet"][href^="/"]');
        if (localCSSLinks.length < 1) return false;

        const localCSSPaths = localCSSLinks.map(function () {
          return $(this).attr('href').replace(/\?.*$/, '');
        }).get();

        // Преобразуем локальные адреса в абсолютные и проверяем существование файлов
        const absoluteCSSPaths = localCSSPaths.map(cssPath => {
          const absolutePath = cssPath.startsWith('/bitrix/') ? `.${cssPath}` : cssPath;

          if (fs.existsSync(absolutePath)) {
            return absolutePath;
          } else {
            console.warn(`Файл не найден: ${absolutePath}`);
            return null; // Если файл не существует, вернем null
          }
        }).filter(Boolean); // Фильтруем null значения, чтобы удалить ненайденные файлы


        console.log(`Найдено ${absoluteCSSPaths.length} локальных CSS файлов.`);

        // Обработка и объединение каждого CSS файла
        const localCSSFiles = absoluteCSSPaths.map(cssPath => {
          return gulp.src(cssPath)
            .pipe(plumber())
            .pipe(cleanCSS({
              level: {
                1: {
                  cleanupCharsets: true, // controls `@charset` moving to the front of a stylesheet; defaults to `true`
                  normalizeUrls: false, // controls URL normalization; defaults to `true`
                  optimizeBackground: true, // controls `background` property optimizations; defaults to `true`
                  optimizeBorderRadius: true, // controls `border-radius` property optimizations; defaults to `true`
                  optimizeFilter: true, // controls `filter` property optimizations; defaults to `true`
                  optimizeFont: true, // controls `font` property optimizations; defaults to `true`
                  optimizeFontWeight: true, // controls `font-weight` property optimizations; defaults to `true`
                  optimizeOutline: true, // controls `outline` property optimizations; defaults to `true`
                  removeEmpty: true, // controls removing empty rules and nested blocks; defaults to `true`
                  removeNegativePaddings: true, // controls removing negative paddings; defaults to `true`
                  removeQuotes: true, // controls removing quotes when unnecessary; defaults to `true`
                  removeWhitespace: false, // controls removing unused whitespace; defaults to `true`
                  replaceMultipleZeros: true, // contols removing redundant zeros; defaults to `true`
                  replaceTimeUnits: true, // controls replacing time units with shorter values; defaults to `true`
                  replaceZeroUnits: true, // controls replacing zero values with units; defaults to `true`
                  roundingPrecision: false, // rounds pixel values to `N` decimal places; `false` disables rounding; defaults to `false`
                  selectorsSortingMethod: 'standard', // denotes selector sorting method; can be `'natural'` or `'standard'`, `'none'`, or false (the last two since 4.1.0); defaults to `'standard'`
                  specialComments: 'all', // denotes a number of /*! ... */ comments preserved; defaults to `all`
                  tidyAtRules: true, // controls at-rules (e.g. `@charset`, `@import`) optimizing; defaults to `true`
                  tidyBlockScopes: true, // controls block scopes (e.g. `@media`) optimizing; defaults to `true`
                  tidySelectors: true, // controls selectors optimizing; defaults to `true`,
                  variableValueOptimizers: [] // controls value optimizers which are applied to variables
                },
                2: {
                  mergeAdjacentRules: true, // controls adjacent rules merging; defaults to true
                  mergeIntoShorthands: true, // controls merging properties into shorthands; defaults to true
                  mergeMedia: true, // controls `@media` merging; defaults to true
                  mergeNonAdjacentRules: true, // controls non-adjacent rule merging; defaults to true
                  mergeSemantically: false, // controls semantic merging; defaults to false
                  overrideProperties: true, // controls property overriding based on understandability; defaults to true
                  removeEmpty: true, // controls removing empty rules and nested blocks; defaults to `true`
                  reduceNonAdjacentRules: true, // controls non-adjacent rule reducing; defaults to true
                  removeDuplicateFontRules: true, // controls duplicate `@font-face` removing; defaults to true
                  removeDuplicateMediaBlocks: true, // controls duplicate `@media` removing; defaults to true
                  removeDuplicateRules: true, // controls duplicate rules removing; defaults to true
                  removeUnusedAtRules: false, // controls unused at rule removing; defaults to false (available since 4.1.0)
                  restructureRules: false, // controls rule restructuring; defaults to false
                  skipProperties: ['background'] // controls which properties won't be optimized, defaults to `[]` which means all will be optimized (since 4.1.0)
                },
              },
              compatibility: {
                colors: {
                  hexAlpha: false, // controls 4- and 8-character hex color support
                  opacity: true // controls `rgba()` / `hsla()` color support
                },
                properties: {
                  backgroundClipMerging: true, // controls background-clip merging into shorthand
                  backgroundOriginMerging: true, // controls background-origin merging into shorthand
                  backgroundSizeMerging: true, // controls background-size merging into shorthand
                  colors: true, // controls color optimizations
                  ieBangHack: false, // controls keeping IE bang hack
                  ieFilters: false, // controls keeping IE `filter` / `-ms-filter`
                  iePrefixHack: false, // controls keeping IE prefix hack
                  ieSuffixHack: false, // controls keeping IE suffix hack
                  merging: true, // controls property merging based on understandability
                  shorterLengthUnits: false, // controls shortening pixel units into `pc`, `pt`, or `in` units
                  spaceAfterClosingBrace: true, // controls keeping space after closing brace - `url() no-repeat` into `url()no-repeat`
                  urlQuotes: true, // controls keeping quoting inside `url()`
                  zeroUnits: true // controls removal of units `0` value
                },
                selectors: {
                  adjacentSpace: false, // controls extra space before `nav` element
                  ie7Hack: true, // controls removal of IE7 selector hacks, e.g. `*+html...`
                  mergeablePseudoClasses: [':active', ':has', ':not'], // controls a whitelist of mergeable pseudo classes
                  mergeablePseudoElements: ['::after', '::before'], // controls a whitelist of mergeable pseudo elements
                  mergeLimit: 8191, // controls maximum number of selectors in a single rule (since 4.1.0)
                  multiplePseudoMerging: true // controls merging of rules with multiple pseudo classes / elements (since 4.1.0)
                },
                units: {
                  ch: true, // controls treating `ch` as a supported unit
                  in: true, // controls treating `in` as a supported unit
                  pc: true, // controls treating `pc` as a supported unit
                  pt: true, // controls treating `pt` as a supported unit
                  rem: true, // controls treating `rem` as a supported unit
                  vh: true, // controls treating `vh` as a supported unit
                  vm: true, // controls treating `vm` as a supported unit
                  vmax: true, // controls treating `vmax` as a supported unit
                  vmin: true // controls treating `vmin` as a supported unit
                }
              }
            }))
            .pipe(gulp.dest(cssDir));
        });

        // Объединение обработанных CSS файлов в один
        return merge(localCSSFiles)
          .pipe(plumber())
          .pipe(concat('style.css'))
          .pipe(gulp.dest(cssDir))
          .on('end', function () {
            console.log('Локальные CSS файлы объединены в style.css.');

            console.log('Удаляем локальные CSS файлы' + cssFiles);
            // Получаем список CSS файлов в директории cssDir
            fs.readdir(cssDir, (err, files) => {
              if (err) throw err;

              // Удаляем каждый CSS файл, кроме style.min.css
              files.forEach(file => {
                if (file.endsWith('.css') && file !== 'style.css') {
                  const filePath = `${cssDir}/${file}`;
                  fs.unlink(filePath, (err) => {
                    if (err) throw err;
                    console.log(`Удален файл CSS: ${filePath}`);
                  });
                }
              });
            });

            // Далее выполняем обработку объединенного CSS файла
            //console.log("66:" + path.join(cssDir, 'style.css'));
            gulp.src(path.join(cssDir, 'style.css'))
              .pipe(plumber())

              .pipe(gulp.dest(cssDir))
              .on('end', function () {
                console.log('Обработка CSS файла завершена.');

                const url = $('link[rel="canonical"]').attr('href');

                console.log("Извлекаем Critical CSS " + url);
                penthouse({
                  url: url,
                  css: path.join(cssDir, 'style.css'),
                  width: 1680,  // viewport width for 13" Retina Macbook.  Adjust for your needs
                  height: 953,  // viewport height for 13" Retina Macbook.  Adjust for your needs
                  keepLargerMediaQueries: true,  // when true, will not filter out larger media queries
                  renderWaitTime: 5000,
                  forceExclude: [
                    // '.btn',
                    // '.btn-orange',
                    // '.btn-sub',
                    // '.btn-info'
                  ],
                  forceInclude: [
                    '.col-sm-12',
                    '.col-sm-5',
                    '.col-md-7',
                    '.col-md-5',
                    '.p-xs-0',
                    '.row',
                    '.flex',
                    '.slider-bg',
                    '.w-100',
                    '.no-gutters',
                    '.container',
                    '.img-rounded',
                    '.px-0',
                    '.pull-right',
                    '.ml-3'
                  ],
                  blockJSRequests: false,
                  propertiesToRemove: [
                    '@font-face',
                    /url\(/,
                    '(.*)transition(.*)',
                    'cursor',
                    'pointer-events',
                    '(-webkit-)?tap-highlight-color',
                    '(.*)user-select',
                    'background-color',
                    'background-image',
                    'background',
                  ],
                  userAgent: 'Penthouse Critical Path CSS Generator', // specify which user agent string when loading the page
                  puppeteer: {
                    getBrowser: undefined, // A function that resolves with a puppeteer browser to use instead of launching a new browser session
                  }
                }).then(criticalCSS => {
                  console.log('Извлечен Critical CSS.');

                  // Удаляем локальные CSS ссылки
                  localCSSLinks.remove();
                  console.log('Локальные CSS ссылки удалены.');

                  // Добавляем Critical CSS перед </head>
                  $('head').first().append(`<style>${criticalCSS}</style>`);
                  console.log('Critical CSS добавлен в <head>.');

                  // Обработка и запись сжатого CSS файла
                  gulpCSS(url, htmlFilePath, cssDir);

                  // Перемещаем обработанный CSS в конец </body>
                  const body = $('body');


                  body.append(`<link rel="stylesheet" href="${fullPath}/style.min.css"  data-template-style="true">`);

                  console.log('Ссылка на обработанный CSS добавлена перед </body>.');

                  let html = $.html();
                  // Удаляем пробелы, табуляцию и переносы строк между тегами
                  html = html.replace(/\s+/g, ' ');

                  // Удаляем комментарии
                  //  html = html.replace(/<!--[\s\S]*?-->/g, '');

                  // Перезаписываем HTML файл
                  fs.writeFileSync(htmlFilePath, html);
                  console.log(`HTML файл ${htmlFilePath} перезаписан.`);
                })
                  .catch(err => {
                    // handle the error
                    console.log(err);
                  });
              });
          });
      },
      parserOptions: {
        decodeEntities: false,
      },
    }));
});

// Задача для обработки и записи сжатого CSS файла
async function gulpCSS(url, htmlFilePath, cssDir) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url);
  const htmlContent = await page.content();
  const cssSource = fs.readFileSync(path.join(cssDir, 'style.css'), 'utf8');

  let source = [htmlContent, cssSource];

  if (!Array.isArray(source)) {
    source = Array.from(source);
  }

  console.log("Готовим сжатый файл: " + path.join(cssDir, 'style.min.css'));

  const purifiedCss = purify(...source, {
    minify: true,
    info: true,
    whitelist: ['cookie-notification', '*modal*', 'trans*', 'line', 'logo-wrapper', 'logo-trans', 'mark', 'modal-8800'],
  });

  console.log("Записываем сжатый файл: " + path.join(cssDir, 'style.min.css'));
  fs.writeFileSync(path.join(cssDir, 'style.min.css'), purifiedCss);

  // Получаем список CSS файлов в директории cssDir
  fs.readdir(cssDir, (err, files) => {
    if (err) throw err;

    // Удаляем каждый CSS файл, кроме style.min.css
    files.forEach(file => {
      if (file.endsWith('.css') && file !== 'style.min.css') {
        const filePath = `${cssDir}/${file}`;
        fs.unlink(filePath, (err) => {
          if (err) throw err;
          console.log(`Удален файл CSS: ${filePath}`);
        });
      }
    });
  });

  await browser.close();
}

// Запуск задачи при старте Gulp
gulp.task('default', ['optimize-html']);
