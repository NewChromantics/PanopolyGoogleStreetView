function ShowElement($ElementName,Visible)
{
	if ( Visible == undefined )
		Visible = true;
	var Element = document.getElementById($ElementName);
	if ( !Element )
		return;
	Element.style.display = Visible ? "block" : "none";
}

function GetElement($Name)
{
	return document.getElementById($Name);
}

function IsDevice(Name)
{
	return ( navigator.userAgent.indexOf(Name) != -1 );
}

function IsFileUploadSupported()
{
	//	does browser support input?
	if ( !window.File || !window.FileReader )
		return false;
	
	return true;
}
