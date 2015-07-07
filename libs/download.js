/*
* 用户选择图标后，生成对应的字体文件和样式,
*/
var path = require('path'),
	Q = require('q'),
	fs = require('fs'),
	fontCarrier = require('font-carrier'),
	conf = require('../conf.js'),
	tools = require('./tools.js'),
	fs = require('fs'),
	archiver = require('archiver'),
	low = require('lowdb')
	/*db = new Datastore({filename: conf.db_path, autoload: true})*/;

var font = fontCarrier.create(),
	svgPath = conf.svg_path;

function getIconsByIds(ids, cb){
	var pc = low(conf.low_db)('pc'),
		h5 = low(conf.low_db)('h5');
	var _ids = [],
		icons = [],
		ret = [];

	ids.forEach(function(id, index){
		_ids.push(id - 0);
		ret = pc.find({'iconId': id - 0}) || h5.find({'iconId': id - 0});
		if(ret){
			icons.push(ret);
		}
	});
	typeof cb === 'function' && cb(icons);
/*	db.find({"iconId": { $in: _ids }}, function(err, icons){
		typeof cb === 'function' && cb(err ? [] : icons)
	});*/
}

function generateZip(icons, downloadCb){
	if(!fs.existsSync('download')) fs.mkdirSync('download');
	var folderName = 'download/iconfont-' + Date.now();
	var folder = fs.mkdirSync(folderName);
	var svgsObj = {},
		iconNames = [];
	
	icons.forEach(function(icon, index){
		svgsObj[icon.content.replace('\\f', '&#xf')] = fs.readFileSync(path.join(svgPath, icon.name.replace('i-', '') + '.svg')).toString();
		iconNames.push(icon.name.replace('i-', ''));
	});
	font.setSvg(svgsObj);
	var zipPath = folderName + '.zip';
	fs.mkdirSync(path.join(folderName, 'fonts'));
	// 异步
	Q.fcall(function(){
		font.output({
			path: path.join(folderName, 'fonts/iconfont')
		});
		// 这里生成字体后，需要读取字体文件，生成base64，但是output方法没有提供回调
		tools.generateCss(icons, path.join(folderName, 'iconfont.css'));
		tools.generateHtml(iconNames, path.join(folderName, 'demo.html'));
		// 这里生成字体后，需要读取字体文件，生成base64，但是output方法没有提供回调, 已经向作者pull requrest
		// font-carrier/lib/helpler/engine.js 280行，写文件 改正writeFileSync 同步
		// tools.generateBase64Css(icons, path.join(folderName, 'iconfont-embedded.css'));
	}).then(function(){

		var output = fs.createWriteStream(zipPath);
		var archive = archiver('zip');

		archive.on('error', function(err){
		    throw err;
		});

		archive.pipe(output);
		archive.bulk([
		    { src: [folderName + '/**']}
		]);
		archive.finalize();
		// 这里没有回调，好蛋疼
		archive.on('finish', function(){
			setTimeout(function(){
				typeof downloadCb === 'function' && downloadCb(zipPath);
			}, 5000)
			
		})
		
	});
}

module.exports = {
	download: function(ids, cb){
		getIconsByIds(ids, function(icons){
			generateZip(icons, cb);
		});
	}
}