

varying vec4 vColor;
uniform sampler2D DiffuseTexture;
uniform sampler2D DepthTexture;
uniform float gDepthNear;
uniform float gDepthFar;
uniform float gPointSize;
uniform float gWorldYaw;

//	from http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/
/*
 vec4 EncodeFloatRGBA( float v )
 {
 vec4 enc = vec4(1.0, 255.0, 65025.0, 160581375.0) * v;
 enc.x = frac(enc.x);
 enc -= enc.yzww * vec4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);
 return enc;
 }
 */
float DecodeFloatRGBA( vec4 rgba )
{
	return dot( rgba, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/160581375.0) );
}

float DecodeFloatRGB( vec4 rgba )
{
	return dot( rgba, vec4(1.0, 1.0/255.0, 1.0/65025.0, 0.0) );
}

//	from my php code
vec3 VectorFromCoordsRad(vec2 latlon)
{
	//	http://en.wikipedia.org/wiki/N-vector#Converting_latitude.2Flongitude_to_n-vector
	float latitude = latlon.x;
	float longitude = latlon.y;
	float las = sin(latitude);
	float lac = cos(latitude);
	float los = sin(longitude);
	float loc = cos(longitude);
	
	return vec3( los * lac, las, loc * lac );
}
#define M_PI 3.1415926535897932384626433832795

vec2 GetLatLong(float x,float y,float Width,float Height)
{
	float xmul = 2.0;
	float xsub = 1.0;
	float ymul = 1.0;
	float ysub = 0.5;
	
	float xfract = x / Width;
	xfract *= xmul;
	
	//	float yfract = (Height - y) / Height;
	float yfract = (y) / Height;
	yfract *= ymul;
	
	float lon = ( xfract - xsub) * M_PI;
	float lat = ( yfract - ysub) * M_PI;
	return vec2( lat, lon );
}

float lerp(float From,float To,float Time)
{
	return From + (To-From)*Time;
}

void main()
{
	//	debug view different angle
	float x = position.x + gWorldYaw;
	if ( x < 0.0 )
		x += 1.0;
	if ( x > 1.0 )
		x -= 1.0;
	
	vec2 Diffuseuv = vec2( 1.0-x,position.y );
	vec2 Depthuv = vec2( 1.0-x,position.y );
	
	vec4 Depth4 = texture2D( DepthTexture, Depthuv );
	bool DepthInf = Depth4.w < 0.5;
	Depth4.w = 0.0;
	float Depthf = DepthInf ? 1.0 : DecodeFloatRGB( Depth4 );
	
	///Depthf = 1.0;
	//	lat lon to view
	vec3 View3 = VectorFromCoordsRad( GetLatLong(position.x, position.y,1.0,1.0) );
	View3 = normalize(View3);
	
	//	gr: have a near value so the floor bends and isnt flat...
	float WorldDepth = lerp( gDepthNear, gDepthFar, Depthf );
	vec3 World3 = View3 * WorldDepth;
	
	vec4 World4 = modelViewMatrix * vec4( World3, 1.0 );
	
	gl_PointSize = gPointSize;
	
	gl_Position = projectionMatrix * World4;
	
	vColor = texture2D( DiffuseTexture, Diffuseuv );
	
	if ( DepthInf )
	{
		//gl_PointSize = 0.0;
		vColor.r *= 0.2;
		vColor.g *= 0.2;
		vColor.b *= 0.2;
	}
	else
	{
		//vColor.r = 1.0-Depthf;
		//	vColor.g = 1.0-Depthf;
		//vColor.b = 1.0-Depthf;
	}
}
