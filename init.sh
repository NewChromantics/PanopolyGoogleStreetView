cd ~/
if [ ! -d "ffmpeg" ]; then
	echo "updating ffmpeg"
	mkdir ffmpeg
	wget -P ffmpeg http://johnvansickle.com/ffmpeg/releases/ffmpeg-2.4-64bit-static.tar.xz
	tar -xvf ffmpeg/ffmpeg-2.4-64bit-static.tar.xz -C ffmpeg
	mv ffmpeg/ffmpeg-2.4-64bit-static/* ffmpeg
fi

cd ~/
if [ ! -d "panopoly.git" ]; then
	echo "making git repos"
	mkdir panopoly.git
	cd panopoly.git
	git init --bare
fi

cd ~/
if [ -d "clone" ]; then
	echo "updating hook"
	cp clone/post-recieve.txt panopoly.git/hooks/post-recieve
fi
