var RENDERMODE_WEBGL = 'webgl';		//	three js
var RENDERMODE_CANVAS = 'canvas';	//	three js without webgl
var RENDERMODE_CUBEMAP = 'cubemap';	//	css3d
var RENDERMODE_NONE = null;

function SoyConfig($RenderMode)
{
	this.mFov = 70;
	this.mSeperation = 0.20;

	//	larger res = clipping issues
	//	gr: trying low res for mobile to stop crashes
	if ( IsMobile() )
	{
		this.mFaceResolution = 256;
		this.mMaxResolution = 2048;
	}
	else
	{
		//	osx chrome css clips badly at 2000px
		this.mFaceResolution = 1500;
		this.mMaxResolution = 4096;
	}

	this.mRenderMode = $RenderMode;
	
	assert(	this.mRenderMode == RENDERMODE_WEBGL ||
		   this.mRenderMode == RENDERMODE_CANVAS ||
		   this.mRenderMode == RENDERMODE_NONE ||
		   this.mRenderMode == RENDERMODE_CUBEMAP
		   );
}
