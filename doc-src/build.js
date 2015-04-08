#!/usr/bin/env node

var fs = require('fs');
var ejs = require('ejs');
var markextend = require('markextend');
var codemirror = require('codemirror-highlight');

markextend.setOptions({
    // 代码高亮
    highlight: function(code, lang) {
        if(lang && !codemirror.modes[lang]) {
            if(lang === 'coffee') lang = 'coffeescript';
            if(lang === 'json') lang = 'javascript';
            if(lang === 'html') lang = 'xml';
            if(lang === 'console') return code;

            try {
                codemirror.loadMode(lang);
            } catch(e) {
                console.error(e);
            }
        }

        if(codemirror.modes[lang])
            return codemirror.highlight(code, {mode: lang});
        else
            return code;
    }
});

var sitemap = require('./sitemap.json');
var jsdoc = require('./jsdoc.js');
var cssdoc = require('./cssdoc.js');

/**
 * @function build 通过`path`生成单个文档
 * @param {string} path 路径，如`unit/button`、`component/modal`
 * @return {void}
 */
function build(path, template) {
    var level = path.split('/');
    if(path === 'index')
        level = ['start', 'index'];

    // 组织模板数据
    var data = {
        sitemap: sitemap,
        mainnavs: [],
        sidenavs: [],
        relativePath: '../',
        mainnav: level[0],
        sidenav: level[1],
        article: '',
        script: '',
        api: '',
        current: null
    }

    if(path === 'index') {
        data.relativePath = '';
        data.mainnav = null;
        data.sidenav = null;
    }

    // 组织主导航数据
    sitemap.children.forEach(function(level1) {
        level1.path = (level1.name + '/index.html').toLowerCase();
        data.mainnavs.push(level1);
    });

    // 组织侧边栏数据
    for(var i = 0; i < sitemap.children.length; i++)
        if(sitemap.children[i].lowerName === level[0]) {
            data.sidenavs = sitemap.children[i].children;
            data.sidenavs.forEach(function(item) {
                if(item.lowerName === level[1])
                    data.current = item;
                item.path = (level[0] + '/' + item.name + '.html').toLowerCase();
            });
            break;
        }

    // 根据./view目录下的markdown文件生成文档
    var md = __dirname + '/view/' + path + '.md';
    if(fs.existsSync(md))
        data.article = markextend(fs.readFileSync(md) + '');

    // 如果是JS组件，使用jsdoc解析../src目录下的js代码生成API
    if(level[0] === 'jsUnit') {
        var jsUnit = __dirname + '/../src/js/unit/' + level[1] + '.js';
        if(fs.existsSync(jsUnit))
            data.api = jsdoc.render(jsUnit, template.jsApi);
    } else if(level[0] === 'jsModule') {
        var jsModule = __dirname + '/../src/js/module/' + level[1] + '.js';
        if(fs.existsSync(jsModule))
            data.api = jsdoc.render(jsModule, template.jsApi);
    }

    // 将./view目录下的js脚本添加到HTML中用于生成示例
    var script = __dirname + '/view/' + path + '.js';
    if(fs.existsSync(script))
        data.script = fs.readFileSync(script);

    // 渲染HTML文件
    var tpl = template.head + template.sidebar + template.main + template.foot;
    var html = ejs.render(tpl, data);

    fs.writeFileSync(__dirname + '/../doc/' + path.toLowerCase() + '.html', html, {encoding: 'utf8', mode: 0644});
    // console.log('[SUCCESS] build: ' + path);
}

module.exports = build;