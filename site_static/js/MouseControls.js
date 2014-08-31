
THREE.MouseOrientationControls = function ( object, Container ) {

	var scope = this;

	this.object = object;

	this.object.rotation.reorder( "YXZ" );

	this.freeze = true;

	this.deviceOrientation = {};

	this.screenOrientation = 0;

	this.isUserInteracting = false;
	this.onMouseDownMouseX = 0;
	this.onMouseDownMouseY = 0;
	this.lon = 0;
	this.onMouseDownLon = 0;
	this.lat = 0;
	this.onMouseDownLat = 0;
	this.phi = 0;
	this.theta = 0;
	this.onPointerDownLon = 0;
	this.onPointerDownLat = 0;
	
	
	var onDocumentMouseDown = function( event ) {
		
		event.preventDefault();
		
		scope.isUserInteracting = true;
		
		scope.onPointerDownPointerX = event.clientX;
		scope.onPointerDownPointerY = event.clientY;
		
		scope.onPointerDownLon = scope.lon;
		scope.onPointerDownLat = scope.lat;
	};
	
	var onDocumentMouseMove = function( event ) {
		
		if ( scope.isUserInteracting === true ) {
			
			scope.lon = ( scope.onPointerDownPointerX - event.clientX ) * 0.1 + scope.onPointerDownLon;
			scope.lat = ( event.clientY - scope.onPointerDownPointerY ) * 0.1 + scope.onPointerDownLat;
			
		}
	};
	
	var onDocumentMouseUp = function( event ) {
		
		scope.isUserInteracting = false;
		
	};
	
	// The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

	var setObjectQuaternion = function () {

		var zee = new THREE.Vector3( 0, 0, 1 );

		var euler = new THREE.Euler();

		var q0 = new THREE.Quaternion();

		var q1 = new THREE.Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis

		return function ( quaternion, alpha, beta, gamma, orient ) {

			euler.set( beta, alpha, - gamma, 'YXZ' );                       // 'ZXY' for the device, but 'YXZ' for us

			quaternion.setFromEuler( euler );                               // orient the device

			quaternion.multiply( q1 );                                      // camera looks out the back of the device, not the top

			quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) );    // adjust for screen orientation
		}

	}();

	this.connect = function() {

		document.addEventListener( 'mousedown', onDocumentMouseDown, false );
		document.addEventListener( 'mousemove', onDocumentMouseMove, false );
		document.addEventListener( 'mouseup', onDocumentMouseUp, false );
		
		scope.freeze = false;

	};

	this.disconnect = function() {

		scope.freeze = true;

		window.removeEventListener( 'mousedown', onDocumentMouseDown, false );
		window.removeEventListener( 'mousemove', onDocumentMouseMove, false );
		window.removeEventListener( 'mouseup', onDocumentMouseUp, false );

	};

	this.update = function () {

		if ( scope.freeze ) return;
		
		if ( this.isUserInteracting === false ) {
			this.lon += 0.1;
		}
		
		
		var lat = Math.max( - 85, Math.min( 85, this.lat ) );
		var phi = THREE.Math.degToRad( 90 - this.lat );
		var theta = THREE.Math.degToRad( this.lon );
		
		var Origin = new THREE.Vector3(0,0,0);
		var Up = new THREE.Vector3(0,1,0);
		var Forward = new THREE.Vector3();
		Forward.x = 1 * Math.sin( phi ) * Math.cos( theta );
		Forward.y = 1 * Math.cos( phi );
		Forward.z = 1 * Math.sin( phi ) * Math.sin( theta );
		
		var Mat = new THREE.Matrix4();
		Mat.lookAt( Origin, Forward, Up );
		
		var alpha  = lat;
		var beta   = phi;
		var gamma  = theta;
		var orient = 0; // O

		scope.object.quaternion.setFromRotationMatrix( Mat );
	//	setObjectQuaternion( scope.object.quaternion, alpha, beta, gamma, orient );

	};


};