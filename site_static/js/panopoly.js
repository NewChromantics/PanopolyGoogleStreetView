
function GetUploadUrl()
{
	//	locally testing
	if ( window.location.origin == "file://" )
		return "http://localhost:8888/upload.php";
	return "http://upload.panopo.ly/upload.php";
}

function AllowWebGl()
{
	return true;
}

function HasWebGl()
{
	if ( !AllowWebGl() )
		return false;
	
	if ( !window.WebGLRenderingContext )
		return false;
	
	//	could exist, but not enabled (iphone!)
	var canvas = document.createElement("canvas");
	var gl = null;
	var experimental = false;
	try			{	gl = canvas.getContext("webgl");	}
	catch (e)	{	gl = null;	}
	if ( gl )
		return true;
	
	//	do we have experimental? (safari 7 osx enabled from developer menu)
	try			{	gl = canvas.getContext("experimental-webgl"); experimental = true;	}
	catch (e)	{	gl = null;	}
	if (gl)
		return true;

	return false;
}

function IsMobile()
{
	if ( IsDevice('iPad') )
		return true;
	//return true;
	return !HasWebGl();
}


function GetDefaultPanoFilename()
{
	return "equirectangular.png";
}

function IsShrinkSupported()
{
	if ( IsDevice('iPad') )
		return true;
	return false;
}

function IsSplitSupported()
{
	return true;
}


function IsGyroSupported()
{
	//	gr: event supported... but assume not availible until we get a first event. so we need to create this regardless
	if ( !window.DeviceOrientationEvent )
		return false;
	
	if ( IsDevice('iPad') || IsDevice('iPhone') )
		return true;
	return false;
}



function ReplaceFilename(Filename,Number,NextNumber)
{
	var NewFilename = Filename.replace( "."+Number.toString(), "."+NextNumber.toString() );
	//console.log( NewFilename + " = " + Filename + " .replace( " + Number.toString() + " , " + NextNumber.toString() + ")" );
	if ( NewFilename == Filename )
		return null;
	return NewFilename;
}

function GetNextResFilename(Filename)
{
	//	0 is our special "not loaded" resolution
	var NewFilename = ReplaceFilename( Filename, 0, 256 );
	if ( NewFilename )
		return NewFilename;
	
	var NewFilename = ReplaceFilename( Filename, 256, 1024 );
	if ( NewFilename )
		return NewFilename;
	
	var NewFilename = ReplaceFilename( Filename, 1024, 2048 );
	if ( NewFilename )
		return NewFilename;
	
	if ( IsMobile() )
		return null;
	NewFilename = ReplaceFilename( Filename, 2048, 4096 );
	if ( NewFilename )
		return NewFilename;
	return null;
}


function LoadHigher(Material)
{
	if ( !Material.map )
		return false;
	//console.log("LoadHigher - " + Material.map.sourceFile );
	var NewFilename = GetNextResFilename( Material.map.sourceFile );
	if ( NewFilename == null )
	{
		//console.log("no higher res");
		return false;
	}
	console.log("loading higher res:" + NewFilename );
	
	//	enable cross-site loading
	THREE.ImageUtils.crossOrigin = "";
	
	var HiTexture = THREE.ImageUtils.loadTexture( NewFilename,
												 new THREE.UVMapping(),
												 function(NewHiTexture)
												 {
												 Material.map = NewHiTexture;
												 Material.needsUpdate = true;
												 LoadHigher( Material );
												 },
												 function ()
												 {
												 //	error: maybe 404, just try next res up
												 //LoadHigher( Material );
												 }
												 );
}
