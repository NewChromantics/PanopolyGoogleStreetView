#!/bin/bash

CLONE_DIR=~/clone
FFMPEG_DIR=~/ffmpeg
REPOS_DIR=~/panopoly.git
branch="master"

cd ~/
if [ ! -d "ffmpeg" ]; then
	echo "updating ffmpeg"
	mkdir ffmpeg
	wget -P ffmpeg http://johnvansickle.com/ffmpeg/releases/ffmpeg-2.4-64bit-static.tar.xz
	tar -xvf ffmpeg/ffmpeg-2.4-64bit-static.tar.xz -C ffmpeg
	mv ffmpeg/ffmpeg-2.4-64bit-static/* ffmpeg
fi

cd ~/
if [ ! -d "$REPOS_DIR" ]; then
	echo "making git repos"
	mkdir panopoly.git
	cd panopoly.git
	git init --bare
fi

cd ~/
if [ ! -d "$CLONE_DIR" ] && [ -d "$REPOS_DIR" ]; then
	echo "initial checkout"
	mkdir $CLONE_DIR
	cd $REPOS_DIR
	git --work-tree=$CLONE_DIR checkout -f $branch
fi	

cd ~/
if [ -d "$CLONE_DIR" ]; then
	echo "updating hook"
	cp $CLONE_DIR/post-receive.txt $REPOS_DIR/hooks/post-receive
fi
