
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
	
	var $Thing = document.createElement('span');
	$Thing.style.position = 'fixed';
	$Thing.style.top = '50%';
	$Thing.style.left = '50%';
	$Thing.innerText = $FaceName;
	$FaceContentElement.appendChild($Thing);
	
	var $Pad = 3;
	$Element.style.width = ($FaceSize+$Pad) + 'px';
	$Element.style.height = ($FaceSize+$Pad) + 'px';
	var $ZTransform = ' translateZ(' + ($FaceSize/2) + 'px) ';
	var $Transform = $RotationTransform + ' ' + $ZTransform;
	SetElementTransform3d( $Element, $Transform );
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
	CreateCubeFace( $Cube, 'Up', $FaceSize, 'rotateX(90deg) rotate(180deg)', 'red' );
	CreateCubeFace( $Cube, 'Front', $FaceSize, '', 'lime' );
	CreateCubeFace( $Cube, 'Left', $FaceSize, 'rotateY(-90deg)', 'blue' );
	CreateCubeFace( $Cube, 'Back', $FaceSize, 'rotateY(180deg)', 'yellow' );
	CreateCubeFace( $Cube, 'Right', $FaceSize, 'rotateY(90deg)', 'cyan' );
	CreateCubeFace( $Cube, 'Down', $FaceSize, 'rotateX(-90deg) rotate(180deg)', 'magenta' );

	return $Cube;
}



//	intialise cube faces
function SetCubemapBackground($Asset,$Cube)
{
	if ( !$Cube )
		return;
	var $Meta = $Asset.mMeta;
	var $CubemapLayout = $Meta.GetCubemapLayout();
	if ( !$CubemapLayout )
		return false;
	
	var $Layout = new CubemapLayout( $Asset.mAsset, $Meta.Width, $Meta.Height, $CubemapLayout );
	
	SetFaceBackground( $Cube.mFaces['Front'], $Layout.GetFront(), $Layout );
	SetFaceBackground( $Cube.mFaces['Back'], $Layout.GetBack(), $Layout );
	SetFaceBackground( $Cube.mFaces['Left'], $Layout.GetLeft(), $Layout );
	SetFaceBackground( $Cube.mFaces['Right'], $Layout.GetRight(), $Layout );
	SetFaceBackground( $Cube.mFaces['Up'], $Layout.GetUp(), $Layout );
	SetFaceBackground( $Cube.mFaces['Down'], $Layout.GetDown(), $Layout );
	return true;
}


function SetFaceBackground($Element,$ImageOffset,$Layout)
{
	var $ImageSize = $Layout.mImageSize;
	var $ImageUrl = $Layout.mImageUrl;
	if ( !$Element )
		return;
	
	var $FaceSize = new THREE.Vector2( $Element.clientWidth, $Element.clientHeight );
	var $CssScale = DivideVectors( $Layout.GetFaceSize(), $FaceSize );
	var $x = -($ImageOffset.x/$CssScale.x) + 'px ';
	var $y = -($ImageOffset.y/$CssScale.y) + 'px ';
	var $w = ($ImageSize.x/$CssScale.x) + 'px ';
	var $h = ($ImageSize.y/$CssScale.y) + 'px ';
	
	if ( typeof $ImageUrl == 'object' )
	{
		var $ElementChildImg = $ImageUrl.cloneNode(false);
		$ElementChildImg.style.position = 'fixed';
		$ElementChildImg.style.left = $x;
		$ElementChildImg.style.top = $y;
		$ElementChildImg.style.width = $w;
		$ElementChildImg.style.height = $h;
		$ElementChildImg.style.zIndex = -900;	//	doesn't work just setting the content's Z index :/
		$Element.appendChild($ElementChildImg);
	}
	else
	{
		//	check is string?
		//console.log( typeof $ImageUrl);
	/*
	var $ElementChildImg = document.createElement('img');
	$ElementChildImg.style.width = '100%';
	$ElementChildImg.style.height = '100%';
	var $MJpeg = new SoyMJpeg( 'http://image.panopo.ly/banks.mjpeg', $ElementChildImg, 25  );
	$Element.appendChild( $ElementChildImg );
*/
		//	old CSS background method with proper alignment (working)
		$Element.style.background = 'url(' + $ImageUrl + ') ' + $x + $y;
		$Element.style.backgroundSize = $w + $h;
	}
		
		
}



