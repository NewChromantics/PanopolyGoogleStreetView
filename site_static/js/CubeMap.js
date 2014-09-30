

function GetRealFace($Face)
{
	switch ( $Face )
	{
		case 'Z':	return 'B';
		case 'A':	return 'U';
		case 'W':	return 'D';
	}
	return $Face;
}

function GetFaceMatrix($Face)
{
	switch ( $Face )
	{
		case 'Z':	return new THREE.Vector2(-1,-1);
		case 'A':	return new THREE.Vector2(-1,-1);
		case 'W':	return new THREE.Vector2(-1,-1);
	}
	return new THREE.Vector2(1,1);
}

function CubemapLayout($ImageUrl,$ImageWidth,$ImageHeight,$Layout)
{
	this.mFaces = {};
	this.mFaceMatrix = {};
	
	//	layout should be WH<FACES>
	var $TileWidth = $Layout[0];
	var $TileHeight = $Layout[1];
	
	assert( isInt( $TileWidth ), 'Invalid tile width:' + $TileWidth );
	assert( isInt( $TileHeight ), 'Invalid tile height:' + $TileHeight );
	$TileWidth = isInt( $TileWidth ) ? $TileWidth : 0;
	$TileHeight = isInt( $TileHeight ) ? $TileHeight : 0;
	
	for ( var $t=2;	$t<$Layout.length;	$t++ )
	{
		var $Face = $Layout[$t];
		var $x = ($t-2) % $TileWidth;
		var $y = Math.floor(($t-2) / $TileWidth);
		
		var $RealFace = GetRealFace( $Face );
		var $FaceMatrix = GetFaceMatrix( $Face );
		
		this.mFaces[$RealFace] = new THREE.Vector2($x,$y);
		this.mFaceMatrix[$RealFace] = $FaceMatrix;
		//console.log($Face + " = " + $x + "," + $y );
	}
	
	this.mFaceCount = new THREE.Vector2( $TileWidth, $TileHeight );
	this.mImageUrl = $ImageUrl;
	this.mImageSize = new THREE.Vector2( $ImageWidth/$TileWidth, $ImageHeight/$TileHeight );
}

CubemapLayout.prototype.GetFaceSize = function()
{
	return DivideVectors( this.mImageSize, this.mFaceCount );
}



function CreateCubeFace($Parent,$FaceName,$FaceSize,$RotationTransform,$Colour)
{
	var $Element = document.createElement('div');
	$Parent.mFaces[$FaceName] = $Element;	//	for easy access without id's later
	$Parent.appendChild( $Element );
	$Element.className = 'Face';
	$Element.id = 'cubemap_' + $FaceName;	//	just for debug
	
	var $FaceContentElement = document.createElement('div');
	$FaceContentElement.className = 'FaceContent';
	$Element.appendChild( $FaceContentElement );
/*
	var $Thing = document.createElement('span');
	$Thing.style.position = 'fixed';
	$Thing.style.top = '50%';
	$Thing.style.left = '50%';
	$Thing.innerText = $FaceName;
	$FaceContentElement.appendChild($Thing);
*/
	//	add padding to try and fill gaps. but dont go too far then we get "z fighting"
	var $Pad = 1;
	$Element.style.width = ($FaceSize+$Pad) + 'px';
	$Element.style.height = ($FaceSize+$Pad) + 'px';
	//	gr: if using backface culling (no noticable speed increase), negate the z transform
	var $ZTransform = ' translateZ(' + ($FaceSize/2) + 'px) ';
	var $Transform = $RotationTransform + ' ' + $ZTransform;
	SetElementTransform( $Element, $Transform );
	$Element.style.backgroundColor = $Colour;
	$Element.style.overflow = 'hidden';
}

var epsilon = function ( value ) {
	
	return Math.abs( value ) < 0.000001 ? 0 : value;
	
};


function CreateCube($Parent,$FaceSize)
{
	var $Cube = document.createElement('div');
	$Cube.className = 'ThreeD';
	$Parent.appendChild($Cube);
	
	//	gr: need this so we rotate around the center... not sure why
	$Cube.style.width = $FaceSize + 'px';
	$Cube.style.height = $FaceSize + 'px';
	$Cube.mFaces = {};
	
	//	gr: have swapped L and R here because of cubemap.php output.... one of these is wrong...
	CreateCubeFace( $Cube, 'Up', $FaceSize, 'rotateX(90deg) rotateZ(180deg)', 'red' );
	CreateCubeFace( $Cube, 'Front', $FaceSize, '', 'lime' );
	CreateCubeFace( $Cube, 'Left', $FaceSize, 'rotateY(-90deg)', 'blue' );
	CreateCubeFace( $Cube, 'Back', $FaceSize, 'rotateY(180deg)', 'yellow' );
	CreateCubeFace( $Cube, 'Right', $FaceSize, 'rotateY(90deg)', 'cyan' );
	CreateCubeFace( $Cube, 'Down', $FaceSize, 'rotateX(-90deg) rotateZ(180deg)', 'magenta' );
	
	return $Cube;
}



//	intialise cube faces
function SetCubemapBackground($Asset,$Cube)
{
	if ( !$Cube )
		return;
	
	//	quick update
	var $ImageAssetType = typeof $Asset.mAsset;
	if ( $ImageAssetType == 'string' && $Cube.mGeometryInitialised === $ImageAssetType )
	{
		//	for speed up, only update non-culled faces
		var $Success = true;
		$Success &= UpdateFaceBackground( $Cube.mFaces['Front'], $Asset );
		$Success &= UpdateFaceBackground( $Cube.mFaces['Back'], $Asset );
		$Success &= UpdateFaceBackground( $Cube.mFaces['Left'], $Asset );
		$Success &= UpdateFaceBackground( $Cube.mFaces['Right'], $Asset );
		$Success &= UpdateFaceBackground( $Cube.mFaces['Up'], $Asset );
		$Success &= UpdateFaceBackground( $Cube.mFaces['Down'], $Asset );
		if ( $Success )
			return true;
		console.log("failed fast cubemap update",$Cube);
	}
	
	var $Meta = $Asset.mMeta;
	var $CubemapLayout = $Meta.GetCubemapLayout();
	if ( !$CubemapLayout )
		$CubemapLayout = '11F';
	
	$Cube.mLayout = new CubemapLayout( $Asset.mAsset, $Meta.Width, $Meta.Height, $CubemapLayout );
	
	SetFaceBackground( $Cube.mFaces['Front'], 'F', $Cube.mLayout );
	SetFaceBackground( $Cube.mFaces['Back'], 'B', $Cube.mLayout );
	SetFaceBackground( $Cube.mFaces['Left'], 'L', $Cube.mLayout );
	SetFaceBackground( $Cube.mFaces['Right'], 'R', $Cube.mLayout );
	SetFaceBackground( $Cube.mFaces['Up'], 'U', $Cube.mLayout );
	SetFaceBackground( $Cube.mFaces['Down'], 'D', $Cube.mLayout );
	
	$Cube.mGeometryLayout = $CubemapLayout;
	$Cube.mGeometryInitialised = $ImageAssetType;
	
	return true;
}

function DeleteFace($Element,$Face)
{
	if ( $Element.mFaceImgElement )
	{
		$Element.removeChild( $Element.mFaceImgElement );
		$Element.mFaceImgElement = null;
	}

}

function SetFaceBackground($Element,$Face,$Layout)
{
	if ( !$Element )
		return false;
	
	if ( !($Face in $Layout.mFaces) )
	{
		DeleteFace($Element,$Face);
		return false;
	}
	
	//console.log("Setting face " + $Face,$Layout);
	var $ImageOffset = ScaleVectors( $Layout.mFaces[$Face], $Layout.GetFaceSize() );
	var $ImageMatrix = $Layout.mFaceMatrix[$Face];
	var $ImageSize = $Layout.mImageSize;
	var $ImageUrl = $Layout.mImageUrl;
	
	var $FaceSize = new THREE.Vector2( $Element.clientWidth, $Element.clientHeight );
	var $CssScale = DivideVectors( $Layout.GetFaceSize(), $FaceSize );
	var $x = -($ImageOffset.x/$CssScale.x);
	var $y = -($ImageOffset.y/$CssScale.y);
	var $w = ($ImageSize.x/$CssScale.x);
	var $h = ($ImageSize.y/$CssScale.y);
	
	
	if ( $ImageMatrix.x < 0 )
	{
		$x = ($w + $x) - $FaceSize.x;
		$x = -$x;

		$y = ($h + $y) - $FaceSize.y;
		$y = -$y;
	}
	
	var $ElementChildImg = $Element.mFaceImgElement;
	
	if ( typeof $ImageUrl == 'object' )
	{
		//	new image, need to delete the old one
		if ( $ElementChildImg )
		{
			$Element.removeChild( $ElementChildImg );
			$ElementChildImg = null;
		}
		
		//	create new element as clone (this allows us to re-use the element and cross origin state if we've loaded an image)
		$ElementChildImg = $ImageUrl.cloneNode(false);
		$Element.appendChild($ElementChildImg);
		$Element.mFaceImgElement = $ElementChildImg;
	}
	else if ( typeof $ImageUrl == 'string' )
	{
	//	console.log("update url", $ImageUrl );
		//	data url, or url
		//	need to create element
		if ( !$ElementChildImg )
		{
			console.log("creating new img");
			$ElementChildImg = document.createElement('img');
			$Element.appendChild($ElementChildImg);
			$Element.mFaceImgElement = $ElementChildImg;
		}
		
		$ElementChildImg.src = $ImageUrl;
	}

	//	set style
	if ( $ElementChildImg )
	{
		$ElementChildImg.style.position = 'fixed';
		$ElementChildImg.style.left = $x + 'px ';
		$ElementChildImg.style.top = $y + 'px ';
		$ElementChildImg.style.width = $w + 'px ';
		$ElementChildImg.style.height = $h + 'px ';
		$ElementChildImg.style.zIndex = -900;	//	doesn't work just setting the content's Z index :/
		SetElementTransform($ElementChildImg, 'scaleX(' + $ImageMatrix.x +') scaleY(' + $ImageMatrix.y +')' );
	}
	
	return true;
}


function UpdateFaceBackground($Element,$Asset)
{
	var $ImageUrl = $Asset.mAsset;
	var $ElementChildImg = $Element.mFaceImgElement;
	/*
	if ( !$ElementChildImg )
		return false;
	
	if ( typeof $ImageUrl != 'string' )
		return false;
*/
	$ElementChildImg.src = $ImageUrl;
	return true;
}


