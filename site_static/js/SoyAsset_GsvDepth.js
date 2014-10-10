

function GoogleStreetViewDepthMap($DataView)
{
	
	this.parseHeader = function(depthMap) {
		return {
			headerSize : depthMap.getUint8(0),
			numberOfPlanes : depthMap.getUint16(1, true),
		width: depthMap.getUint16(3, true),
		height: depthMap.getUint16(5, true),
		offset: depthMap.getUint16(7, true)
		};
	}
	
	this.parsePlanes = function(header, depthMap) {
		var planes = [],
		indices = [],
		i,
		n = [0, 0, 0],
		d,
		byteOffset;
		
		for(i=0; i<header.width*header.height; ++i) {
			indices.push(depthMap.getUint8(header.offset + i));
		}
		
		for(i=0; i<header.numberOfPlanes; ++i) {
			byteOffset = header.offset + header.width*header.height + i*4*4;
			n[0] = depthMap.getFloat32(byteOffset, true);
			n[1] = depthMap.getFloat32(byteOffset + 4, true);
			n[2] = depthMap.getFloat32(byteOffset + 8, true);
			d    = depthMap.getFloat32(byteOffset + 12, true);
			planes.push({
						n: n.slice(0),
						d: d
						});
		}
		
		return { planes: planes, indices: indices };
	}
	
	this.computeDepthMap = function(header, indices, planes) {
		var depthMap = null,
		x, y,
		planeIdx,
		phi, theta,
		v = [0, 0, 0],
		w = header.width, h = header.height,
		plane, t, p;
		
		depthMap = new Float32Array(w*h);
		
		var sin_theta = new Float32Array(h);
		var cos_theta = new Float32Array(h);
		var sin_phi   = new Float32Array(w);
		var cos_phi   = new Float32Array(w);
		
		for(y=0; y<h; ++y) {
			theta = (h - y - 0.5) / h * Math.PI;
			sin_theta[y] = Math.sin(theta);
			cos_theta[y] = Math.cos(theta);
		}
		for(x=0; x<w; ++x) {
			phi = (w - x - 0.5) / w * 2 * Math.PI + Math.PI/2;
			sin_phi[x] = Math.sin(phi);
			cos_phi[x] = Math.cos(phi);
		}
		
		var maxt = false;
		var avgt = false;
		var mint = false;
		
		for(y=0; y<h; ++y) {
			for(x=0; x<w; ++x) {
				planeIdx = indices[y*w + x];
				
				v[0] = sin_theta[y] * cos_phi[x];
				v[1] = sin_theta[y] * sin_phi[x];
				v[2] = cos_theta[y];
				
				//var $depthx = w-x-1;
				var $depthx = x;
				var $depthy = y;
				var $index = $depthy*w + $depthx;
				
				if(planeIdx > 0) {
					plane = planes[planeIdx];
					
					t = Math.abs( plane.d / (v[0]*plane.n[0] + v[1]*plane.n[1] + v[2]*plane.n[2]) );
					depthMap[$index] = t;
					
					if ( mint===false || t < mint )
						mint = t;
					if ( maxt===false || t > maxt )
						maxt = t;
					if ( avgt === false )
						avgt = t;
					else
						avgt = (avgt + t)/2;
				} else {
					depthMap[$index] = 9999999999999999999.;
				}
			}
		}
		
		return {
		maxt: maxt,
		mint: mint,
		avgt: avgt,
		width: w,
		height: h,
		depthMap: depthMap
		};
	}
	
	this.parse = function(depthMap) {
		var self = this,
		depthMapData,
		header,
		data,
		depthMap;
		
		depthMapData = new DataView(depthMap.buffer);
		header = self.parseHeader(depthMapData);
		data = self.parsePlanes(header, depthMapData);
		depthMap = self.computeDepthMap(header, data.indices, data.planes);
		
		return depthMap;
	}
	
	this.createEmptyDepthMap = function() {
		var depthMap = {
		width: 512,
		height: 256,
		depthMap: new Float32Array(512*256)
		};
		for(var i=0; i<512*256; ++i)
			depthMap.depthMap[i] = 9999999999999999999.;
		return depthMap;
	}
	
	this.mDepthMap = this.parse( $DataView );
}

SoyAsset_GsvDepth.prototype = new SoyAsset('GsvDepth');

function SoyAsset_GsvDepth($Meta,$OnLoaded,$OnFailed,$DoLoad)
{
	$DoLoad = CheckDefaultParam($DoLoad,true);
	
	this.mGooglePanoId = null;
	this.mLatLon = null;	//	array of 2 coords
	
	if ( isArray($Meta) )
	{
		if ( $Meta.length == 2 )
			this.mLatLon = $Meta;
		$Meta = new SoyAssetMeta();
	}
	
	if ( typeof $Meta == 'string' )
	{
		var $LatLon = MatchLatLonString( $Meta );
		if ( $LatLon !== false )
		{
			this.mLatLon = $LatLon;
		}
		else
		{
			this.mGooglePanoId = $Meta;
		}
		$Meta = new SoyAssetMeta();
	}

	//	call super
	SoyAsset.apply( this, [$Meta,$OnLoaded,$OnFailed] );
	
	if ( $DoLoad )
		this.Load();
}

SoyAsset_GsvDepth.prototype.LoadGsvPanoMeta = function()
{
	var $this = this;
	var $OnLoaded = function($Asset)
	{
		//alert('LoadGsvPanoMeta OnLoaded');
		$this.mGooglePanoId = $Asset.mAsset;
		$this.Load();
	};
	var $OnFailed = function($Asset)
	{
		//alert('LoadGsvPanoMeta OnFailed');
		$this.OnError('failed to load gsv pano meta ' + $Asset );
	};
	this.mGsvPanoMetaAsset = new SoyAsset_GsvPanoMeta( this.mLatLon, $OnLoaded, $OnFailed );
	return true;
}

SoyAsset_GsvDepth.prototype.LoadGsvAsset = function()
{
	var $this = this;
	var $OnLoaded = function($Asset)
	{
		//alert('LoadGsvAsset OnLoaded');
		$this.OnLoadedJson($Asset);
	}
	var $OnFailed = function($Asset)
	{
		//alert('LoadGsvAsset OnFailed');
		$this.OnError('failed to load gsv asset ' + $Asset );
	};
	
	this.mGsvAssetMeta = {};
	this.mGsvAssetMeta.Filename = 'http://maps.google.com/cbk?output=json&cb_client=maps_sv&v=4&dm=1&pm=1&ph=1&hl=en&panoid=' + this.mGooglePanoId;
	this.mJsonAsset = new SoyAsset_JsonP( this.mGsvAssetMeta, $OnLoaded, $OnFailed );
	return true;
}

SoyAsset_GsvDepth.prototype.Load = function()
{
	//	if we don't know the pano id, we need to fetch it
	if ( this.mGooglePanoId == null && this.mLatLon != null )
	{
		return this.LoadGsvPanoMeta();
	}
	
	if ( this.mGooglePanoId != null )
	{
		return this.LoadGsvAsset();
	}

	return false;
}



SoyAsset_GsvDepth.prototype.OnLoadedJson = function($JsonAsset)
{
	console.log('depth json; ',$JsonAsset.mAsset);
	var $DepthMapDataZip64 = $JsonAsset.mAsset.model.depth_map;
	if ( IsUndefined($DepthMapDataZip64) )
	{
		this.OnError('Data has no depth map');
		return;
	}

	console.log('OnLoadedJson',this);
	//	loaded depth map, now process
	var $DepthMapDataZip = this.DecodeDepthMapData64( $DepthMapDataZip64 );
	if ( !$DepthMapDataZip )
	{
		this.OnError('Failed to decode depthmap data from base64');
		return;
	}
	
	var $DepthMapDataArray = this.DecompressDepthMapData( $DepthMapDataZip );
	if ( !$DepthMapDataArray )
	{
		this.OnError('Failed to decode depthmap data from base64');
		return;
	}
	
	//	parse data format
	this.mDepthMap = this.ParseDepthMapData( $DepthMapDataArray );
	if ( !this.mDepthMap )
	{
		this.OnError('failed to parse depth map data');
		return;
	}
	
	//	create depth map image
	this.mAsset = this.CreateDepthImage( this.mDepthMap );
	
	this.OnLoaded();
}

SoyAsset_GsvDepth.prototype.OnFailedJson = function($JsonAsset)
{
	this.OnError('Failed to fetch data');
}


SoyAsset_GsvDepth.prototype.Stop = function()
{
	this.mDesired = false;
	this.mAsset = null;
	assert( !this.IsLoaded(), "Loaded state wrong" );
}

SoyAsset_GsvDepth.prototype.DecodeDepthMapData64 = function($DepthMapDataZip64)
{
	// Append '=' in order to make the length of the array a multiple of 4
	while($DepthMapDataZip64.length %4 != 0)
		$DepthMapDataZip64 += '=';
	
	// Replace '-' by '+' and '_' by '/'
	$DepthMapDataZip64 = $DepthMapDataZip64.replace(/-/g,'+');
	$DepthMapDataZip64 = $DepthMapDataZip64.replace(/_/g,'/');
	
	// Decode and decompress data
	return atob($DepthMapDataZip64);
}


SoyAsset_GsvDepth.prototype.DecompressDepthMapData = function($DepthMapDataZip)
{
	var decompressedDepthMap = zpipe.inflate($DepthMapDataZip);
	
	// Convert output of decompressor to Uint8Array
	var depthMap = new Uint8Array(decompressedDepthMap.length);
	for(i=0; i<decompressedDepthMap.length; ++i)
		depthMap[i] = decompressedDepthMap.charCodeAt(i);
	
	return depthMap;
}


SoyAsset_GsvDepth.prototype.ParseDepthMapData = function($DepthMapArray)
{
	//	decode depth map
	depthMapData = new DataView($DepthMapArray.buffer);
	var DepthMap = new GoogleStreetViewDepthMap( depthMapData );
	if ( !DepthMap.mDepthMap )
		return false;
	
	return DepthMap;
}

function frac(f)
{
	return f - Math.floor(f);
}

//	http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/
function EncodeFloatRGB(f)
{
	var enc = new THREE.Vector4( f * 1.0, f*255.0, f*65025.0, 0);
	enc.x = frac(enc.x);
	enc.y = frac(enc.y);
	enc.z = frac(enc.z);
	
	enc.x -= enc.y * (1.0/255.0);
	enc.y -= enc.z * (1.0/255.0);
	enc.z -= enc.w * 0;//(1.0/255.0);
	//enc -= enc.yzww * new THREE.Vector4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);
	return enc;
}

SoyAsset_GsvDepth.prototype.CreateDepthImage = function($DepthMap)
{
	//	turn into image
	var $DepthMapFloat = $DepthMap.mDepthMap;
	console.log($DepthMap);
	var canvas = document.createElement("canvas");
	var $w = $DepthMapFloat.width;
	var $h = $DepthMapFloat.height;
	var $maxf = $DepthMapFloat.maxt;
	var $avgf = $DepthMapFloat.avgt;
	canvas.width = $w;
	canvas.height = $h;
	
	console.log("Generating depth image " + $w + "x" + $h );
	var ctx = canvas.getContext("2d");
	var PixelImage = ctx.createImageData(1,1);
	var Pixel = PixelImage.data;
	
	for ( var y=0;	y<$h;	y++ )
		for ( var x=0;	x<$w;	x++ )
		{
			var $i = (y*$w) + x;
			var $f = $DepthMapFloat.depthMap[$i];
			
			//	inf
			if ( $f > $maxf )
			{
				Pixel[0] = 0;
				Pixel[1] = 0;
				Pixel[2] = 0;
				Pixel[3] = 0;
			}
			else
			{
				var $f4 = EncodeFloatRGB($f / $maxf);
				Pixel[0] = $f4.x * 255;
				Pixel[1] = $f4.y * 255;
				Pixel[2] = $f4.z * 255;
				Pixel[3] = 255;
			}
			
			/*	fancy colours
			if ( $f > $maxf )
			{
				Pixel[0] = 0;
				Pixel[1] = 0;
				Pixel[2] = 0;
			}
			else
			{
				var $threshold = $avgf*4;
				var $far = $maxf * 0.5;
				if ( $f > $far )
					$f = $far;
				//$avgf = 10;
				if ( $f > $threshold )
				{
					$f = GetLerp( $threshold, $far, $f );
					Pixel[0] = Lerp( 0, 255, $f );
					Pixel[1] = Lerp( 255, 0, $f );
					Pixel[2] = Lerp( 0, 255, $f );
				}
				else
				{
					$f = GetLerp( 0, $threshold, $f );
					Pixel[0] = Lerp( 255, 0, $f );
					Pixel[1] = Lerp( 0, 255, $f );
					Pixel[2] = Lerp( 0, 0, $f );
				}
			}
			
			
			Pixel[3] = 255;
			 */
			ctx.putImageData( PixelImage, x, y );
		}
	
	var $DataUrl = canvas.toDataURL();
	var Image = document.createElement("img"); // create img tag
	Image.src = $DataUrl;
	
	return Image;

}