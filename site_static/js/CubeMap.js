
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
	console.log("$CubemapLayout: ",$CubemapLayout);
	if ( !$CubemapLayout )
		return false;
	
	var $Layout = new CubemapLayout( $Asset.mAsset, $Meta.Width, $Meta.Height, $CubemapLayout );
	
	SetFaceBackground( $Cube.mFaces['Front'], 'F', $Layout );
	SetFaceBackground( $Cube.mFaces['Back'], 'B', $Layout );
	SetFaceBackground( $Cube.mFaces['Left'], 'L', $Layout );
	SetFaceBackground( $Cube.mFaces['Right'], 'R', $Layout );
	SetFaceBackground( $Cube.mFaces['Up'], 'U', $Layout );
	SetFaceBackground( $Cube.mFaces['Down'], 'D', $Layout );
	return true;
}


function SetFaceBackground($Element,$Face,$Layout)
{
	var $ImageOffset = ScaleVectors( $Layout.mFaces[$Face], $Layout.GetFaceSize() );
	var $ImageMatrix = $Layout.mFaceMatrix[$Face];
	var $ImageSize = $Layout.mImageSize;
	var $ImageUrl = $Layout.mImageUrl;
	if ( !$Element )
		return;
	
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
	
	
	if ( typeof $ImageUrl == 'object' )
	{
		var $ElementChildImg = $ImageUrl.cloneNode(false);
		$ElementChildImg.style.position = 'fixed';
		$ElementChildImg.style.left = $x + 'px ';
		$ElementChildImg.style.top = $y + 'px ';
		$ElementChildImg.style.width = $w + 'px ';
 		$ElementChildImg.style.height = $h + 'px ';
		$ElementChildImg.style.zIndex = -900;	//	doesn't work just setting the content's Z index :/
		SetElementTransform($ElementChildImg, 'scaleX(' + $ImageMatrix.x +') scaleY(' + $ImageMatrix.y +')' );
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
		$Element.style.background = 'url(' + $ImageUrl + ') ' + $x + 'px ' + $y + 'px';
		$Element.style.backgroundSize = $w + 'px ' + $h + 'px ';
	}
		
		
}



