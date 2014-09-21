var RENDERMODE_WEBGL = 'webgl';		//	three js
var RENDERMODE_CANVAS = 'canvas';	//	three js without webgl
var RENDERMODE_CUBEMAP = 'cubemap';	//	css3d
var RENDERMODE_NONE = null;

function SoyConfig($RenderMode)
{
	this.mFov = 45;
	this.mFaceResolution = 1000;
	
	this.mRenderMode = $RenderMode;
	
	assert(	this.mRenderMode == RENDERMODE_WEBGL ||
		   this.mRenderMode == RENDERMODE_CANVAS ||
		   this.mRenderMode == RENDERMODE_NONE ||
		   this.mRenderMode == RENDERMODE_CUBEMAP
		   );
}
