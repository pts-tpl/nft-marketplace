/**
 * Upstream: https://github.com/pattisahusiwa/tpl-skeleton
 * Author: Asis Pattisahusiwa
 */

// pnpm i -D gulp browser-sync del gulp-if gulp-sass sass gulp-sourcemaps \\
// gulp-postcss autoprefixer postcss gulp-rename gulp-twig gulp-plumber gulp-data

const gulp = require('gulp');
let _path, _env, _server;

function generatePath(dest) {
    return {
        dist: {
            root: dest,
            assets: `${dest}/assets`
        },
        src: {
            root: 'src',
            scss: 'src/scss',
            twig: 'src/twig',
            twigdata: 'src/twigdata',
            assets: 'src/assets'
        }
    }
}

function clean(done) {
    const del = require('del');
    return del([_path.dist.root], done);
}

function compileSCSS(done){
    const sass = require('gulp-sass')(require('sass'));
    const gulpif = require('gulp-if');
    const rename = require('gulp-rename');
    const sourcemaps = require('gulp-sourcemaps');
    const postcss = require("gulp-postcss");
    const autoprefixer = require("autoprefixer");

    const options = {
        precision: 8,
        errLogToConsole: true,
        includePaths: ['./node_modules'],
    };

    const task = gulp.src(`${_path.src.scss}/main.scss`, {allowEmpty: true})
        .pipe(gulpif(_env === 'dev', sourcemaps.init()))
        .pipe(sass(options)).on('error', function(err) {
            sass.logError.bind(this)(err);
            if (_env !== 'dev') {
                process.exit(err.status);
            }
        })
        .pipe(postcss([
            autoprefixer()
        ]))
        .pipe(rename(function (path) {
            path.extname = ".min.css";
        }))
        .pipe(gulpif(_env === 'dev', sourcemaps.write('.')))
        .pipe(gulp.dest(_path.dist.assets));

    if (_server) {
        task.pipe(_server.stream({ match: '**/*.css' }));
    }

    done();
}

function compileTwig(done){
    const rename = require('gulp-rename');
    const plumber = require('gulp-plumber');
    const gdata = require('gulp-data');
    const twig = require('gulp-twig');



    gulp.src(`${_path.src.twig}/**/*.html.twig`)
        // Stay live and reload on error
        .pipe(plumber({
            errorHandler: function (err) {
                process.stderr.write('\n' + err.toString() + '\n\n');
                if (_env !== 'dev') {
                    process.exit(1);
                }
                this.emit('end');
            }
        }))
        .pipe(gdata((file) => {

            const loadFile = (path) => {
                if (fs.existsSync(path)) {
                    return JSON.parse(fs.readFileSync(path));
                }
                return null;
            }

            const fs = require('fs');
            const nodePath = require('path');

            const filename = nodePath.basename(file.path, '.html.twig') + '.json';
            let data = loadFile(`${_path.src.twigdata}/${filename}`);

            let global = loadFile(`${_path.src.twigdata}/global.json`);
            return {...global, ...data};
        }))
        .pipe(twig({baseDir: _path.src.twig}))
        .pipe(rename(function (path) {
            path.dirname = "";
            path.extname = "";
        }))
        .pipe(gulp.dest(_path.dist.root));
    done();
}

function copyAssets(done){
    gulp.src(`${_path.src.assets}/**/*`)
    .pipe(gulp.dest(_path.dist.assets));
    done();
}

function startServer(done){
    _server = require('browser-sync').create();

    _server.init({
        server: {
            baseDir: _path.dist.root
        },
        open: true,
        notify: false,
        https: false,
    });
    done();
}

function watch(done){
    const reload = (done) => {
        _server.reload();
        done();
    }

    gulp.watch(`${_path.src.scss}/**/*.scss`, compileSCSS);
    gulp.watch(`${_path.src.twig}/**/*.twig`, gulp.series(compileTwig, reload));
    gulp.watch(`${_path.src.twig}/**/*.svg`, gulp.series(compileTwig, reload));
    gulp.watch(`${_path.src.twigdata}/**/*.json`, gulp.series(compileTwig, reload));
    gulp.watch(`${_path.src.assets}/**/*`, gulp.series(copyAssets, reload));

    done();
}

const devBuild = (done) => {
    _path = generatePath('dev');
    _env = 'dev';
    done();
}

const devProd = (done) => {
    _path = generatePath('dist');
    _env = 'prod';
    done();
}


const build = gulp.parallel(compileSCSS, compileTwig, copyAssets);
exports.default = gulp.series(devBuild, clean, build, startServer, watch);
exports.build = gulp.series(devProd, clean, build);
