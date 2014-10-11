
SoyAsset_GsvPointCloud.prototype = new SoyAsset('GsvPointCloud');

function SoyAsset_GsvPointCloud($Meta,$OnLoaded,$OnFailed,$DoLoad)
{
	$DoLoad = CheckDefaultParam($DoLoad,true);
	
	$Meta = GoogleLocationToMeta($Meta);

	//	call super
	SoyAsset.apply( this, [$Meta,$OnLoaded,$OnFailed] );
	
	if ( $DoLoad )
		this.Load();
}


SoyAsset_GsvPointCloud.prototype.Load = function()
{
	var $this = this;
	function MakeOnLoadFunc($Name)
	{
		return function($Asset) { $this.OnLoadSubAsset($Asset,$Name); };
	}
	function MakeOnFailedFunc($Name)
	{
		return function($Asset) { $this.OnFailedSubAsset($Asset,$Name); };
	}
	
	//	load all sub-assets

	//	use local shader if provided
	if ( GetElement('pointcloudvertexshader') )
	{
		var $Element = GetElement('pointcloudvertexshader');
		this.mVertexShaderAsset = { mAsset: $Element.innerText, IsLoaded: function(){return true;}, };
	}
	else
		this.mVertexShaderAsset = new SoyAsset_Ajax('pointcloud.vert.glsl', MakeOnLoadFunc('VertexShader'), MakeOnFailedFunc('VertexShader') );
	
	this.mFragmentShaderAsset = new SoyAsset_Ajax('pointcloud.frag.glsl', MakeOnLoadFunc('FragmentShader'), MakeOnFailedFunc('FragmentShader') );
	this.mDepthAsset = new SoyAsset_GsvDepth( this.mMeta.Filename, MakeOnLoadFunc('Depth'), MakeOnFailedFunc('Depth') );
	this.mImageAsset = new SoyAsset_GsvImage( this.mMeta.Filename, MakeOnLoadFunc('Image'), MakeOnFailedFunc('Image') );
	
	return true;
}

SoyAsset_GsvPointCloud.prototype.OnFailedSubAsset = function($Asset,$Name)
{
	//	already stopped, don't need to do anything
	if ( this.mDesired == false )
		return;
	this.Stop();
	this.OnError('failed to load sub asset ' + $Name );
}


SoyAsset_GsvPointCloud.prototype.OnLoadSubAsset = function($Asset,$Name)
{
	//	already stopped, don't need to do anything
	if ( this.mDesired == false )
		return;

	//	see if all sub assets are loaded
	var $AllLoaded = true;
	var $SubAssets = this.GetSubAssets();
	forEach($SubAssets,function($Asset) { $AllLoaded = $AllLoaded && $Asset.IsLoaded(); } );
	
	if ( $AllLoaded )
		this.OnAllSubAssetsLoaded();
}

SoyAsset_GsvPointCloud.prototype.OnAllSubAssetsLoaded = function()
{
	assert( this.mVertexShaderAsset.mAsset );
	assert( this.mFragmentShaderAsset.mAsset );
	assert( this.mImageAsset.mAsset );
	assert( this.mDepthAsset.mAsset );

	//	create pointcloud
	//	gr: take resolution from somewhere... depth? image?
	var $w = 900;
	var $h = 900;

	var geometry = new THREE.BufferGeometry();
		
	geometry.attributes = {
		position: {
		itemSize: 3,
		array: new Float32Array( $w * $h * 3 ),
		numItems: $w * $h * 3,
		},
	};
		
	var $i = 0;
	for ( var $y=0;	$y<$h;	$y++ )
	{
		for ( var $x=0;	$x<$w;	$x++,$i+=geometry.attributes.position.itemSize )
		{
			geometry.attributes.position.array[$i+0] = $x/$w;
			geometry.attributes.position.array[$i+1] = $y/$h;
			geometry.attributes.position.array[$i+2] = 0;
		}
	}
	
	//	gr: we want no culling at all...
	var $Far = 100000;
	geometry.boundingSphere = new THREE.Sphere( new THREE.Vector3(0,0,0), $Far );
		
	var uniforms =
	{
		DiffuseTexture: { type: "t", value: THREE.ImageUtils.loadTexture( this.mImageAsset.mAsset.src ) },
		DepthTexture: { type: "t", value: THREE.ImageUtils.loadTexture( this.mDepthAsset.mAsset.src ) },
	};
	

	var material = new THREE.ShaderMaterial( {
											uniforms: 		uniforms,
											vertexShader:   this.mVertexShaderAsset.mAsset,
											fragmentShader: this.mFragmentShaderAsset.mAsset,
											});
		
	var mesh = new THREE.PointCloud( geometry, material );
	this.mAsset = mesh;
	
	this.OnLoaded();
}

SoyAsset_GsvPointCloud.prototype.GetSubAssets = function()
{
	return [ this.mVertexShaderAsset,
			this.mFragmentShaderAsset,
			this.mDepthAsset,
			this.mImageAsset
			];
}

SoyAsset_GsvPointCloud.prototype.Stop = function()
{
	var $SubAssets = GetSubAssets();
	forEach( $SubAssets, function($Asset) { $Asset.stop(); } );

	this.mDesired = false;
	this.mAsset = null;
}
