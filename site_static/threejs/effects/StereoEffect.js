/**
 * @author alteredq / http://alteredqualia.com/
 * @authod mrdoob / http://mrdoob.com/
 * @authod arodic / http://aleksandarrodic.com/
 */

THREE.StereoEffect = function ( $LeftRenderer,$RightRenderer ) {

	// API

	this.separation = 10;

	// internals

	var _width, _height;

	var _position = new THREE.Vector3();
	var _quaternion = new THREE.Quaternion();
	var _scale = new THREE.Vector3();

	var _cameraL = new THREE.PerspectiveCamera();
	var _cameraR = new THREE.PerspectiveCamera();

	// initialization

	if ( $LeftRenderer )
		$LeftRenderer.autoClear = false;
	
	if ( $RightRenderer )
		$RightRenderer.autoClear = false;

	this.setSize = function ( width, height ) {

		var $OneRenderer = !$RightRenderer;

		_width = width;
		_height = height;
/*
		
		//	just do this in render()
		if ( $LeftRenderer )
			$LeftRenderer.setSize( _width, _height );
		
		if ( $RightRenderer )
			$RightRenderer.setSize( _width, _height );
*/
	};

	this.render = function ( scene, camera ) {

		scene.updateMatrixWorld();

		if ( camera.parent === undefined ) camera.updateMatrixWorld();
	
		camera.matrixWorld.decompose( _position, _quaternion, _scale );

		// left

		_cameraL.fov = camera.fov;
		_cameraL.aspect = 0.5 * camera.aspect;
		_cameraL.near = camera.near;
		_cameraL.far = camera.far;
		_cameraL.updateProjectionMatrix();

		_cameraL.position.copy( _position );
		_cameraL.quaternion.copy( _quaternion );
		_cameraL.translateX( - this.separation );

		// right

		_cameraR.near = camera.near;
		_cameraR.far = camera.far;
		_cameraR.projectionMatrix = _cameraL.projectionMatrix;

		_cameraR.fov = camera.fov;
		_cameraR.aspect = 0.5 * camera.aspect;
		_cameraR.updateProjectionMatrix();

		_cameraR.position.copy( _position );
		_cameraR.quaternion.copy( _quaternion );
		_cameraR.translateX( this.separation );

		var $SingleRenderer = ($RightRenderer == null);
		var $ViewportWidth = $SingleRenderer ? _width/2 : _width/2;
		var $ViewportHeight = _height;
		var $CanvasWidth = $SingleRenderer ? _width : _width/2;
		var $CanvasHeight = _height;

		//	gr: scissor and viewport don't stop clear() from clearing everything in GL so don't clear.

		if ( $LeftRenderer )
		{
			var $x = 0;
			var $y = 0;

			$LeftRenderer.setSize( $CanvasWidth, $CanvasHeight );
			$LeftRenderer.setViewport( $x, $y, $ViewportWidth, $ViewportHeight );
	//		$LeftRenderer.setScissor( $x, $y, $ViewportWidth, $ViewportHeight );
	//		$LeftRenderer.clear();
			$LeftRenderer.render( scene, _cameraL );
		}
		
		
		var $SecondRenderer = $SingleRenderer ? $LeftRenderer : $RightRenderer;
		if ( $SecondRenderer )
		{
			var $x = $ViewportWidth;
			var $y = 0;
			
			$SecondRenderer.setSize( $CanvasWidth, $CanvasHeight );
			$SecondRenderer.setViewport( $x, $y, $ViewportWidth, $ViewportHeight );
	//		$SecondRenderer.setScissor( $x, $y, $ViewportWidth, $ViewportHeight );
	//		$SecondRenderer.clear();
			$SecondRenderer.render( scene, _cameraR );
		}
		 
	};

};