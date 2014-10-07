var $GuiRenderers = new Array();		//	css renderer for each view

var table = [
				"H", "Hydrogen", "1.00794", 1, 1,
				"He", "Helium", "4.002602", 18, 1,
				"Li", "Lithium", "6.941", 1, 2,
				"Be", "Beryllium", "9.012182", 2, 2,
				"B", "Boron", "10.811", 13, 2,
				"C", "Carbon", "12.0107", 14, 2,
				"N", "Nitrogen", "14.0067", 15, 2,
				"O", "Oxygen", "15.9994", 16, 2,
				"F", "Fluorine", "18.9984032", 17, 2,
				"Ne", "Neon", "20.1797", 18, 2,
				"Na", "Sodium", "22.98976...", 1, 3,
				"Mg", "Magnesium", "24.305", 2, 3,
				"Al", "Aluminium", "26.9815386", 13, 3,
				"Si", "Silicon", "28.0855", 14, 3,
				"P", "Phosphorus", "30.973762", 15, 3,
				"S", "Sulfur", "32.065", 16, 3,
				"Cl", "Chlorine", "35.453", 17, 3,
				"Ar", "Argon", "39.948", 18, 3,
				"K", "Potassium", "39.948", 1, 4,
				"Ca", "Calcium", "40.078", 2, 4,
				"Sc", "Scandium", "44.955912", 3, 4,
				"Ti", "Titanium", "47.867", 4, 4,
				"V", "Vanadium", "50.9415", 5, 4,
				"Cr", "Chromium", "51.9961", 6, 4,
				"Mn", "Manganese", "54.938045", 7, 4,
				"Fe", "Iron", "55.845", 8, 4,
				"Co", "Cobalt", "58.933195", 9, 4,
				"Ni", "Nickel", "58.6934", 10, 4,
				"Cu", "Copper", "63.546", 11, 4,
				"Zn", "Zinc", "65.38", 12, 4,
				"Ga", "Gallium", "69.723", 13, 4,
				"Ge", "Germanium", "72.63", 14, 4,
				"As", "Arsenic", "74.9216", 15, 4,
				"Se", "Selenium", "78.96", 16, 4,
				"Br", "Bromine", "79.904", 17, 4,
				"Kr", "Krypton", "83.798", 18, 4,
				"Rb", "Rubidium", "85.4678", 1, 5,
				"Sr", "Strontium", "87.62", 2, 5,
				"Y", "Yttrium", "88.90585", 3, 5,
				"Zr", "Zirconium", "91.224", 4, 5,
				"Nb", "Niobium", "92.90628", 5, 5,
				"Mo", "Molybdenum", "95.96", 6, 5,
				"Tc", "Technetium", "(98)", 7, 5,
				"Ru", "Ruthenium", "101.07", 8, 5,
				"Rh", "Rhodium", "102.9055", 9, 5,
				"Pd", "Palladium", "106.42", 10, 5,
				"Ag", "Silver", "107.8682", 11, 5,
				"Cd", "Cadmium", "112.411", 12, 5,
				"In", "Indium", "114.818", 13, 5,
				"Sn", "Tin", "118.71", 14, 5,
				"Sb", "Antimony", "121.76", 15, 5,
				"Te", "Tellurium", "127.6", 16, 5,
				"I", "Iodine", "126.90447", 17, 5,
				"Xe", "Xenon", "131.293", 18, 5,
				"Cs", "Caesium", "132.9054", 1, 6,
				"Ba", "Barium", "132.9054", 2, 6,
				"La", "Lanthanum", "138.90547", 4, 9,
				"Ce", "Cerium", "140.116", 5, 9,
				"Pr", "Praseodymium", "140.90765", 6, 9,
				"Nd", "Neodymium", "144.242", 7, 9,
				"Pm", "Promethium", "(145)", 8, 9,
				"Sm", "Samarium", "150.36", 9, 9,
				"Eu", "Europium", "151.964", 10, 9,
				"Gd", "Gadolinium", "157.25", 11, 9,
				"Tb", "Terbium", "158.92535", 12, 9,
				"Dy", "Dysprosium", "162.5", 13, 9,
				"Ho", "Holmium", "164.93032", 14, 9,
				"Er", "Erbium", "167.259", 15, 9,
				"Tm", "Thulium", "168.93421", 16, 9,
				"Yb", "Ytterbium", "173.054", 17, 9,
				"Lu", "Lutetium", "174.9668", 18, 9,
				"Hf", "Hafnium", "178.49", 4, 6,
				"Ta", "Tantalum", "180.94788", 5, 6,
				"W", "Tungsten", "183.84", 6, 6,
				"Re", "Rhenium", "186.207", 7, 6,
				"Os", "Osmium", "190.23", 8, 6,
				"Ir", "Iridium", "192.217", 9, 6,
				"Pt", "Platinum", "195.084", 10, 6,
				"Au", "Gold", "196.966569", 11, 6,
				"Hg", "Mercury", "200.59", 12, 6,
				"Tl", "Thallium", "204.3833", 13, 6,
				"Pb", "Lead", "207.2", 14, 6,
				"Bi", "Bismuth", "208.9804", 15, 6,
				"Po", "Polonium", "(209)", 16, 6,
				"At", "Astatine", "(210)", 17, 6,
				"Rn", "Radon", "(222)", 18, 6,
				"Fr", "Francium", "(223)", 1, 7,
				"Ra", "Radium", "(226)", 2, 7,
				"Ac", "Actinium", "(227)", 4, 10,
				"Th", "Thorium", "232.03806", 5, 10,
				"Pa", "Protactinium", "231.0588", 6, 10,
				"U", "Uranium", "238.02891", 7, 10,
				"Np", "Neptunium", "(237)", 8, 10,
				"Pu", "Plutonium", "(244)", 9, 10,
				"Am", "Americium", "(243)", 10, 10,
				"Cm", "Curium", "(247)", 11, 10,
				"Bk", "Berkelium", "(247)", 12, 10,
				"Cf", "Californium", "(251)", 13, 10,
				"Es", "Einstenium", "(252)", 14, 10,
				"Fm", "Fermium", "(257)", 15, 10,
				"Md", "Mendelevium", "(258)", 16, 10,
				"No", "Nobelium", "(259)", 17, 10,
				"Lr", "Lawrencium", "(262)", 18, 10,
				"Rf", "Rutherfordium", "(267)", 4, 7,
				"Db", "Dubnium", "(268)", 5, 7,
				"Sg", "Seaborgium", "(271)", 6, 7,
				"Bh", "Bohrium", "(272)", 7, 7,
				"Hs", "Hassium", "(270)", 8, 7,
				"Mt", "Meitnerium", "(276)", 9, 7,
				"Ds", "Darmstadium", "(281)", 10, 7,
				"Rg", "Roentgenium", "(280)", 11, 7,
				"Cn", "Copernicium", "(285)", 12, 7,
				"Uut", "Unutrium", "(284)", 13, 7,
				"Fl", "Flerovium", "(289)", 14, 7,
				"Uup", "Ununpentium", "(288)", 15, 7,
				"Lv", "Livermorium", "(293)", 16, 7,
				"Uus", "Ununseptium", "(294)", 17, 7,
				"Uuo", "Ununoctium", "(294)", 18, 7
			 ];

var objects = [];
var targets = { table: [], sphere: [], helix: [], grid: [] };

//	compared to face res
//	gr: we want to increase this resolution. when we do, we need to alter camera properties to scale up otherwise element's offset wrong (that's why we need to limit distance to fov)
var $MenuResolution = 0.9;
var $FollowCameraDistanceFarScale = 0.99;

//	if cull fails, then the distance from the camera is wrong and you won't be able to focus in 3d :)
var $FollowCameraEnableCull = true;


function transform( targets ) {
	
	
	for ( var i = 0; i < objects.length; i ++ ) {
		
		var object = objects[ i ];
		var target = targets[ i ];
		
		object.position.x = target.position.x;
		object.position.y = target.position.y;
		object.position.z = target.position.z;
		
		object.rotation.x = target.rotation.x;
		object.rotation.y = target.rotation.y;
		object.rotation.z = target.rotation.z;

	}
	
}

function PanoGui($Container,$Name,$Config,$SceneRenderer)
{
	var $Fov = $Config.mFov;
	var $Aspect = 1;
	var $FaceResolution = $Config.mFaceResolution;
	var $Near = 0;
	var $Far = $FaceResolution / 2;	//	this is how far away the cubemap faces are
	
	this.mName = $Name;
	this.mConfig = $Config;
	this.mContainer = $Container;
	this.mResolution = $FaceResolution;
	
	this.mSceneRenderer = $SceneRenderer;
	
	this.mRenderer = new THREE.CSS3DRenderer();
	this.mRenderer.setSize(200,200);
	this.mRenderer.domElement.style.position = 'absolute';
	this.mContainer.appendChild( this.mRenderer.domElement );
	this.mRenderer.domElement.style.position = 'absolute';
	//this.mRenderer.domElement.style.overflow = 'visible';
	//this.mRenderer.domElement.style.width = '1000px';
	//this.mRenderer.domElement.style.height = '1000px';
	//this.mRenderer.domElement.style.left = '0px';
	//this.mRenderer.domElement.style.top = '0px';
	
	this.mScene = new THREE.Scene();
	this.mCamera = new THREE.PerspectiveCamera( $Fov, $Aspect, $Near, $Far );
	
	this.Render();
}

PanoGui.prototype.GetCameraZ = function()
{
	return 0;
}

PanoGui.prototype.ShowSphere = function()
{
	
	var element = document.createElement( 'div' );
	element.style.width = '100px';
	element.style.height = '100px';
	
	var $ObjectOffset = new THREE.Vector3(0,0,100);
	var $dist = 200;
	var scene = this.mScene;
	
	var vector = new THREE.Vector3(0,0,0);
	
	for ( var i = 0; i < table.length; i += 5 ) {
		
		var element = document.createElement( 'div' );
		element.className = 'element';
		element.style.backgroundColor = 'rgba(0,127,127,' + ( Math.random() * 0.5 + 0.25 ) + ')';
		
		var number = document.createElement( 'div' );
		number.className = 'number';
		number.textContent = (i/5) + 1;
		element.appendChild( number );
		
		var symbol = document.createElement( 'div' );
		symbol.className = 'symbol';
		symbol.textContent = table[ i ];
		element.appendChild( symbol );
		
		var details = document.createElement( 'div' );
		details.className = 'details';
		details.innerHTML = table[ i + 1 ] + '<br>' + table[ i + 2 ];
		element.appendChild( details );
		
		var object = new THREE.CSS3DObject( element );
		object.position.x = Math.random() * $dist - ($dist/2);
		object.position.y = Math.random() * $dist - ($dist/2);
		object.position.z = Math.random() * $dist - ($dist/2);
		object.position.x += $ObjectOffset.x;
		object.position.y += $ObjectOffset.y;
		object.position.z += $ObjectOffset.z;
		scene.add( object );
		
		objects.push( object );
		
		//
		
		var object = new THREE.Object3D();
		object.position.x = ( table[ i + 3 ] * 140 ) - 1330;
		object.position.y = - ( table[ i + 4 ] * 180 ) + 990;
		
		targets.table.push( object );
		
	}
	
	for ( var i = 0, l = objects.length; i < l; i ++ ) {
		
		var phi = Math.acos( -1 + ( 2 * i ) / l );
		var theta = Math.sqrt( l * Math.PI ) * phi;
		
		var object = new THREE.Object3D();
		
		object.position.x = $dist * Math.cos( theta ) * Math.sin( phi );
		object.position.y = $dist * Math.sin( theta ) * Math.sin( phi );
		object.position.z = $dist * Math.cos( phi );
		object.position.x += $ObjectOffset.x;
		object.position.y += $ObjectOffset.y;
		object.position.z += $ObjectOffset.z;
		
		vector.copy( object.position ).multiplyScalar( 2 );
		
		object.lookAt( vector );
		
		targets.sphere.push( object );
		
	}
	
	
	
	
	transform( targets.sphere );

	//this.Show(element);
}


PanoGui.prototype.Show = function($Element,$FollowCamera)
{
	$FollowCamera = CheckDefaultParam($FollowCamera,false);
	
	//	wrap in a div where we control scale
	//	$Element, if it has dimensions, should be in %
	var $Wrapper = document.createElement('div');
	var $w = (this.mResolution/2) * $MenuResolution;
	var $h = (this.mResolution/2) * $MenuResolution;
	$Wrapper.style.width = $w + 'px';
	$Wrapper.style.height = $h + 'px';
	//	to allow % font in children, make font size same as height
	$Wrapper.style.fontSize = $h +  'px';
	//$Wrapper.style.backgroundColor = 'red';
	//$Wrapper.style.opacity = '0.5';
	
	//	as we're using this element in multiple places, we need to clone it!
	var $Clone = $Element.cloneNode(true);
	$Wrapper.appendChild($Clone);
	
	// create the object3d for this element
	if ( $FollowCamera )
	{
		//	orientate to face camera....
		//	gr: not what we want to do when we start rotating menus
		//var cssObject = new THREE.CSS3DSprite( $Wrapper );
		var cssObject = new THREE.CSS3DObject( $Wrapper );
		
		cssObject.mFollowMatrix = new THREE.Matrix4();
		cssObject.mEnableCull = $FollowCameraEnableCull;
		
		
		cssObject.getCSSMatrix = function($Camera)
		{
			//	we use rendering camera far
			var $Far = $Camera.far;
			var $ParentCamera = $Camera.mParentCamera;
			if ( !$ParentCamera )
				return this.matrixWorld;

			var $Timestamp = new Date().getTime();
			
			//	get scale to turn menu res into face size (which would be full-screen)
			var $MenuScale = 1 - $FollowCameraDistanceFarScale;
			
			var $Dist = ($Far * $MenuScale) -1;	//	-1 to stop clipping if menu scale is 1
			
			//	debug anim
			//$Dist += Math.sin($Timestamp/1000) * $Far*0.5;
			
			var $Forward = new THREE.Vector3( 0, 0, $Dist );
			$Forward.applyMatrix4($ParentCamera.matrixWorld);

			var $CameraMatrix = new THREE.Matrix4();
			$CameraMatrix.makeRotationFromQuaternion( $ParentCamera.quaternion );
			$CameraMatrix.setPosition($Forward);

			var $LocalMatrix = this.matrixWorld.clone();
			$LocalMatrix.multiplyScalar( 1 );

			//$CameraMatrix.getInverse($CameraMatrix);
			//$LocalMatrix.getInverse($LocalMatrix);
			this.mFollowMatrix.multiplyMatrices($CameraMatrix,$LocalMatrix);
		
			return this.mFollowMatrix;
		};
	}
	else
	{
		var cssObject = new THREE.CSS3DObject( $Wrapper );
	}
	cssObject.mFollowCamera = $FollowCamera;

	// add it to the css scene
	this.mScene.add(cssObject);

	return cssObject;
}



PanoGui.prototype.Render = function($Timestamp)
{
//	console.log( this.mName );
	var $SceneCamera = this.mSceneRenderer.mLastCamera;
	var $SceneParentCamera = this.mSceneRenderer.mLastParentCamera;
	if ( $SceneCamera )
	{
		/*
		//	gr: always make camera match parent
		this.mCamera.near = $SceneCamera.near;
		this.mCamera.far = $SceneCamera.far;
		this.mCamera.fov = $SceneCamera.fov;
		 //this.mCamera.aspect = 0.5 * $SceneCamera.aspect;
		this.mCamera.aspect = $SceneCamera.aspect;
		this.mCamera.updateProjectionMatrix();
		this.mCamera.projectionMatrix.copy($SceneCamera.projectionMatrix);
	*/
		this.mCamera.position.copy( $SceneCamera.position );
		this.mCamera.rotation.copy( $SceneCamera.rotation );
	}
	
	//	update parent camera reference
	this.mCamera.mParentCamera = $SceneParentCamera;
	
	//	animate children else where to make sure all gui elements match...
	//	gr: one scene/css object... mulitple dom elements?
	/*
	if ( this.mScene.children.length > 0 )
	{
		var $Child = this.mScene.children[0];
		//	place child in front of camera...
		if ( $SceneParentCamera )
		{
			if ( $Child.mFollowCamera )
			{
				var $Dist = -Math.sin($Timestamp /(3*1000))*(this.mCamera.far*0.90);
				var $Forward = new THREE.Vector3( 0, 0, -$Dist );
				$SceneParentCamera.updateMatrixWorld();
				$Forward.applyMatrix4( $SceneParentCamera.matrixWorld );
				console.log($Forward);
				$Child.position.copy( $Forward );
				$Child.updateMatrixWorld();
			}
			
		}
		else
		{
			var $trans = -Math.sin($Timestamp /(3*1000))*(this.mCamera.far*0.90);
			$Child.position.z = $trans;
		}
	}
*/
	
	var $Viewport = CheckDefaultParam( this.mSceneRenderer.mViewport, false );
	//console.log($Viewport,this.mScene.children[0]);
	if ( $Viewport === false )
	{
		var $w = this.mContainer.clientWidth;
		var $h = this.mContainer.clientHeight;
		$Viewport = new SoyRect( 0, 0, $w, $h );
	}
	
	this.mRenderer.setSize( $Viewport.w, $Viewport.$h );
	this.mRenderer.setViewport( $Viewport.x, $Viewport.y, $Viewport.w, $Viewport.h );
	this.mRenderer.render( this.mScene, this.mCamera );

	var $this = this;
	requestAnimationFrame( function($Timestamp){ $this.Render($Timestamp); } );
}

function RegisterMenuContainer($Element,$Name)
{
	var $Gui = new PanoGui( $Element, $Name, null, null );
	$GuiRenderers.push( $Gui );

}

function RegisterMenuConfig($Config)
{
	//alert("RegisterMenuConfig( " + $Config.mRenderMode + ")" );
	
	if ( $Config.mRendererLeft )
		CreateGui( $Config.mRendererLeft, $Config, $Config.mRenderMode + ' left' );
	if ( $Config.mRendererRight )
		CreateGui( $Config.mRendererRight, $Config, $Config.mRenderMode + ' right' );
}

function CreateGui($SceneRenderer,$Config,$Name)
{
	var $Container = $SceneRenderer.domElement.parentNode;
	var $Gui = new PanoGui( $Container, $Name, $Config, $SceneRenderer );
	$GuiRenderers.push( $Gui );
}

function ShowMenu($Element,$Width,$Height)
{
	$Width = CheckDefaultParam( $Width, 100 );
	$Height = CheckDefaultParam( $Height, $Width );
	
	//	construct the rendering element
	if ( typeof $Element == 'string' )
	{
		var $NewElement = document.createElement('div');
		$NewElement.innerText = $Element;
		$NewElement.style.backgroundColor = 'white';
		$NewElement.style.opacity = '0.8';
		$NewElement.style.fontSize = '10%';
		
		//	gr: scale this res & margin for menuresoluition
		$NewElement.style.width = ($Width) + '%';	//	scale down
		$NewElement.style.height = ($Height) + '%';
		$NewElement.style.marginLeft = (100/2) - ($Width/2) + '%';
		$NewElement.style.marginTop = (100/2) - ($Height/2) + '%';
		$NewElement.style.overflow = 'hidden';
		
		$Element = $NewElement;
	}
	
	forEach( $GuiRenderers, function($Gui)
	{
		//	$Gui.Show($Element,true);
		var $Objecta = null;
		var $Objectb = null;
		$Objecta = $Gui.Show($Element,false);
		$Objectb = $Gui.Show($Element,true);
		//$Gui.ShowSphere();
		
			
			
		var $SpinAnim = function($Timestamp)
		{
			var $Object = this;
			var $CamFar = 512/2;
			
			//	animate in world space
			var $Dist = $CamFar * 0.90;

			var $Offset = new THREE.Vector3( 0, 0, -$Dist  );
			$Object.position.copy($Offset);
			
			//	animate
			
		//	$Object.position.x += Math.cos($Timestamp /1000) * $Dist;
		//	$Object.position.z += Math.sin($Timestamp /1000) * $Dist;

		//	$Object.rotateOnAxis( new THREE.Vector3(0,1,0), 0.11 );
			
			$Object.updateMatrixWorld();

			requestAnimationFrame( function($Timestamp){ $Object.Animate($Timestamp); } );
		};
			
		if ( $Objecta )
		{
			$Objecta.Animate = $SpinAnim;
			$Objecta.Animate(0);
		}
			
		if ( $Objectb )
		{
			$Objectb.Animate = $SpinAnim;
			$Objectb.Animate(0);
		}
	} );
}



//	returns when finished
function Slide($this,$Timestep,$FromAngle,$ToAngle,$FromLerp,$ToLerp)
{
	var $LerpStep = 0.001;
	var $Dist = 200;

	$this.mLerp = CheckDefaultParam( $this.mLerp, $FromLerp );
	$this.mLerp += $Timestep * $LerpStep;

	var $Finished = ( $this.mLerp >= $ToLerp );
	if ( $Finished )
		$this.mLerp = $ToLerp;

	//	animate in world space
	var $Deg = Lerp($FromAngle,$ToAngle,GetLerp($FromLerp,$ToLerp,$this.mLerp) );
	var $Rad = THREE.Math.degToRad( $Deg );
	$this.position.x = Math.cos( $Rad ) * $Dist;
	$this.position.z = Math.sin( $Rad ) * $Dist;
	$this.quaternion.setFromAxisAngle( new THREE.Vector3(0,1,0), THREE.Math.degToRad(-$Deg-90) );

	return $Finished;
}

function SlideOn($this,$Timestep)
{
	if ( Slide($this,$Timestep,180,270,-1,0) )
		$this.mOnUpdate = null;
}

function SlideOff($this,$Timestep)
{
	if ( Slide($this,$Timestep,270,360,0,1) )
		$this.mOnUpdate = null;
}

function PanoMenu($Element,$OnUpdate)
{
	$OnUpdate = CheckDefaultParam( $OnUpdate, false );
	this.mOnUpdate = $OnUpdate;
	this.mDeleteMe = false;
	this.mElement = $Element;
	this.mObjects = [];
	this.position = new THREE.Vector3();
	this.quaternion = new THREE.Quaternion();
	this.scale = new THREE.Vector3(1,1,1);
	
	this.Update(0);
}

PanoMenu.prototype.Update = function($Timestamp)
{
	//	calc timestep
	var $Timestep = 1000/60;
	if ( this.mOnUpdate )
	{
		this.mOnUpdate( this, $Timestep );
	}
	
	//	delete self
	if ( this.mDeleteMe )
	{
		
	}
	
	//	update object in scene
	var $this = this;
	forEach( this.mObjects, function($Object)
	{
			$Object.position.copy( $this.position );
			$Object.quaternion.copy( $this.quaternion );
			$Object.scale.copy( $this.scale );
		//	$Object.updateMatrixWorld();
	});

	var $this = this;
	requestAnimationFrame( function($Timestamp){ $this.Update($Timestamp); } );

}


PanoMenu.prototype.Show = function()
{
	this.mOnUpdate = SlideOn;

	//	todo: grab existing element w/h
	var $Width = CheckDefaultParam( this.mElement.style.width, 100 );
	var $Height = CheckDefaultParam( this.mElement.style.height, $Width );

	$Width = 50;
	$Height = 50;
	//	gr: scale this res & margin for menuresoluition
	this.mElement.style.width = ($Width) + '%';	//	scale down
	this.mElement.style.height = ($Height) + '%';
	this.mElement.style.marginLeft = (100/2) - ($Width/2) + '%';
	this.mElement.style.marginTop = (100/2) - ($Height/2) + '%';
	//this.mElement.style.overflow = 'hidden';
	this.mElement.style.fontSize = '10%';
	
	var $FollowCamera = true;
	
	var $this = this;
	forEach( $GuiRenderers, function($Gui)
	{
		var $Object = $Gui.Show($this.mElement,$FollowCamera);
		$this.mObjects.push( $Object );
	} );
}


PanoMenu.prototype.Hide = function()
{
	this.mOnUpdate = SlideOff;
}

