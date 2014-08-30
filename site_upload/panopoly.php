<?php
	function Init()
	{
		define('HASH_SALT', 'panopo.ly' );
		define('BUCKET_IMAGE', 'image.panopo.ly' );
		define('AWS_ACCESS','AKIAJK2WSC6CZI3Y7YUQ');
		define('AWS_SECRET','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');

		//	show parse errors
		ini_set('display_startup_errors',1);

		$Debug = array_key_exists( 'debug', $_GET );
		$Debug = true;
		if ( $Debug )
		{
			define('DEBUG', true );
			error_reporting(E_ALL);
			ini_set('display_errors', 1);
		}
	}
	
	function SanitiseImageName($Filename)
	{
		//	limit to certain characterset
		return $Filename;
	}
	
	function GetHashFile($Filename)
	{
		return hash_file("crc32", $Filename);
	}
	
	function GetHash($Content)
	{
		//	replace this with a database increment and hash that number to a short hash?
		//	crc32 is short anyway
		return hash("crc32", $Content);
	}

	Init();
?>