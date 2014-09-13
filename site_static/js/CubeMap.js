
function CubemapUpdate()
{
	//	update camera
	var Quaternion = GetCameraQuaternion();
	SetCameraQuaternion( Quaternion );
	
	var $UpdateRateMs = 1000/40;
	setTimeout( CubemapUpdate, $UpdateRateMs );
}

function CreateCubeFace($Parent,$FaceName,$FaceSize,$RotationTransform,$Colour)
{
	var $Element = document.createElement('div');
	$Parent.mFaces[$FaceName] = $Element;	//	for easy access without id's later
	$Parent.appendChild( $Element );
	$Element.className = 'face';
	$Element.id = 'cubemap_' + $FaceName;	//	just for debug
	$Element.innerText = $FaceName;			//	just for debug
	
	$Element.style.width = $FaceSize + 'px';
	$Element.style.height = $FaceSize + 'px';
	var $ZTransform = ' translateZ(' + ($FaceSize/2) + 'px) ';
	var $Transform = $RotationTransform + ' ' + $ZTransform;
	SetElementTransform3d( $Element, $Transform );
	$Element.style.backgroundColor = $Colour;
}

function InitCubemap($Container,$Config)
{
	if ( !$Container )
		return false;
	
	//	world = parent
	//	container = viewport
	var $CubeParent = document.createElement('div');
	$CubeParent.className = 'ThreeD';
	$CubeParent.id = 'CubeMapParent';
	$Container.appendChild($CubeParent);
	
	var $Cube = document.createElement('div');
	$Cube.className = 'ThreeD';
	$Cube.id = 'CubeMap';
	$CubeParent.appendChild($Cube);
	
	var $Viewport = $Container;

	//var $FaceSize = $Config.mFaceResolution;
	//var hfov = $Config.mFov ;
	var $FaceSize = 500;
	var hfov = 90;
	var focal = 1 / Math.max( 0.001, Math.tan(hfov / 2) );
	var CanvasWidth = $Container.offsetWidth;
	var zoom = focal * CanvasWidth / 2 + 'px';
		
	var $ParentTransform = "translateZ(" + zoom + ")";
	SetElementTransform3d( $CubeParent, $ParentTransform );
	SetElementPerspective3d( $Viewport, zoom );
	SetElementPerspectiveOrigin3d( $Viewport, '0 0 0' );
	
	//	need width & margin to center 3D around 2D center
	$CubeParent.style.width = $FaceSize + 'px';
	$CubeParent.style.height = $FaceSize + 'px';
	$CubeParent.style.margin = 'auto';
	//	gr: need this so we rotate around the center... not sure why
	$Cube.style.width = $FaceSize + 'px';
	$Cube.style.height = $FaceSize + 'px';
	$Cube.mFaces = {};
	
	CreateCubeFace( $Cube, 'Up', $FaceSize, 'rotateX(90deg)', 'red' );
	CreateCubeFace( $Cube, 'Front', $FaceSize, '', 'lime' );
	CreateCubeFace( $Cube, 'Left', $FaceSize, 'rotateY(90deg)', 'blue' );
	CreateCubeFace( $Cube, 'Back', $FaceSize, 'rotateY(180deg)', 'yellow' );
	CreateCubeFace( $Cube, 'Right', $FaceSize, 'rotateY(-90deg)', 'cyan' );
	CreateCubeFace( $Cube, 'Down', $FaceSize, 'rotateX(-90deg)', 'magenta' );
}




//	intialise cube faces
function SetCubemapBackground()
{
	var $Cube = GetElementCubeMap();
	if ( !$Cube )
		return false;
	var $Layout = new CubemapLayout('cubemap.jpg',400,300);
	//	var $Layout = new CubemapLayout('cubemap2x.jpg',800,600);
	//	var $Layout = new CubemapLayout('stormycubemap.jpg',4096,3072);
	/*
	 var $Layout = new CubemapLayout('churchcubemap.jpg',8192, 2048);
	 $Layout.mFront = new THREE.Vector2(2,0);
	 $Layout.mBack = new THREE.Vector2(4,0);
	 $Layout.mLeft = new THREE.Vector2(3,0);
	 $Layout.mRight = new THREE.Vector2(1,0);
	 $Layout.mUp = new THREE.Vector2(0,0);
	 $Layout.mDown = new THREE.Vector2(5,0);
	 $Layout.mBlockCount = new THREE.Vector2( 6, 1 );
	 */
	
	
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
	
	
	$Element.style.background = 'url(' + $ImageUrl + ') ' + $x + $y;
	$Element.style.backgroundSize = $w + $h;
	/*
	 gr: setting these individually just didn't work...
	 $Element.style.backgroundImage = 'url(' + $ImageUrl + ')';
	 $Element.style.backgroundAttachment = "fixed";
	 $Element.style.backgroundPosition = '-100px -0px';
	 //$Element.style.backgroundSize = '' + $ImageSize.x + 'px ' + $ImageSize.y + 'px';
	 //$Element.style.backgroundPosition = '' + $x + 'px ' + $y + 'px';
	 //$Element.style.backgroundSize = '' + $ImageSize.x + 'px ' + $ImageSize.y + 'px';
	 $Element.style.backgroundSize = '400px 300px';
	 */
}




function GetElementCubeMap()
{
	var $Parent = GetElement('CubeMap');
	return $Parent;
}


function SetCameraRotation($RotateX,$RotateY,$RotateZ)
{
	var $Transform = "rotateX("+$RotateX+"deg) rotateY("+$RotateY+"deg) rotateZ("+$RotateZ+"deg)";
	SetElementTransform3d( GetElementCubeMap(), $Transform );
}


function SetCameraQuaternion($Quaternion)
{
	//	convert quaternion to matrix
	var $CssMatrix = GetCssMatrixFromQuaternion( $Quaternion );

	//	convert Quaternion to eular
	var $Transform = $CssMatrix;
	SetElementTransform3d( GetElementCubeMap(), $Transform );
}


