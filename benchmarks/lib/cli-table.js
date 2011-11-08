
/**
 * Module dependencies.
 */

var utils = require('./utils')
  , repeat = utils.repeat
  , truncate = utils.truncate
  , pad = utils.pad;

function line (line, left, right, intersection, colWidths, totalWidth){
	var width = 0
	var line = left + repeat(line, totalWidth - 2) + right;

	colWidths.forEach(function (w, i){
		  if (i !== colWidths.length - 1) {
			  width += w + 1;
			  line = line.substr(0, width) + intersection + line.substr(width + 1);
		  } else {
			  return;
		  }
	});

	return line;
};
function lineTop(colWidths, totalWidth){
	return line('-', '+', '+', '+', colWidths, totalWidth);
};
function lineMiddle(colWidths, totalWidth){
	return line('-', '+', '+', '+', colWidths, totalWidth);
};
function lineBottom(colWidths, totalWidth){
	return line('-', '+', '+', '+', colWidths, totalWidth);
};

function string (str, index, colWidths, colAligns, style){
	var str = String(typeof str == 'object' && str.text ? str.text : str)
	  , length = str.length
	  , width = colWidths[index]
		  - (style['padding-left'] || 0)
		  - (style['padding-right'] || 0)
	  , align = colAligns[index] || 'left';

	return repeat(' ', style['padding-left'] || 0)
		 + (length == width ? str :
			 (length < width
			  ? pad(str, width, ' ', align == 'left' ? 'right' :
				  (align == 'middle' ? 'both' : 'left'))
			  : (true ? truncate(str, width, '...') : str))
		   )
		 + repeat(' ', style['padding-right'] || 0);
};

function row(cells, colWidths, colAligns, style) {
	var result = '|';

	cells.forEach(function(cell, i){
		result += string(cell, i, colWidths, colAligns, style) + '|';
    });

	return result + '\n';
};

/**
 * Table constructor
 *
 * @param {Object} options
 * @api public
 */

function Table (options){
	this.options = utils.options({
	    truncate: '…',
		colWidths: [],
		colAligns: [],
		style: {
		    'padding-left': 1,
		    'padding-right': 1,
			head: ['cyan']
	    },
		head: []
	}, options);

	var colWidths = this.options.colWidths;
	var style = this.options.style; 

	if (!colWidths.length){
		this.concat([head]).forEach(function(cells){
			cells.forEach(function(cell, i){
				var width = (typeof cell == 'object' && cell.width != undefined) ? cell.width :
								((typeof cell == 'object' ? String(cell.text) :
									String(cell)).length + (style['padding-left'] || 0) + (style['padding-right'] || 0))

				colWidths[i] = Math.max(colWidths[i] || 0, width || 0);
			});
		});
	};

	this.__totalWidth = (colWidths.length == 1 ? colWidths[0] :
		colWidths.reduce(function (a, b){ return a + b })) + colWidths.length + 1;
};

/**
 * Inherit from Array.
 */

Table.prototype.__proto__ = Array.prototype;

/**
 * Width getter
 *
 * @return {Number} width
 * @api public
 */

Table.prototype.__defineGetter__('width', function (){
  var str = this.toString().split("\n");
  if (str.length) return str[0].length;
  return 0;
});

/**
 * Render to a string.
 *
 * @return {String} table representation
 * @api public
 */

Table.prototype.render 
Table.prototype.toString = function (){
    var options = this.options;

	var ret = '';
	if (options.head.length || this.length) {

		if (options.head.length){
			ret += lineTop(options.colWidths, this.__totalWidth) + '\n' + row(options.head, options.colWidths, options.colAligns, options.style);
		}


		var i = 0,
			l = this.length;
		
		while (i < l) {
			ret += row(this[i], options.colWidths, options.colAligns, options.style) ;
			i++;
		}
	}

    ret += lineBottom(options.colWidths, this.__totalWidth);
	
    return ret;
};

Table.prototype.writeHead = function() {
	
}

/**
 * Module exports.
 */

module.exports = Table;

module.exports.version = '0.0.1';
