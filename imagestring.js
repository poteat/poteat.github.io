

var fps = 60;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var zoom_cvs = document.getElementById("zoom_canvas");
var zoom_ctx = zoom_cvs.getContext('2d');

init();

var img;

var mainloop;
clearInterval(mainloop);


function init()
{
	cvs.addEventListener("dragenter", dragenter, false);
	cvs.addEventListener("dragover", dragover, false);
	cvs.addEventListener("drop", drop, false);

	document.getElementById("string_textarea").value = "";
}

function main()
{
	var zoom = document.getElementById("zoom").value;
	var width = img.naturalWidth;
	var height = img.naturalHeight;

	if (zoom_cvs.width != width*zoom || zoom_cvs.height != height*zoom)
	{
		zoom_cvs.width = width*zoom;
		zoom_cvs.height = height*zoom;
	}

	ctx.drawImage(img, 0, 0);

	var imgd = ctx.getImageData(0, 0, width, height);
	var pix = imgd.data;

	var string = "";

	for (var i = 0, n = pix.length; i < n; i += 4)
	{
		// Numbers from 0 to 9 representing RGB color.
		var R = Math.round((pix[i + 0])/255 * 9);
		var G = Math.round((pix[i + 1])/255 * 9);
		var B = Math.round((pix[i + 2])/255 * 9);

		string += "" + R + "" + G + "" + B;
	}

	document.getElementById("string_textarea").value = string;

	var zoom_imgd = zoom_ctx.getImageData(0, 0, zoom_cvs.width, zoom_cvs.height);
	var zoom_pix = zoom_imgd.data;

	for (var i = 0, n = zoom_pix.length; i < n; i += 4)
	{
		var x = Math.floor(i/4) % zoom_cvs.width;
		var y = Math.floor(i/4 / zoom_cvs.height);

		var small_x = Math.floor(x/zoom);
		var small_y = Math.floor(y/zoom);

		zoom_pix[i] = Math.round((pix[(small_x + small_y*width)*4])/255 * 9)/9*255;
		zoom_pix[i+1] = Math.round((pix[(small_x + small_y*width)*4 + 1])/255 * 9)/9*255;
		zoom_pix[i+2] = Math.round((pix[(small_x + small_y*width)*4 + 2])/255 * 9)/9*255;
		zoom_pix[i+3] = 255;
	}

	// Draw the ImageData at the given (x,y) coordinates.
	ctx.putImageData(imgd, 0, 0);
	zoom_ctx.putImageData(zoom_imgd, 0, 0);
}

function dragenter(e)
{
	e.stopPropagation();
	e.preventDefault();
}

function dragover(e)
{
	e.stopPropagation();
	e.preventDefault();
}

function drop(e)
{
	e.stopPropagation();
	e.preventDefault();

	var dt = e.dataTransfer;
	var files = dt.files;

	handleFile(files);
}

function handleFile(files)
{
	var file = files[0];

	img = document.createElement("img");
	img.classList.add("obj");
	img.file = file;

	var reader = new FileReader();
	reader.onload = (function(aImg)
	{
		return function(e)
		{
			aImg.src = e.target.result;

			cvs.width = img.naturalWidth;
			cvs.height = img.naturalHeight;

			clearInterval(mainloop);
			mainloop = setInterval("main();",1000/fps);

		};
	})(img);

	reader.readAsDataURL(file);
}